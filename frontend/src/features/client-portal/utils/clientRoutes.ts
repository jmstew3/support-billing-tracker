/**
 * Route mappings for client portal navigation
 */

export type ClientView = 'dashboard' | 'tickets' | 'sites' | 'projects';

// Map routes to view names
export const clientRouteToView: Record<string, ClientView> = {
  '/portal': 'dashboard',
  '/portal/dashboard': 'dashboard',
  '/portal/tickets': 'tickets',
  '/portal/sites': 'sites',
  '/portal/projects': 'projects',
};

// Map view names to routes
export const clientViewToRoute: Record<ClientView, string> = {
  dashboard: '/portal',
  tickets: '/portal/tickets',
  sites: '/portal/sites',
  projects: '/portal/projects',
};
