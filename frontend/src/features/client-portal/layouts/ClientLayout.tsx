import { useState, useCallback, useMemo } from 'react';
import { Outlet, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Loader2, LayoutDashboard, Ticket, Globe, FolderKanban } from 'lucide-react';
import { ClientSidebar } from '../components/ClientSidebar';
import { BillingDisclaimer } from '../components/BillingDisclaimer';
import { MobileTopBar } from '../../../components/shared/MobileTopBar';
import { MobileMenu, type MenuItem } from '../../../components/shared/MobileMenu';
import { useClientAuth } from '../contexts/ClientAuthContext';
import { useClientActivity } from '../hooks/useClientData';
import { useTheme } from '../../../hooks/useTheme';
import { getLoginRoute, clientRouteToView, clientViewToRoute, type ClientView } from '../utils/clientRoutes';

/**
 * Client Portal layout with sidebar, disclaimer, and content area
 * Requires client authentication - redirects to login if not authenticated
 */
export function ClientLayout() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const { isAuthenticated, isLoading, logout, user } = useClientAuth();
  const { data: activity } = useClientActivity();
  const location = useLocation();
  const navigate = useNavigate();

  const currentView = clientRouteToView[location.pathname] || 'dashboard';

  const toggleMobileMenu = useCallback(() => {
    setIsMobileMenuOpen(prev => !prev);
  }, []);

  const closeMobileMenu = useCallback(() => {
    setIsMobileMenuOpen(false);
  }, []);

  const handleLogout = useCallback(async () => {
    try {
      await logout();
      navigate(getLoginRoute());
    } catch {
      navigate(getLoginRoute());
    }
  }, [logout, navigate]);

  // Build menu items based on activity data
  const mobileMenuItems: MenuItem[] = useMemo(() => {
    const allItems: Array<{ id: ClientView; label: string; icon: typeof LayoutDashboard; show: boolean }> = [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, show: true },
      { id: 'tickets', label: 'Tickets', icon: Ticket, show: true },
      { id: 'sites', label: 'Sites', icon: Globe, show: !activity || activity.websites.total > 0 },
      { id: 'projects', label: 'Projects', icon: FolderKanban, show: !activity || activity.projects.total > 0 },
    ];

    return allItems
      .filter(item => item.show)
      .map(item => ({
        id: item.id,
        label: item.label,
        icon: item.icon,
        isActive: currentView === item.id,
        onClick: () => {
          navigate(clientViewToRoute[item.id]);
          closeMobileMenu();
        },
      }));
  }, [activity, currentView, navigate, closeMobileMenu]);

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
    return <Navigate to={getLoginRoute()} replace />;
  }

  return (
    <>
      {/* Mobile top bar */}
      <MobileTopBar
        isMenuOpen={isMobileMenuOpen}
        onToggleMenu={toggleMobileMenu}
        logo={
          user?.clientLogoUrl ? (
            <img src={user.clientLogoUrl} alt={user.clientName} className="h-6 w-auto max-w-[140px] object-contain" />
          ) : (
            <span className="text-sm font-semibold text-foreground truncate">
              {user?.clientName || 'Client Portal'}
            </span>
          )
        }
      />

      {/* Full-screen mobile menu */}
      <MobileMenu
        isOpen={isMobileMenuOpen}
        onClose={closeMobileMenu}
        menuItems={mobileMenuItems}
        theme={theme}
        onToggleTheme={toggleTheme}
        onLogout={handleLogout}
      />

      <div className="flex h-screen overflow-hidden">
        <ClientSidebar
          theme={theme}
          onToggleTheme={toggleTheme}
          activitySummary={activity}
          aria-hidden={isMobileMenuOpen || undefined}
        />
        <div
          className="flex-1 flex flex-col overflow-hidden pt-14 sm:pt-0"
          aria-hidden={isMobileMenuOpen || undefined}
        >
          {/* Persistent disclaimer banner */}
          <BillingDisclaimer />

          {/* Main content area */}
          <main className="flex-1 overflow-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </>
  );
}
