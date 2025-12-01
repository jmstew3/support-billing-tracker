import pool from '../db/config.js';

/**
 * FluentSyncStatus Repository
 * Data access layer for fluent_sync_status table
 * Tracks synchronization operations with FluentSupport
 */
class FluentSyncStatusRepository {
  /**
   * Create a new sync status record (mark sync as in progress)
   * @param {Object} connection - MySQL connection
   * @param {string} dateFilter - Date filter used for sync
   * @returns {Promise<number>} Inserted sync status ID
   */
  async startSync(connection, dateFilter) {
    const [result] = await connection.query(
      `INSERT INTO fluent_sync_status (last_sync_at, last_sync_status, date_filter)
       VALUES (NOW(), 'in_progress', ?)`,
      [dateFilter]
    );
    return result.insertId;
  }

  /**
   * Mark sync as successful
   * @param {Object} connection - MySQL connection
   * @param {number} id - Sync status ID
   * @param {Object} stats - Sync statistics
   * @returns {Promise<boolean>} True if updated
   */
  async markSuccess(connection, id, stats) {
    const {
      ticketsFetched,
      ticketsAdded,
      ticketsUpdated,
      ticketsSkipped,
      durationMs
    } = stats;

    const [result] = await connection.query(
      `UPDATE fluent_sync_status
       SET last_sync_status = 'success',
           tickets_fetched = ?,
           tickets_added = ?,
           tickets_updated = ?,
           tickets_skipped = ?,
           sync_duration_ms = ?,
           error_message = NULL
       WHERE id = ?`,
      [ticketsFetched, ticketsAdded, ticketsUpdated, ticketsSkipped, durationMs, id]
    );

    return result.affectedRows > 0;
  }

  /**
   * Mark sync as failed
   * @param {Object} connection - MySQL connection
   * @param {string} errorMessage - Error message
   * @returns {Promise<boolean>} True if updated
   */
  async markFailed(connection, errorMessage) {
    const [result] = await connection.query(
      `UPDATE fluent_sync_status
       SET last_sync_status = 'failed',
           error_message = ?
       WHERE id = (SELECT MAX(id) FROM (SELECT id FROM fluent_sync_status) AS t)`,
      [errorMessage]
    );

    return result.affectedRows > 0;
  }

  /**
   * Get the latest sync status
   * @returns {Promise<Object|null>} Latest sync status or null
   */
  async getLatest() {
    const [rows] = await pool.query(
      'SELECT * FROM fluent_sync_status ORDER BY id DESC LIMIT 1'
    );
    return rows[0] || null;
  }

  /**
   * Get sync history
   * @param {number} limit - Number of records to return
   * @returns {Promise<Array>} Array of sync status records
   */
  async getHistory(limit = 10) {
    const [rows] = await pool.query(
      'SELECT * FROM fluent_sync_status ORDER BY id DESC LIMIT ?',
      [limit]
    );
    return rows;
  }
}

export default new FluentSyncStatusRepository();
