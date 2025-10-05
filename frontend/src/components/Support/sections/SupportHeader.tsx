/**
 * SupportHeader Component
 *
 * Sticky header with title and controls for the Support Tickets page
 *
 * Features:
 * - Page title
 * - Date range selector with navigation arrows
 * - View mode toggle (All/Month/Day)
 * - Theme toggle
 */

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { ThemeToggle } from '../../ui/ThemeToggle'
import { DatePickerPopover } from '../../shared/DatePickerPopover'
import { ToggleGroup } from '../../ui/toggle-group'

export interface SupportHeaderProps {
  // Title
  title?: string

  // Date selection
  selectedYear: number
  selectedMonth: number | 'all'
  selectedDay: string | 'all'
  availableYears: number[]
  availableMonths: number[]
  availableDates: string[]

  // View mode
  timeViewMode: 'all' | 'month' | 'day'

  // Theme
  theme: 'light' | 'dark'

  // Navigation
  canNavigatePrevious: boolean
  canNavigateNext: boolean
  previousMonthTooltip: string
  nextMonthTooltip: string

  // Event handlers
  onYearChange: (year: number) => void
  onMonthChange: (month: number | 'all') => void
  onDayChange: (day: string | 'all') => void
  onTimeViewModeChange: (mode: 'all' | 'month' | 'day') => void
  onToggleTheme: () => void
  onPreviousMonth: () => void
  onNextMonth: () => void
}

export function SupportHeader({
  title = 'Support',
  selectedYear,
  selectedMonth,
  selectedDay,
  availableYears,
  availableMonths,
  availableDates,
  timeViewMode,
  theme,
  canNavigatePrevious,
  canNavigateNext,
  previousMonthTooltip,
  nextMonthTooltip,
  onYearChange,
  onMonthChange,
  onDayChange,
  onTimeViewModeChange,
  onToggleTheme,
  onPreviousMonth,
  onNextMonth
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
            {/* Date Range Selector */}
            <div className="flex items-center space-x-3">
              <span className="text-sm font-medium text-muted-foreground">Period:</span>

              {/* Navigation arrows and date picker */}
              <div className="flex items-center space-x-1">
                {/* Previous Month Arrow */}
                <button
                  onClick={onPreviousMonth}
                  disabled={!canNavigatePrevious}
                  className={`p-1.5 rounded hover:bg-accent hover:text-accent-foreground transition-colors ${
                    !canNavigatePrevious
                      ? 'opacity-50 cursor-not-allowed'
                      : 'cursor-pointer'
                  }`}
                  title={canNavigatePrevious ? previousMonthTooltip : 'No previous data'}
                  aria-label="Navigate to previous month"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <DatePickerPopover
                  selectedYear={selectedYear}
                  selectedMonth={selectedMonth}
                  selectedDay={selectedDay}
                  availableYears={availableYears}
                  availableMonths={availableMonths}
                  availableDates={availableDates}
                  onYearChange={onYearChange}
                  onMonthChange={onMonthChange}
                  onDayChange={onDayChange}
                />

                {/* Next Month Arrow */}
                <button
                  onClick={onNextMonth}
                  disabled={!canNavigateNext}
                  className={`p-1.5 rounded hover:bg-accent hover:text-accent-foreground transition-colors ${
                    !canNavigateNext
                      ? 'opacity-50 cursor-not-allowed'
                      : 'cursor-pointer'
                  }`}
                  title={canNavigateNext ? nextMonthTooltip : 'No future data'}
                  aria-label="Navigate to next month"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

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

            {/* Theme Toggle */}
            <ThemeToggle theme={theme} onToggle={onToggleTheme} />
          </div>
        </div>
      </div>
    </div>
  )
}
