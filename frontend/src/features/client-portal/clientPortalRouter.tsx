import { createBrowserRouter, Navigate } from 'react-router-dom';
import { ClientLayout } from './layouts/ClientLayout';
import { ClientLogin } from './pages/ClientLogin';
import { ClientDashboard } from './pages/ClientDashboard';
import { ClientTickets } from './pages/ClientTickets';
import { ClientTicketDetail } from './pages/ClientTicketDetail';
import { ClientSites } from './pages/ClientSites';
import { ClientProjects } from './pages/ClientProjects';

/**
 * Client Portal Router Configuration
 *
 * URL Structure depends on access method:
 *
 * Portal Subdomain (portal.peakonedigital.com):
 * - /login -> Login page
 * - / -> Dashboard (requires auth)
 * - /dashboard -> Dashboard alias
 * - /tickets -> Tickets list
 * - /tickets/:ticketId -> Ticket detail
 * - /sites -> Sites list
 * - /projects -> Projects list
 *
 * Shared Domain (billing.peakonedigital.com):
 * - /portal/login -> Login page
 * - /portal -> Dashboard (requires auth)
 * - /portal/dashboard -> Dashboard alias
 * - /portal/tickets -> Tickets list
 * - /portal/tickets/:ticketId -> Ticket detail
 * - /portal/sites -> Sites list
 * - /portal/projects -> Projects list
 */

// Detect portal subdomain
const isPortalSubdomain = typeof window !== 'undefined' && window.location.hostname === 'portal.peakonedigital.com';

// Base path for router: '/' for subdomain, VITE_BASE_PATH for shared domain
const basePath = isPortalSubdomain ? '/' : (import.meta.env.VITE_BASE_PATH || '/');

// Route prefix: '' for subdomain (routes at root), '/portal' for shared domain
const routePrefix = isPortalSubdomain ? '' : '/portal';

export const clientPortalRouter = createBrowserRouter(
  [
    // Login page - no auth required
    {
      path: `${routePrefix}/login`,
      element: <ClientLogin />,
    },
    // Protected routes with layout
    {
      path: routePrefix || '/',
      element: <ClientLayout />,
      children: [
        {
          index: true,
          element: <ClientDashboard />,
        },
        {
          path: 'dashboard',
          element: <ClientDashboard />,
        },
        {
          path: 'tickets',
          element: <ClientTickets />,
        },
        {
          path: 'tickets/:ticketId',
          element: <ClientTicketDetail />,
        },
        {
          path: 'sites',
          element: <ClientSites />,
        },
        {
          path: 'projects',
          element: <ClientProjects />,
        },
      ],
    },
    // Catch-all redirect to portal dashboard
    {
      path: `${routePrefix}/*`,
      element: <Navigate to={routePrefix || '/'} replace />,
    },
  ],
  {
    basename: basePath,
  }
);
