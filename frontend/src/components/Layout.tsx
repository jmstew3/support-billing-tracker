import { useState, useCallback } from 'react';
import { Outlet, useLocation, useNavigate, Navigate } from 'react-router-dom';
import { Sidebar } from './shared/Sidebar';
import { MobileTopBar } from './shared/MobileTopBar';
import { MobileMenu, type MenuItem } from './shared/MobileMenu';
import { PeriodProvider } from '../contexts/PeriodContext';
import { useTheme } from '../hooks/useTheme';
import { useAuth } from '../contexts/AuthContext';
import { routeToView, viewToRoute, type ViewType } from '../router';
import { Loader2, Ticket, FolderKanban, BarChart3, Zap, FileText, Settings } from 'lucide-react';
import velocityLogo from '../assets/velocity-logo.png';

const MENU_ITEMS_CONFIG = [
  { id: 'overview' as const, label: 'Dashboard', icon: BarChart3 },
  { id: 'home' as const, label: 'Support', icon: Ticket },
  { id: 'projects' as const, label: 'Projects', icon: FolderKanban },
  { id: 'billing' as const, label: 'Turbo Hosting', icon: Zap },
  { id: 'invoices' as const, label: 'Invoices', icon: FileText },
  { id: 'settings' as const, label: 'Settings', icon: Settings },
];

/**
 * Main application layout with Sidebar and content area
 * Wraps all authenticated routes - redirects to /login if not authenticated
 */
export function Layout() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, isLoading, logout } = useAuth();

  const currentView = (routeToView[location.pathname] || 'overview') as ViewType;

  const toggleMobileMenu = useCallback(() => {
    setIsMobileMenuOpen(prev => !prev);
  }, []);

  const closeMobileMenu = useCallback(() => {
    setIsMobileMenuOpen(false);
  }, []);

  const handleLogout = useCallback(async () => {
    try {
      await logout();
    } catch {
      // Logout failed
    }
  }, [logout]);

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

  // Build menu items for MobileMenu
  const mobileMenuItems: MenuItem[] = MENU_ITEMS_CONFIG.map(item => ({
    id: item.id,
    label: item.label,
    icon: item.icon,
    isActive: currentView === item.id,
    onClick: () => {
      navigate(viewToRoute[item.id]);
      closeMobileMenu();
    },
  }));

  return (
    <PeriodProvider>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:font-medium"
      >
        Skip to main content
      </a>

      {/* Mobile top bar - visible < 640px */}
      <MobileTopBar
        isMenuOpen={isMobileMenuOpen}
        onToggleMenu={toggleMobileMenu}
        logo={
          <div className="bg-black px-2.5 py-1 rounded">
            <img src={velocityLogo} alt="Velocity Dashboard" className="h-5 w-auto object-contain" />
          </div>
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
        <Sidebar
          currentView={currentView}
          theme={theme}
          onToggleTheme={toggleTheme}
          aria-hidden={isMobileMenuOpen || undefined}
        />
        <main
          id="main-content"
          className="flex-1 overflow-auto pt-14 sm:pt-0"
          aria-hidden={isMobileMenuOpen || undefined}
        >
          <Outlet />
        </main>
      </div>
    </PeriodProvider>
  );
}
