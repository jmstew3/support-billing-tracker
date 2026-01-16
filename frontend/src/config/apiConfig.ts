/**
 * Centralized API endpoint configuration
 * Single source of truth for all API URLs
 *
 * This file eliminates the duplicate API_BASE_URL definitions that were
 * previously scattered across utils/api.ts, projectsApi.ts, and hostingApi.ts
 */

const IS_PRODUCTION = window.location.hostname === 'billing.peakonedigital.com';

export const API_CONFIG = {
  // Base API URL for backend requests
  BASE_URL: IS_PRODUCTION
    ? 'https://billing.peakonedigital.com/api'
    : (import.meta.env.VITE_API_URL || 'http://localhost:3011/api'),

  // Health check endpoint (public, no auth required)
  HEALTH_URL: IS_PRODUCTION
    ? 'https://billing.peakonedigital.com/health'
    : 'http://localhost:3011/health',

  // Twenty CRM proxy base URL
  TWENTY_PROXY_BASE: IS_PRODUCTION
    ? 'https://billing.peakonedigital.com/api/twenty-proxy'
    : 'http://localhost:3011/api/twenty-proxy',

  // Feature flags
  USE_TWENTY_MOCK: import.meta.env.VITE_TWENTY_USE_MOCK === 'true',
} as const;

/**
 * All API endpoints in a single location
 * Makes it easy to update endpoints without searching across files
 */
export const ENDPOINTS = {
  // Support/Requests
  REQUESTS: `${API_CONFIG.BASE_URL}/requests`,
  REQUESTS_BULK: `${API_CONFIG.BASE_URL}/requests/bulk-update`,
  STATISTICS: `${API_CONFIG.BASE_URL}/statistics`,
  EXPORT_CSV: `${API_CONFIG.BASE_URL}/export-csv`,
  IMPORT_CSV: `${API_CONFIG.BASE_URL}/import-csv`,

  // Twenty CRM Sync
  TWENTY_SYNC: `${API_CONFIG.BASE_URL}/twenty/sync`,
  TWENTY_STATUS: `${API_CONFIG.BASE_URL}/twenty/status`,

  // FluentSupport Sync
  FLUENT_SYNC: `${API_CONFIG.BASE_URL}/fluent/sync`,
  FLUENT_STATUS: `${API_CONFIG.BASE_URL}/fluent/status`,

  // Twenty CRM Proxy Endpoints
  PROJECTS: `${API_CONFIG.TWENTY_PROXY_BASE}/projects`,
  WEBSITE_PROPERTIES: `${API_CONFIG.TWENTY_PROXY_BASE}/websiteProperties`,

  // Auth
  LOGIN: `${API_CONFIG.BASE_URL}/auth/login`,
  LOGOUT: `${API_CONFIG.BASE_URL}/auth/logout`,
} as const;

// Standard hosting MRR rate
export const STANDARD_MRR = 99.0;
