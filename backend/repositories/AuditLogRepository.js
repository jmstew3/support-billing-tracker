import pool from '../db/config.js';

/**
 * Audit Log Repository
 * Handles all audit logging operations for security events
 */
class AuditLogRepository {
  /**
   * Log an audit event
   * @param {object} params - Audit log parameters
   * @param {number} params.userId - User ID (optional for system events)
   * @param {string} params.userEmail - User email
   * @param {string} params.authMethod - Authentication method (jwt, basicauth, system)
   * @param {string} params.action - Action performed (AUTH_LOGIN_SUCCESS, DATA_DELETE, etc.)
   * @param {string} params.resourceType - Type of resource (user, request, backup, etc.)
   * @param {string} params.resourceId - ID of the affected resource
   * @param {object} params.details - Additional details (JSON)
   * @param {string} params.ipAddress - Client IP address
   * @param {string} params.userAgent - Client user agent
   * @param {string} params.requestPath - Request path
   * @param {string} params.requestMethod - HTTP method
   * @param {string} params.status - Outcome (success, failure, error)
   * @param {string} params.errorMessage - Error message if status is failure/error
   */
  static async log({
    userId = null,
    userEmail = null,
    authMethod = 'system',
    action,
    resourceType = null,
    resourceId = null,
    details = null,
    ipAddress = null,
    userAgent = null,
    requestPath = null,
    requestMethod = null,
    status = 'success',
    errorMessage = null
  }) {
    try {
      const [result] = await pool.execute(
        `INSERT INTO audit_logs
         (user_id, user_email, auth_method, action, resource_type, resource_id,
          details, ip_address, user_agent, request_path, request_method,
          status, error_message)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          userId,
          userEmail,
          authMethod,
          action,
          resourceType,
          resourceId ? String(resourceId) : null,
          details ? JSON.stringify(details) : null,
          ipAddress,
          userAgent ? userAgent.substring(0, 500) : null, // Limit user agent length
          requestPath ? requestPath.substring(0, 500) : null,
          requestMethod,
          status,
          errorMessage ? errorMessage.substring(0, 1000) : null
        ]
      );
      return result.insertId;
    } catch (error) {
      // Don't throw - logging failures shouldn't break the application
      console.error('[AuditLog] Failed to write audit log:', error.message);
      return null;
    }
  }

  /**
   * Helper to log from Express request object
   * @param {object} req - Express request object
   * @param {string} action - Action performed
   * @param {object} options - Additional options
   */
  static async logFromRequest(req, action, options = {}) {
    const user = req.user || {};

    return this.log({
      userId: user.id || null,
      userEmail: user.email || null,
      authMethod: user.authMethod || 'system',
      action,
      ipAddress: req.ip || req.connection?.remoteAddress,
      userAgent: req.get('User-Agent'),
      requestPath: req.originalUrl || req.path,
      requestMethod: req.method,
      ...options
    });
  }

  /**
   * Query audit logs with filters
   * @param {object} filters - Query filters
   * @param {number} limit - Max results
   * @param {number} offset - Pagination offset
   */
  static async query({
    userId = null,
    action = null,
    resourceType = null,
    status = null,
    startDate = null,
    endDate = null,
    limit = 100,
    offset = 0
  } = {}) {
    let query = 'SELECT * FROM audit_logs WHERE 1=1';
    const params = [];

    if (userId) {
      query += ' AND user_id = ?';
      params.push(userId);
    }

    if (action) {
      query += ' AND action = ?';
      params.push(action);
    }

    if (resourceType) {
      query += ' AND resource_type = ?';
      params.push(resourceType);
    }

    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }

    if (startDate) {
      query += ' AND created_at >= ?';
      params.push(startDate);
    }

    if (endDate) {
      query += ' AND created_at <= ?';
      params.push(endDate);
    }

    query += ' ORDER BY created_at DESC';
    query += ` LIMIT ${parseInt(limit, 10)} OFFSET ${parseInt(offset, 10)}`;

    const [rows] = await pool.query(query, params);
    return rows;
  }

  /**
   * Get failed login attempts for an IP address in the last N minutes
   * Useful for security monitoring
   */
  static async getFailedLoginAttempts(ipAddress, minutes = 15) {
    const [rows] = await pool.execute(
      `SELECT COUNT(*) as count FROM audit_logs
       WHERE ip_address = ?
         AND action = 'AUTH_LOGIN_FAILURE'
         AND created_at >= DATE_SUB(NOW(), INTERVAL ? MINUTE)`,
      [ipAddress, minutes]
    );
    return rows[0]?.count || 0;
  }

  /**
   * Clean up old audit logs (retention policy)
   * @param {number} daysToKeep - Number of days to retain logs
   */
  static async cleanup(daysToKeep = 90) {
    const [result] = await pool.execute(
      `DELETE FROM audit_logs
       WHERE created_at < DATE_SUB(NOW(), INTERVAL ? DAY)`,
      [daysToKeep]
    );
    return result.affectedRows;
  }
}

// Audit action constants
export const AuditActions = {
  // Authentication
  AUTH_LOGIN_SUCCESS: 'AUTH_LOGIN_SUCCESS',
  AUTH_LOGIN_FAILURE: 'AUTH_LOGIN_FAILURE',
  AUTH_LOGOUT: 'AUTH_LOGOUT',
  AUTH_PASSWORD_CHANGE: 'AUTH_PASSWORD_CHANGE',
  AUTH_TOKEN_REFRESH: 'AUTH_TOKEN_REFRESH',
  AUTH_SESSION_REVOKE: 'AUTH_SESSION_REVOKE',
  AUTH_LOGOUT_ALL: 'AUTH_LOGOUT_ALL',

  // Data operations
  DATA_CREATE: 'DATA_CREATE',
  DATA_UPDATE: 'DATA_UPDATE',
  DATA_DELETE: 'DATA_DELETE',
  DATA_BULK_UPDATE: 'DATA_BULK_UPDATE',
  DATA_IMPORT: 'DATA_IMPORT',
  DATA_EXPORT: 'DATA_EXPORT',
  DATA_BACKUP: 'DATA_BACKUP',
  DATA_RESTORE: 'DATA_RESTORE',

  // Admin operations
  ADMIN_USER_CREATE: 'ADMIN_USER_CREATE',
  ADMIN_CONFIG_CHANGE: 'ADMIN_CONFIG_CHANGE'
};

export default AuditLogRepository;
