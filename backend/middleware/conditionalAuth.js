import jwt from 'jsonwebtoken';
import User from '../models/User.js';

/**
 * Conditional Authentication Middleware
 *
 * This middleware provides flexible authentication for environments with multiple auth layers:
 *
 * Production (velocity.peakonedigital.com):
 *   - Protected by Traefik BasicAuth at reverse proxy level
 *   - This middleware trusts BasicAuth and allows requests without JWT
 *   - Creates a pseudo-user object for authenticated BasicAuth users
 *
 * Development (localhost) or Direct API Access:
 *   - Requires JWT token in Authorization header
 *   - Standard JWT validation and user lookup
 *
 * This prevents the "double authentication" problem where users must pass
 * BasicAuth AND provide a JWT token, which requires a login screen.
 */
export const conditionalAuth = async (req, res, next) => {
  try {
    const host = req.get('host') || '';
    const origin = req.get('origin') || '';

    // Check if request is from BasicAuth-protected production domain
    const isBasicAuthProtected =
      host.includes('velocity.peakonedigital.com') ||
      origin.includes('velocity.peakonedigital.com');

    if (isBasicAuthProtected) {
      // Request came through Traefik BasicAuth - user is already authenticated
      // Create a pseudo-user object for compatibility with routes expecting req.user
      req.user = {
        id: 1,
        email: 'admin@peakonedigital.com',
        role: 'admin',
        authMethod: 'basicauth'
      };

      console.log('✅ BasicAuth-protected request - JWT validation bypassed');
      return next();
    }

    // For non-BasicAuth requests (localhost, direct API access), require JWT
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        error: 'Access token required',
        hint: 'Use POST /api/auth/login to obtain a token'
      });
    }

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Fetch user from database to ensure they still exist and are active
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ error: 'User not found or inactive' });
    }

    // Attach user to request object
    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      authMethod: 'jwt'
    };

    console.log(`✅ JWT authenticated: ${user.email}`);
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(403).json({ error: 'Invalid token' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(403).json({ error: 'Token expired' });
    }
    console.error('Authentication error:', error);
    return res.status(500).json({ error: 'Authentication failed' });
  }
};

/**
 * Middleware to require specific role(s)
 * Must be used after conditionalAuth middleware
 * @param {string|string[]} roles - Required role(s)
 */
export const requireRole = (roles) => {
  const allowedRoles = Array.isArray(roles) ? roles : [roles];

  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        required: allowedRoles,
        current: req.user.role
      });
    }

    next();
  };
};
