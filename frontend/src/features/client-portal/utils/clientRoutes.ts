/**
 * Route mappings for client portal navigation
 *
 * Routes are different based on access method:
 * - Portal subdomain (portal.peakonedigital.com): /, /dashboard, /tickets, etc.
 * - Shared domain: /portal, /portal/dashboard, /portal/tickets, etc.
 */

export type ClientView = 'dashboard' | 'tickets' | 'sites' | 'projects';

// Detect portal subdomain
const isPortalSubdomain = typeof window !== 'undefined' && window.location.hostname === 'portal.peakonedigital.com';
const routePrefix = isPortalSubdomain ? '' : '/portal';

// Map routes to view names (need to check both with and without prefix for robustness)
export const clientRouteToView: Record<string, ClientView> = {
  // Subdomain routes
  '/': 'dashboard',
  '/dashboard': 'dashboard',
  '/tickets': 'tickets',
  '/sites': 'sites',
  '/projects': 'projects',
  // Shared domain routes
  '/portal': 'dashboard',
  '/portal/dashboard': 'dashboard',
  '/portal/tickets': 'tickets',
  '/portal/sites': 'sites',
  '/portal/projects': 'projects',
};

// Map view names to routes (uses appropriate prefix based on domain)
export const clientViewToRoute: Record<ClientView, string> = {
  dashboard: routePrefix || '/',
  tickets: `${routePrefix}/tickets`,
  sites: `${routePrefix}/sites`,
  projects: `${routePrefix}/projects`,
};

// Export for use in other components
export const getLoginRoute = () => `${routePrefix}/login`;
export const getDashboardRoute = () => routePrefix || '/';
