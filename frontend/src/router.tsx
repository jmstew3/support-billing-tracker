/* eslint-disable react-refresh/only-export-components */
import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Login } from './features/auth/components/Login';

// Lazy-loaded page components for code splitting
const Dashboard = lazy(() => import('./features/dashboard/components/Dashboard').then(m => ({ default: m.Dashboard })));
const SupportTickets = lazy(() => import('./features/support/components/SupportTickets').then(m => ({ default: m.SupportTickets })));
const Projects = lazy(() => import('./features/projects/components/Projects').then(m => ({ default: m.Projects })));
const TurboHosting = lazy(() => import('./features/hosting/components/TurboHosting').then(m => ({ default: m.TurboHosting })));
const Invoices = lazy(() => import('./features/invoices').then(m => ({ default: m.Invoices })));

/**
 * Loading fallback component displayed inside the layout while lazy pages load.
 * Uses Tailwind classes for a centered spinner animation.
 */
function PageLoadingFallback() {
  return (
    <div className="flex items-center justify-center h-full min-h-[200px]">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}

/**
 * Wraps a lazy component with Suspense boundary.
 * The Suspense is placed inside the Layout so the sidebar remains visible during loading.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function withSuspense(Component: React.LazyExoticComponent<React.ComponentType<any>>) {
  return (
    <Suspense fallback={<PageLoadingFallback />}>
      <Component />
    </Suspense>
  );
}

/**
 * Route configuration for the application
 *
 * URL Structure:
 * - /login -> Login page (public)
 * - / (root) -> Dashboard (protected)
 * - /overview -> Dashboard (alias, protected)
 * - /support -> Support Tickets (protected)
 * - /projects -> Projects (protected)
 * - /billing -> Turbo Hosting (protected)
 * - /invoices -> Invoices (protected)
 */

// Get base path from environment (for deployment at /billing-overview)
const basePath = import.meta.env.VITE_BASE_PATH || '/';

export const router = createBrowserRouter(
  [
    // Public login route (outside Layout)
    {
      path: '/login',
      element: <Login />,
    },
    // Protected routes (inside Layout with auth check)
    {
      element: <Layout />,
      children: [
        {
          path: '/',
          element: withSuspense(Dashboard),
        },
        {
          path: '/overview',
          element: withSuspense(Dashboard),
        },
        {
          path: '/support',
          element: withSuspense(SupportTickets),
        },
        {
          path: '/projects',
          element: withSuspense(Projects),
        },
        {
          path: '/billing',
          element: withSuspense(TurboHosting),
        },
        {
          path: '/invoices',
          element: withSuspense(Invoices),
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
