import { PeriodSelector } from './PeriodSelector';
import { ViewModeToggle } from './ViewModeToggle';
import type { ViewMode } from '../../contexts/PeriodContext';
import { MobileControls } from './MobileControls';

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
   * - 'full': Arrows + date picker (like SupportTickets)
   * - 'simple': Just a dropdown (like Dashboard/TurboHosting)
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
  className = '',
}: PageHeaderProps) {
  const mobileControls = (showPeriodSelector || showViewToggle || rightControls);

  return (
    <header className={`sticky top-0 z-10 bg-background border-b ${className}`}>
      {/* Top row: Title + Controls */}
      <div className="px-4 sm:px-6 lg:px-8 py-3 sm:py-4 flex items-center justify-between gap-3">
        {/* Left side: Title */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-semibold tracking-tight truncate">{title}</h1>
        </div>

        {/* Right side: Controls */}
        <div className="flex items-center gap-3 flex-shrink-0">
          {/* Desktop Controls */}
          <div className="hidden sm:flex items-center gap-6">
            {showPeriodSelector && (
              <PeriodSelector
                type={periodSelectorType}
                label={periodLabel}
              />
            )}
            {showViewToggle && (
              <ViewModeToggle
                label={viewLabel}
                availableModes={viewOptions}
                size="sm"
              />
            )}
            {rightControls}
          </div>

          {/* Mobile Controls Trigger */}
          {mobileControls && (
            <div className="sm:hidden">
              <MobileControls>
                {showPeriodSelector && (
                  <div className="flex flex-col items-start gap-2">
                    <span className="text-sm font-medium text-muted-foreground">{periodLabel}</span>
                    <PeriodSelector
                      type={periodSelectorType}
                      label=""
                    />
                  </div>
                )}
                {showViewToggle && (
                  <div className="flex flex-col items-start gap-2">
                    <span className="text-sm font-medium text-muted-foreground">{viewLabel}</span>
                    <ViewModeToggle
                      label=""
                      availableModes={viewOptions}
                      size="sm"
                    />
                  </div>
                )}
                {rightControls}
              </MobileControls>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
