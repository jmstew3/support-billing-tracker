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
 * URL Structure:
 * - /portal/login -> Login page
 * - /portal -> Dashboard (requires auth)
 * - /portal/dashboard -> Dashboard alias (requires auth)
 * - /portal/tickets -> Tickets list (requires auth)
 * - /portal/tickets/:ticketId -> Ticket detail (requires auth)
 * - /portal/sites -> Sites list (requires auth)
 * - /portal/projects -> Projects list (requires auth)
 */

// Get base path from environment (for deployment at /billing-overview)
const basePath = import.meta.env.VITE_BASE_PATH || '/';

export const clientPortalRouter = createBrowserRouter(
  [
    // Login page - no auth required
    {
      path: '/portal/login',
      element: <ClientLogin />,
    },
    // Protected routes with layout
    {
      path: '/portal',
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
      path: '/portal/*',
      element: <Navigate to="/portal" replace />,
    },
  ],
  {
    basename: basePath,
  }
);
