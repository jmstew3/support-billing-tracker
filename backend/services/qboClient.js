import OAuthClient from 'intuit-oauth';
import crypto from 'crypto';
import FormData from 'form-data';
import pool from '../db/config.js';
import QBOTokenRepository from '../repositories/QBOTokenRepository.js';
import { encrypt, decrypt } from '../utils/encryption.js';
import logger from './logger.js';

/**
 * QBO Client Service
 *
 * Manages the intuit-oauth OAuthClient instance, automatic token refresh,
 * concurrency-safe token rotation, and the makeApiCall wrapper.
 *
 * All QBO API calls go through this service.
 */

const QBO_BASE_URLS = {
  sandbox: 'https://sandbox-quickbooks.api.intuit.com',
  production: 'https://quickbooks.api.intuit.com'
};

class QBOClient {
  constructor() {
    this.oauthClient = null;
    this._refreshPromise = null;
  }

  /**
   * Get or create the OAuthClient instance
   */
  _getOAuthClient() {
    if (!this.oauthClient) {
      const env = process.env.QBO_ENVIRONMENT || 'sandbox';
      this.oauthClient = new OAuthClient({
        clientId: process.env.QBO_CLIENT_ID,
        clientSecret: process.env.QBO_CLIENT_SECRET,
        environment: env,
        redirectUri: process.env.QBO_REDIRECT_URI || 'http://localhost:3011/api/qbo/callback',
        logging: false
      });
    }
    return this.oauthClient;
  }

  /**
   * Generate the Intuit authorization URL
   * @param {string} state - CSRF state token (signed JWT)
   * @returns {string} Authorization URL
   */
  getAuthorizationUrl(state) {
    const client = this._getOAuthClient();
    return client.authorizeUri({
      scope: [OAuthClient.scopes.Accounting],
      state
    });
  }

  /**
   * Exchange authorization code for tokens
   * @param {string} redirectUrl - Full callback URL with query params
   * @returns {Promise<Object>} Token response
   */
  async createToken(redirectUrl) {
    const client = this._getOAuthClient();
    const authResponse = await client.createToken(redirectUrl);
    return authResponse.getToken();
  }

  /**
   * Load tokens from DB and prepare client for API calls.
   * Auto-refreshes if access token expires within 5 minutes.
   * @returns {Promise<{client: OAuthClient, realmId: string}>}
   */
  async getAuthenticatedClient() {
    const tokenRecord = await QBOTokenRepository.getActiveToken();
    if (!tokenRecord) {
      throw new Error('QBO not connected. Please authorize via /api/qbo/connect');
    }

    const client = this._getOAuthClient();

    // Set tokens on the client
    client.setToken({
      token_type: tokenRecord.token_type || 'Bearer',
      access_token: tokenRecord.access_token,
      refresh_token: tokenRecord.refresh_token,
      expires_in: Math.max(0, Math.floor((new Date(tokenRecord.access_token_expires_at) - Date.now()) / 1000)),
      x_refresh_token_expires_in: Math.max(0, Math.floor((new Date(tokenRecord.refresh_token_expires_at) - Date.now()) / 1000)),
      createdAt: Date.now()
    });

    // Auto-refresh if access token expires within 5 minutes
    const expiresAt = new Date(tokenRecord.access_token_expires_at);
    const fiveMinFromNow = new Date(Date.now() + 5 * 60 * 1000);
    if (expiresAt <= fiveMinFromNow) {
      logger.info('[QBO] Access token expiring soon, refreshing...');
      await this.refreshTokens(tokenRecord.realm_id);
    }

    return { client, realmId: tokenRecord.realm_id };
  }

  /**
   * Concurrency-safe token refresh (C4 fix).
   * If a refresh is already in flight, returns the existing promise.
   * @param {string} realmId
   */
  async refreshTokens(realmId) {
    if (this._refreshPromise) {
      logger.info('[QBO] Token refresh already in flight, awaiting existing promise');
      return this._refreshPromise;
    }
    this._refreshPromise = this._doRefreshTokens(realmId).finally(() => {
      this._refreshPromise = null;
    });
    return this._refreshPromise;
  }

  /**
   * Internal token refresh with transactional DB persist (C1 fix).
   * @private
   */
  async _doRefreshTokens(realmId) {
    const client = this._getOAuthClient();
    let connection;

    try {
      // Refresh via Intuit — this IMMEDIATELY invalidates the old refresh token
      const authResponse = await client.refresh();
      const newToken = authResponse.getToken();

      // Encrypt new tokens
      const encryptedAccess = encrypt(newToken.access_token);
      const encryptedRefresh = encrypt(newToken.refresh_token);
      const accessExpiresAt = new Date(Date.now() + newToken.expires_in * 1000);

      // Persist immediately with a dedicated connection
      connection = await pool.getConnection();
      await QBOTokenRepository.updateTokens(
        realmId, encryptedAccess, encryptedRefresh, accessExpiresAt, connection
      );

      // Log token hashes for audit trail (never log plaintext tokens)
      const oldHash = crypto.createHash('sha256').update(client.token.refresh_token || '').digest('hex').substring(0, 8);
      const newHash = crypto.createHash('sha256').update(newToken.refresh_token).digest('hex').substring(0, 8);
      logger.info('[QBO] Token refresh successful', {
        realmId,
        oldRefreshHash: oldHash,
        newRefreshHash: newHash,
        expiresAt: accessExpiresAt.toISOString()
      });

      // Update the client's in-memory token
      client.setToken(newToken);

    } catch (error) {
      // If the refresh succeeded but DB write failed, we have the new tokens
      // only in memory — the old ones are dead. Log for emergency recovery.
      if (error.message && error.message.includes('ER_')) {
        logger.error('[QBO] EMERGENCY: Token refresh succeeded but DB persist failed!', {
          realmId,
          error: error.message,
          hint: 'New tokens exist only in memory. Old tokens are invalidated. Manual recovery required.'
        });
      } else {
        logger.error('[QBO] Token refresh failed', {
          realmId,
          error: error.message || error.originalMessage || 'Unknown error'
        });
      }
      throw error;
    } finally {
      if (connection) connection.release();
    }
  }

  /**
   * Make an authenticated API call to QBO.
   * Handles 401 retry with token refresh.
   * @param {string} method - HTTP method (GET, POST, etc.)
   * @param {string} endpoint - QBO entity endpoint (e.g., 'invoice', 'item')
   * @param {Object|null} body - Request body (for POST/PUT)
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Parsed JSON response
   */
  async makeApiCall(method, endpoint, body = null, options = {}) {
    const { client, realmId } = await this.getAuthenticatedClient();
    const env = process.env.QBO_ENVIRONMENT || 'sandbox';
    const baseUrl = QBO_BASE_URLS[env];
    const minorVersion = process.env.QBO_MINOR_VERSION || '75';
    const url = `${baseUrl}/v3/company/${realmId}/${endpoint}?minorversion=${minorVersion}`;

    const callOptions = {
      url,
      method: method.toUpperCase(),
      headers: { 'Content-Type': 'application/json' }
    };

    if (body) {
      callOptions.body = JSON.stringify(body);
    }

    try {
      const response = await client.makeApiCall(callOptions);
      // intuit-oauth returns { json, body, status } — use json directly if available
      if (response.json && typeof response.json === 'object') return response.json;
      return JSON.parse(response.body);
    } catch (error) {
      return this._handleApiError(error, method, endpoint, body, realmId, options);
    }
  }

  /**
   * Upload a file attachment to a QBO entity (e.g., Invoice).
   * Uses multipart/form-data with the QBO Upload API.
   * @param {string} entityType - QBO entity type (e.g., 'Invoice')
   * @param {string} entityId - QBO entity ID
   * @param {string} fileName - Attachment file name
   * @param {string} contentType - MIME type (e.g., 'text/csv')
   * @param {Buffer} buffer - File content as Buffer
   * @returns {Promise<Object>} Parsed upload response
   */
  async uploadAttachment(entityType, entityId, fileName, contentType, buffer) {
    const { client, realmId } = await this.getAuthenticatedClient();
    const env = process.env.QBO_ENVIRONMENT || 'sandbox';
    const baseUrl = QBO_BASE_URLS[env];
    const minorVersion = process.env.QBO_MINOR_VERSION || '75';
    const url = `${baseUrl}/v3/company/${realmId}/upload?minorversion=${minorVersion}`;

    const metadata = JSON.stringify({
      AttachableRef: [{ EntityRef: { type: entityType, value: entityId } }],
      FileName: fileName,
      ContentType: contentType
    });

    const form = new FormData();
    form.append('file_metadata_0', metadata, {
      contentType: 'application/json',
      filename: 'metadata.json'
    });
    form.append('file_content_0', buffer, {
      contentType,
      filename: fileName
    });

    const response = await client.makeApiCall({
      url,
      method: 'POST',
      headers: form.getHeaders(),
      body: form.getBuffer()
    });

    if (response.json && typeof response.json === 'object') return response.json;
    return JSON.parse(response.body);
  }

  /**
   * Execute a QBO Query API call (for customer/item lookups).
   * @param {string} query - QBO query string (e.g., "SELECT * FROM Customer")
   * @returns {Promise<Object>} Query response
   */
  async query(query) {
    const { client, realmId } = await this.getAuthenticatedClient();
    const env = process.env.QBO_ENVIRONMENT || 'sandbox';
    const baseUrl = QBO_BASE_URLS[env];
    const minorVersion = process.env.QBO_MINOR_VERSION || '75';
    const encodedQuery = encodeURIComponent(query);
    const url = `${baseUrl}/v3/company/${realmId}/query?query=${encodedQuery}&minorversion=${minorVersion}`;

    try {
      const response = await client.makeApiCall({
        url,
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      if (response.json && typeof response.json === 'object') return response.json;
      return JSON.parse(response.body);
    } catch (error) {
      return this._handleApiError(error, 'GET', `query: ${query}`, null, realmId, {});
    }
  }

  /**
   * Handle API errors with retry logic.
   * @private
   */
  async _handleApiError(error, method, endpoint, body, realmId, options) {
    const statusCode = error.response?.status || error.authResponse?.response?.status || error.statusCode;
    const retryCount = options._retryCount || 0;

    // 401 — Token expired, refresh and retry once
    if (statusCode === 401 && retryCount < 1) {
      logger.warn('[QBO] 401 received, refreshing token and retrying', { endpoint });
      await this.refreshTokens(realmId);
      return this.makeApiCall(method, endpoint, body, { ...options, _retryCount: retryCount + 1 });
    }

    // 400 — Validation error, do NOT retry
    if (statusCode === 400) {
      const errorBody = this._parseErrorResponse(error);
      logger.warn('[QBO] Validation error (400)', { endpoint, error: errorBody });
      const err = new Error(errorBody);
      err.statusCode = 400;
      err.qboError = errorBody;
      throw err;
    }

    // 403 — Insufficient scope, require re-auth
    if (statusCode === 403) {
      logger.error('[QBO] Forbidden (403) — re-authorization required', { endpoint });
      const err = new Error('QBO access forbidden. Please disconnect and reconnect.');
      err.statusCode = 403;
      throw err;
    }

    // 429 / 5xx — intuit-oauth handles retries internally, but log
    if (statusCode === 429) {
      logger.warn('[QBO] Rate limited (429)', { endpoint });
    }

    if (statusCode >= 500 && retryCount < 3) {
      const delay = 1000 * Math.pow(2, retryCount);
      logger.warn(`[QBO] Server error (${statusCode}), retrying in ${delay}ms`, { endpoint });
      await new Promise(resolve => setTimeout(resolve, delay));
      return this.makeApiCall(method, endpoint, body, { ...options, _retryCount: retryCount + 1 });
    }

    // Unhandled or exhausted retries
    const errorDetail = this._parseErrorResponse(error);
    logger.error('[QBO] API call failed', { method, endpoint, statusCode, error: errorDetail });
    const err = new Error(errorDetail);
    err.statusCode = statusCode;
    err.qboError = errorDetail;
    throw err;
  }

  /**
   * Parse QBO error response into human-readable string.
   * @private
   */
  _parseErrorResponse(error) {
    try {
      // intuit-oauth errors: error.response.data (object) or error.authResponse.response.body (string)
      const body = error.response?.data
        || (error.authResponse?.response?.body ? JSON.parse(error.authResponse.response.body) : null)
        || (error.body ? JSON.parse(error.body) : null);

      if (body?.Fault?.Error) {
        return body.Fault.Error.map(e => `${e.code}: ${e.Detail || e.Message}`).join('; ');
      }
      return error.originalMessage || error.message || 'Unknown QBO error';
    } catch {
      return error.originalMessage || error.message || 'Unknown QBO error';
    }
  }

  /**
   * Revoke tokens and disconnect
   * @param {string} realmId
   */
  async revokeTokens(realmId) {
    const client = this._getOAuthClient();
    try {
      await client.revoke();
    } catch (error) {
      // Revoke can fail if token is already expired — that's fine
      logger.warn('[QBO] Token revocation failed (may already be expired)', {
        error: error.message || error.originalMessage
      });
    }
    await QBOTokenRepository.deactivate(realmId);
    logger.info('[QBO] Disconnected', { realmId });
  }

  /**
   * Check if QBO is currently connected (has active tokens).
   * Uses metadata-only query to avoid decryption failures on status checks.
   * @returns {Promise<Object|null>} Connection status or null
   */
  async getConnectionStatus() {
    const meta = await QBOTokenRepository.getActiveTokenMeta();
    if (!meta) return null;

    return {
      connected: true,
      realmId: meta.realm_id,
      companyName: meta.company_name,
      tokenExpiresAt: meta.access_token_expires_at,
      refreshTokenExpiresAt: meta.refresh_token_expires_at,
      lastRefreshed: meta.last_refreshed_at
    };
  }
}

// Export singleton
export default new QBOClient();
