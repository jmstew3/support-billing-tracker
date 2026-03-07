import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Ticket, FolderKanban, BarChart3, Zap, ChevronLeft, ChevronRight, LogOut, FileText, Settings } from 'lucide-react';
import { ThemeToggle } from '../ui/ThemeToggle';
import { useAuth } from '../../contexts/AuthContext';
import { viewToRoute, type ViewType } from '../../router';
import velocityLogo from '../../assets/velocity-logo.png';
import peakOneLogo from '../../assets/PeakOne Logo_onwhite_withtext.svg';

interface SidebarProps {
  currentView?: ViewType;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  'aria-hidden'?: boolean;
}

export function Sidebar({ currentView = 'home', theme, onToggleTheme, 'aria-hidden': ariaHidden }: SidebarProps) {
  const navigate = useNavigate();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { logout } = useAuth();

  const menuItems = [
    { id: 'overview' as const, label: 'Dashboard', icon: BarChart3 },
    { id: 'home' as const, label: 'Support', icon: Ticket },
    { id: 'projects' as const, label: 'Projects', icon: FolderKanban },
    { id: 'billing' as const, label: 'Turbo Hosting', icon: Zap },
    { id: 'invoices' as const, label: 'Invoices', icon: FileText },
    { id: 'settings' as const, label: 'Settings', icon: Settings },
  ];

  const handleNavigation = (view: ViewType) => {
    const route = viewToRoute[view];
    navigate(route);
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch {
      // Logout failed
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
          <div className="bg-black px-2.5 py-1 rounded">
            <img
              src={velocityLogo}
              alt="Velocity Dashboard"
              className="h-5 w-auto object-contain"
            />
          </div>
        )}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1.5 rounded-md hover:bg-background/80 text-muted-foreground hover:text-foreground transition-all duration-150 hover:scale-105"
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      {/* Navigation menu */}
      <nav className="flex-1 py-3" aria-label="Main navigation">
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
                    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary
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
              className="w-full p-2 rounded-md text-muted-foreground hover:bg-muted/10 hover:text-foreground transition-all duration-150 hover:scale-105 flex items-center justify-center min-h-[44px] group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              aria-label={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              <ThemeToggle theme={theme} onToggle={() => {}} className="w-5 h-5" />
            </button>
          ) : (
            <button
              onClick={onToggleTheme}
              className="w-full flex items-center gap-3 px-3 py-3 rounded-md text-sm font-medium text-muted-foreground hover:bg-muted/10 hover:text-foreground transition-all duration-200 min-h-[44px] group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
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
              className="w-full p-2 rounded-md hover:bg-destructive/10 text-destructive transition-all duration-150 hover:scale-105 flex items-center justify-center min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              title="Log Out"
              aria-label="Log Out"
            >
              <LogOut size={18} />
            </button>
          ) : (
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-3 rounded-md text-sm font-medium text-red-700 dark:text-red-400 hover:bg-red-500/10 transition-all duration-200 min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
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
