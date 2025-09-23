import express from 'express';
import axios from 'axios';
import pool from '../db/config.js';

const router = express.Router();

// Get Twenty API config from environment
const TWENTY_API_URL = process.env.VITE_TWENTY_API_URL || 'https://twenny.peakonedigital.com/rest/supportTickets';
const TWENTY_API_TOKEN = process.env.VITE_TWENTY_API_TOKEN || '';

// Transform Twenty ticket to request format
function transformTicketToRequest(ticket) {
  // Map category enum to dashboard categories
  const mapCategory = (category) => {
    switch(category) {
      case 'BRAND_WEBSITE_TICKET':
      case 'MULTI_BRAND_TICKET':
        return 'Support';
      case 'LANDING_PAGE_TICKET':
        return 'Forms';
      default:
        return 'Support';
    }
  };

  // Map priority to urgency levels
  const mapPriority = (priority) => {
    switch(priority) {
      case 'CRITICAL':
        return 'HIGH';
      case 'MEDIUM':
        return 'MEDIUM';
      case 'NORMAL':
      default:
        return 'LOW';
    }
  };

  // Estimate effort based on urgency
  const estimateEffort = (urgency) => {
    switch(urgency) {
      case 'HIGH':
        return 'Large';
      case 'MEDIUM':
        return 'Medium';
      case 'LOW':
      default:
        return 'Small';
    }
  };

  const urgency = mapPriority(ticket.priority);

  // Parse date and time
  const creationDate = new Date(ticket.fsCreationDate);
  const date = creationDate.toISOString().split('T')[0];
  const time = '08:00:00'; // Default time since API doesn't provide specific time

  return {
    date,
    time,
    request_type: 'Support Ticket',
    category: mapCategory(ticket.category),
    description: ticket.subject && ticket.description
      ? `${ticket.subject} - ${ticket.description}`
      : ticket.description || ticket.subject || 'No description available',
    urgency,
    effort: estimateEffort(urgency),
    status: 'active',
    source: 'ticket',
    twenty_id: ticket.id || ticket.fluentTicketId || null
  };
}

// Sync Twenty tickets to database
router.post('/sync', async (req, res) => {
  const startTime = Date.now();
  let connection;

  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    // Update sync status to in_progress
    await connection.query(
      'INSERT INTO twenty_sync_status (last_sync_at, last_sync_status) VALUES (NOW(), "in_progress")'
    );
    const syncId = (await connection.query('SELECT LAST_INSERT_ID() as id'))[0][0].id;

    // Fetch tickets from Twenty API
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${TWENTY_API_TOKEN}`
    };

    const url = TWENTY_API_URL.includes('/rest/supportTicket')
      ? `${TWENTY_API_URL}?depth=1`
      : `${TWENTY_API_URL}/rest/supportTicket?depth=1`;

    console.log('Fetching tickets from:', url);

    const response = await axios.get(url, { headers });

    // Parse response based on structure
    let tickets = [];
    if (response.data && typeof response.data === 'object') {
      if (response.data.data && response.data.data.supportTickets) {
        tickets = response.data.data.supportTickets;
      } else if (response.data.items) {
        tickets = response.data.items;
      } else if (Array.isArray(response.data)) {
        tickets = response.data;
      }
    }

    console.log(`Fetched ${tickets.length} tickets from Twenty API`);

    let ticketsAdded = 0;
    let ticketsUpdated = 0;

    // Process each ticket
    for (const ticket of tickets) {
      const requestData = transformTicketToRequest(ticket);

      // Check if ticket already exists
      const [existing] = await connection.query(
        'SELECT id FROM twenty_tickets WHERE twenty_id = ?',
        [requestData.twenty_id]
      );

      if (existing.length > 0) {
        // Update existing request
        const ticketId = existing[0].id;

        // Update the associated request
        await connection.query(
          `UPDATE requests r
           JOIN twenty_tickets t ON r.id = t.request_id
           SET r.date = ?, r.time = ?, r.category = ?, r.description = ?,
               r.urgency = ?, r.effort = ?, r.source = ?
           WHERE t.id = ?`,
          [requestData.date, requestData.time, requestData.category,
           requestData.description, requestData.urgency, requestData.effort,
           requestData.source, ticketId]
        );

        // Update twenty_tickets record
        const creationDate = ticket.fsCreationDate ? new Date(ticket.fsCreationDate).toISOString().slice(0, 19).replace('T', ' ') : null;
        await connection.query(
          `UPDATE twenty_tickets
           SET fs_creation_date = ?, subject = ?, description = ?, priority = ?, category = ?,
               raw_data = ?, last_synced_at = NOW()
           WHERE id = ?`,
          [creationDate, ticket.subject, ticket.description, ticket.priority,
           ticket.category, JSON.stringify(ticket), ticketId]
        );

        ticketsUpdated++;
      } else {
        // Create new request
        const [result] = await connection.query(
          `INSERT INTO requests (date, time, request_type, category, description,
                                urgency, effort, status, source)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [requestData.date, requestData.time, requestData.request_type,
           requestData.category, requestData.description, requestData.urgency,
           requestData.effort, requestData.status, requestData.source]
        );

        const requestId = result.insertId;

        // Create twenty_tickets record
        const creationDate = ticket.fsCreationDate ? new Date(ticket.fsCreationDate).toISOString().slice(0, 19).replace('T', ' ') : null;
        await connection.query(
          `INSERT INTO twenty_tickets (twenty_id, fs_creation_date, subject, description,
                                      priority, category, raw_data, request_id)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [requestData.twenty_id, creationDate, ticket.subject,
           ticket.description, ticket.priority, ticket.category,
           JSON.stringify(ticket), requestId]
        );

        ticketsAdded++;
      }
    }

    // Update sync status to success
    const duration = Date.now() - startTime;
    await connection.query(
      `UPDATE twenty_sync_status
       SET last_sync_status = "success",
           tickets_fetched = ?, tickets_added = ?, tickets_updated = ?,
           sync_duration_ms = ?, error_message = NULL
       WHERE id = ?`,
      [tickets.length, ticketsAdded, ticketsUpdated, duration, syncId]
    );

    await connection.commit();

    res.json({
      success: true,
      ticketsFetched: tickets.length,
      ticketsAdded,
      ticketsUpdated,
      syncDuration: duration
    });

  } catch (error) {
    console.error('Sync error:', error);

    if (connection) {
      await connection.rollback();

      // Update sync status to failed
      await connection.query(
        `UPDATE twenty_sync_status
         SET last_sync_status = "failed",
             error_message = ?
         WHERE id = (SELECT MAX(id) FROM (SELECT id FROM twenty_sync_status) AS t)`,
        [error.message]
      );
    }

    res.status(500).json({
      success: false,
      error: error.message
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

// Get sync status
router.get('/status', async (req, res) => {
  try {
    const [status] = await pool.query(
      `SELECT * FROM twenty_sync_status
       ORDER BY id DESC LIMIT 1`
    );

    const [ticketCount] = await pool.query(
      `SELECT COUNT(*) as count FROM twenty_tickets`
    );

    res.json({
      syncStatus: status[0] || null,
      totalTickets: ticketCount[0].count
    });
  } catch (error) {
    console.error('Error fetching sync status:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;