import express from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Store refresh tokens in memory (in production, use Redis or database)
const refreshTokens = new Set();

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
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    // Validate input
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find user by email
    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Verify password
    const isValid = await User.verifyPassword(password, user.password_hash);
    if (!isValid) {
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

    // Generate refresh token (long-lived: 7 days)
    const refreshToken = jwt.sign(
      { id: user.id },
      process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
    );

    // Store refresh token
    refreshTokens.add(refreshToken);

    // Update last login timestamp
    await User.updateLastLogin(user.id);

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
router.post('/logout', (req, res) => {
  const { refreshToken } = req.body;

  if (refreshToken) {
    refreshTokens.delete(refreshToken);
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
router.post('/refresh', async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(401).json({ error: 'Refresh token required' });
  }

  // Check if refresh token is in our store
  if (!refreshTokens.has(refreshToken)) {
    return res.status(403).json({ error: 'Invalid refresh token' });
  }

  try {
    // Verify refresh token
    const decoded = jwt.verify(
      refreshToken,
      process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET
    );

    // Fetch user
    const user = await User.findById(decoded.id);
    if (!user) {
      refreshTokens.delete(refreshToken); // Clean up invalid token
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
    refreshTokens.delete(refreshToken); // Clean up invalid token
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
router.post('/change-password', authenticateToken, async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  try {
    // Validate input
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current and new passwords are required' });
    }

    if (newPassword.length < 12) {
      return res.status(400).json({ error: 'New password must be at least 12 characters' });
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

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Password change error:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

export default router;
