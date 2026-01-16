import { createBrowserRouter, Navigate } from 'react-router-dom';
import { SupportTickets } from './features/support/components/SupportTickets';
import { Projects } from './features/projects/components/Projects';
import { TurboHosting } from './features/hosting/components/TurboHosting';
import { Dashboard } from './features/dashboard/components/Dashboard';
import { Invoices } from './features/invoices';
import { Layout } from './components/Layout';

/**
 * Route configuration for the application
 *
 * URL Structure:
 * - / (root) -> Dashboard
 * - /overview -> Dashboard (alias)
 * - /support -> Support Tickets
 * - /projects -> Projects
 * - /billing -> Turbo Hosting
 * - /invoices -> Invoices
 */

// Get base path from environment (for deployment at /billing-overview)
const basePath = import.meta.env.VITE_BASE_PATH || '/';

export const router = createBrowserRouter(
  [
    {
      element: <Layout />,
      children: [
        {
          path: '/',
          element: <Dashboard />,
        },
        {
          path: '/overview',
          element: <Dashboard />,
        },
        {
          path: '/support',
          element: <SupportTickets />,
        },
        {
          path: '/projects',
          element: <Projects />,
        },
        {
          path: '/billing',
          element: <TurboHosting />,
        },
        {
          path: '/invoices',
          element: <Invoices />,
        },
        // Catch-all redirect to Dashboard
        {
          path: '*',
          element: <Navigate to="/" replace />,
        },
      ],
    },
  ],
  {
    basename: basePath,
  }
);

// Route path to view mapping (for Sidebar active state)
export const routeToView: Record<string, 'home' | 'projects' | 'overview' | 'billing' | 'invoices'> = {
  '/': 'overview',
  '/overview': 'overview',
  '/support': 'home',
  '/projects': 'projects',
  '/billing': 'billing',
  '/invoices': 'invoices',
};

// View to route mapping (for navigation)
export const viewToRoute: Record<'home' | 'projects' | 'overview' | 'billing' | 'invoices', string> = {
  overview: '/',
  home: '/support',
  projects: '/projects',
  billing: '/billing',
  invoices: '/invoices',
};
