import jwt from 'jsonwebtoken';
import User from '../models/User.js';

/**
 * Conditional Authentication Middleware
 *
 * This middleware provides flexible authentication for environments with multiple auth layers:
 *
 * Production (velocity.peakonedigital.com):
 *   - Protected by Traefik BasicAuth at reverse proxy level
 *   - This middleware trusts BasicAuth and looks up the configured admin user
 *   - Uses ADMIN_EMAIL env var to find user in database
 *
 * Development (localhost) or Direct API Access:
 *   - Requires JWT token in Authorization header
 *   - Standard JWT validation and user lookup
 *
 * Security Note: BasicAuth users share a single identity in audit logs.
 * For per-user tracking, configure Traefik ForwardAuth or use JWT-only auth.
 *
 * This prevents the "double authentication" problem where users must pass
 * BasicAuth AND provide a JWT token, which requires a login screen.
 */

// Cache the admin user for BasicAuth requests to avoid repeated DB lookups
let cachedBasicAuthUser = null;
let cacheExpiry = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export const conditionalAuth = async (req, res, next) => {
  try {
    const host = req.get('host') || '';
    const origin = req.get('origin') || '';

    // Check if request is from BasicAuth-protected production domain
    const isBasicAuthProtected =
      host.includes('billing.peakonedigital.com') ||
      origin.includes('billing.peakonedigital.com');

    if (isBasicAuthProtected) {
      // Request came through Traefik BasicAuth - user is already authenticated
      // Look up admin user from database (with caching to reduce DB load)
      const adminEmail = process.env.ADMIN_EMAIL || 'admin@peakonedigital.com';

      if (!cachedBasicAuthUser || Date.now() > cacheExpiry) {
        const user = await User.findByEmail(adminEmail);
        if (user) {
          cachedBasicAuthUser = {
            id: user.id,
            email: user.email,
            role: user.role,
            authMethod: 'basicauth'
          };
          cacheExpiry = Date.now() + CACHE_TTL;
        } else {
          // SECURITY: Do NOT use fallback identity - require valid user in database
          console.error(`[conditionalAuth] SECURITY: Admin user ${adminEmail} not found in database. Access denied.`);
          return res.status(401).json({
            error: 'Admin user not configured',
            hint: 'Run database migrations or create admin user via API'
          });
        }
      }

      req.user = { ...cachedBasicAuthUser };
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
      return res.status(401).json({
        error: 'User not found or inactive',
        hint: 'User account may have been deactivated or removed'
      });
    }

    // Attach user to request object
    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      authMethod: 'jwt'
    };

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
