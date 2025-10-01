import { Menu } from 'lucide-react';
import { PeriodSelector } from './PeriodSelector';
import { ViewModeToggle } from './ViewModeToggle';
import type { ViewMode } from '../contexts/PeriodContext';
import velocityLogo from '../assets/velocity-logo.png';

export interface PageHeaderProps {
  /**
   * Page title to display
   */
  title: string;

  /**
   * Whether to show the period selector
   */
  showPeriodSelector?: boolean;

  /**
   * Type of period selector:
   * - 'full': Arrows + date picker (like Dashboard)
   * - 'simple': Just a dropdown (like BillingOverview/HostingBilling)
   */
  periodSelectorType?: 'full' | 'simple';

  /**
   * Label for the period selector
   */
  periodLabel?: string;

  /**
   * Whether to show the view mode toggle
   */
  showViewToggle?: boolean;

  /**
   * Which view modes to show in the toggle
   */
  viewOptions?: ViewMode[];

  /**
   * Label for the view toggle
   */
  viewLabel?: string;

  /**
   * Additional controls to render on the right side
   */
  rightControls?: React.ReactNode;

  /**
   * Mobile menu toggle function
   */
  onToggleMobileMenu?: () => void;

  /**
   * Additional CSS classes
   */
  className?: string;
}

export function PageHeader({
  title,
  showPeriodSelector = true,
  periodSelectorType = 'full',
  periodLabel = 'Period:',
  showViewToggle = false,
  viewOptions = ['all', 'month', 'day'],
  viewLabel = 'View:',
  rightControls,
  onToggleMobileMenu,
  className = '',
}: PageHeaderProps) {
  return (
    <div className={`sticky top-0 z-10 bg-background border-b ${className}`}>
      {/* Top row: Logo + Title + Hamburger */}
      <div className="px-4 sm:px-6 lg:px-8 py-3 sm:py-4 flex items-center justify-between gap-3">
        {/* Left side: Logo (mobile) + Title */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {/* Velocity Logo - only visible on mobile when menu button exists */}
          {onToggleMobileMenu && (
            <div className="sm:hidden bg-black px-2 py-1 rounded flex-shrink-0">
              <img
                src={velocityLogo}
                alt="Velocity"
                className="h-4 w-auto object-contain"
              />
            </div>
          )}
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-semibold tracking-tight truncate">{title}</h1>
        </div>

        {/* Right side: Hamburger (mobile) + Desktop Controls */}
        <div className="flex items-center gap-3 flex-shrink-0">
          {/* Mobile hamburger button - only visible on screens < 640px */}
          {onToggleMobileMenu && (
            <button
              onClick={onToggleMobileMenu}
              className="sm:hidden p-2.5 rounded-md bg-card border border-border shadow-sm hover:bg-muted transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
              aria-label="Toggle menu"
            >
              <Menu size={20} />
            </button>
          )}

          {/* Desktop Controls */}
          <div className="hidden sm:flex items-center gap-6">
            {/* Period Selector */}
            {showPeriodSelector && (
              <PeriodSelector
                type={periodSelectorType}
                label={periodLabel}
              />
            )}

            {/* View Mode Toggle */}
            {showViewToggle && (
              <ViewModeToggle
                label={viewLabel}
                availableModes={viewOptions}
                size="sm"
              />
            )}

            {/* Additional Controls */}
            {rightControls}
          </div>
        </div>
      </div>

      {/* Mobile Controls Row - below header */}
      {(showPeriodSelector || showViewToggle || rightControls) && (
        <div className="sm:hidden px-4 py-3 border-t flex items-center gap-3 overflow-x-auto">
          {/* Period Selector */}
          {showPeriodSelector && (
            <PeriodSelector
              type={periodSelectorType}
              label={periodLabel}
            />
          )}

          {/* View Mode Toggle */}
          {showViewToggle && (
            <ViewModeToggle
              label={viewLabel}
              availableModes={viewOptions}
              size="sm"
            />
          )}

          {/* Additional Controls */}
          {rightControls}
        </div>
      )}
    </div>
  );
}
