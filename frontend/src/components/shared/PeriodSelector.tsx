import { ChevronLeft, ChevronRight } from 'lucide-react';
import { usePeriod } from '../../contexts/PeriodContext';
import { DatePickerPopover } from './DatePickerPopover';

export interface PeriodSelectorProps {
  /**
   * Type of selector to display:
   * - 'full': Arrows + DatePickerPopover (like SupportTickets)
   * - 'simple': Just a dropdown select (like Dashboard/TurboHosting)
   */
  type?: 'full' | 'simple';

  /**
   * Label to display before the selector
   */
  label?: string;
}

export function PeriodSelector({ type = 'full', label = 'Period:' }: PeriodSelectorProps) {
  const {
    selectedYear,
    selectedMonth,
    selectedDay,
    availableYears,
    availableMonths,
    availableDates,
    setYear: onYearChange,
    setMonth: onMonthChange,
    setDay: onDayChange,
    navigatePrevious,
    navigateNext,
    canNavigatePrevious,
    canNavigateNext,
    getFormattedPeriod,
  } = usePeriod();

  // Month names for formatting
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Get tooltip for previous navigation
  const getPreviousTooltip = (): string => {
    if (selectedMonth === 'all') {
      const currentIndex = availableYears.indexOf(selectedYear);
      if (currentIndex > 0) {
        return `Go to ${availableYears[currentIndex - 1]}`;
      }
      return 'No previous data';
    }

    const prevMonth = selectedMonth === 1 ? 12 : (selectedMonth as number) - 1;
    const prevYear = selectedMonth === 1 ? selectedYear - 1 : selectedYear;
    return `Go to ${monthNames[prevMonth - 1]} ${prevYear}`;
  };

  // Get tooltip for next navigation
  const getNextTooltip = (): string => {
    if (selectedMonth === 'all') {
      const currentIndex = availableYears.indexOf(selectedYear);
      if (currentIndex < availableYears.length - 1) {
        return `Go to ${availableYears[currentIndex + 1]}`;
      }
      return 'No future data';
    }

    const nextMonth = selectedMonth === 12 ? 1 : (selectedMonth as number) + 1;
    const nextYear = selectedMonth === 12 ? selectedYear + 1 : selectedYear;
    return `Go to ${monthNames[nextMonth - 1]} ${nextYear}`;
  };

  // Generate months for dropdown (used in simple mode)
  const getMonthOptions = () => {
    const options: Array<{ value: string; label: string }> = [
      { value: 'all', label: 'All Months' }
    ];

    // Group by year and generate month strings
    const monthsByYear = new Map<number, number[]>();

    availableMonths.forEach(month => {
      const year = availableYears[0] || selectedYear; // Default to first available year
      if (!monthsByYear.has(year)) {
        monthsByYear.set(year, []);
      }
      monthsByYear.get(year)!.push(month);
    });

    // Generate options for each year
    monthsByYear.forEach((months, year) => {
      months.sort((a, b) => a - b).forEach(month => {
        const monthStr = `${year}-${String(month).padStart(2, '0')}`;
        const label = `${monthNames[month - 1]} ${year}`;
        options.push({ value: monthStr, label });
      });
    });

    return options;
  };

  // Handle simple dropdown change
  const handleSimpleChange = (value: string) => {
    if (value === 'all') {
      onMonthChange('all');
    } else {
      // Parse YYYY-MM format
      const [year, month] = value.split('-').map(Number);
      if (year !== selectedYear) {
        onYearChange(year);
      }
      onMonthChange(month);
    }
  };

  // Get current value for simple dropdown
  const getSimpleValue = (): string => {
    if (selectedMonth === 'all') return 'all';
    return `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;
  };

  if (type === 'simple') {
    // Simple dropdown mode
    const monthOptions = getMonthOptions();

    return (
      <div className="flex items-center space-x-3">
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
        <select
          value={getSimpleValue()}
          onChange={(e) => handleSimpleChange(e.target.value)}
          className="px-3 py-1.5 border border-input bg-background text-sm rounded"
        >
          {monthOptions.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    );
  }

  // Full mode with arrows and date picker
  return (
    <div className="flex items-center space-x-3">
      <span className="text-sm font-medium text-muted-foreground">{label}</span>

      <div className="flex items-center space-x-1">
        {/* Previous Navigation Arrow */}
        <button
          onClick={navigatePrevious}
          disabled={!canNavigatePrevious()}
          className={`p-1.5 rounded hover:bg-accent hover:text-accent-foreground transition-colors ${
            !canNavigatePrevious()
              ? 'opacity-50 cursor-not-allowed'
              : 'cursor-pointer'
          }`}
          title={canNavigatePrevious() ? getPreviousTooltip() : 'No previous data'}
          aria-label="Navigate to previous period"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* Date Picker Popover */}
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

        {/* Next Navigation Arrow */}
        <button
          onClick={navigateNext}
          disabled={!canNavigateNext()}
          className={`p-1.5 rounded hover:bg-accent hover:text-accent-foreground transition-colors ${
            !canNavigateNext()
              ? 'opacity-50 cursor-not-allowed'
              : 'cursor-pointer'
          }`}
          title={canNavigateNext() ? getNextTooltip() : 'No future data'}
          aria-label="Navigate to next period"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
