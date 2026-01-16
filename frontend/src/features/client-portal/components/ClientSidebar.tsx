import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, Ticket, Globe, FolderKanban, ChevronLeft, ChevronRight, LogOut } from 'lucide-react';
import { ThemeToggle } from '../../../components/ui/ThemeToggle';
import { useClientAuth } from '../contexts/ClientAuthContext';
import { clientRouteToView, clientViewToRoute, type ClientView } from '../utils/clientRoutes';
import peakOneLogo from '../../../assets/PeakOne Logo_onwhite_withtext.svg';

interface ClientSidebarProps {
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}

export function ClientSidebar({ isMobileOpen, setIsMobileOpen, theme, onToggleTheme }: ClientSidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { logout, user } = useClientAuth();

  // Determine current view from route
  const currentView = clientRouteToView[location.pathname] || 'dashboard';

  // Close mobile menu when view changes
  useEffect(() => {
    setIsMobileOpen(false);
  }, [location.pathname, setIsMobileOpen]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 640) {
        setIsMobileOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [setIsMobileOpen]);

  const menuItems = [
    { id: 'dashboard' as const, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'tickets' as const, label: 'Tickets', icon: Ticket },
    { id: 'sites' as const, label: 'Sites', icon: Globe },
    { id: 'projects' as const, label: 'Projects', icon: FolderKanban },
  ];

  const handleNavigation = (view: ClientView) => {
    const route = clientViewToRoute[view];
    navigate(route);
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/portal/login');
    } catch {
      // Logout failed - still navigate to login
      navigate('/portal/login');
    }
  };

  return (
    <>
      {/* Mobile overlay */}
      {isMobileOpen && (
        <div
          className="sm:hidden fixed inset-0 bg-black/50 z-30"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`
          h-screen bg-background border-r border-border/50 flex flex-col
          transition-all duration-300 ease-in-out
          ${isCollapsed ? 'w-16' : 'w-60'}
          sm:relative fixed z-40
          ${isMobileOpen ? 'translate-x-0' : '-translate-x-full sm:translate-x-0'}
        `}
      >
        {/* Header */}
        <div className="h-14 flex items-center justify-between px-3 border-b border-border/50">
          {!isCollapsed && (
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-foreground">Client Portal</span>
            </div>
          )}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden sm:block p-1.5 rounded-md hover:bg-background/80 text-muted-foreground hover:text-foreground transition-all duration-150 hover:scale-105"
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>

        {/* User info */}
        {!isCollapsed && user && (
          <div className="px-4 py-3 border-b border-border/50">
            <p className="text-sm font-medium text-foreground truncate">{user.clientName}</p>
            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
          </div>
        )}

        {/* Navigation menu */}
        <nav className="flex-1 py-3">
          <ul className="space-y-0.5 px-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;

              return (
                <li key={item.id}>
                  <button
                    onClick={() => handleNavigation(item.id)}
                    className={`
                      relative w-full flex items-center gap-3 px-3 py-3 rounded-md min-h-[44px]
                      text-sm font-medium transition-all duration-200
                      ${
                        isActive
                          ? 'bg-primary/10 text-primary'
                          : 'text-muted-foreground hover:bg-background/60 hover:text-foreground'
                      }
                      ${isCollapsed ? 'justify-center' : ''}
                      group
                    `}
                    title={isCollapsed ? item.label : undefined}
                  >
                    {isActive && !isCollapsed && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-primary rounded-r-full" />
                    )}
                    <Icon
                      size={18}
                      className={`flex-shrink-0 transition-transform duration-200 ${
                        isActive ? '' : 'group-hover:scale-110'
                      }`}
                    />
                    {!isCollapsed && <span className="truncate">{item.label}</span>}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Footer - Theme Toggle, Logout & Powered by PeakOne */}
        <div className="border-t border-border/50 bg-background/30">
          {/* Theme Toggle */}
          <div className="py-2 px-2">
            {isCollapsed ? (
              <button
                onClick={onToggleTheme}
                className="w-full p-2 rounded-md text-muted-foreground hover:bg-muted/10 hover:text-foreground transition-all duration-150 hover:scale-105 flex items-center justify-center min-h-[44px] group"
                title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                aria-label={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              >
                <ThemeToggle theme={theme} onToggle={() => {}} className="w-5 h-5" />
              </button>
            ) : (
              <button
                onClick={onToggleTheme}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-md text-sm font-medium text-muted-foreground hover:bg-muted/10 hover:text-foreground transition-all duration-200 min-h-[44px] group"
                aria-label={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              >
                <span className="text-xs">Theme:</span>
                <ThemeToggle theme={theme} onToggle={() => {}} className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Logout Button */}
          <div className="border-t border-border/50 py-2 px-2">
            {isCollapsed ? (
              <button
                onClick={handleLogout}
                className="w-full p-2 rounded-md hover:bg-destructive/10 text-destructive transition-all duration-150 hover:scale-105 flex items-center justify-center min-h-[44px]"
                title="Log Out"
                aria-label="Log Out"
              >
                <LogOut size={18} />
              </button>
            ) : (
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-md text-sm font-medium text-destructive hover:bg-destructive/10 transition-all duration-200 min-h-[44px]"
              >
                <LogOut size={18} className="flex-shrink-0" />
                <span>Log Out</span>
              </button>
            )}
          </div>

          {/* Powered by PeakOne */}
          {!isCollapsed && (
            <div className="px-4 pb-3 border-t border-border/50 pt-2">
              <p className="text-xs text-muted-foreground/70 mb-2">Powered by</p>
              <a
                href="https://peakonedigital.com"
                target="_blank"
                rel="noopener noreferrer"
                className="block"
              >
                <img
                  src={peakOneLogo}
                  alt="PeakOne Digital"
                  className="h-5 w-auto opacity-80 hover:opacity-100 transition-opacity dark:invert"
                />
              </a>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
