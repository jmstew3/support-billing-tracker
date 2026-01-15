/**
 * BillingDatePicker Component
 *
 * Extends DateRangePicker with a toggle for filtering by presence of billing date.
 * Options: All, Has Billing Date, No Billing Date
 */

import { DateRangePicker } from './DateRangePicker';
import type { BillingDateFilter } from '../../types/filters';

interface BillingDatePickerProps {
  value: BillingDateFilter;
  onChange: (filter: BillingDateFilter) => void;
  counts?: {
    hasValue: number;
    noValue: number;
  };
}

export function BillingDatePicker({ value, onChange, counts }: BillingDatePickerProps) {
  const handleDateRangeChange = (range: { from: string | null; to: string | null }) => {
    onChange({ ...value, ...range });
  };

  const handleHasValueChange = (hasValue: 'all' | 'yes' | 'no') => {
    // When switching to 'no', clear the date range since it doesn't apply
    if (hasValue === 'no') {
      onChange({ from: null, to: null, hasValue });
    } else {
      onChange({ ...value, hasValue });
    }
  };

  return (
    <div className="space-y-3">
      {/* Has Value Toggle */}
      <div className="space-y-1.5">
        <span className="text-xs text-muted-foreground">Filter by presence:</span>
        <div className="flex gap-1.5">
          {[
            { id: 'all' as const, label: 'All' },
            { id: 'yes' as const, label: `Has Date${counts?.hasValue !== undefined ? ` (${counts.hasValue})` : ''}` },
            { id: 'no' as const, label: `No Date${counts?.noValue !== undefined ? ` (${counts.noValue})` : ''}` },
          ].map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => handleHasValueChange(option.id)}
              className={`px-2.5 py-1 text-xs rounded-md transition-colors ${
                value.hasValue === option.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-muted hover:bg-muted/80'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Date Range (only show when filtering by "All" or "Has Date") */}
      {value.hasValue !== 'no' && (
        <>
          <div className="border-t border-border pt-3">
            <span className="text-xs text-muted-foreground block mb-2">
              Filter by billing date range:
            </span>
            <DateRangePicker
              value={{ from: value.from, to: value.to }}
              onChange={handleDateRangeChange}
            />
          </div>
        </>
      )}
    </div>
  );
}
