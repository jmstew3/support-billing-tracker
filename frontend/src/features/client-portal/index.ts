/**
 * Client Portal Feature Module
 * Exports all client portal components, hooks, and services
 */

// App entry point
export { ClientPortalApp } from './ClientPortalApp';

// Router
export { clientPortalRouter } from './clientPortalRouter';

// Context
export { ClientAuthProvider, useClientAuth } from './contexts/ClientAuthContext';

// Layouts
export { ClientLayout } from './layouts/ClientLayout';

// Components
export { BillingDisclaimer } from './components/BillingDisclaimer';
export { ClientSidebar } from './components/ClientSidebar';

// Pages
export { ClientLogin } from './pages/ClientLogin';
export { ClientDashboard } from './pages/ClientDashboard';
export { ClientTickets } from './pages/ClientTickets';
export { ClientTicketDetail as ClientTicketDetailPage } from './pages/ClientTicketDetail';
export { ClientSites } from './pages/ClientSites';
export { ClientProjects } from './pages/ClientProjects';

// Hooks
export {
  useClientProfile,
  useClientActivity,
  useClientTickets,
  useClientTicket,
  useClientTicketMessages,
  useClientSites,
  useClientProjects,
} from './hooks/useClientData';

// Services
export {
  getClientApiUrl,
  getClientAccessToken,
  setClientTokens,
  clearClientTokens,
  clientFetch,
  clientAuthApi,
  clientDataApi,
} from './services/clientApi';

// Types re-exported from services
export type {
  ClientUser,
  ClientLoginResponse,
  ClientProfile,
  ClientTicket,
  ClientTicketDetail,
  TicketMessage,
  ClientWebsite,
  ClientProject,
  ClientActivitySummary,
  PaginatedResponse,
} from './services/clientApi';
