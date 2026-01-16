import jwt from 'jsonwebtoken';
import ClientUser from '../models/ClientUser.js';

/**
 * Middleware to authenticate client portal JWT tokens
 * Extracts token from Authorization header, verifies it, and attaches client user to request
 * Separate from internal authenticateToken for security isolation
 */
export const authenticateClientToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Must be a client token (has clientId)
    if (!decoded.clientId || decoded.role !== 'client') {
      return res.status(403).json({ error: 'Invalid client token' });
    }

    // Fetch client user from database to ensure they still exist and are active
    const clientUser = await ClientUser.findById(decoded.id);
    if (!clientUser) {
      return res.status(401).json({ error: 'Client user not found or inactive' });
    }

    // Attach client user to request object with scoping info
    req.clientUser = {
      id: clientUser.id,
      email: clientUser.email,
      name: clientUser.name,
      clientId: clientUser.client_id,
      clientName: clientUser.company_name,
      fluentCustomerId: clientUser.fluent_customer_id,
      twentyBrandId: clientUser.twenty_brand_id,
      role: 'client'
    };

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(403).json({ error: 'Invalid token' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(403).json({ error: 'Token expired' });
    }
    console.error('Client authentication error:', error);
    return res.status(500).json({ error: 'Authentication failed' });
  }
};

/**
 * Middleware to require client role
 * Must be used after authenticateClientToken middleware
 * This is essentially a validation that the token is a client token
 */
export const requireClient = (req, res, next) => {
  if (!req.clientUser) {
    return res.status(401).json({ error: 'Client authentication required' });
  }

  if (req.clientUser.role !== 'client') {
    return res.status(403).json({ error: 'Client access required' });
  }

  next();
};

/**
 * Middleware to enforce client data scope
 * Attaches clientId filter that MUST be applied to all data queries
 * This ensures clients can only see their own data
 */
export const enforceClientScope = (req, res, next) => {
  if (!req.clientUser || !req.clientUser.clientId) {
    return res.status(401).json({ error: 'Client scope not established' });
  }

  // Attach scope filter that must be used in all queries
  req.clientScope = {
    clientId: req.clientUser.clientId,
    fluentCustomerId: req.clientUser.fluentCustomerId,
    twentyBrandId: req.clientUser.twentyBrandId
  };

  // Helper function to validate scope is being applied
  req.validateScope = (queryClientId) => {
    if (queryClientId !== req.clientScope.clientId) {
      throw new Error('Client scope violation detected');
    }
  };

  next();
};

/**
 * Combined middleware for client portal routes
 * Applies authentication, role check, and scope enforcement in one call
 */
export const clientPortalAuth = [
  authenticateClientToken,
  requireClient,
  enforceClientScope
];

/**
 * Middleware to strip sensitive fields from response data
 * Removes hours, revenue, cost, and other internal business data
 * @param {string[]} sensitiveFields - Fields to remove from response
 */
export const stripSensitiveFields = (sensitiveFields = []) => {
  const defaultSensitiveFields = [
    'estimated_hours',
    'actual_hours',
    'hourly_rate',
    'total_cost',
    'total_revenue',
    'profit',
    'margin',
    'internal_notes',
    'admin_notes',
    'billing_notes'
  ];

  const fieldsToStrip = [...defaultSensitiveFields, ...sensitiveFields];

  return (req, res, next) => {
    // Store original json method
    const originalJson = res.json.bind(res);

    // Override json method to strip sensitive fields
    res.json = (data) => {
      const sanitized = stripFields(data, fieldsToStrip);
      return originalJson(sanitized);
    };

    next();
  };
};

/**
 * Recursively strip sensitive fields from data
 * @param {*} data - Data to sanitize
 * @param {string[]} fields - Fields to remove
 * @returns {*} Sanitized data
 */
function stripFields(data, fields) {
  if (Array.isArray(data)) {
    return data.map(item => stripFields(item, fields));
  }

  if (data && typeof data === 'object' && !(data instanceof Date)) {
    const sanitized = {};
    for (const [key, value] of Object.entries(data)) {
      if (!fields.includes(key)) {
        sanitized[key] = stripFields(value, fields);
      }
    }
    return sanitized;
  }

  return data;
}

export default {
  authenticateClientToken,
  requireClient,
  enforceClientScope,
  clientPortalAuth,
  stripSensitiveFields
};
