import pool from '../db/config.js';
import { encrypt, decrypt } from '../utils/encryption.js';

/**
 * QBO Token Repository
 * Manages encrypted OAuth token storage for QuickBooks Online integration.
 * Uses static methods with optional connection parameter for transaction support.
 */
export default class QBOTokenRepository {
  /**
   * Get the active QBO token record (only one active connection at a time)
   * @param {import('mysql2/promise').Pool|import('mysql2/promise').PoolConnection} connection
   * @returns {Promise<Object|null>} Token record with decrypted tokens, or null
   */
  static async getActiveToken(connection = pool) {
    const [rows] = await connection.query(
      'SELECT * FROM qbo_tokens WHERE is_active = TRUE LIMIT 1'
    );
    if (!rows[0]) return null;

    const row = rows[0];
    return {
      ...row,
      access_token: decrypt(row.access_token),
      refresh_token: decrypt(row.refresh_token)
    };
  }

  /**
   * Upsert token data after OAuth callback or token refresh.
   * Uses INSERT ... ON DUPLICATE KEY UPDATE keyed on realm_id.
   * @param {string} realmId - QBO company realm ID
   * @param {Object} tokenData - Token data from intuit-oauth
   * @param {import('mysql2/promise').Pool|import('mysql2/promise').PoolConnection} connection
   */
  static async upsertToken(realmId, tokenData, connection = pool) {
    const { accessToken, refreshToken, expiresIn, xRefreshTokenExpiresIn, companyName } = tokenData;
    const accessExpiry = new Date(Date.now() + expiresIn * 1000);
    const refreshExpiry = new Date(Date.now() + xRefreshTokenExpiresIn * 1000);

    await connection.query(
      `INSERT INTO qbo_tokens
       (realm_id, access_token, refresh_token, access_token_expires_at,
        refresh_token_expires_at, company_name, is_active)
       VALUES (?, ?, ?, ?, ?, ?, TRUE)
       ON DUPLICATE KEY UPDATE
         access_token = VALUES(access_token),
         refresh_token = VALUES(refresh_token),
         access_token_expires_at = VALUES(access_token_expires_at),
         refresh_token_expires_at = VALUES(refresh_token_expires_at),
         company_name = COALESCE(VALUES(company_name), company_name),
         is_active = TRUE`,
      [realmId, encrypt(accessToken), encrypt(refreshToken),
       accessExpiry, refreshExpiry, companyName || null]
    );
  }

  /**
   * Update tokens after a refresh.
   * CRITICAL: Must persist new refresh token immediately — old one is dead after refresh.
   * @param {string} realmId
   * @param {string} encryptedAccessToken - Already encrypted
   * @param {string} encryptedRefreshToken - Already encrypted
   * @param {Date} accessExpiresAt
   * @param {import('mysql2/promise').Pool|import('mysql2/promise').PoolConnection} connection
   */
  static async updateTokens(realmId, encryptedAccessToken, encryptedRefreshToken, accessExpiresAt, connection = pool) {
    await connection.query(
      `UPDATE qbo_tokens
       SET access_token = ?, refresh_token = ?, access_token_expires_at = ?,
           last_refreshed_at = NOW()
       WHERE realm_id = ? AND is_active = TRUE`,
      [encryptedAccessToken, encryptedRefreshToken, accessExpiresAt, realmId]
    );
  }

  /**
   * Deactivate tokens (on disconnect/revoke)
   * @param {string} realmId
   * @param {import('mysql2/promise').Pool|import('mysql2/promise').PoolConnection} connection
   */
  static async deactivate(realmId, connection = pool) {
    await connection.query(
      'UPDATE qbo_tokens SET is_active = FALSE WHERE realm_id = ?',
      [realmId]
    );
  }
}
