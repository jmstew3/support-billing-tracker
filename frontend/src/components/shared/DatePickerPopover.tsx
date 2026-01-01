import * as React from "react";
import { Calendar as CalendarIcon, X } from "lucide-react";
import { format, parseISO, isValid } from "date-fns";
import { Calendar } from "../ui/calendar";
import { clsx } from "clsx";

interface DatePickerPopoverProps {
  selectedYear: number;
  selectedMonth: number | 'all';
  selectedMonths?: number[] | 'all'; // New: for multi-month support
  selectedDay: string | 'all';
  availableYears: number[];
  availableMonths: number[];
  availableDates: string[];
  onYearChange: (year: number) => void;
  onMonthChange: (month: number | 'all') => void;
  onMonthsChange?: (months: number[] | 'all') => void; // New: for multi-month support
  onDayChange: (day: string | 'all') => void;
  minDate?: Date;
  maxDate?: Date;
  enableRangeMode?: boolean; // New: enable multi-month range selection
}

const monthNames = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export function DatePickerPopover({
  selectedYear,
  selectedMonth,
  selectedMonths = 'all',
  selectedDay,
  availableYears,
  availableMonths: _availableMonths,
  availableDates,
  onYearChange,
  onMonthChange,
  onMonthsChange,
  onDayChange,
  minDate,
  maxDate,
  enableRangeMode = false,
}: DatePickerPopoverProps) {
  // Silence unused variable warnings - these are kept for API compatibility
  void _availableMonths;

  const [isOpen, setIsOpen] = React.useState(false);
  const [viewMode, setViewMode] = React.useState<'calendar' | 'presets' | 'monthRange'>('calendar');
  const [rangeStart, setRangeStart] = React.useState<number | null>(null);
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

    // Handle multi-month selection
    if (enableRangeMode && selectedMonths !== 'all' && Array.isArray(selectedMonths) && selectedMonths.length > 0) {
      if (selectedMonths.length === 1) {
        return `${monthNames[selectedMonths[0] - 1]} ${selectedYear}`;
      }
      // Show range
      const sortedMonths = [...selectedMonths].sort((a, b) => a - b);
      const firstMonth = monthNames[sortedMonths[0] - 1].substring(0, 3); // Short name
      const lastMonth = monthNames[sortedMonths[sortedMonths.length - 1] - 1].substring(0, 3);
      return `${firstMonth} - ${lastMonth} ${selectedYear} (${selectedMonths.length})`;
    }

    // Fallback to single month
    if (selectedMonth !== 'all') {
      return `${monthNames[selectedMonth - 1]} ${selectedYear}`;
    }

    return `${selectedYear} - All`;
  }, [selectedYear, selectedMonth, selectedMonths, selectedDay, enableRangeMode]);

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

  // Handle month click in range mode
  const handleMonthClick = (month: number) => {
    if (!enableRangeMode || !onMonthsChange) {
      // Single month mode
      onMonthChange(month);
      onDayChange('all');
      setIsOpen(false);
      return;
    }

    // Multi-month range mode
    if (rangeStart === null) {
      // Start of range
      setRangeStart(month);
      onMonthsChange([month]);
      onDayChange('all');
    } else {
      // End of range - create consecutive month array
      const start = Math.min(rangeStart, month);
      const end = Math.max(rangeStart, month);
      const range = Array.from({ length: end - start + 1 }, (_, i) => start + i);

      onMonthsChange(range);
      onDayChange('all');
      setRangeStart(null);
      setIsOpen(false);
    }
  };

  // Handle month range preset selection
  const handleMonthRangePreset = (preset: string) => {
    if (!onMonthsChange) return;

    const today = new Date();
    const currentMonth = today.getMonth() + 1;

    switch (preset) {
      case 'last3': {
        const last3 = Array.from({ length: 3 }, (_, i) => Math.max(1, currentMonth - 2 + i));
        onMonthsChange(last3);
        break;
      }
      case 'last6': {
        const last6 = Array.from({ length: 6 }, (_, i) => Math.max(1, currentMonth - 5 + i));
        onMonthsChange(last6);
        break;
      }
      case 'q1':
        onMonthsChange([1, 2, 3]);
        break;
      case 'q2':
        onMonthsChange([4, 5, 6]);
        break;
      case 'q3':
        onMonthsChange([7, 8, 9]);
        break;
      case 'q4':
        onMonthsChange([10, 11, 12]);
        break;
      case 'ytd': {
        const ytd = Array.from({ length: currentMonth }, (_, i) => i + 1);
        onMonthsChange(ytd);
        break;
      }
    }
    onDayChange('all');
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
          "flex items-center space-x-2 px-3 py-1.5 text-sm min-w-[220px]",
          "border border-border rounded-md bg-background",
          "hover:bg-accent transition-colors",
          "focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white focus:ring-offset-1"
        )}
      >
        <CalendarIcon className="h-4 w-4 text-muted-foreground" />
        <span>{displayText}</span>
      </button>

      {/* Popover Content */}
      {isOpen && (
        <div className="absolute top-full mt-2 right-0 z-[100] bg-card rounded-lg shadow-lg border border-border overflow-hidden">
          {/* Tab Navigation */}
          <div className="flex border-b border-border">
            {!enableRangeMode && (
              <button
                type="button"
                onClick={() => setViewMode('calendar')}
                className={clsx(
                  "flex-1 px-4 py-2 text-sm font-medium transition-colors",
                  viewMode === 'calendar'
                    ? "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-b-2 border-black dark:border-white"
                    : "text-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800"
                )}
              >
                Calendar
              </button>
            )}
            {enableRangeMode && (
              <button
                type="button"
                onClick={() => setViewMode('monthRange')}
                className={clsx(
                  "flex-1 px-4 py-2 text-sm font-medium transition-colors",
                  viewMode === 'monthRange'
                    ? "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-b-2 border-black dark:border-white"
                    : "text-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800"
                )}
              >
                Month Range
              </button>
            )}
            <button
              type="button"
              onClick={() => setViewMode('presets')}
              className={clsx(
                "flex-1 px-4 py-2 text-sm font-medium transition-colors",
                viewMode === 'presets'
                  ? "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-b-2 border-black dark:border-white"
                  : "text-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800"
              )}
            >
              Quick Select
            </button>
          </div>

          {/* Content Area */}
          <div className="p-2">
            {viewMode === 'monthRange' ? (
              <div className="w-80 p-3">
                {/* Instructions */}
                <div className="mb-3 text-xs text-gray-600 dark:text-gray-400">
                  {rangeStart === null
                    ? 'Click to select start month, then click end month'
                    : `Selected: ${monthNames[rangeStart - 1]} → Click end month`}
                </div>

                {/* Month Grid (3x4) */}
                <div className="grid grid-cols-3 gap-2">
                  {monthNames.map((name, index) => {
                    const monthNum = index + 1;
                    const isSelected = selectedMonths !== 'all' && Array.isArray(selectedMonths) && selectedMonths.includes(monthNum);
                    const isRangeStart = rangeStart === monthNum;
                    const isInTempRange = rangeStart !== null && monthNum >= Math.min(rangeStart, monthNum) && monthNum <= Math.max(rangeStart, monthNum);

                    return (
                      <button
                        key={monthNum}
                        type="button"
                        onClick={() => handleMonthClick(monthNum)}
                        className={clsx(
                          "px-3 py-2 text-sm rounded transition-colors",
                          isSelected && "bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100 font-medium",
                          isRangeStart && "ring-2 ring-blue-500",
                          isInTempRange && !isSelected && "bg-blue-50 dark:bg-blue-950",
                          !isSelected && !isInTempRange && "bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700"
                        )}
                      >
                        {name.substring(0, 3)}
                      </button>
                    );
                  })}
                </div>

                {/* Clear button */}
                {selectedMonths !== 'all' && Array.isArray(selectedMonths) && selectedMonths.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                    <button
                      type="button"
                      onClick={() => {
                        if (onMonthsChange) onMonthsChange('all');
                        setRangeStart(null);
                        setIsOpen(false);
                      }}
                      className="flex items-center space-x-1 text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
                    >
                      <X className="h-3 w-3" />
                      <span>Clear selection</span>
                    </button>
                  </div>
                )}
              </div>
            ) : viewMode === 'calendar' ? (
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
                {enableRangeMode ? (
                  // Month range presets
                  <>
                    <button
                      type="button"
                      onClick={() => handleMonthRangePreset('last3')}
                      className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                      Last 3 Months
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMonthRangePreset('last6')}
                      className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                      Last 6 Months
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMonthRangePreset('ytd')}
                      className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                      Year to Date
                    </button>
                    <div className="my-2 border-t border-gray-200 dark:border-gray-700" />
                    <button
                      type="button"
                      onClick={() => handleMonthRangePreset('q1')}
                      className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                      Q1 (Jan - Mar)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMonthRangePreset('q2')}
                      className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                      Q2 (Apr - Jun)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMonthRangePreset('q3')}
                      className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                      Q3 (Jul - Sep)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMonthRangePreset('q4')}
                      className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                      Q4 (Oct - Dec)
                    </button>
                    <div className="my-2 border-t border-gray-200 dark:border-gray-700" />
                    <button
                      type="button"
                      onClick={() => handlePresetClick('all')}
                      className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                      All Months
                    </button>
                  </>
                ) : (
                  // Single date/month presets
                  <>
                    <button
                      type="button"
                      onClick={() => handlePresetClick('today')}
                      className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                      Today
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePresetClick('thisMonth')}
                      className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                      This Month
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePresetClick('thisYear')}
                      className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                      This Year
                    </button>
                    <div className="my-2 border-t border-gray-200 dark:border-gray-700" />
                    <button
                      type="button"
                      onClick={() => handlePresetClick('all')}
                      className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                      All Time
                    </button>
                  </>
                )}

                {/* Custom Year Selection */}
                <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                    Select Year
                  </label>
                  <select
                    value={selectedYear}
                    onChange={(e) => {
                      onYearChange(Number(e.target.value));
                      setIsOpen(false);
                    }}
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white bg-background"
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