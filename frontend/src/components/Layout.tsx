import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './shared/Sidebar';
import { PeriodProvider } from '../contexts/PeriodContext';
import { useTheme } from '../hooks/useTheme';
import { routeToView } from '../router';

/**
 * Main application layout with Sidebar and content area
 * Wraps all authenticated routes
 */
export function Layout() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();

  // Determine current view based on route
  const currentView = (routeToView[location.pathname] || 'overview') as 'home' | 'projects' | 'overview' | 'billing' | 'invoices';

  return (
    <PeriodProvider>
      <div className="flex h-screen overflow-hidden">
        <Sidebar
          currentView={currentView}
          isMobileOpen={isMobileMenuOpen}
          setIsMobileOpen={setIsMobileMenuOpen}
          theme={theme}
          onToggleTheme={toggleTheme}
        />
        <main className="flex-1 overflow-auto">
          <Outlet context={{ toggleMobileMenu: () => setIsMobileMenuOpen(!isMobileMenuOpen) }} />
        </main>
      </div>
    </PeriodProvider>
  );
}
