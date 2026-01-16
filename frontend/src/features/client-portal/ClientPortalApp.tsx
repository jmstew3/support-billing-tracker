import { QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from 'react-router-dom';
import { ClientAuthProvider } from './contexts/ClientAuthContext';
import { clientPortalRouter } from './clientPortalRouter';
import { queryClient } from '../../lib/queryClient';

/**
 * Client Portal Application
 * Separate app with its own auth context and router for client users
 */
export function ClientPortalApp() {
  return (
    <QueryClientProvider client={queryClient}>
      <ClientAuthProvider>
        <RouterProvider router={clientPortalRouter} />
      </ClientAuthProvider>
    </QueryClientProvider>
  );
}

export default ClientPortalApp;
