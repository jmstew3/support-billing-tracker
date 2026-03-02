import pool from '../db/config.js';

/**
 * FluentTicket Repository
 * Data access layer for fluent_tickets table
 * Handles FluentSupport ticket metadata storage
 */
class FluentTicketRepository {
  /**
   * Find a fluent ticket by fluent_id
   * @param {string|number} fluentId - FluentSupport ticket ID
   * @returns {Promise<Object|null>} Fluent ticket record or null
   */
  async findByFluentId(fluentId) {
    const [rows] = await pool.execute(
      'SELECT id, request_id FROM fluent_tickets WHERE fluent_id = ?',
      [fluentId.toString()]
    );
    return rows[0] || null;
  }

  /**
   * Find a fluent ticket by ID
   * @param {number} id - Internal ID
   * @returns {Promise<Object|null>} Fluent ticket record or null
   */
  async findById(id) {
    const [rows] = await pool.execute(
      'SELECT * FROM fluent_tickets WHERE id = ?',
      [id]
    );
    return rows[0] || null;
  }

  /**
   * Create a new fluent ticket record
   * @param {Object} connection - MySQL connection (for transactions)
   * @param {Object} data - Ticket data
   * @returns {Promise<number>} Inserted ticket ID
   */
  async createWithConnection(connection, data) {
    const {
      fluent_id,
      ticket_number,
      created_at,
      resolved_at,
      updated_at,
      ticket_status,
      customer_id,
      customer_name,
      customer_email,
      mailbox_id,
      title,
      customer_message,
      priority,
      response_count = 0,
      total_close_time = null,
      product_id,
      product_name,
      agent_id,
      agent_name,
      raw_data,
      request_id
    } = data;

    const [result] = await connection.query(
      `INSERT INTO fluent_tickets (
        fluent_id, ticket_number, created_at, resolved_at, updated_at_fluent,
        ticket_status, customer_id, customer_name, customer_email,
        mailbox_id, title, customer_message, priority,
        response_count, total_close_time,
        product_id, product_name, agent_id, agent_name,
        raw_data, request_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        fluent_id,
        ticket_number,
        created_at,
        resolved_at || null,
        updated_at,
        ticket_status,
        customer_id,
        customer_name,
        customer_email,
        mailbox_id,
        title,
        customer_message,
        priority,
        response_count,
        total_close_time,
        product_id,
        product_name,
        agent_id,
        agent_name,
        JSON.stringify(raw_data),
        request_id
      ]
    );

    return result.insertId;
  }

  /**
   * Update a fluent ticket record
   * @param {Object} connection - MySQL connection (for transactions)
   * @param {number} id - Internal ID
   * @param {Object} data - Fields to update
   * @returns {Promise<boolean>} True if updated
   */
  async updateWithConnection(connection, id, data) {
    const {
      ticket_number,
      created_at,
      resolved_at,
      updated_at,
      ticket_status,
      customer_id,
      customer_name,
      customer_email,
      mailbox_id,
      title,
      customer_message,
      priority,
      response_count,
      total_close_time,
      product_id,
      product_name,
      agent_id,
      agent_name,
      raw_data
    } = data;

    const [result] = await connection.query(
      `UPDATE fluent_tickets
       SET ticket_number = ?, created_at = ?, resolved_at = ?, updated_at_fluent = ?,
           ticket_status = ?, customer_id = ?, customer_name = ?,
           customer_email = ?, mailbox_id = ?, title = ?,
           customer_message = ?, priority = ?,
           response_count = ?, total_close_time = ?,
           product_id = ?,
           product_name = ?, agent_id = ?, agent_name = ?,
           raw_data = ?, last_synced_at = NOW()
       WHERE id = ?`,
      [
        ticket_number,
        created_at,
        resolved_at !== undefined ? resolved_at : null,
        updated_at,
        ticket_status,
        customer_id,
        customer_name,
        customer_email,
        mailbox_id,
        title,
        customer_message,
        priority,
        response_count != null ? response_count : 0,
        total_close_time != null ? total_close_time : null,
        product_id,
        product_name,
        agent_id,
        agent_name,
        JSON.stringify(raw_data),
        id
      ]
    );

    return result.affectedRows > 0;
  }

  /**
   * Find all fluent tickets with pagination, optionally filtered by mailbox_id
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Array of fluent ticket records
   */
  async findAll({ limit = 100, offset = 0, mailboxId = null } = {}) {
    let query = `
      SELECT ft.*, r.date, r.time, r.category, r.urgency, r.status
      FROM fluent_tickets ft
      LEFT JOIN requests r ON ft.request_id = r.id
    `;
    const params = [];

    if (mailboxId) {
      query += ` WHERE ft.mailbox_id = ?`;
      params.push(mailboxId);
    }

    query += ` ORDER BY ft.created_at DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), parseInt(offset));

    const [rows] = await pool.query(query, params);
    return rows;
  }

  /**
   * Count fluent tickets by status, optionally filtered by mailbox_id
   * @param {number|string} mailboxId - Optional mailbox filter
   * @returns {Promise<Array>} Status breakdown
   */
  async countByStatus(mailboxId = null) {
    let query = `SELECT ticket_status, COUNT(*) as count FROM fluent_tickets`;
    const params = [];

    if (mailboxId) {
      query += ` WHERE mailbox_id = ?`;
      params.push(mailboxId);
    }

    query += ` GROUP BY ticket_status`;
    const [rows] = await pool.query(query, params);
    return rows;
  }

  /**
   * Get total count of fluent tickets, optionally filtered by mailbox_id
   * @param {number|string} mailboxId - Optional mailbox filter
   * @returns {Promise<number>} Total count
   */
  async count(mailboxId = null) {
    let query = `SELECT COUNT(*) as count FROM fluent_tickets`;
    const params = [];

    if (mailboxId) {
      query += ` WHERE mailbox_id = ?`;
      params.push(mailboxId);
    }

    const [[{ count }]] = await pool.query(query, params);
    return parseInt(count);
  }

  /**
   * Delete tickets not matching the specified mailbox_id
   * Use with caution!
   * @param {Object} connection - MySQL connection
   * @param {number|string} mailboxId - The mailbox_id to KEEP
   * @returns {Promise<number>} Number of deleted tickets
   */
  async deleteOtherMailboxes(connection, mailboxId) {
    if (!mailboxId) return 0;
    
    // First find the associated request IDs to delete those too (soft delete)
    const [rows] = await connection.query(
      'SELECT request_id FROM fluent_tickets WHERE mailbox_id != ? AND request_id IS NOT NULL',
      [mailboxId]
    );
    
    const requestIds = rows.map(r => r.request_id);
    
    if (requestIds.length > 0) {
      const placeholders = requestIds.map(() => '?').join(', ');
      await connection.query(
        `UPDATE requests SET status = 'deleted' WHERE id IN (${placeholders})`,
        requestIds
      );
    }

    const [result] = await connection.query(
      'DELETE FROM fluent_tickets WHERE mailbox_id != ?',
      [mailboxId]
    );
    
    return result.affectedRows;
  }

  /**
   * Check if fluent_id exists using specific connection
   * @param {Object} connection - MySQL connection
   * @param {string|number} fluentId - FluentSupport ticket ID
   * @returns {Promise<Object|null>} Existing record or null
   */
  async findByFluentIdWithConnection(connection, fluentId) {
    const [rows] = await connection.query(
      'SELECT id, request_id FROM fluent_tickets WHERE fluent_id = ?',
      [fluentId.toString()]
    );
    return rows[0] || null;
  }

  /**
   * Batch lookup fluent tickets by multiple fluent IDs
   * Eliminates N+1 query pattern by using WHERE fluent_id IN (?)
   * @param {Object} connection - MySQL connection (for transactions)
   * @param {string[]} fluentIds - Array of FluentSupport ticket IDs
   * @returns {Promise<Map<string, Object>>} Map of fluent_id → record
   */
  async findByFluentIdsBatch(connection, fluentIds) {
    const map = new Map();
    if (!fluentIds || fluentIds.length === 0) return map;

    const placeholders = fluentIds.map(() => '?').join(', ');
    const [rows] = await connection.query(
      `SELECT id, request_id, fluent_id FROM fluent_tickets WHERE fluent_id IN (${placeholders})`,
      fluentIds
    );

    for (const row of rows) {
      map.set(row.fluent_id.toString(), row);
    }

    return map;
  }
}

export default new FluentTicketRepository();
