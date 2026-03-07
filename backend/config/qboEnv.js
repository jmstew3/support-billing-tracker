/**
 * QBO Environment Resolver
 *
 * Runs once at import time. Reads QBO_ENVIRONMENT and copies the right
 * prefixed values (QBO_SANDBOX_* or QBO_PROD_*) into generic process.env
 * names (QBO_CLIENT_ID, etc.). Only sets a generic var if it's currently empty,
 * so explicit generic values in .env still override.
 *
 * Import this before any QBO module (first import in server.js).
 */

const env = process.env.QBO_ENVIRONMENT || 'sandbox';
const prefix = env === 'production' ? 'QBO_PROD' : 'QBO_SANDBOX';

const RESOLVED_KEYS = [
  'CLIENT_ID',
  'CLIENT_SECRET',
  'REDIRECT_URI',
  'REALM_ID',
  'TOKEN_ENCRYPTION_KEY',
];

for (const key of RESOLVED_KEYS) {
  const prefixed = process.env[`${prefix}_${key}`];
  const generic = `QBO_${key}`;
  if (prefixed && !process.env[generic]) {
    process.env[generic] = prefixed;
  }
}
