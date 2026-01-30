/**
 * DateRangePicker Component
 *
 * A date range selector with from/to inputs and quick preset buttons.
 * Uses the existing Calendar component for date selection.
 */

import * as React from 'react';
import { ArrowRight, X } from 'lucide-react';
import { format, parseISO, isValid, startOfWeek, startOfMonth, endOfMonth, subDays, subMonths } from 'date-fns';
import { Calendar } from '../../../../components/ui/calendar';
import type { DateRangeFilter } from '../../types/filters';

interface DateRangePickerProps {
  value: DateRangeFilter;
  onChange: (range: DateRangeFilter) => void;
  minDate?: Date;
  maxDate?: Date;
}

type SelectingState = 'from' | 'to' | null;

export function DateRangePicker({
  value,
  onChange,
  minDate,
  maxDate,
}: DateRangePickerProps) {
  const [selectingState, setSelectingState] = React.useState<SelectingState>(null);

  const handleDateSelect = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');

    if (selectingState === 'from') {
      // If new from date is after current to date, reset to date
      if (value.to && dateStr > value.to) {
        onChange({ from: dateStr, to: null });
      } else {
        onChange({ ...value, from: dateStr });
      }
      setSelectingState('to');
    } else if (selectingState === 'to') {
      // If new to date is before current from date, set it as from and clear to
      if (value.from && dateStr < value.from) {
        onChange({ from: dateStr, to: null });
      } else {
        onChange({ ...value, to: dateStr });
      }
      setSelectingState(null);
    } else {
      // No active selection - start with from
      onChange({ from: dateStr, to: null });
      setSelectingState('to');
    }
  };

  const handleClear = () => {
    onChange({ from: null, to: null });
    setSelectingState(null);
  };

  const handlePreset = (preset: string) => {
    const today = new Date();
    const todayStr = format(today, 'yyyy-MM-dd');

    switch (preset) {
      case 'today':
        onChange({ from: todayStr, to: todayStr });
        break;
      case 'thisWeek': {
        const weekStart = startOfWeek(today, { weekStartsOn: 0 }); // Sunday
        onChange({ from: format(weekStart, 'yyyy-MM-dd'), to: todayStr });
        break;
      }
      case 'last7': {
        const sevenDaysAgo = subDays(today, 6);
        onChange({ from: format(sevenDaysAgo, 'yyyy-MM-dd'), to: todayStr });
        break;
      }
      case 'thisMonth': {
        const monthStart = startOfMonth(today);
        onChange({ from: format(monthStart, 'yyyy-MM-dd'), to: todayStr });
        break;
      }
      case 'last30': {
        const thirtyDaysAgo = subDays(today, 29);
        onChange({ from: format(thirtyDaysAgo, 'yyyy-MM-dd'), to: todayStr });
        break;
      }
      case 'lastMonth': {
        const lastMonth = subMonths(today, 1);
        const lastMonthStart = startOfMonth(lastMonth);
        const lastMonthEnd = endOfMonth(lastMonth);
        onChange({ from: format(lastMonthStart, 'yyyy-MM-dd'), to: format(lastMonthEnd, 'yyyy-MM-dd') });
        break;
      }
    }
    setSelectingState(null);
  };

  const formatDisplayDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    try {
      const date = parseISO(dateStr);
      return isValid(date) ? format(date, 'MMM d, yyyy') : '—';
    } catch {
      return '—';
    }
  };

  // Calculate selected date for calendar highlight
  const selectedDate = React.useMemo(() => {
    if (selectingState === 'from' && value.from) {
      return parseISO(value.from);
    }
    if (selectingState === 'to' && value.to) {
      return parseISO(value.to);
    }
    if (value.to) {
      return parseISO(value.to);
    }
    if (value.from) {
      return parseISO(value.from);
    }
    return null;
  }, [selectingState, value.from, value.to]);

  // Dates to highlight (range between from and to)
  const highlightedDates = React.useMemo(() => {
    if (!value.from || !value.to) return [];
    const from = parseISO(value.from);
    const to = parseISO(value.to);
    const dates: Date[] = [];
    let current = from;
    while (current <= to) {
      dates.push(new Date(current));
      current = new Date(current.setDate(current.getDate() + 1));
    }
    return dates;
  }, [value.from, value.to]);

  return (
    <div className="space-y-3">
      {/* Current Selection Display */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setSelectingState('from')}
          className={`flex-1 px-3 py-2 text-sm rounded-md border transition-colors text-left ${
            selectingState === 'from'
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
              : 'border-border bg-muted hover:bg-muted/80'
          }`}
        >
          <span className="text-xs text-muted-foreground block">From</span>
          <span className={value.from ? 'text-foreground' : 'text-muted-foreground'}>
            {formatDisplayDate(value.from)}
          </span>
        </button>

        <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />

        <button
          type="button"
          onClick={() => setSelectingState('to')}
          className={`flex-1 px-3 py-2 text-sm rounded-md border transition-colors text-left ${
            selectingState === 'to'
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
              : 'border-border bg-muted hover:bg-muted/80'
          }`}
        >
          <span className="text-xs text-muted-foreground block">To</span>
          <span className={value.to ? 'text-foreground' : 'text-muted-foreground'}>
            {formatDisplayDate(value.to)}
          </span>
        </button>

        {(value.from || value.to) && (
          <button
            type="button"
            onClick={handleClear}
            className="p-2 hover:bg-muted rounded-md transition-colors"
            aria-label="Clear date range"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        )}
      </div>

      {/* Quick Presets */}
      <div className="flex flex-wrap gap-1.5">
        {[
          { id: 'today', label: 'Today' },
          { id: 'thisWeek', label: 'This Week' },
          { id: 'last7', label: 'Last 7 Days' },
          { id: 'thisMonth', label: 'This Month' },
          { id: 'lastMonth', label: 'Last Month' },
          { id: 'last30', label: 'Last 30 Days' },
        ].map((preset) => (
          <button
            key={preset.id}
            type="button"
            onClick={() => handlePreset(preset.id)}
            className="px-2.5 py-1 text-xs bg-muted hover:bg-muted/80 rounded-md transition-colors"
          >
            {preset.label}
          </button>
        ))}
      </div>

      {/* Calendar */}
      {selectingState && (
        <div className="border border-border rounded-lg bg-background">
          <div className="px-3 py-2 border-b border-border bg-muted/30">
            <p className="text-xs text-muted-foreground">
              {selectingState === 'from' ? 'Select start date' : 'Select end date'}
            </p>
          </div>
          <Calendar
            selected={selectedDate}
            onSelect={handleDateSelect}
            minDate={minDate}
            maxDate={maxDate}
            highlightedDates={highlightedDates}
          />
        </div>
      )}
    </div>
  );
}
