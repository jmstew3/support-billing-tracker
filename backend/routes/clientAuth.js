import express from 'express';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import ClientUser from '../models/ClientUser.js';
import { authenticateClientToken } from '../middleware/clientAuth.js';
import pool from '../db/config.js';
import logger from '../services/logger.js';
import {
  getClientRefreshTokenCookieOptions,
  getClientClearCookieOptions,
  CLIENT_REFRESH_TOKEN_COOKIE
} from '../utils/cookies.js';

const router = express.Router();

/**
 * Parse duration string to milliseconds
 */
function parseDuration(duration) {
  const match = duration.match(/^(\d+)([dhms])$/);
  if (!match) return 7 * 24 * 60 * 60 * 1000; // Default 7 days

  const value = parseInt(match[1]);
  const unit = match[2];

  switch (unit) {
    case 'd': return value * 24 * 60 * 60 * 1000;
    case 'h': return value * 60 * 60 * 1000;
    case 'm': return value * 60 * 1000;
    case 's': return value * 1000;
    default: return 7 * 24 * 60 * 60 * 1000;
  }
}

// Strict rate limiter for client login (more restrictive than internal)
const clientLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window per IP
  message: {
    error: 'Too many login attempts. Please try again after 15 minutes.',
    retryAfter: 15 * 60
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true
});

// Moderate rate limiter for other client auth endpoints
const clientAuthLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 20,
  message: {
    error: 'Too many requests. Please try again later.',
    retryAfter: 5 * 60
  },
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * Log client audit event
 */
async function logClientAudit(clientUserId, clientId, action, details = {}) {
  try {
    await pool.execute(
      `INSERT INTO client_audit_logs (client_user_id, client_id, action, resource_type, resource_id, ip_address, user_agent)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        clientUserId,
        clientId,
        action,
        details.resourceType || null,
        details.resourceId || null,
        details.ipAddress || null,
        details.userAgent || null
      ]
    );
  } catch (error) {
    logger.error('Error logging client audit', { error: error.message });
    // Don't throw - audit logging should not block operations
  }
}

/**
 * POST /api/auth/client/login
 * Authenticate client user and return JWT tokens
 */
router.post('/login', clientLoginLimiter, async (req, res) => {
  const { email, password } = req.body;

  try {
    // Validate input
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find client user by email
    const clientUser = await ClientUser.findByEmail(email);
    if (!clientUser) {
      await logClientAudit(null, null, 'login_failure', {
        resourceType: 'auth',
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Verify password
    const isValid = await ClientUser.verifyPassword(password, clientUser.password_hash);
    if (!isValid) {
      await logClientAudit(clientUser.id, clientUser.client_id, 'login_failure', {
        resourceType: 'auth',
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Generate access token with client-specific claims
    const accessToken = jwt.sign(
      {
        id: clientUser.id,
        email: clientUser.email,
        role: 'client',
        clientId: clientUser.client_id,
        clientName: clientUser.company_name
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '1h' }
    );

    // Generate refresh token
    if (!process.env.JWT_REFRESH_SECRET) {
      logger.error('SECURITY ERROR: JWT_REFRESH_SECRET is not configured.');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    const refreshExpiresIn = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
    const refreshToken = jwt.sign(
      { id: clientUser.id, type: 'client' },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: refreshExpiresIn }
    );

    // Update last login timestamp
    await ClientUser.updateLastLogin(clientUser.id);

    // Log successful login
    await logClientAudit(clientUser.id, clientUser.client_id, 'login', {
      resourceType: 'auth',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    // Set refresh token as HttpOnly cookie (prevents XSS theft)
    res.cookie(CLIENT_REFRESH_TOKEN_COOKIE, refreshToken, getClientRefreshTokenCookieOptions(refreshExpiresIn));

    // Return access token and client user info (refresh token only in cookie, not body)
    res.json({
      accessToken,
      user: {
        id: clientUser.id,
        email: clientUser.email,
        name: clientUser.name,
        clientId: clientUser.client_id,
        clientName: clientUser.company_name,
        clientLogoUrl: clientUser.logo_url || null,
        role: 'client'
      }
    });
  } catch (error) {
    logger.error('Client login error', { error: error.message });
    res.status(500).json({ error: 'Login failed' });
  }
});

/**
 * POST /api/auth/client/logout
 * Invalidate client refresh token
 */
router.post('/logout', clientAuthLimiter, async (req, res) => {
  // Clear the refresh token cookie
  res.clearCookie(CLIENT_REFRESH_TOKEN_COOKIE, getClientClearCookieOptions());
  res.json({ message: 'Logged out successfully' });
});

/**
 * POST /api/auth/client/refresh
 * Get new access token using refresh token
 */
router.post('/refresh', clientAuthLimiter, async (req, res) => {
  // Read refresh token from HttpOnly cookie (preferred) or request body (legacy fallback)
  const refreshToken = req.cookies?.[CLIENT_REFRESH_TOKEN_COOKIE] || req.body?.refreshToken;

  if (!refreshToken) {
    return res.status(401).json({ error: 'Refresh token required' });
  }

  try {
    if (!process.env.JWT_REFRESH_SECRET) {
      logger.error('SECURITY ERROR: JWT_REFRESH_SECRET not configured');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    // Verify refresh token
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

    // Must be a client refresh token
    if (decoded.type !== 'client') {
      return res.status(403).json({ error: 'Invalid client refresh token' });
    }

    // Fetch client user to ensure they're still active
    const clientUser = await ClientUser.findById(decoded.id);
    if (!clientUser) {
      return res.status(403).json({ error: 'Client user not found or inactive' });
    }

    // Generate new access token
    const accessToken = jwt.sign(
      {
        id: clientUser.id,
        email: clientUser.email,
        role: 'client',
        clientId: clientUser.client_id,
        clientName: clientUser.company_name
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '1h' }
    );

    res.json({ accessToken });
  } catch (error) {
    logger.error('Client token refresh error', { error: error.message });
    return res.status(403).json({ error: 'Invalid or expired refresh token' });
  }
});

/**
 * GET /api/auth/client/me
 * Get current client user information
 */
router.get('/me', authenticateClientToken, async (req, res) => {
  try {
    const clientUser = await ClientUser.findById(req.clientUser.id);
    if (!clientUser) {
      return res.status(404).json({ error: 'Client user not found' });
    }

    // Return user info without sensitive data
    res.json({
      id: clientUser.id,
      email: clientUser.email,
      name: clientUser.name,
      clientId: clientUser.client_id,
      clientName: clientUser.company_name,
      clientLogoUrl: clientUser.logo_url || null,
      lastLoginAt: clientUser.last_login_at,
      createdAt: clientUser.created_at
    });
  } catch (error) {
    logger.error('Error fetching client user', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch user information' });
  }
});

export default router;
