import express from 'express';
import pool from '../db/config.js';
import { fetchFluentTickets, transformFluentTicket } from '../services/fluentSupportApi.js';

const router = express.Router();

/**
 * POST /api/fluent/sync
 * Sync tickets from FluentSupport API to database
 * Only imports tickets created after the configured date filter
 */
router.post('/sync', async (req, res) => {
  const startTime = Date.now();
  let connection;

  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    // Get date filter from request or use default
    const dateFilter = req.body.dateFilter || process.env.VITE_FLUENT_DATE_FILTER || '2025-09-20';

    // Update sync status to in_progress
    const [syncResult] = await connection.query(
      'INSERT INTO fluent_sync_status (last_sync_at, last_sync_status, date_filter) VALUES (NOW(), "in_progress", ?)',
      [dateFilter]
    );
    const syncId = syncResult.insertId;

    // Fetch tickets from FluentSupport API
    const tickets = await fetchFluentTickets(dateFilter);

    let ticketsAdded = 0;
    let ticketsUpdated = 0;
    let ticketsSkipped = 0;

    // Process each ticket
    for (const ticket of tickets) {
      try {
        const requestData = transformFluentTicket(ticket);

        if (!requestData.fluent_id) {
          ticketsSkipped++;
          continue;
        }

        // Check if ticket already exists
        const [existing] = await connection.query(
          'SELECT id, request_id FROM fluent_tickets WHERE fluent_id = ?',
          [requestData.fluent_id]
        );

        if (existing.length > 0) {
          // Update existing ticket
          const fluentTicketId = existing[0].id;
          const requestId = existing[0].request_id;

          // Update the associated request
          if (requestId) {
            await connection.query(
              `UPDATE requests
               SET date = ?, time = ?, category = ?, description = ?,
                   urgency = ?, effort = ?, source = ?, website_url = ?
               WHERE id = ?`,
              [
                requestData.date,
                requestData.time,
                requestData.category,
                requestData.description,
                requestData.urgency,
                requestData.effort,
                requestData.source,
                requestData.website_url,
                requestId
              ]
            );
          }

          // Update fluent_tickets record
          const meta = requestData.fluent_metadata;
          await connection.query(
            `UPDATE fluent_tickets
             SET ticket_number = ?, created_at = ?, updated_at_fluent = ?,
                 ticket_status = ?, customer_id = ?, customer_name = ?,
                 customer_email = ?, mailbox_id = ?, title = ?,
                 customer_message = ?, priority = ?, product_id = ?,
                 product_name = ?, agent_id = ?, agent_name = ?,
                 raw_data = ?, last_synced_at = NOW()
             WHERE id = ?`,
            [
              meta.ticket_number,
              meta.created_at,
              meta.updated_at,
              meta.ticket_status,
              meta.customer_id,
              meta.customer_name,
              meta.customer_email,
              meta.mailbox_id,
              requestData.description.substring(0, 255), // title field max length
              meta.customer_message,
              meta.priority,
              meta.product_id,
              meta.product_name,
              meta.agent_id,
              meta.agent_name,
              JSON.stringify(meta.raw_data),
              fluentTicketId
            ]
          );

          ticketsUpdated++;

        } else {
          // Create new request
          const [result] = await connection.query(
            `INSERT INTO requests (date, time, request_type, category, description,
                                  urgency, effort, status, source, website_url)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              requestData.date,
              requestData.time,
              requestData.request_type,
              requestData.category,
              requestData.description,
              requestData.urgency,
              requestData.effort,
              requestData.status,
              requestData.source,
              requestData.website_url
            ]
          );

          const requestId = result.insertId;

          // Create fluent_tickets record
          const meta = requestData.fluent_metadata;
          await connection.query(
            `INSERT INTO fluent_tickets (
              fluent_id, ticket_number, created_at, updated_at_fluent,
              ticket_status, customer_id, customer_name, customer_email,
              mailbox_id, title, customer_message, priority,
              product_id, product_name, agent_id, agent_name,
              raw_data, request_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              requestData.fluent_id,
              meta.ticket_number,
              meta.created_at,
              meta.updated_at,
              meta.ticket_status,
              meta.customer_id,
              meta.customer_name,
              meta.customer_email,
              meta.mailbox_id,
              requestData.description.substring(0, 255),
              meta.customer_message,
              meta.priority,
              meta.product_id,
              meta.product_name,
              meta.agent_id,
              meta.agent_name,
              JSON.stringify(meta.raw_data),
              requestId
            ]
          );

          ticketsAdded++;
        }

      } catch (ticketError) {
        ticketsSkipped++;
      }
    }

    // Update sync status to success
    const duration = Date.now() - startTime;
    await connection.query(
      `UPDATE fluent_sync_status
       SET last_sync_status = "success",
           tickets_fetched = ?, tickets_added = ?, tickets_updated = ?,
           tickets_skipped = ?, sync_duration_ms = ?, error_message = NULL
       WHERE id = ?`,
      [tickets.length, ticketsAdded, ticketsUpdated, ticketsSkipped, duration, syncId]
    );

    await connection.commit();

    res.json({
      success: true,
      ticketsFetched: tickets.length,
      ticketsAdded,
      ticketsUpdated,
      ticketsSkipped,
      syncDuration: duration,
      dateFilter
    });

  } catch (error) {
    if (connection) {
      await connection.rollback();

      // Update sync status to failed
      try {
        await connection.query(
          `UPDATE fluent_sync_status
           SET last_sync_status = "failed",
               error_message = ?
           WHERE id = (SELECT MAX(id) FROM (SELECT id FROM fluent_sync_status) AS t)`,
          [error.message]
        );
      } catch (updateError) {
        // Failed to update sync status
      }
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

/**
 * GET /api/fluent/status
 * Get the last sync status and statistics
 */
router.get('/status', async (req, res) => {
  try {
    // Get latest sync status
    const [status] = await pool.query(
      `SELECT * FROM fluent_sync_status
       ORDER BY id DESC LIMIT 1`
    );

    // Get total ticket count
    const [ticketCount] = await pool.query(
      `SELECT COUNT(*) as count FROM fluent_tickets`
    );

    // Get tickets by status
    const [statusBreakdown] = await pool.query(
      `SELECT ticket_status, COUNT(*) as count
       FROM fluent_tickets
       GROUP BY ticket_status`
    );

    res.json({
      syncStatus: status[0] || null,
      totalTickets: ticketCount[0].count,
      statusBreakdown
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/fluent/tickets
 * Get all FluentSupport tickets from database
 */
router.get('/tickets', async (req, res) => {
  try {
    const { limit = 100, offset = 0 } = req.query;

    const [tickets] = await pool.query(
      `SELECT ft.*, r.date, r.time, r.category, r.urgency, r.status
       FROM fluent_tickets ft
       LEFT JOIN requests r ON ft.request_id = r.id
       ORDER BY ft.created_at DESC
       LIMIT ? OFFSET ?`,
      [parseInt(limit), parseInt(offset)]
    );

    res.json(tickets);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
