/**
 * RequestService - Business logic layer for request management
 *
 * Extracts business logic from routes/requests.js to improve:
 * - Testability: Easier to unit test business logic separately
 * - Maintainability: Single responsibility for data operations
 * - Reusability: Can be used across different routes/controllers
 *
 * @module services/RequestService
 */

import pool from '../db/config.js';
import Request from '../models/Request.js';

/**
 * Input validation helpers
 */
class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ValidationError';
    this.statusCode = 400;
  }
}

/**
 * Validates estimated hours value
 * @param {number} hours - Hours to validate
 * @throws {ValidationError} If hours are invalid
 */
function validateEstimatedHours(hours) {
  const parsedHours = parseFloat(hours);
  if (isNaN(parsedHours) || parsedHours < 0 || parsedHours > 99.99) {
    throw new ValidationError('Estimated hours must be between 0 and 99.99');
  }
  return parsedHours;
}

/**
 * Validates urgency level
 * @param {string} urgency - Urgency level to validate
 * @returns {string} Uppercase urgency level
 */
function validateUrgency(urgency) {
  const validUrgencies = ['HIGH', 'MEDIUM', 'LOW', 'PROMOTION'];
  const upperUrgency = urgency.toUpperCase();

  if (!validUrgencies.includes(upperUrgency)) {
    throw new ValidationError(`Invalid urgency level. Must be one of: ${validUrgencies.join(', ')}`);
  }

  return upperUrgency;
}

/**
 * Transforms database row to API response format
 * @param {Object} row - Database row
 * @returns {Object} Transformed request object
 */
function transformRequestRow(row) {
  return {
    id: row.id,
    Date: row.date.toISOString().split('T')[0],
    Time: row.time,
    Month: row.month,
    Request_Type: row.request_type,
    Category: row.category,
    Request_Summary: row.description,
    Urgency: row.urgency,
    Effort: row.effort,
    EstimatedHours: parseFloat(row.estimated_hours),
    Status: row.status,
    source: row.source || 'sms',
    website_url: row.website_url || null,
    CreatedAt: row.created_at,
    UpdatedAt: row.updated_at,
  };
}

/**
 * RequestService - Core business logic for request management
 */
class RequestService {
  /**
   * Find all requests with optional filters
   *
   * @param {Object} filters - Filter options
   * @param {string} [filters.status='active'] - Request status
   * @param {string} [filters.category] - Category filter
   * @param {string} [filters.urgency] - Urgency filter
   * @param {string} [filters.startDate] - Start date filter
   * @param {string} [filters.endDate] - End date filter
   * @returns {Promise<Array>} Array of requests
   */
  static async findAll(filters = {}) {
    const {
      status = 'active',
      category,
      urgency,
      startDate,
      endDate
    } = filters;

    let query = 'SELECT * FROM requests WHERE 1=1';
    const params = [];

    // Apply filters with parameterized queries
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
      params.push(validateUrgency(urgency));
    }

    if (startDate) {
      query += ' AND date >= ?';
      params.push(startDate);
    }

    if (endDate) {
      query += ' AND date <= ?';
      params.push(endDate);
    }

    query += ' ORDER BY date DESC, time DESC';

    const [rows] = await pool.execute(query, params);
    return rows.map(transformRequestRow);
  }

  /**
   * Find a single request by ID
   *
   * @param {number} id - Request ID
   * @returns {Promise<Object|null>} Request object or null if not found
   */
  static async findById(id) {
    const [rows] = await pool.execute(
      'SELECT * FROM requests WHERE id = ?',
      [id]
    );

    if (rows.length === 0) {
      return null;
    }

    return transformRequestRow(rows[0]);
  }

  /**
   * Create a new request
   *
   * @param {Object} data - Request data
   * @returns {Promise<Object>} Created request with ID
   */
  static async create(data) {
    const request = new Request(data);
    const result = await request.save();

    return {
      id: result.insertId,
      message: 'Request created successfully',
    };
  }

  /**
   * Update a request
   *
   * @param {number} id - Request ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object>} Update result
   * @throws {ValidationError} If validation fails
   */
  static async update(id, updates) {
    const allowedFields = [
      'category',
      'urgency',
      'effort',
      'status',
      'description',
      'request_type',
      'estimated_hours'
    ];

    const updateFields = [];
    const updateValues = [];

    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        updateFields.push(`${field} = ?`);
        let value = updates[field];

        // Apply field-specific validation and transformation
        if (field === 'urgency') {
          value = validateUrgency(value);
        } else if (field === 'estimated_hours') {
          value = validateEstimatedHours(value);
        }

        updateValues.push(value);
      }
    }

    if (updateFields.length === 0) {
      throw new ValidationError('No valid fields to update');
    }

    updateValues.push(id);

    const query = `UPDATE requests SET ${updateFields.join(', ')} WHERE id = ?`;
    const [result] = await pool.execute(query, updateValues);

    if (result.affectedRows === 0) {
      return null; // Not found
    }

    return { message: 'Request updated successfully' };
  }

  /**
   * Delete a request (soft or permanent)
   *
   * @param {number} id - Request ID
   * @param {boolean} permanent - Whether to permanently delete
   * @returns {Promise<Object>} Delete result
   */
  static async delete(id, permanent = false) {
    if (permanent) {
      const [result] = await pool.execute('DELETE FROM requests WHERE id = ?', [id]);

      if (result.affectedRows === 0) {
        return null;
      }

      return { message: 'Request permanently deleted' };
    } else {
      const [result] = await pool.execute(
        'UPDATE requests SET status = ? WHERE id = ?',
        ['deleted', id]
      );

      if (result.affectedRows === 0) {
        return null;
      }

      return { message: 'Request marked as deleted' };
    }
  }

  /**
   * Bulk update multiple requests
   *
   * @param {Array<number>} ids - Array of request IDs
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object>} Update result with affected row count
   * @throws {ValidationError} If validation fails
   */
  static async bulkUpdate(ids, updates) {
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      throw new ValidationError('Invalid request IDs');
    }

    const allowedFields = ['category', 'urgency', 'status', 'estimated_hours'];
    const updateFields = [];
    const updateValues = [];

    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        updateFields.push(`${field} = ?`);
        let value = updates[field];

        // Apply field-specific validation and transformation
        if (field === 'urgency') {
          value = validateUrgency(value);
        } else if (field === 'estimated_hours') {
          value = validateEstimatedHours(value);
        }

        updateValues.push(value);
      }
    }

    if (updateFields.length === 0) {
      throw new ValidationError('No valid fields to update');
    }

    const placeholders = ids.map(() => '?').join(', ');
    const query = `UPDATE requests SET ${updateFields.join(', ')} WHERE id IN (${placeholders})`;
    const [result] = await pool.execute(query, [...updateValues, ...ids]);

    return {
      message: 'Bulk update successful',
      affectedRows: result.affectedRows,
    };
  }

  /**
   * Get request statistics
   *
   * @returns {Promise<Object>} Statistics object
   */
  static async getStatistics() {
    // Get category distribution
    const [categories] = await pool.execute(
      `SELECT category, COUNT(*) as count, SUM(estimated_hours) as total_hours
       FROM requests WHERE status = 'active' GROUP BY category`
    );

    // Get urgency distribution
    const [urgencies] = await pool.execute(
      `SELECT urgency, COUNT(*) as count
       FROM requests WHERE status = 'active' GROUP BY urgency`
    );

    // Get monthly distribution
    const [monthly] = await pool.execute(
      `SELECT month, COUNT(*) as count
       FROM requests WHERE status = 'active' GROUP BY month ORDER BY month`
    );

    // Get total statistics
    const [[totals]] = await pool.execute(
      `SELECT
        COUNT(*) as total_requests,
        SUM(estimated_hours) as total_hours,
        COUNT(DISTINCT DATE(date)) as unique_days
       FROM requests WHERE status = 'active'`
    );

    return {
      categories,
      urgencies,
      monthly,
      totals,
    };
  }

  /**
   * Import CSV data
   *
   * @param {Array} csvData - Array of CSV row objects
   * @returns {Promise<Object>} Import result with counts and errors
   */
  static async importCSV(csvData) {
    if (!csvData || !Array.isArray(csvData)) {
      throw new ValidationError('Invalid CSV data');
    }

    let imported = 0;
    let failed = 0;
    const errors = [];

    for (const row of csvData) {
      try {
        const request = new Request({
          date: row.date,
          time: row.time,
          request_type: row.request_type || 'General Request',
          category: row.category || 'Support',
          description: row.description || row.Request_Summary,
          urgency: row.urgency || 'MEDIUM',
          effort: row.effort || 'Medium',
          status: row.status || 'active',
        });

        await request.save();
        imported++;
      } catch (error) {
        failed++;
        errors.push({ row, error: error.message });
      }
    }

    return {
      success: true,
      imported,
      failed,
      errors: errors.slice(0, 10), // Return first 10 errors only
    };
  }

  /**
   * Export requests as CSV data
   *
   * @param {string} [status='active'] - Status filter
   * @returns {Promise<Array>} Array of request rows
   */
  static async exportCSV(status = 'active') {
    let query = 'SELECT * FROM requests';
    const params = [];

    if (status !== 'all') {
      query += ' WHERE status = ?';
      params.push(status);
    }

    query += ' ORDER BY date DESC, time DESC';

    const [rows] = await pool.execute(query, params);
    return rows;
  }
}

export default RequestService;
export { ValidationError };
