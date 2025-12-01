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
      updated_at,
      ticket_status,
      customer_id,
      customer_name,
      customer_email,
      mailbox_id,
      title,
      customer_message,
      priority,
      product_id,
      product_name,
      agent_id,
      agent_name,
      raw_data,
      request_id
    } = data;

    const [result] = await connection.query(
      `INSERT INTO fluent_tickets (
        fluent_id, ticket_number, created_at, updated_at_fluent,
        ticket_status, customer_id, customer_name, customer_email,
        mailbox_id, title, customer_message, priority,
        product_id, product_name, agent_id, agent_name,
        raw_data, request_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        fluent_id,
        ticket_number,
        created_at,
        updated_at,
        ticket_status,
        customer_id,
        customer_name,
        customer_email,
        mailbox_id,
        title,
        customer_message,
        priority,
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
      updated_at,
      ticket_status,
      customer_id,
      customer_name,
      customer_email,
      mailbox_id,
      title,
      customer_message,
      priority,
      product_id,
      product_name,
      agent_id,
      agent_name,
      raw_data
    } = data;

    const [result] = await connection.query(
      `UPDATE fluent_tickets
       SET ticket_number = ?, created_at = ?, updated_at_fluent = ?,
           ticket_status = ?, customer_id = ?, customer_name = ?,
           customer_email = ?, mailbox_id = ?, title = ?,
           customer_message = ?, priority = ?, product_id = ?,
           product_name = ?, agent_id = ?, agent_name = ?,
           raw_data = ?, last_synced_at = NOW()
       WHERE id = ?`,
      [
        ticket_number,
        created_at,
        updated_at,
        ticket_status,
        customer_id,
        customer_name,
        customer_email,
        mailbox_id,
        title,
        customer_message,
        priority,
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
   * Find all fluent tickets with pagination
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Array of fluent ticket records
   */
  async findAll({ limit = 100, offset = 0 } = {}) {
    const [rows] = await pool.query(
      `SELECT ft.*, r.date, r.time, r.category, r.urgency, r.status
       FROM fluent_tickets ft
       LEFT JOIN requests r ON ft.request_id = r.id
       ORDER BY ft.created_at DESC
       LIMIT ? OFFSET ?`,
      [parseInt(limit), parseInt(offset)]
    );
    return rows;
  }

  /**
   * Count fluent tickets by status
   * @returns {Promise<Array>} Status breakdown
   */
  async countByStatus() {
    const [rows] = await pool.query(
      `SELECT ticket_status, COUNT(*) as count
       FROM fluent_tickets
       GROUP BY ticket_status`
    );
    return rows;
  }

  /**
   * Get total count of fluent tickets
   * @returns {Promise<number>} Total count
   */
  async count() {
    const [[{ count }]] = await pool.query(
      'SELECT COUNT(*) as count FROM fluent_tickets'
    );
    return parseInt(count);
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
}

export default new FluentTicketRepository();
