import * as React from "react";
import { Calendar as CalendarIcon, X } from "lucide-react";
import { format, startOfMonth, endOfMonth, parseISO, isValid } from "date-fns";
import { Calendar } from "./ui/calendar";
import { clsx } from "clsx";

interface DatePickerPopoverProps {
  selectedYear: number;
  selectedMonth: number | 'all';
  selectedDay: string | 'all';
  availableYears: number[];
  availableMonths: number[];
  availableDates: string[];
  onYearChange: (year: number) => void;
  onMonthChange: (month: number | 'all') => void;
  onDayChange: (day: string | 'all') => void;
  minDate?: Date;
  maxDate?: Date;
}

const monthNames = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export function DatePickerPopover({
  selectedYear,
  selectedMonth,
  selectedDay,
  availableYears,
  availableMonths,
  availableDates,
  onYearChange,
  onMonthChange,
  onDayChange,
  minDate,
  maxDate,
}: DatePickerPopoverProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [viewMode, setViewMode] = React.useState<'calendar' | 'presets'>('calendar');
  const popoverRef = React.useRef<HTMLDivElement>(null);

  // Parse the selected date
  const selectedDate = React.useMemo(() => {
    if (selectedDay !== 'all' && isValid(parseISO(selectedDay))) {
      return parseISO(selectedDay);
    }
    if (selectedMonth !== 'all') {
      // If month is selected but not day, show the first day of the month
      return new Date(selectedYear, selectedMonth - 1, 1);
    }
    return null;
  }, [selectedYear, selectedMonth, selectedDay]);

  // Format display text
  const displayText = React.useMemo(() => {
    if (selectedDay !== 'all' && isValid(parseISO(selectedDay))) {
      return format(parseISO(selectedDay), "MMM d, yyyy");
    }
    if (selectedMonth !== 'all') {
      return `${monthNames[selectedMonth - 1]} ${selectedYear}`;
    }
    return `${selectedYear} - All`;
  }, [selectedYear, selectedMonth, selectedDay]);

  // Handle date selection from calendar
  const handleDateSelect = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const dateString = format(date, "yyyy-MM-dd");

    // Update all three values in sequence
    if (year !== selectedYear) {
      onYearChange(year);
    }
    if (month !== selectedMonth) {
      onMonthChange(month);
    }
    onDayChange(dateString);

    // Close popover after selection
    setIsOpen(false);
  };

  // Handle month selection from calendar
  const handleMonthSelect = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;

    // Update year and month, set day to 'all' to indicate entire month
    if (year !== selectedYear) {
      onYearChange(year);
    }
    onMonthChange(month);
    onDayChange('all');

    // Close popover after selection
    setIsOpen(false);
  };

  // Preset date ranges
  const handlePresetClick = (preset: string) => {
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth() + 1;

    switch (preset) {
      case 'today':
        onYearChange(currentYear);
        onMonthChange(currentMonth);
        onDayChange(format(today, "yyyy-MM-dd"));
        break;
      case 'thisMonth':
        onYearChange(currentYear);
        onMonthChange(currentMonth);
        onDayChange('all');
        break;
      case 'thisYear':
        onYearChange(currentYear);
        onMonthChange('all');
        onDayChange('all');
        break;
      case 'all':
        if (availableYears.length > 0) {
          onYearChange(availableYears[0]); // Most recent year
        }
        onMonthChange('all');
        onDayChange('all');
        break;
    }
    setIsOpen(false);
  };

  // Clear selection
  const handleClear = () => {
    onMonthChange('all');
    onDayChange('all');
    setIsOpen(false);
  };

  // Close popover when clicking outside
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

  // Get highlighted dates for the current month view
  const highlightedDates = React.useMemo(() => {
    if (selectedMonth !== 'all' && availableDates.length > 0) {
      return availableDates
        .map(d => parseISO(d))
        .filter(d => isValid(d) && d.getMonth() === (selectedMonth as number) - 1);
    }
    return [];
  }, [selectedMonth, availableDates]);

  return (
    <div className="relative" ref={popoverRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={clsx(
          "flex items-center space-x-2 px-3 py-1.5 text-sm",
          "border border-border rounded-md bg-background",
          "hover:bg-accent transition-colors",
          "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
        )}
      >
        <CalendarIcon className="h-4 w-4 text-muted-foreground" />
        <span>{displayText}</span>
      </button>

      {/* Popover Content */}
      {isOpen && (
        <div className="absolute top-full mt-2 right-0 z-50 bg-card rounded-lg shadow-lg border border-border overflow-hidden">
          {/* Tab Navigation */}
          <div className="flex border-b border-border">
            <button
              type="button"
              onClick={() => setViewMode('calendar')}
              className={clsx(
                "flex-1 px-4 py-2 text-sm font-medium transition-colors",
                viewMode === 'calendar'
                  ? "bg-blue-50 text-blue-700 border-b-2 border-blue-600"
                  : "text-gray-600 hover:bg-gray-50"
              )}
            >
              Calendar
            </button>
            <button
              type="button"
              onClick={() => setViewMode('presets')}
              className={clsx(
                "flex-1 px-4 py-2 text-sm font-medium transition-colors",
                viewMode === 'presets'
                  ? "bg-blue-50 text-blue-700 border-b-2 border-blue-600"
                  : "text-gray-600 hover:bg-gray-50"
              )}
            >
              Quick Select
            </button>
          </div>

          {/* Content Area */}
          <div className="p-2">
            {viewMode === 'calendar' ? (
              <div>
                <Calendar
                  selected={selectedDate}
                  onSelect={handleDateSelect}
                  onMonthSelect={handleMonthSelect}
                  isMonthSelected={selectedMonth !== 'all' && selectedDay === 'all'}
                  minDate={minDate}
                  maxDate={maxDate}
                  highlightedDates={highlightedDates}
                  className="w-72"
                />

                {/* Clear button */}
                {(selectedMonth !== 'all' || selectedDay !== 'all') && (
                  <div className="px-3 pb-2 border-t border-gray-100 pt-2">
                    <button
                      type="button"
                      onClick={handleClear}
                      className="flex items-center space-x-1 text-sm text-gray-600 hover:text-gray-900"
                    >
                      <X className="h-3 w-3" />
                      <span>Clear selection</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="w-72 p-2 space-y-1">
                <button
                  type="button"
                  onClick={() => handlePresetClick('today')}
                  className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-gray-100 transition-colors"
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={() => handlePresetClick('thisMonth')}
                  className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-gray-100 transition-colors"
                >
                  This Month
                </button>
                <button
                  type="button"
                  onClick={() => handlePresetClick('thisYear')}
                  className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-gray-100 transition-colors"
                >
                  This Year
                </button>
                <div className="my-2 border-t border-gray-200" />
                <button
                  type="button"
                  onClick={() => handlePresetClick('all')}
                  className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-gray-100 transition-colors"
                >
                  All Time
                </button>

                {/* Custom Year Selection */}
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <label className="block text-xs font-medium text-gray-600 mb-2">
                    Select Year
                  </label>
                  <select
                    value={selectedYear}
                    onChange={(e) => {
                      onYearChange(Number(e.target.value));
                      setIsOpen(false);
                    }}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {availableYears.map(year => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}