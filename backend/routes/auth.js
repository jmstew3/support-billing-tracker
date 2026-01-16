import express from 'express';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import User from '../models/User.js';
import RefreshTokenRepository from '../repositories/RefreshTokenRepository.js';
import AuditLogRepository, { AuditActions } from '../repositories/AuditLogRepository.js';
import { authenticateToken } from '../middleware/auth.js';
import { validatePassword } from '../middleware/security.js';

const router = express.Router();

/**
 * Parse duration string to milliseconds
 * @param {string} duration - Duration string like '7d', '1h', '30m'
 * @returns {number} Duration in milliseconds
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

// Rate limiting configuration for authentication endpoints
// Prevents brute force attacks on login

// Strict rate limiter for login endpoint
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window per IP
  message: {
    error: 'Too many login attempts. Please try again after 15 minutes.',
    retryAfter: 15 * 60 // seconds
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  skipSuccessfulRequests: true // Don't count successful logins against the limit
  // Note: Using default IP-based key generator for simplicity
});

// Moderate rate limiter for other auth endpoints
const authLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 20, // 20 requests per window per IP
  message: {
    error: 'Too many requests. Please try again later.',
    retryAfter: 5 * 60
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Strict rate limiter for password change
const passwordChangeLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 attempts per hour
  message: {
    error: 'Too many password change attempts. Please try again after 1 hour.',
    retryAfter: 60 * 60
  },
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * POST /api/auth/login
 * Authenticate user and return JWT tokens
 *
 * Request body:
 * {
 *   "email": "admin@peakonedigital.com",
 *   "password": "PeakonBilling2025"
 * }
 *
 * Response:
 * {
 *   "accessToken": "eyJhbGciOiJIUzI1NiIs...",
 *   "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
 *   "user": {
 *     "id": 1,
 *     "email": "admin@peakonedigital.com",
 *     "role": "admin"
 *   }
 * }
 */
router.post('/login', loginLimiter, async (req, res) => {
  const { email, password } = req.body;

  try {
    // Validate input
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find user by email
    const user = await User.findByEmail(email);
    if (!user) {
      // Log failed login attempt (user not found)
      await AuditLogRepository.logFromRequest(req, AuditActions.AUTH_LOGIN_FAILURE, {
        resourceType: 'user',
        details: { email, reason: 'user_not_found' },
        status: 'failure'
      });
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Verify password
    const isValid = await User.verifyPassword(password, user.password_hash);
    if (!isValid) {
      // Log failed login attempt (wrong password)
      await AuditLogRepository.logFromRequest(req, AuditActions.AUTH_LOGIN_FAILURE, {
        userId: user.id,
        userEmail: user.email,
        resourceType: 'user',
        resourceId: user.id,
        details: { reason: 'invalid_password' },
        status: 'failure'
      });
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Generate access token (short-lived: 1 hour)
    const accessToken = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '1h' }
    );

    // SECURITY: JWT_REFRESH_SECRET is required - no fallback to JWT_SECRET
    if (!process.env.JWT_REFRESH_SECRET) {
      console.error('SECURITY ERROR: JWT_REFRESH_SECRET is not configured. Refresh tokens disabled.');
      return res.status(500).json({
        error: 'Server configuration error',
        hint: 'JWT_REFRESH_SECRET must be configured. Generate with: openssl rand -hex 32'
      });
    }

    // Generate refresh token (long-lived: 7 days)
    const refreshExpiresIn = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
    const refreshToken = jwt.sign(
      { id: user.id },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: refreshExpiresIn }
    );

    // Calculate expiration date for database storage
    const expiresAtMs = Date.now() + parseDuration(refreshExpiresIn);
    const expiresAt = new Date(expiresAtMs);

    // Store refresh token in database (hashed for security)
    try {
      await RefreshTokenRepository.create({
        userId: user.id,
        token: refreshToken,
        expiresAt,
        userAgent: req.get('User-Agent') || null,
        ipAddress: req.ip || null
      });
    } catch (tokenError) {
      console.error('Failed to store refresh token:', tokenError);
      // Continue anyway - user can still use access token
    }

    // Update last login timestamp
    await User.updateLastLogin(user.id);

    // Log successful login
    await AuditLogRepository.logFromRequest(req, AuditActions.AUTH_LOGIN_SUCCESS, {
      userId: user.id,
      userEmail: user.email,
      resourceType: 'user',
      resourceId: user.id,
      details: { role: user.role },
      status: 'success'
    });

    // Return tokens and user info (without password)
    res.json({
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

/**
 * POST /api/auth/logout
 * Invalidate refresh token
 *
 * Request body:
 * {
 *   "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
 * }
 *
 * Response:
 * {
 *   "message": "Logged out successfully"
 * }
 */
router.post('/logout', authLimiter, async (req, res) => {
  const { refreshToken } = req.body;

  if (refreshToken) {
    try {
      await RefreshTokenRepository.revoke(refreshToken);
    } catch (error) {
      console.error('Error revoking refresh token:', error);
      // Continue anyway - logout should succeed
    }
  }

  res.json({ message: 'Logged out successfully' });
});

/**
 * POST /api/auth/refresh
 * Get new access token using refresh token
 *
 * Request body:
 * {
 *   "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
 * }
 *
 * Response:
 * {
 *   "accessToken": "eyJhbGciOiJIUzI1NiIs..."
 * }
 */
router.post('/refresh', authLimiter, async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(401).json({ error: 'Refresh token required' });
  }

  try {
    // SECURITY: JWT_REFRESH_SECRET is required - no fallback
    if (!process.env.JWT_REFRESH_SECRET) {
      console.error('SECURITY ERROR: JWT_REFRESH_SECRET not configured');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    // Verify JWT signature first (fast check)
    const decoded = jwt.verify(
      refreshToken,
      process.env.JWT_REFRESH_SECRET
    );

    // Check if refresh token exists and is valid in database
    const tokenRecord = await RefreshTokenRepository.findValidToken(refreshToken);
    if (!tokenRecord) {
      return res.status(403).json({ error: 'Invalid or expired refresh token' });
    }

    // Fetch user (tokenRecord already has user info from JOIN)
    const user = await User.findById(decoded.id);
    if (!user) {
      // Revoke the token since user doesn't exist
      await RefreshTokenRepository.revoke(refreshToken);
      return res.status(403).json({ error: 'User not found' });
    }

    // Generate new access token
    const accessToken = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '1h' }
    );

    res.json({ accessToken });
  } catch (error) {
    console.error('Token refresh error:', error);

    // Revoke invalid token from database
    try {
      await RefreshTokenRepository.revoke(refreshToken);
    } catch (revokeError) {
      // Ignore revoke errors
    }

    return res.status(403).json({ error: 'Invalid or expired refresh token' });
  }
});

/**
 * GET /api/auth/me
 * Get current user information
 * Requires authentication (JWT token in Authorization header)
 *
 * Response:
 * {
 *   "id": 1,
 *   "email": "admin@peakonedigital.com",
 *   "role": "admin",
 *   "last_login_at": "2025-10-08T12:34:56.000Z"
 * }
 */
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Return user info without password
    res.json({
      id: user.id,
      email: user.email,
      role: user.role,
      created_at: user.created_at,
      last_login_at: user.last_login_at
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Failed to fetch user information' });
  }
});

/**
 * POST /api/auth/change-password
 * Change user password
 * Requires authentication
 *
 * Request body:
 * {
 *   "currentPassword": "oldpassword",
 *   "newPassword": "newpassword"
 * }
 */
router.post('/change-password', passwordChangeLimiter, authenticateToken, async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  try {
    // Validate input
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current and new passwords are required' });
    }

    // Validate password complexity
    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.valid) {
      return res.status(400).json({
        error: 'Password does not meet complexity requirements',
        details: passwordValidation.errors
      });
    }

    // Fetch user
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify current password
    const isValid = await User.verifyPassword(currentPassword, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    // Update password
    await User.updatePassword(user.id, newPassword);

    // Revoke all refresh tokens for security (forces re-login on all devices)
    let revokedCount = 0;
    try {
      revokedCount = await RefreshTokenRepository.revokeAllForUser(user.id);
      console.log(`Password changed for user ${user.id}, revoked ${revokedCount} refresh tokens`);
    } catch (revokeError) {
      console.error('Failed to revoke tokens after password change:', revokeError);
      // Continue anyway - password was changed successfully
    }

    // Log password change
    await AuditLogRepository.logFromRequest(req, AuditActions.AUTH_PASSWORD_CHANGE, {
      resourceType: 'user',
      resourceId: user.id,
      details: { tokensRevoked: revokedCount },
      status: 'success'
    });

    res.json({ message: 'Password changed successfully. Please login again on all devices.' });
  } catch (error) {
    console.error('Password change error:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

/**
 * POST /api/auth/logout-all
 * Logout from all devices by revoking all refresh tokens
 * Requires authentication
 *
 * Response:
 * {
 *   "message": "Logged out from all devices",
 *   "sessionsRevoked": 5
 * }
 */
router.post('/logout-all', authLimiter, authenticateToken, async (req, res) => {
  try {
    const revokedCount = await RefreshTokenRepository.revokeAllForUser(req.user.id);

    res.json({
      message: 'Logged out from all devices',
      sessionsRevoked: revokedCount
    });
  } catch (error) {
    console.error('Logout all error:', error);
    res.status(500).json({ error: 'Failed to logout from all devices' });
  }
});

/**
 * GET /api/auth/sessions
 * Get all active sessions for current user
 * Requires authentication
 *
 * Response:
 * {
 *   "sessions": [
 *     {
 *       "id": 1,
 *       "created_at": "2025-01-14T12:00:00.000Z",
 *       "expires_at": "2025-01-21T12:00:00.000Z",
 *       "user_agent": "Mozilla/5.0...",
 *       "ip_address": "192.168.1.1"
 *     }
 *   ]
 * }
 */
router.get('/sessions', authLimiter, authenticateToken, async (req, res) => {
  try {
    const sessions = await RefreshTokenRepository.getActiveSessions(req.user.id);

    res.json({ sessions });
  } catch (error) {
    console.error('Get sessions error:', error);
    res.status(500).json({ error: 'Failed to fetch sessions' });
  }
});

/**
 * DELETE /api/auth/sessions/:sessionId
 * Revoke a specific session
 * Requires authentication
 *
 * Response:
 * {
 *   "message": "Session revoked successfully"
 * }
 */
router.delete('/sessions/:sessionId', authLimiter, authenticateToken, async (req, res) => {
  try {
    const sessionId = parseInt(req.params.sessionId);

    if (isNaN(sessionId)) {
      return res.status(400).json({ error: 'Invalid session ID' });
    }

    const revoked = await RefreshTokenRepository.revokeSession(req.user.id, sessionId);

    if (!revoked) {
      return res.status(404).json({ error: 'Session not found or already revoked' });
    }

    res.json({ message: 'Session revoked successfully' });
  } catch (error) {
    console.error('Revoke session error:', error);
    res.status(500).json({ error: 'Failed to revoke session' });
  }
});

export default router;
