import express from 'express';

const router = express.Router();

/**
 * Logout endpoint for HTTP BasicAuth
 *
 * This endpoint MUST be accessible without authentication (no BasicAuth middleware)
 * to allow the logout process to work.
 *
 * How it works:
 * 1. Frontend sends XMLHttpRequest/fetch to this endpoint with invalid credentials
 * 2. Server responds with 401 Unauthorized and WWW-Authenticate header
 * 3. Browser receives 401 and clears cached BasicAuth credentials
 * 4. Frontend redirects to app, triggering fresh authentication prompt
 *
 * Note: This endpoint intentionally returns 401 regardless of credentials sent.
 * This is necessary to force browsers to clear their credential cache.
 */
router.get('/logout', (req, res) => {
  // Set WWW-Authenticate header with same realm as BasicAuth middleware
  // This tells the browser which credential cache to clear
  res.setHeader('WWW-Authenticate', 'Basic realm="Billing Dashboard"');

  // Return 401 Unauthorized to force browser to clear cached credentials
  // This is the key to making logout work with HTTP BasicAuth
  res.status(401).json({
    message: 'Logged out successfully. Please authenticate again.',
    success: true
  });
});

export default router;
