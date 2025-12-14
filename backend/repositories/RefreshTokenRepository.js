import crypto from 'crypto';
import pool from '../db/config.js';

/**
 * RefreshToken Repository
 * Data access layer for refresh_tokens table
 *
 * SECURITY: This repository stores hashed tokens, never plaintext.
 * Tokens are hashed with SHA-256 before storage and lookup.
 */
class RefreshTokenRepository {
  /**
   * Hash a token using SHA-256
   * @param {string} token - Plain token to hash
   * @returns {string} SHA-256 hash of the token
   */
  hashToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Store a new refresh token
   * @param {Object} data - Token data
   * @param {number} data.userId - User ID
   * @param {string} data.token - Plain refresh token (will be hashed)
   * @param {Date} data.expiresAt - Token expiration date
   * @param {string} [data.userAgent] - Optional user agent string
   * @param {string} [data.ipAddress] - Optional IP address
   * @returns {Promise<number>} Inserted token ID
   */
  async create({ userId, token, expiresAt, userAgent = null, ipAddress = null }) {
    const tokenHash = this.hashToken(token);

    const [result] = await pool.execute(
      `INSERT INTO refresh_tokens (user_id, token_hash, expires_at, user_agent, ip_address)
       VALUES (?, ?, ?, ?, ?)`,
      [userId, tokenHash, expiresAt, userAgent, ipAddress]
    );

    return result.insertId;
  }

  /**
   * Find a valid (non-revoked, non-expired) token by its hash
   * @param {string} token - Plain token to look up
   * @returns {Promise<Object|null>} Token record or null if not found/invalid
   */
  async findValidToken(token) {
    const tokenHash = this.hashToken(token);

    const [rows] = await pool.execute(
      `SELECT rt.*, u.email, u.role
       FROM refresh_tokens rt
       JOIN users u ON rt.user_id = u.id
       WHERE rt.token_hash = ?
         AND rt.revoked_at IS NULL
         AND rt.expires_at > NOW()
         AND u.is_active = TRUE`,
      [tokenHash]
    );

    return rows[0] || null;
  }

  /**
   * Revoke a specific token
   * @param {string} token - Plain token to revoke
   * @returns {Promise<boolean>} True if token was revoked
   */
  async revoke(token) {
    const tokenHash = this.hashToken(token);

    const [result] = await pool.execute(
      `UPDATE refresh_tokens SET revoked_at = NOW() WHERE token_hash = ? AND revoked_at IS NULL`,
      [tokenHash]
    );

    return result.affectedRows > 0;
  }

  /**
   * Revoke all tokens for a user (logout from all devices)
   * @param {number} userId - User ID
   * @returns {Promise<number>} Number of tokens revoked
   */
  async revokeAllForUser(userId) {
    const [result] = await pool.execute(
      `UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = ? AND revoked_at IS NULL`,
      [userId]
    );

    return result.affectedRows;
  }

  /**
   * Delete expired tokens (cleanup job)
   * @param {number} daysOld - Delete tokens that expired more than this many days ago
   * @returns {Promise<number>} Number of tokens deleted
   */
  async deleteExpired(daysOld = 7) {
    const [result] = await pool.execute(
      `DELETE FROM refresh_tokens WHERE expires_at < DATE_SUB(NOW(), INTERVAL ? DAY)`,
      [daysOld]
    );

    return result.affectedRows;
  }

  /**
   * Count active tokens for a user
   * @param {number} userId - User ID
   * @returns {Promise<number>} Number of active tokens
   */
  async countActiveForUser(userId) {
    const [[{ count }]] = await pool.execute(
      `SELECT COUNT(*) as count FROM refresh_tokens
       WHERE user_id = ? AND revoked_at IS NULL AND expires_at > NOW()`,
      [userId]
    );

    return parseInt(count);
  }

  /**
   * Get all active sessions for a user (for session management UI)
   * @param {number} userId - User ID
   * @returns {Promise<Array>} Array of active token records (without hash)
   */
  async getActiveSessions(userId) {
    const [rows] = await pool.execute(
      `SELECT id, created_at, expires_at, user_agent, ip_address
       FROM refresh_tokens
       WHERE user_id = ? AND revoked_at IS NULL AND expires_at > NOW()
       ORDER BY created_at DESC`,
      [userId]
    );

    return rows;
  }

  /**
   * Revoke a specific session by ID (for session management)
   * @param {number} userId - User ID (for security - must match)
   * @param {number} tokenId - Token ID to revoke
   * @returns {Promise<boolean>} True if token was revoked
   */
  async revokeSession(userId, tokenId) {
    const [result] = await pool.execute(
      `UPDATE refresh_tokens SET revoked_at = NOW()
       WHERE id = ? AND user_id = ? AND revoked_at IS NULL`,
      [tokenId, userId]
    );

    return result.affectedRows > 0;
  }

  /**
   * Check if token exists (for validation without full lookup)
   * @param {string} token - Plain token to check
   * @returns {Promise<boolean>} True if token exists and is valid
   */
  async isValid(token) {
    const tokenHash = this.hashToken(token);

    const [[{ count }]] = await pool.execute(
      `SELECT COUNT(*) as count FROM refresh_tokens
       WHERE token_hash = ? AND revoked_at IS NULL AND expires_at > NOW()`,
      [tokenHash]
    );

    return parseInt(count) > 0;
  }
}

export default new RefreshTokenRepository();
