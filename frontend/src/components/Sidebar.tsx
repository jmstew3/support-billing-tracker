import { useState } from 'react';
import { Home, FolderKanban, DollarSign, BarChart3, Server, ChevronLeft, ChevronRight } from 'lucide-react';

interface SidebarProps {
  currentView?: 'home' | 'projects' | 'overview' | 'billing';
  onNavigate?: (view: 'home' | 'projects' | 'overview' | 'billing') => void;
}

export function Sidebar({ currentView = 'home', onNavigate }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const menuItems = [
    { id: 'overview' as const, label: 'Dashboard', icon: BarChart3 },
    { id: 'home' as const, label: 'Support', icon: Home },
    { id: 'projects' as const, label: 'Projects', icon: FolderKanban },
    { id: 'billing' as const, label: 'Hosting & Billing', icon: Server },
  ];

  const handleNavigation = (view: 'home' | 'projects' | 'overview' | 'billing') => {
    if (onNavigate) {
      onNavigate(view);
    }
  };

  return (
    <div
      className={`
        h-screen bg-muted/30 border-r border-border/50 flex flex-col
        transition-all duration-300 ease-in-out
        ${isCollapsed ? 'w-16' : 'w-60'}
      `}
    >
      {/* Header */}
      <div className="h-14 flex items-center justify-between px-3 border-b border-border/50">
        {!isCollapsed && (
          <h1 className="text-base font-semibold text-foreground tracking-tight">Dashboard</h1>
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
                    relative w-full flex items-center gap-3 px-3 py-2 rounded-md
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

      {/* Footer - Optional user section or collapse hint */}
      <div className="h-12 border-t border-border/50 flex items-center justify-center bg-background/30">
        {!isCollapsed && (
          <p className="text-xs text-muted-foreground/70 px-4 font-mono">v1.0.0</p>
        )}
      </div>
    </div>
  );
}