import { useState } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { ClientSidebar } from '../components/ClientSidebar';
import { BillingDisclaimer } from '../components/BillingDisclaimer';
import { useClientAuth } from '../contexts/ClientAuthContext';
import { useTheme } from '../../../hooks/useTheme';

/**
 * Client Portal layout with sidebar, disclaimer, and content area
 * Requires client authentication - redirects to login if not authenticated
 */
export function ClientLayout() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const { isAuthenticated, isLoading } = useClientAuth();

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 size={48} className="animate-spin text-primary" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/portal/login" replace />;
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <ClientSidebar
        isMobileOpen={isMobileMenuOpen}
        setIsMobileOpen={setIsMobileMenuOpen}
        theme={theme}
        onToggleTheme={toggleTheme}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Persistent disclaimer banner */}
        <BillingDisclaimer />

        {/* Main content area */}
        <main className="flex-1 overflow-auto">
          <Outlet context={{ toggleMobileMenu: () => setIsMobileMenuOpen(!isMobileMenuOpen) }} />
        </main>
      </div>
    </div>
  );
}
