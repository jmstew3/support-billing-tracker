import { useRef } from 'react';
import { createPortal } from 'react-dom';
import type { LucideIcon } from 'lucide-react';
import { HamburgerButton } from './HamburgerButton';
import { useOverlay } from '../../hooks/useOverlay';
import peakOneLogo from '../../assets/PeakOne Logo_onwhite_withtext.svg';
import { ThemeToggle } from '../ui/ThemeToggle';
import { LogOut } from 'lucide-react';

export interface MenuItem {
  id: string;
  label: string;
  icon: LucideIcon;
  isActive: boolean;
  onClick: () => void;
}

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  menuItems: MenuItem[];
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  onLogout: () => void;
  footer?: React.ReactNode;
}

export function MobileMenu({
  isOpen,
  onClose,
  menuItems,
  theme,
  onToggleTheme,
  onLogout,
  footer,
}: MobileMenuProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useOverlay(isOpen, onClose, containerRef);

  if (!isOpen) return null;

  const portalRoot = document.getElementById('portal-root');
  if (!portalRoot) return null;

  return createPortal(
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 bg-background flex flex-col animate-menu-fade-in"
      style={{ height: '100dvh' }}
      role="dialog"
      aria-modal="true"
      aria-label="Navigation menu"
    >
      {/* Close button top-right */}
      <div className="flex justify-end px-2 pt-[env(safe-area-inset-top)]">
        <div className="h-14 flex items-center">
          <HamburgerButton isOpen={true} onClick={onClose} />
        </div>
      </div>

      {/* Nav items centered */}
      <nav className="flex-1 flex flex-col items-center justify-center gap-2 px-6">
        {menuItems.map((item, index) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={item.onClick}
              className={`
                w-full max-w-xs flex items-center gap-4 px-6 py-4 text-2xl font-semibold
                transition-colors duration-200 animate-menu-item-in
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary
                ${
                  item.isActive
                    ? 'text-foreground border-l-2 border-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }
              `}
              style={{ animationDelay: `${index * 75}ms` }}
            >
              <Icon size={24} className="flex-shrink-0" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Footer: theme toggle + logout + branding */}
      <div className="px-6 pb-6 space-y-4" style={{ paddingBottom: `max(1.5rem, env(safe-area-inset-bottom))` }}>
        {footer}
        <div className="flex items-center justify-center gap-6">
          <button
            onClick={onToggleTheme}
            className="flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            <ThemeToggle theme={theme} onToggle={() => {}} className="w-5 h-5" />
            <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
          </button>
          <button
            onClick={onLogout}
            className="flex items-center gap-2 px-4 py-2 text-sm text-red-700 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 transition-colors min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <LogOut size={18} />
            <span>Log Out</span>
          </button>
        </div>
        <div className="flex items-center justify-center gap-2">
          <span className="text-xs text-muted-foreground">Powered by</span>
          <a
            href="https://peakonedigital.com"
            target="_blank"
            rel="noopener noreferrer"
          >
            <img
              src={peakOneLogo}
              alt="PeakOne Digital"
              className="h-4 w-auto opacity-60 hover:opacity-100 transition-opacity dark:invert"
            />
          </a>
        </div>
      </div>
    </div>,
    portalRoot,
  );
}
