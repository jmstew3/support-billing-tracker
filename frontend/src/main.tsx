import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ClientPortalApp } from './features/client-portal/ClientPortalApp'

/**
 * Determine if we should render the client portal or main app
 * - Client portal: portal.peakonedigital.com OR /portal/* paths
 * - Main app: everything else
 */
function isClientPortal(): boolean {
  const hostname = window.location.hostname;
  const pathname = window.location.pathname;

  // Check subdomain
  if (hostname === 'portal.peakonedigital.com') {
    return true;
  }

  // Check path (for development and shared domain deployment)
  // Account for basePath in production
  const basePath = import.meta.env.VITE_BASE_PATH || '';
  const effectivePath = basePath ? pathname.replace(basePath, '') : pathname;

  return effectivePath.startsWith('/portal');
}

const RootApp = isClientPortal() ? ClientPortalApp : App;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RootApp />
  </StrictMode>,
)
