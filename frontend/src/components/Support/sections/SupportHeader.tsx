/**
 * SupportHeader Component
 *
 * Sticky header with title and controls for the Support Tickets page
 *
 * Features:
 * - Page title
 * - Period selector with navigation arrows (from PeriodContext)
 * - View mode toggle (All/Month/Day)
 */

import { PeriodSelector } from '../../shared/PeriodSelector'
import { ToggleGroup } from '../../ui/toggle-group'

export interface SupportHeaderProps {
  // Title
  title?: string

  // View mode
  timeViewMode: 'all' | 'month' | 'day'

  // Event handlers
  onTimeViewModeChange: (mode: 'all' | 'month' | 'day') => void
}

export function SupportHeader({
  title = 'Support',
  timeViewMode,
  onTimeViewModeChange
}: SupportHeaderProps) {
  return (
    <div className="flex-shrink-0 bg-background border-b border-border">
      <div className="px-6 py-3">
        <div className="flex items-start justify-between">
          {/* Left side - Title */}
          <div className="flex items-center space-x-3">
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">
              {title}
            </h1>
          </div>

          {/* Right side - Controls */}
          <div className="flex items-center space-x-6">
            {/* Period Selector - uses PeriodContext */}
            <PeriodSelector type="full" label="Period:" />

            {/* View Mode Toggle */}
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-muted-foreground">View:</span>
              <ToggleGroup
                options={[
                  { value: 'all', label: 'All' },
                  { value: 'month', label: 'Month' },
                  { value: 'day', label: 'Day' }
                ]}
                value={timeViewMode}
                onValueChange={(value) => onTimeViewModeChange(value as 'all' | 'month' | 'day')}
                size="sm"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
