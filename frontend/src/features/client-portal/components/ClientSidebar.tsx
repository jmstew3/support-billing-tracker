import { useState, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, Ticket, Globe, FolderKanban, ChevronLeft, ChevronRight, LogOut } from 'lucide-react';
import { ThemeToggle } from '../../../components/ui/ThemeToggle';
import { useClientAuth } from '../contexts/ClientAuthContext';
import { clientRouteToView, clientViewToRoute, getLoginRoute, type ClientView } from '../utils/clientRoutes';
import type { ClientActivitySummary } from '../services/clientApi';
import peakOneLogo from '../../../assets/PeakOne Logo_onwhite_withtext.svg';

interface ClientSidebarProps {
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  activitySummary?: ClientActivitySummary;
  'aria-hidden'?: boolean;
}

export function ClientSidebar({ theme, onToggleTheme, activitySummary, 'aria-hidden': ariaHidden }: ClientSidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { logout, user } = useClientAuth();

  // Determine current view from route
  const currentView = clientRouteToView[location.pathname] || 'dashboard';

  // Build menu items based on activity data - hide empty sections
  const menuItems = useMemo(() => {
    const items: Array<{ id: ClientView; label: string; icon: typeof LayoutDashboard }> = [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { id: 'tickets', label: 'Tickets', icon: Ticket },
    ];

    // Only show Sites if client has websites
    if (!activitySummary || activitySummary.websites.total > 0) {
      items.push({ id: 'sites', label: 'Sites', icon: Globe });
    }

    // Only show Projects if client has projects
    if (!activitySummary || activitySummary.projects.total > 0) {
      items.push({ id: 'projects', label: 'Projects', icon: FolderKanban });
    }

    return items;
  }, [activitySummary]);

  const handleNavigation = (view: ClientView) => {
    const route = clientViewToRoute[view];
    navigate(route);
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate(getLoginRoute());
    } catch {
      // Logout failed - still navigate to login
      navigate(getLoginRoute());
    }
  };

  return (
    <div
      className={`
        hidden sm:flex sm:flex-col
        h-screen bg-background border-r border-border/50
        transition-all duration-300 ease-in-out
        ${isCollapsed ? 'w-16' : 'w-60'}
      `}
      aria-hidden={ariaHidden}
    >
      {/* Header */}
      <div className="h-14 flex items-center justify-between px-3 border-b border-border/50">
        {!isCollapsed && (
          <div className="flex items-center gap-2 min-w-0 flex-1 mr-2">
            {user?.clientLogoUrl ? (
              <img
                src={user.clientLogoUrl}
                alt={user.clientName}
                className="h-6 w-auto max-w-[120px] object-contain"
              />
            ) : (
              <span className="text-sm font-semibold text-foreground truncate">
                {user?.clientName || 'Client Portal'}
              </span>
            )}
          </div>
        )}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1.5 rounded-md hover:bg-background/80 text-muted-foreground hover:text-foreground transition-all duration-150 hover:scale-105 flex-shrink-0"
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
              <ThemeToggle theme={theme} onToggle={() => {}} className="w-5 h-5" />
              <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
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
              className="w-full flex items-center gap-3 px-3 py-3 rounded-md text-sm font-medium text-red-700 dark:text-red-400 hover:bg-red-500/10 transition-all duration-200 min-h-[44px]"
            >
              <LogOut size={18} className="flex-shrink-0" />
              <span>Log Out</span>
            </button>
          )}
        </div>

        {/* Powered by PeakOne */}
        {!isCollapsed && (
          <div className="px-4 pb-3 border-t border-border/50 pt-2">
            <p className="text-xs text-muted-foreground mb-2">Powered by</p>
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
  );
}
