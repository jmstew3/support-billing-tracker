import { PeriodSelector } from './PeriodSelector';
import { ViewModeToggle } from './ViewModeToggle';
import type { ViewMode } from '../contexts/PeriodContext';

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
  return (
    <div className={`sticky top-0 z-10 bg-background border-b ${className}`}>
      <div className="px-8 py-4 flex items-center justify-between">
        {/* Left side: Title */}
        <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>

        {/* Right side: Controls */}
        <div className="flex items-center space-x-6">
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
  );
}
