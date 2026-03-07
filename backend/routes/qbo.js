import express from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import pool from '../db/config.js';
import qboClient from '../services/qboClient.js';
import QBOTokenRepository from '../repositories/QBOTokenRepository.js';
import QBOItemMappingRepository from '../repositories/QBOItemMappingRepository.js';
import { conditionalAuth } from '../middleware/conditionalAuth.js';
import logger from '../services/logger.js';

const router = express.Router();

// ── OAuth Flow ──

/**
 * GET /api/qbo/connect
 * Generate Intuit authorization URL and return it to the frontend.
 * Frontend opens this URL to start the OAuth flow.
 */
router.get('/connect', async (req, res) => {
  try {
    // Pre-flight: validate required config before starting OAuth
    const missing = [];
    if (!process.env.QBO_CLIENT_ID) missing.push('QBO_CLIENT_ID');
    if (!process.env.QBO_CLIENT_SECRET) missing.push('QBO_CLIENT_SECRET');
    const ek = process.env.QBO_TOKEN_ENCRYPTION_KEY;
    if (!ek || ek.length !== 64) missing.push('QBO_TOKEN_ENCRYPTION_KEY (64-char hex — run: openssl rand -hex 32)');

    if (missing.length > 0) {
      logger.error('[QBO] Missing required config', { missing });
      return res.status(500).json({ error: 'QBO configuration incomplete', missing });
    }

    // Generate CSRF state as a signed JWT (C3 fix — self-validating, no server storage)
    const csrfPayload = {
      nonce: crypto.randomBytes(16).toString('hex'),
      exp: Math.floor(Date.now() / 1000) + 10 * 60 // 10-min expiry
    };
    const jwtSecret = process.env.JWT_SECRET || process.env.QBO_CLIENT_SECRET;
    const state = jwt.sign(csrfPayload, jwtSecret);

    const authUrl = qboClient.getAuthorizationUrl(state);

    // If called from browser directly, redirect; if API call, return JSON
    if (req.query.json === 'true' || (req.headers.accept && req.headers.accept.includes('application/json') && !req.headers.accept.includes('text/html'))) {
      return res.json({ authUrl });
    }
    res.redirect(authUrl);
  } catch (error) {
    logger.error('[QBO] Failed to generate auth URL', { error: error.message });
    res.status(500).json({ error: 'Failed to initiate QBO connection' });
  }
});

/**
 * GET /api/qbo/callback
 * Intuit redirects here after authorization. NO auth middleware —
 * this is a browser redirect from Intuit, not an authenticated API call.
 */
router.get('/callback', async (req, res) => {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

  try {
    // Validate CSRF state
    const { state, realmId } = req.query;
    if (!state) {
      logger.warn('[QBO] Callback missing state parameter');
      return res.redirect(`${frontendUrl}/invoices?qbo=error&message=Missing+state+parameter`);
    }

    const jwtSecret = process.env.JWT_SECRET || process.env.QBO_CLIENT_SECRET;
    try {
      jwt.verify(state, jwtSecret);
    } catch (jwtError) {
      logger.warn('[QBO] CSRF state validation failed', { error: jwtError.message });
      return res.redirect(`${frontendUrl}/invoices?qbo=error&message=Invalid+or+expired+state`);
    }

    // Exchange authorization code for tokens
    const token = await qboClient.createToken(req.url);

    // Store tokens encrypted in DB
    await QBOTokenRepository.upsertToken(realmId, {
      accessToken: token.access_token,
      refreshToken: token.refresh_token,
      expiresIn: token.expires_in,
      xRefreshTokenExpiresIn: token.x_refresh_token_expires_in,
      companyName: null // Will be populated by optional CompanyInfo fetch
    });

    // Optionally fetch company name
    try {
      const { client } = await qboClient.getAuthenticatedClient();
      const companyInfo = await qboClient.makeApiCall('GET', `companyinfo/${realmId}`);
      const companyName = companyInfo?.CompanyInfo?.CompanyName;
      if (companyName) {
        await QBOTokenRepository.upsertToken(realmId, {
          accessToken: token.access_token,
          refreshToken: token.refresh_token,
          expiresIn: token.expires_in,
          xRefreshTokenExpiresIn: token.x_refresh_token_expires_in,
          companyName
        });
      }
    } catch (companyError) {
      // Non-fatal — we already have tokens stored
      logger.warn('[QBO] Could not fetch company name', { error: companyError.message });
    }

    logger.info('[QBO] OAuth callback successful', { realmId });
    res.redirect(`${frontendUrl}/invoices?qbo=connected`);
  } catch (error) {
    logger.error('[QBO] OAuth callback failed', { error: error.message });
    res.redirect(`${frontendUrl}/invoices?qbo=error&message=${encodeURIComponent(error.message)}`);
  }
});

// ── Management Endpoints (all require auth) ──

/**
 * GET /api/qbo/status
 * Return QBO connection status.
 */
router.get('/status', conditionalAuth, async (req, res) => {
  try {
    const status = await qboClient.getConnectionStatus();
    if (!status) {
      return res.json({ connected: false });
    }
    res.json(status);
  } catch (error) {
    logger.error('[QBO] Status check failed', { error: error.message });
    // Return disconnected instead of 500 — status check failures shouldn't crash the UI
    res.json({ connected: false, error: 'Status check failed' });
  }
});

/**
 * POST /api/qbo/disconnect
 * Revoke tokens and disconnect from QBO.
 */
router.post('/disconnect', conditionalAuth, async (req, res) => {
  try {
    const tokenRecord = await QBOTokenRepository.getActiveToken();
    if (!tokenRecord) {
      return res.json({ disconnected: true, message: 'No active QBO connection' });
    }

    await qboClient.revokeTokens(tokenRecord.realm_id);
    res.json({ disconnected: true });
  } catch (error) {
    logger.error('[QBO] Disconnect failed', { error: error.message });
    res.status(500).json({ error: 'Failed to disconnect QBO' });
  }
});

/**
 * POST /api/qbo/refresh
 * Force a manual token refresh (for debugging).
 */
router.post('/refresh', conditionalAuth, async (req, res) => {
  try {
    const tokenRecord = await QBOTokenRepository.getActiveToken();
    if (!tokenRecord) {
      return res.status(404).json({ error: 'No active QBO connection' });
    }

    await qboClient.refreshTokens(tokenRecord.realm_id);
    const status = await qboClient.getConnectionStatus();
    res.json({ refreshed: true, ...status });
  } catch (error) {
    logger.error('[QBO] Manual refresh failed', { error: error.message });
    res.status(500).json({ error: 'Token refresh failed: ' + error.message });
  }
});

// ── Customer & Item Sync ──

/**
 * Expected mappings between internal line item types and QBO Item names.
 * QBO Items must be created manually in the QBO company first (Phase 0).
 */
const EXPECTED_ITEM_MAPPINGS = [
  { internalItemType: 'support', internalCategory: null, internalDescription: 'High Priority Support Hours', qboItemName: 'p1 - Emergency Support' },
  { internalItemType: 'support', internalCategory: null, internalDescription: 'Medium Priority Support Hours', qboItemName: 'p2 - Urgent Support' },
  { internalItemType: 'support', internalCategory: null, internalDescription: 'Low Priority Support Hours', qboItemName: 'p3 - Standard Support' },
  { internalItemType: 'credit', internalCategory: null, internalDescription: 'Turbo Support Credit Applied', qboItemName: 'Free Support Hours Credit' },
  { internalItemType: 'project', internalCategory: 'LANDING_PAGE', internalDescription: null, qboItemName: 'Landing Page Development' },
  { internalItemType: 'project', internalCategory: 'MULTI_FORM', internalDescription: null, qboItemName: 'Multi-Step Lead Form Implementation' },
  { internalItemType: 'project', internalCategory: 'BASIC_FORM', internalDescription: null, qboItemName: 'Basic Lead Form Implementation' },
  { internalItemType: 'project', internalCategory: 'MIGRATION', internalDescription: null, qboItemName: 'Website Migration Services' },
  { internalItemType: 'project', internalCategory: null, internalDescription: null, qboItemName: 'Custom Development' },
  { internalItemType: 'hosting', internalCategory: null, internalDescription: null, qboItemName: 'PeakOne Website Hosting' },
  { internalItemType: 'credit', internalCategory: 'HOSTING_CREDIT', internalDescription: null, qboItemName: 'Free Hosting Credit' },
  { internalItemType: 'credit', internalCategory: 'HOSTING_PRORATED', internalDescription: null, qboItemName: 'Free Hosting Credit' },
];

/**
 * GET /api/qbo/sync/customers
 * Match local customers to QBO customers by DisplayName.
 * ?dryRun=true (default) shows matches without writing.
 */
router.get('/sync/customers', conditionalAuth, async (req, res) => {
  try {
    const dryRun = req.query.dryRun !== 'false'; // default true for safety
    const results = { matched: 0, created: 0, unmatched: 0, failed: 0, dryRun, details: [] };

    // Get local customers without a qbo_customer_id
    const [customers] = await pool.query(
      'SELECT id, name, email, qbo_customer_id FROM customers WHERE is_active = TRUE'
    );

    for (const customer of customers) {
      if (customer.qbo_customer_id) {
        results.matched++;
        results.details.push({ name: customer.name, status: 'already_mapped', qboId: customer.qbo_customer_id });
        continue;
      }

      try {
        // Query QBO for customer by DisplayName
        const response = await qboClient.query(
          `SELECT * FROM Customer WHERE DisplayName = '${customer.name.replace(/'/g, "\\'")}'`
        );
        const qboCustomers = response?.QueryResponse?.Customer;

        if (qboCustomers && qboCustomers.length > 0) {
          const qboCustomer = qboCustomers[0];
          if (!dryRun) {
            await pool.query(
              'UPDATE customers SET qbo_customer_id = ? WHERE id = ?',
              [qboCustomer.Id, customer.id]
            );
          }
          results.matched++;
          results.details.push({ name: customer.name, status: 'matched', qboId: qboCustomer.Id, qboName: qboCustomer.DisplayName });
        } else if (!dryRun) {
          // Create customer in QBO
          const newCustomer = await qboClient.makeApiCall('POST', 'customer', {
            DisplayName: customer.name,
            PrimaryEmailAddr: customer.email ? { Address: customer.email } : undefined
          });
          const createdId = newCustomer?.Customer?.Id;
          if (createdId) {
            await pool.query(
              'UPDATE customers SET qbo_customer_id = ? WHERE id = ?',
              [createdId, customer.id]
            );
            results.created++;
            results.details.push({ name: customer.name, status: 'created', qboId: createdId });
          }
        } else {
          results.unmatched++;
          results.details.push({ name: customer.name, status: 'unmatched', hint: 'Will be created when dryRun=false' });
        }
      } catch (error) {
        results.failed++;
        results.details.push({ name: customer.name, status: 'error', error: error.message });
        logger.error('[QBO] Customer sync error', { customer: customer.name, error: error.message });
      }
    }

    logger.info('[QBO] Customer sync complete', { ...results, details: undefined });
    res.json(results);
  } catch (error) {
    logger.error('[QBO] Customer sync failed', { error: error.message });
    res.status(500).json({ error: 'Customer sync failed: ' + error.message });
  }
});

/**
 * GET /api/qbo/sync/items
 * Fetch all QBO Service items, match by name to expected internal mappings,
 * populate qbo_item_mappings table.
 */
router.get('/sync/items', conditionalAuth, async (req, res) => {
  try {
    // Fetch all Service items from QBO
    const response = await qboClient.query("SELECT * FROM Item WHERE Type = 'Service'");
    const qboItems = response?.QueryResponse?.Item || [];

    // Build name→Item lookup (case-insensitive)
    const qboItemsByName = new Map();
    for (const item of qboItems) {
      qboItemsByName.set(item.Name.toLowerCase(), item);
    }

    const results = { mapped: 0, missing: 0, details: [] };

    for (const expected of EXPECTED_ITEM_MAPPINGS) {
      const qboItem = qboItemsByName.get(expected.qboItemName.toLowerCase());

      if (qboItem) {
        await QBOItemMappingRepository.upsertMapping({
          internalItemType: expected.internalItemType,
          internalCategory: expected.internalCategory,
          internalDescription: expected.internalDescription,
          qboItemId: qboItem.Id,
          qboItemName: qboItem.Name
        });
        results.mapped++;
        results.details.push({
          internalType: expected.internalItemType,
          internalCategory: expected.internalCategory,
          internalDescription: expected.internalDescription,
          qboItemName: qboItem.Name,
          qboItemId: qboItem.Id,
          status: 'mapped'
        });
      } else {
        results.missing++;
        results.details.push({
          internalType: expected.internalItemType,
          internalCategory: expected.internalCategory,
          internalDescription: expected.internalDescription,
          expectedQboName: expected.qboItemName,
          status: 'missing',
          hint: `Create a Service item named "${expected.qboItemName}" in QBO`
        });
        logger.warn('[QBO] Expected item not found in QBO', { expectedName: expected.qboItemName });
      }
    }

    logger.info('[QBO] Item sync complete', { mapped: results.mapped, missing: results.missing });
    res.json(results);
  } catch (error) {
    logger.error('[QBO] Item sync failed', { error: error.message });
    res.status(500).json({ error: 'Item sync failed: ' + error.message });
  }
});

/**
 * GET /api/qbo/mappings
 * Return all active item mappings (for admin debugging).
 */
router.get('/mappings', conditionalAuth, async (req, res) => {
  try {
    const mappings = await QBOItemMappingRepository.getAllMappings();
    res.json({ mappings, count: mappings.length });
  } catch (error) {
    logger.error('[QBO] Failed to fetch mappings', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch mappings' });
  }
});

/**
 * GET /api/qbo/sync/eligible-count
 * Return the number of invoices eligible for QBO sync.
 */
router.get('/sync/eligible-count', conditionalAuth, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT COUNT(*) as count FROM invoices
       WHERE status IN ('sent','paid','overdue')
       AND qbo_sync_status IN ('pending','error')`
    );
    res.json({ eligible: rows[0].count });
  } catch (error) {
    logger.error('[QBO] Eligible count failed', { error: error.message });
    res.status(500).json({ error: 'Failed to get eligible count' });
  }
});

export default router;
