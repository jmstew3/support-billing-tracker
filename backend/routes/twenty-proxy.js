import express from 'express';

const router = express.Router();

// Twenty CRM API configuration from environment
const TWENTY_API_TOKEN = process.env.VITE_TWENTY_API_TOKEN || '';
const TWENTY_BASE_URL = 'https://twenny.peakonedigital.com/rest';

// SECURITY: Whitelist of allowed query parameters to prevent parameter pollution attacks
const ALLOWED_QUERY_PARAMS = new Set([
  'filter', 'orderBy', 'limit', 'offset', 'depth',
  'starting_after', 'ending_before', 'first', 'last'
]);

/**
 * Sanitize query parameters - only allow whitelisted params
 * @param {Object} query - Express req.query object
 * @returns {string} Sanitized query string
 */
function sanitizeQueryParams(query) {
  const sanitized = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (ALLOWED_QUERY_PARAMS.has(key) && typeof value === 'string') {
      // Additional validation: prevent injection in values
      const sanitizedValue = value.replace(/[<>\"'`;]/g, '');
      sanitized.append(key, sanitizedValue);
    }
  }
  return sanitized.toString();
}

/**
 * Proxy endpoint for Twenty CRM Projects API
 * GET /api/twenty-proxy/projects
 */
router.get('/projects', async (req, res) => {
  try {
    // SECURITY: Only forward whitelisted query parameters
    const queryParams = sanitizeQueryParams(req.query);
    const url = `${TWENTY_BASE_URL}/projects${queryParams ? `?${queryParams}` : ''}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${TWENTY_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Twenty API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Twenty Projects API proxy error:', error);
    res.status(500).json({
      error: 'Failed to fetch projects from Twenty CRM',
      message: error.message
    });
  }
});

/**
 * Proxy endpoint for Twenty CRM Website Properties API
 * GET /api/twenty-proxy/websiteProperties
 */
router.get('/websiteProperties', async (req, res) => {
  try {
    // SECURITY: Only forward whitelisted query parameters
    const queryParams = sanitizeQueryParams(req.query);
    const url = `${TWENTY_BASE_URL}/websiteProperties${queryParams ? `?${queryParams}` : ''}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${TWENTY_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Twenty API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Twenty Website Properties API proxy error:', error);
    res.status(500).json({
      error: 'Failed to fetch website properties from Twenty CRM',
      message: error.message
    });
  }
});

export default router;
