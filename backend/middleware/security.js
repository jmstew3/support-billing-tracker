import rateLimit from 'express-rate-limit';

/**
 * Security Middleware
 * Rate limiters and validators for sensitive operations
 */

// Rate limiter for bulk operations (more restrictive)
export const bulkOperationLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 requests per minute
  message: {
    error: 'Too many bulk operations. Please wait before trying again.',
    retryAfter: 60
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Rate limiter for data import/export operations
export const dataTransferLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 5, // 5 requests per 5 minutes
  message: {
    error: 'Too many data transfer operations. Please wait before trying again.',
    retryAfter: 300
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Rate limiter for destructive operations (very restrictive)
export const destructiveOperationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 requests per hour
  message: {
    error: 'Too many destructive operations. Please wait before trying again.',
    retryAfter: 3600
  },
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * Input Validators
 */

// Valid values for enums
const VALID_STATUS = ['active', 'deleted', 'ignored', 'all'];
const VALID_URGENCY = ['LOW', 'MEDIUM', 'HIGH'];
const VALID_CATEGORIES = [
  'Advisory', 'Email', 'Forms', 'General', 'Hosting',
  'Migration', 'Non-billable', 'Scripts', 'Support', 'Website'
];

/**
 * Validate and sanitize request ID
 * @param {string|number} id - Request ID to validate
 * @returns {number|null} Validated ID or null if invalid
 */
export function validateId(id) {
  const parsed = parseInt(id, 10);
  if (isNaN(parsed) || parsed <= 0 || parsed > 2147483647) {
    return null;
  }
  return parsed;
}

/**
 * Validate status value
 * @param {string} status - Status to validate
 * @returns {string|null} Validated status or null if invalid
 */
export function validateStatus(status) {
  if (!status) return 'active'; // default
  const lower = status.toLowerCase();
  return VALID_STATUS.includes(lower) ? lower : null;
}

/**
 * Validate urgency value
 * @param {string} urgency - Urgency to validate
 * @returns {string|null} Validated urgency or null if invalid
 */
export function validateUrgency(urgency) {
  if (!urgency) return null;
  const upper = urgency.toUpperCase();
  return VALID_URGENCY.includes(upper) ? upper : null;
}

/**
 * Validate category value
 * @param {string} category - Category to validate
 * @returns {string|null} Validated category or null if invalid
 */
export function validateCategory(category) {
  if (!category) return null;
  // Capitalize first letter
  const formatted = category.charAt(0).toUpperCase() + category.slice(1).toLowerCase();
  return VALID_CATEGORIES.includes(formatted) ? formatted : null;
}

/**
 * Validate date string (YYYY-MM-DD format)
 * @param {string} dateStr - Date string to validate
 * @returns {string|null} Validated date string or null if invalid
 */
export function validateDate(dateStr) {
  if (!dateStr) return null;
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(dateStr)) return null;

  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return null;

  // Check it's a reasonable date (not before 2020, not more than 1 year in future)
  const minDate = new Date('2020-01-01');
  const maxDate = new Date();
  maxDate.setFullYear(maxDate.getFullYear() + 1);

  if (date < minDate || date > maxDate) return null;

  return dateStr;
}

/**
 * Validate pagination parameters
 * @param {object} params - Object with limit and offset
 * @returns {object} Validated pagination params (integers for MySQL compatibility)
 */
export function validatePagination({ limit, offset }) {
  // Ensure limit is a valid integer or null
  let validatedLimit = null;
  if (limit !== undefined && limit !== null && limit !== '') {
    const parsed = parseInt(limit, 10);
    if (!isNaN(parsed) && parsed > 0) {
      validatedLimit = Math.min(Math.max(parsed, 1), 1000);
    }
  }

  // Ensure offset is a valid integer (default 0)
  let validatedOffset = 0;
  if (offset !== undefined && offset !== null && offset !== '') {
    const parsed = parseInt(offset, 10);
    if (!isNaN(parsed) && parsed >= 0) {
      validatedOffset = parsed;
    }
  }

  return { limit: validatedLimit, offset: validatedOffset };
}

/**
 * Validate array of IDs
 * @param {Array} ids - Array of IDs to validate
 * @returns {Array|null} Validated IDs or null if invalid
 */
export function validateIdArray(ids) {
  if (!Array.isArray(ids) || ids.length === 0) return null;
  if (ids.length > 100) return null; // Limit bulk operations to 100 items

  const validated = ids.map(id => validateId(id)).filter(id => id !== null);
  if (validated.length !== ids.length) return null; // All must be valid

  return validated;
}

/**
 * Sanitize error message for client response
 * Removes sensitive information like stack traces, SQL details, file paths
 * @param {Error} error - Error object
 * @param {boolean} isDev - Whether in development mode
 * @returns {string} Sanitized error message
 */
export function sanitizeErrorMessage(error, isDev = false) {
  // In development, return more details
  if (isDev && process.env.NODE_ENV === 'development') {
    return error.message;
  }

  // Patterns that indicate sensitive information
  const sensitivePatterns = [
    /at\s+.*:\d+:\d+/i,           // Stack trace lines
    /\/.*\.(js|ts|mjs)/i,         // File paths
    /password|secret|token|key/i, // Credential keywords
    /SQL|query|table|column/i,    // Database details
    /ECONNREFUSED|ETIMEDOUT/i,    // Connection errors
    /ER_\w+/i,                    // MySQL error codes
  ];

  const message = error.message || 'An error occurred';

  // Check if message contains sensitive info
  for (const pattern of sensitivePatterns) {
    if (pattern.test(message)) {
      return 'An internal error occurred. Please try again later.';
    }
  }

  // Return generic message if too long (might contain sensitive data)
  if (message.length > 200) {
    return 'An error occurred while processing your request.';
  }

  return message;
}

/**
 * Escape SQL identifier (table name, column name)
 * Prevents SQL injection in dynamic identifiers
 * @param {string} identifier - Identifier to escape
 * @returns {string} Escaped identifier with backticks
 */
export function escapeIdentifier(identifier) {
  // Only allow alphanumeric and underscore
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(identifier)) {
    throw new Error('Invalid SQL identifier');
  }
  // Double any backticks and wrap in backticks
  return '`' + identifier.replace(/`/g, '``') + '`';
}

/**
 * Password Complexity Validation
 * Enforces strong password requirements
 * @param {string} password - Password to validate
 * @returns {object} { valid: boolean, errors: string[] }
 */
export function validatePassword(password) {
  const errors = [];
  const MIN_LENGTH = 12;

  if (!password || typeof password !== 'string') {
    return { valid: false, errors: ['Password is required'] };
  }

  // Length check
  if (password.length < MIN_LENGTH) {
    errors.push(`Password must be at least ${MIN_LENGTH} characters`);
  }

  // Complexity checks
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Password must contain at least one special character (!@#$%^&*...)');
  }

  // Common password patterns to reject
  const commonPatterns = [
    /^password/i,
    /^123456/,
    /^qwerty/i,
    /(.)\1{3,}/, // Repeated characters (4+ in a row)
    /^admin/i,
    /^letmein/i,
  ];

  for (const pattern of commonPatterns) {
    if (pattern.test(password)) {
      errors.push('Password contains a common pattern and is too predictable');
      break;
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
