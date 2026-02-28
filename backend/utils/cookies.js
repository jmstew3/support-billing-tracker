/**
 * Shared cookie configuration for refresh tokens
 * Refresh tokens are stored in HttpOnly cookies to prevent XSS theft
 */

const isProduction = () => process.env.NODE_ENV === 'production';

/**
 * Parse duration string to seconds (for cookie maxAge)
 * @param {string} duration - Duration string like '7d', '1h', '30m'
 * @returns {number} Duration in seconds
 */
function parseDurationSeconds(duration) {
  const match = duration.match(/^(\d+)([dhms])$/);
  if (!match) return 7 * 24 * 60 * 60; // Default 7 days

  const value = parseInt(match[1]);
  const unit = match[2];

  switch (unit) {
    case 'd': return value * 24 * 60 * 60;
    case 'h': return value * 60 * 60;
    case 'm': return value * 60;
    case 's': return value;
    default: return 7 * 24 * 60 * 60;
  }
}

/**
 * Get cookie options for setting refresh token
 * @param {string} expiresIn - JWT expiration string (e.g., '7d')
 * @returns {Object} Cookie options
 */
export function getRefreshTokenCookieOptions(expiresIn = '7d') {
  return {
    httpOnly: true,
    secure: isProduction(),
    sameSite: isProduction() ? 'strict' : 'lax',
    maxAge: parseDurationSeconds(expiresIn) * 1000, // maxAge is in ms
    path: '/api/auth',
  };
}

/**
 * Get cookie options for clearing refresh token
 * @returns {Object} Cookie options for clearing
 */
export function getClearCookieOptions() {
  return {
    httpOnly: true,
    secure: isProduction(),
    sameSite: isProduction() ? 'strict' : 'lax',
    path: '/api/auth',
  };
}

/**
 * Cookie name for admin refresh token
 */
export const REFRESH_TOKEN_COOKIE = 'refreshToken';

/**
 * Cookie name for client portal refresh token
 */
export const CLIENT_REFRESH_TOKEN_COOKIE = 'clientRefreshToken';

/**
 * Get cookie options for client auth (different path)
 * @param {string} expiresIn - JWT expiration string
 * @returns {Object} Cookie options
 */
export function getClientRefreshTokenCookieOptions(expiresIn = '7d') {
  return {
    httpOnly: true,
    secure: isProduction(),
    sameSite: isProduction() ? 'strict' : 'lax',
    maxAge: parseDurationSeconds(expiresIn) * 1000,
    path: '/api/auth/client',
  };
}

/**
 * Get cookie options for clearing client refresh token
 * @returns {Object} Cookie options
 */
export function getClientClearCookieOptions() {
  return {
    httpOnly: true,
    secure: isProduction(),
    sameSite: isProduction() ? 'strict' : 'lax',
    path: '/api/auth/client',
  };
}
