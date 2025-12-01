import pool from '../db/config.js';

/**
 * Request Repository
 * Data access layer for requests table
 * Provides CRUD operations and query methods
 */
class RequestRepository {
  /**
   * Find a request by ID
   * @param {number} id - Request ID
   * @returns {Promise<Object|null>} Request object or null
   */
  async findById(id) {
    const [rows] = await pool.execute(
      'SELECT * FROM requests WHERE id = ?',
      [id]
    );
    return rows[0] || null;
  }

  /**
   * Create a new request
   * @param {Object} data - Request data
   * @returns {Promise<number>} Inserted request ID
   */
  async create(data) {
    const {
      date,
      time,
      request_type = 'General Request',
      category = 'Support',
      description,
      urgency = 'MEDIUM',
      effort = 'Medium',
      status = 'active',
      source = 'sms',
      website_url = null
    } = data;

    const [result] = await pool.execute(
      `INSERT INTO requests (date, time, request_type, category, description,
                            urgency, effort, status, source, website_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [date, time, request_type, category, description,
       urgency, effort, status, source, website_url]
    );

    return result.insertId;
  }

  /**
   * Update a request by ID
   * @param {number} id - Request ID
   * @param {Object} data - Fields to update
   * @returns {Promise<boolean>} True if updated
   */
  async update(id, data) {
    const allowedFields = [
      'date', 'time', 'category', 'description', 'urgency',
      'effort', 'status', 'source', 'website_url'
    ];

    const updates = [];
    const values = [];

    for (const [key, value] of Object.entries(data)) {
      if (allowedFields.includes(key) && value !== undefined) {
        updates.push(`${key} = ?`);
        values.push(value);
      }
    }

    if (updates.length === 0) return false;

    values.push(id);
    const [result] = await pool.execute(
      `UPDATE requests SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    return result.affectedRows > 0;
  }

  /**
   * Delete a request by ID
   * @param {number} id - Request ID
   * @param {boolean} permanent - If true, permanently delete; otherwise soft delete
   * @returns {Promise<boolean>} True if deleted
   */
  async delete(id, permanent = false) {
    if (permanent) {
      const [result] = await pool.execute(
        'DELETE FROM requests WHERE id = ?',
        [id]
      );
      return result.affectedRows > 0;
    }

    // Soft delete
    const [result] = await pool.execute(
      'UPDATE requests SET status = ? WHERE id = ?',
      ['deleted', id]
    );
    return result.affectedRows > 0;
  }

  /**
   * Find all requests with optional filtering
   * @param {Object} filters - Filter options
   * @returns {Promise<Array>} Array of request objects
   */
  async findAll(filters = {}) {
    const {
      status,
      category,
      urgency,
      source,
      startDate,
      endDate,
      limit,
      offset = 0
    } = filters;

    let query = 'SELECT * FROM requests WHERE 1=1';
    const params = [];

    if (status && status !== 'all') {
      query += ' AND status = ?';
      params.push(status);
    }

    if (category) {
      query += ' AND category = ?';
      params.push(category);
    }

    if (urgency) {
      query += ' AND urgency = ?';
      params.push(urgency.toUpperCase());
    }

    if (source) {
      query += ' AND source = ?';
      params.push(source);
    }

    if (startDate) {
      query += ' AND date >= ?';
      params.push(startDate);
    }

    if (endDate) {
      query += ' AND date <= ?';
      params.push(endDate);
    }

    query += ' ORDER BY date DESC, time DESC, id DESC';

    if (limit) {
      query += ' LIMIT ? OFFSET ?';
      params.push(parseInt(limit), parseInt(offset));
    }

    const [rows] = await pool.execute(query, params);
    return rows;
  }

  /**
   * Count requests with optional filtering
   * @param {Object} filters - Filter options
   * @returns {Promise<number>} Count of matching requests
   */
  async count(filters = {}) {
    const { status, category, urgency, source, startDate, endDate } = filters;

    let query = 'SELECT COUNT(*) as total FROM requests WHERE 1=1';
    const params = [];

    if (status && status !== 'all') {
      query += ' AND status = ?';
      params.push(status);
    }

    if (category) {
      query += ' AND category = ?';
      params.push(category);
    }

    if (urgency) {
      query += ' AND urgency = ?';
      params.push(urgency.toUpperCase());
    }

    if (source) {
      query += ' AND source = ?';
      params.push(source);
    }

    if (startDate) {
      query += ' AND date >= ?';
      params.push(startDate);
    }

    if (endDate) {
      query += ' AND date <= ?';
      params.push(endDate);
    }

    const [[{ total }]] = await pool.execute(query, params);
    return parseInt(total);
  }

  /**
   * Use a specific database connection (for transactions)
   * @param {Object} connection - MySQL connection
   * @returns {RequestRepository} Repository instance with connection
   */
  withConnection(connection) {
    const repo = new RequestRepository();
    repo._connection = connection;
    return repo;
  }

  /**
   * Get the active connection (pool or transaction connection)
   * @private
   */
  get _pool() {
    return this._connection || pool;
  }

  /**
   * Create a request using a specific connection (for transactions)
   * @param {Object} connection - MySQL connection
   * @param {Object} data - Request data
   * @returns {Promise<number>} Inserted request ID
   */
  async createWithConnection(connection, data) {
    const {
      date,
      time,
      request_type = 'General Request',
      category = 'Support',
      description,
      urgency = 'MEDIUM',
      effort = 'Medium',
      status = 'active',
      source = 'sms',
      website_url = null
    } = data;

    const [result] = await connection.query(
      `INSERT INTO requests (date, time, request_type, category, description,
                            urgency, effort, status, source, website_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [date, time, request_type, category, description,
       urgency, effort, status, source, website_url]
    );

    return result.insertId;
  }

  /**
   * Update a request using a specific connection (for transactions)
   * @param {Object} connection - MySQL connection
   * @param {number} id - Request ID
   * @param {Object} data - Fields to update
   * @returns {Promise<boolean>} True if updated
   */
  async updateWithConnection(connection, id, data) {
    const allowedFields = [
      'date', 'time', 'category', 'description', 'urgency',
      'effort', 'status', 'source', 'website_url'
    ];

    const updates = [];
    const values = [];

    for (const [key, value] of Object.entries(data)) {
      if (allowedFields.includes(key) && value !== undefined) {
        updates.push(`${key} = ?`);
        values.push(value);
      }
    }

    if (updates.length === 0) return false;

    values.push(id);
    const [result] = await connection.query(
      `UPDATE requests SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    return result.affectedRows > 0;
  }
}

export default new RequestRepository();
