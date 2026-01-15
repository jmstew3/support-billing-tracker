/**
 * FilterPanel Component
 *
 * A modern Popover-based filter panel that consolidates all table filters.
 * Features:
 * - Tabs for Filters and Quick Presets
 * - Collapsible sections for each filter type
 * - Checkbox groups with counts
 * - Date range picker
 * - Active filter count badge
 */

import * as React from 'react';
import { Filter, Zap } from 'lucide-react';
import type { FilterPanelProps, FilterPreset } from '../../types/filters';
import { SOURCE_OPTIONS, SOURCE_DISPLAY_NAMES, DAY_OPTIONS, HOURS_RANGE_OPTIONS, HOURS_RANGE_DISPLAY_NAMES, type HoursRange } from '../../types/filters';
import { FilterSection } from './FilterSection';
import { CheckboxFilterGroup } from './CheckboxFilterGroup';
import { DateRangePicker } from './DateRangePicker';
import { BillingDatePicker } from './BillingDatePicker';

// Quick filter presets
const FILTER_PRESETS: FilterPreset[] = [
  {
    id: 'billable-only',
    label: 'Billable Only',
    description: 'Exclude Non-billable and Migration categories',
    filters: {
      // This will be handled by a special flag
    },
  },
  {
    id: 'high-priority',
    label: 'High Priority',
    description: 'Show only HIGH urgency requests',
    filters: { urgencyFilter: ['HIGH'] },
  },
  {
    id: 'fluent-tickets',
    label: 'FluentSupport',
    description: 'Show only FluentSupport tickets',
    filters: { sourceFilter: ['fluent'] },
  },
  {
    id: 'weekdays',
    label: 'Weekdays Only',
    description: 'Mon-Fri requests only',
    filters: { dayFilter: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] },
  },
  {
    id: 'text-messages',
    label: 'Text Messages',
    description: 'SMS/Text requests only',
    filters: { sourceFilter: ['sms'] },
  },
];

export function FilterPanel({
  categoryFilter,
  urgencyFilter,
  sourceFilter,
  dateRange,
  dayFilter,
  billingDateFilter,
  hoursFilter,
  categoryOptions,
  urgencyOptions,
  filterCounts,
  activeFilterCount,
  onCategoryFilterChange,
  onUrgencyFilterChange,
  onSourceFilterChange,
  onDateRangeChange,
  onDayFilterChange,
  onBillingDateFilterChange,
  onHoursFilterChange,
  onApplyPreset,
  onResetFilters,
  formatUrgencyDisplay,
}: FilterPanelProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<'filters' | 'presets'>('filters');
  const popoverRef = React.useRef<HTMLDivElement>(null);

  // Close on outside click
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Keyboard navigation
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const handleApplyPreset = (preset: FilterPreset) => {
    onApplyPreset(preset);
    setActiveTab('filters');
  };

  // Format source display
  const formatSourceDisplay = (source: string) => {
    return SOURCE_DISPLAY_NAMES[source as keyof typeof SOURCE_DISPLAY_NAMES] || source;
  };

  // Calculate section badges (count of active filters in each section)
  const sourceBadge = sourceFilter.length;
  const categoryBadge = categoryFilter.length;
  const urgencyBadge = urgencyFilter.length;
  const dayBadge = dayFilter.length;
  const dateBadge = dateRange.from || dateRange.to ? 1 : 0;
  const billingDateBadge = (billingDateFilter.from || billingDateFilter.to || billingDateFilter.hasValue !== 'all') ? 1 : 0;
  const hoursBadge = hoursFilter.length;

  // Format hours display
  const formatHoursDisplay = (range: string) => {
    return HOURS_RANGE_DISPLAY_NAMES[range as HoursRange] || range;
  };

  return (
    <div className="relative" ref={popoverRef} onKeyDown={handleKeyDown}>
      {/* Filter Button with Badge */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-3 py-2 text-sm rounded-md border transition-colors ${
          isOpen || activeFilterCount > 0
            ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-400'
            : 'border-border bg-background hover:bg-muted text-foreground'
        }`}
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label={`Filters${activeFilterCount > 0 ? ` (${activeFilterCount} active)` : ''}`}
      >
        <Filter className="h-4 w-4" />
        <span>Filters</span>
        {activeFilterCount > 0 && (
          <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-medium bg-blue-600 text-white rounded-full">
            {activeFilterCount}
          </span>
        )}
      </button>

      {/* Popover Panel */}
      {isOpen && (
        <div className="absolute top-full mt-2 left-0 z-50 w-[380px] bg-card rounded-lg shadow-lg border border-border">
          {/* Tab Navigation */}
          <div className="flex border-b border-border">
            <button
              type="button"
              onClick={() => setActiveTab('filters')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                activeTab === 'filters'
                  ? 'bg-muted text-foreground border-b-2 border-foreground'
                  : 'text-muted-foreground hover:bg-muted/50'
              }`}
            >
              <Filter className="h-4 w-4" />
              Filters
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('presets')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                activeTab === 'presets'
                  ? 'bg-muted text-foreground border-b-2 border-foreground'
                  : 'text-muted-foreground hover:bg-muted/50'
              }`}
            >
              <Zap className="h-4 w-4" />
              Quick Presets
            </button>
          </div>

          {/* Content Area */}
          <div className="max-h-[60vh] overflow-y-auto">
            {activeTab === 'presets' ? (
              /* Presets Tab */
              <div className="p-3 space-y-2">
                {FILTER_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleApplyPreset(preset)}
                    className="w-full flex items-start gap-3 p-3 text-left rounded-md border border-border hover:bg-muted/50 transition-colors"
                  >
                    <Zap className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-foreground">{preset.label}</p>
                      {preset.description && (
                        <p className="text-xs text-muted-foreground mt-0.5">{preset.description}</p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              /* Filters Tab */
              <div>
                {/* Source Filter */}
                <FilterSection title="Source" badge={sourceBadge}>
                  <CheckboxFilterGroup
                    options={[...SOURCE_OPTIONS]}
                    selectedValues={sourceFilter}
                    counts={filterCounts.source}
                    onChange={onSourceFilterChange}
                    formatDisplayValue={formatSourceDisplay}
                    columns={2}
                  />
                </FilterSection>

                {/* Date Range Filter */}
                <FilterSection title="Date Range" badge={dateBadge}>
                  <DateRangePicker
                    value={dateRange}
                    onChange={onDateRangeChange}
                  />
                </FilterSection>

                {/* Category Filter */}
                <FilterSection title="Category" badge={categoryBadge}>
                  <CheckboxFilterGroup
                    options={categoryOptions}
                    selectedValues={categoryFilter}
                    counts={filterCounts.category}
                    onChange={onCategoryFilterChange}
                    columns={1}
                  />
                </FilterSection>

                {/* Urgency Filter */}
                <FilterSection title="Urgency" badge={urgencyBadge}>
                  <CheckboxFilterGroup
                    options={urgencyOptions}
                    selectedValues={urgencyFilter}
                    counts={filterCounts.urgency}
                    onChange={onUrgencyFilterChange}
                    formatDisplayValue={formatUrgencyDisplay}
                    columns={2}
                  />
                </FilterSection>

                {/* Day of Week Filter */}
                <FilterSection title="Day of Week" badge={dayBadge} defaultExpanded={false}>
                  <CheckboxFilterGroup
                    options={[...DAY_OPTIONS]}
                    selectedValues={dayFilter}
                    counts={filterCounts.day}
                    onChange={onDayFilterChange}
                    columns={2}
                  />
                </FilterSection>

                {/* Billing Date Filter */}
                <FilterSection title="Billing Date" badge={billingDateBadge}>
                  <BillingDatePicker
                    value={billingDateFilter}
                    onChange={onBillingDateFilterChange}
                    counts={filterCounts.billingDate}
                  />
                </FilterSection>

                {/* Hours Filter */}
                <FilterSection title="Hours" badge={hoursBadge}>
                  <CheckboxFilterGroup
                    options={[...HOURS_RANGE_OPTIONS]}
                    selectedValues={hoursFilter}
                    counts={filterCounts.hours}
                    onChange={onHoursFilterChange}
                    formatDisplayValue={formatHoursDisplay}
                    columns={2}
                  />
                </FilterSection>
              </div>
            )}
          </div>

          {/* Footer with Reset */}
          <div className="flex justify-between items-center px-4 py-3 border-t border-border bg-muted/30">
            <button
              type="button"
              onClick={onResetFilters}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              disabled={activeFilterCount === 0}
            >
              Reset all filters
            </button>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-4 py-1.5 text-sm font-medium bg-foreground text-background rounded-md hover:opacity-90 transition-opacity"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
