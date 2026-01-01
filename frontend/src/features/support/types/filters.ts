/**
 * Filter System Type Definitions
 *
 * Types for the modern Popover Filter Panel UI including:
 * - Date range filtering (from/to)
 * - Filter counts for all options
 * - Quick filter presets
 */

import type { ReactNode } from 'react';

/**
 * Date range filter state
 * Both from and to are optional - partial ranges are allowed
 */
export interface DateRangeFilter {
  from: string | null;  // YYYY-MM-DD format
  to: string | null;    // YYYY-MM-DD format
}

/**
 * Filter counts for each filter option
 * Used to display counts next to checkbox options
 */
export interface FilterCounts {
  source: Record<string, number>;    // { sms: 5, ticket: 3, fluent: 2, ... }
  urgency: Record<string, number>;   // { HIGH: 10, MEDIUM: 5, LOW: 2, PROMOTION: 1 }
  category: Record<string, number>;  // { Support: 15, Hosting: 8, ... }
  day: Record<string, number>;       // { Mon: 5, Tue: 3, ... }
}

/**
 * Quick filter preset definition
 * Allows one-click application of common filter combinations
 */
export interface FilterPreset {
  id: string;
  label: string;
  description?: string;
  icon?: ReactNode;
  filters: Partial<{
    categoryFilter: string[];
    urgencyFilter: string[];
    sourceFilter: string[];
    dateRange: DateRangeFilter;
    dayFilter: string[];
    hideNonBillable?: boolean;
  }>;
}

/**
 * Props for the main FilterPanel component
 */
export interface FilterPanelProps {
  // Current filter values
  categoryFilter: string[];
  urgencyFilter: string[];
  sourceFilter: string[];
  dateRange: DateRangeFilter;
  dayFilter: string[];

  // Filter options (available values)
  categoryOptions: string[];
  urgencyOptions: string[];

  // Filter counts for displaying (xx) next to options
  filterCounts: FilterCounts;

  // Active filter count for badge
  activeFilterCount: number;

  // Handlers
  onCategoryFilterChange: (categories: string[]) => void;
  onUrgencyFilterChange: (urgencies: string[]) => void;
  onSourceFilterChange: (sources: string[]) => void;
  onDateRangeChange: (range: DateRangeFilter) => void;
  onDayFilterChange: (days: string[]) => void;
  onApplyPreset: (preset: FilterPreset) => void;
  onResetFilters: () => void;

  // Optional: Format display for urgency
  formatUrgencyDisplay?: (urgency: string) => string;
}

/**
 * Props for CheckboxFilterGroup component
 */
export interface CheckboxFilterGroupProps {
  label: string;
  options: string[];
  selectedValues: string[];
  counts?: Record<string, number>;
  onChange: (values: string[]) => void;
  formatDisplayValue?: (value: string) => string;
  columns?: 1 | 2;
}

/**
 * Props for DateRangePicker component
 */
export interface DateRangePickerProps {
  value: DateRangeFilter;
  onChange: (range: DateRangeFilter) => void;
  availableDates?: string[];
  minDate?: Date;
  maxDate?: Date;
}

/**
 * Props for FilterSection component (collapsible section)
 */
export interface FilterSectionProps {
  title: string;
  children: ReactNode;
  defaultExpanded?: boolean;
  badge?: number;
}

/**
 * Source options for the source filter
 */
export const SOURCE_OPTIONS = ['sms', 'ticket', 'email', 'phone', 'fluent'] as const;
export type SourceType = typeof SOURCE_OPTIONS[number];

/**
 * Day of week options
 */
export const DAY_OPTIONS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;
export type DayOfWeek = typeof DAY_OPTIONS[number];

/**
 * Display names for sources
 */
export const SOURCE_DISPLAY_NAMES: Record<SourceType, string> = {
  sms: 'Text',
  ticket: 'Twenty CRM',
  email: 'Email',
  phone: 'Phone',
  fluent: 'FluentSupport',
};
