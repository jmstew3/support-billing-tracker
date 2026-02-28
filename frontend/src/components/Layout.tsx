import { useState } from 'react';
import { Outlet, useLocation, Navigate } from 'react-router-dom';
import { Sidebar } from './shared/Sidebar';
import { PeriodProvider } from '../contexts/PeriodContext';
import { useTheme } from '../hooks/useTheme';
import { useAuth } from '../contexts/AuthContext';
import { routeToView } from '../router';
import { Loader2 } from 'lucide-react';

/**
 * Main application layout with Sidebar and content area
 * Wraps all authenticated routes - redirects to /login if not authenticated
 */
export function Layout() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const { isAuthenticated, isLoading } = useAuth();

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
    return <Navigate to="/login" replace />;
  }

  // Determine current view based on route
  const currentView = (routeToView[location.pathname] || 'overview') as 'home' | 'projects' | 'overview' | 'billing' | 'invoices';

  return (
    <PeriodProvider>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:font-medium"
      >
        Skip to main content
      </a>
      <div className="flex h-screen overflow-hidden">
        <Sidebar
          currentView={currentView}
          isMobileOpen={isMobileMenuOpen}
          setIsMobileOpen={setIsMobileMenuOpen}
          theme={theme}
          onToggleTheme={toggleTheme}
        />
        <main id="main-content" className="flex-1 overflow-auto">
          <Outlet context={{ toggleMobileMenu: () => setIsMobileMenuOpen(!isMobileMenuOpen) }} />
        </main>
      </div>
    </PeriodProvider>
  );
}
