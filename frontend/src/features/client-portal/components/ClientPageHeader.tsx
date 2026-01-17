import { useOutletContext } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { useClientAuth } from '../contexts/ClientAuthContext';

interface ClientLayoutContext {
  toggleMobileMenu: () => void;
}

export interface ClientPageHeaderProps {
  /**
   * Page title to display
   */
  title: string;

  /**
   * Optional subtitle/description
   */
  subtitle?: string;

  /**
   * Additional content to render on the right side
   */
  rightContent?: React.ReactNode;

  /**
   * Additional CSS classes
   */
  className?: string;
}

/**
 * Client Portal Page Header with Mobile Navigation Support
 *
 * Provides:
 * - Page title with optional subtitle
 * - Hamburger menu button on mobile for sidebar navigation
 * - Company branding on mobile
 * - Optional right-side content slot
 */
export function ClientPageHeader({
  title,
  subtitle,
  rightContent,
  className = '',
}: ClientPageHeaderProps) {
  const { toggleMobileMenu } = useOutletContext<ClientLayoutContext>();
  const { user } = useClientAuth();

  return (
    <div className={`sticky top-0 z-10 bg-background border-b ${className}`}>
      <div className="px-4 sm:px-6 lg:px-8 py-3 sm:py-4 flex items-center justify-between gap-3">
        {/* Left side: Company name (mobile) + Title */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {/* Company name badge - visible on mobile */}
          <div className="sm:hidden bg-primary/10 px-2 py-1 rounded flex-shrink-0">
            <span className="text-xs font-medium text-primary truncate max-w-[100px] block">
              {user?.clientName || 'Client Portal'}
            </span>
          </div>

          {/* Page Title */}
          <div className="min-w-0 flex-1">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-semibold tracking-tight truncate">
              {title}
            </h1>
            {subtitle && (
              <p className="text-sm text-muted-foreground mt-0.5 hidden sm:block truncate">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {/* Right side: Controls + Hamburger */}
        <div className="flex items-center gap-3 flex-shrink-0">
          {/* Desktop right content */}
          {rightContent && (
            <div className="hidden sm:block">
              {rightContent}
            </div>
          )}

          {/* Mobile hamburger button */}
          <button
            onClick={toggleMobileMenu}
            className="sm:hidden p-2.5 rounded-md bg-card border border-border shadow-sm hover:bg-muted transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label="Toggle navigation menu"
          >
            <Menu size={20} />
          </button>
        </div>
      </div>

      {/* Mobile subtitle - shown below header on small screens */}
      {subtitle && (
        <div className="sm:hidden px-4 pb-3 -mt-1">
          <p className="text-sm text-muted-foreground truncate">
            {subtitle}
          </p>
        </div>
      )}

      {/* Mobile right content - shown below header on small screens */}
      {rightContent && (
        <div className="sm:hidden px-4 py-2 border-t flex items-center gap-3">
          {rightContent}
        </div>
      )}
    </div>
  );
}
