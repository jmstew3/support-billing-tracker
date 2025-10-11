import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';

// Type definitions
export type ViewMode = 'all' | 'month' | 'day';

export interface PeriodContextValue {
  // Period Selection
  selectedYear: number;
  selectedMonth: number | 'all'; // Deprecated: use selectedMonths
  selectedMonths: number[] | 'all'; // New: supports multi-month selection
  selectedDay: string | 'all';

  // View Mode (for pages that support it)
  viewMode: ViewMode;

  // Available data ranges (set by individual pages)
  availableYears: number[];
  availableMonths: number[];
  availableDates: string[];

  // Actions
  setYear: (year: number) => void;
  setMonth: (month: number | 'all') => void; // Deprecated: use setMonths
  setMonths: (months: number[] | 'all') => void; // New: set multiple months
  setDay: (day: string | 'all') => void;
  setViewMode: (mode: ViewMode) => void;

  // Set available data (called by pages)
  setAvailableData: (years: number[], months: number[], dates: string[]) => void;

  // Navigation helpers
  navigatePrevious: () => void;
  navigateNext: () => void;
  canNavigatePrevious: () => boolean;
  canNavigateNext: () => boolean;

  // Utilities
  getFormattedPeriod: () => string;
  getMonthString: () => string | undefined; // Deprecated: use getMonthStrings
  getMonthStrings: () => string[] | 'all'; // New: returns array of YYYY-MM strings
}

// Create context
const PeriodContext = createContext<PeriodContextValue | undefined>(undefined);

// Provider component
export function PeriodProvider({ children }: { children: React.ReactNode }) {
  // State
  const [selectedYear, setSelectedYear] = useState<number>(2025);
  const [selectedMonth, setSelectedMonth] = useState<number | 'all'>('all'); // Deprecated
  const [selectedMonths, setSelectedMonthsState] = useState<number[] | 'all'>('all'); // New
  const [selectedDay, setSelectedDay] = useState<string | 'all'>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('all');

  // Available data (provided by pages)
  const [availableYears, setAvailableYears] = useState<number[]>([2025]);
  const [availableMonths, setAvailableMonths] = useState<number[]>([]);
  const [availableDates, setAvailableDates] = useState<string[]>([]);

  // Month names for formatting
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Validation helper: check if months are consecutive
  const areMonthsConsecutive = (months: number[]): boolean => {
    if (months.length <= 1) return true;
    const sorted = [...months].sort((a, b) => a - b);
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i] !== sorted[i - 1] + 1) return false;
    }
    return true;
  };

  // Set available data (called by pages)
  const setAvailableData = useCallback((years: number[], months: number[], dates: string[]) => {
    setAvailableYears(years);
    setAvailableMonths(months);
    setAvailableDates(dates);
  }, []);

  // Action handlers
  const setYear = useCallback((year: number) => {
    setSelectedYear(year);
    // Reset month and day when changing year
    setSelectedMonth('all');
    setSelectedMonthsState('all');
    setSelectedDay('all');
  }, []);

  const setMonth = useCallback((month: number | 'all') => {
    setSelectedMonth(month);
    // Sync to selectedMonths for backward compatibility
    setSelectedMonthsState(month === 'all' ? 'all' : [month]);
    // Reset day when changing month
    setSelectedDay('all');
    // Auto-update view mode based on month selection
    if (month === 'all') {
      setViewMode('all');
    } else if (viewMode === 'all') {
      setViewMode('month');
    }
  }, [viewMode]);

  const setMonths = useCallback((months: number[] | 'all') => {
    // Validation
    if (months !== 'all') {
      if (months.length === 0) {
        console.warn('Cannot set empty month array, using "all" instead');
        setSelectedMonthsState('all');
        setSelectedMonth('all');
        return;
      }
      if (months.length > 12) {
        console.warn('Cannot select more than 12 months, truncating to first 12');
        months = months.slice(0, 12);
      }
      if (!areMonthsConsecutive(months)) {
        console.warn('Months must be consecutive, using first month only');
        setSelectedMonthsState([months[0]]);
        setSelectedMonth(months[0]);
        return;
      }
    }

    setSelectedMonthsState(months);
    // Sync to selectedMonth for backward compatibility (use first month or 'all')
    setSelectedMonth(months === 'all' ? 'all' : months[0]);
    // Reset day when changing months
    setSelectedDay('all');
    // Auto-update view mode
    if (months === 'all') {
      setViewMode('all');
    } else if (viewMode === 'all') {
      setViewMode('month');
    }
  }, [viewMode, areMonthsConsecutive]);

  const setDay = useCallback((day: string | 'all') => {
    setSelectedDay(day);
    // Auto-update view mode when selecting a day
    if (day !== 'all') {
      setViewMode('day');
    }
  }, []);

  // Set view mode with side effects to sync month/day selections
  const setViewModeWithSync = useCallback((mode: ViewMode) => {
    setViewMode(mode);

    // Sync month/day selections based on view mode
    if (mode === 'all') {
      // Reset to "all" view - clear month and day filters
      setSelectedMonth('all');
      setSelectedMonthsState('all');
      setSelectedDay('all');
    } else if (mode === 'month') {
      // Keep current month selection (or use first available month if "all")
      if (selectedMonth === 'all' && availableMonths.length > 0) {
        // Default to most recent month
        const latestMonth = Math.max(...availableMonths);
        setSelectedMonth(latestMonth);
        setSelectedMonthsState([latestMonth]);
      }
      // Reset day selection to show full month
      setSelectedDay('all');
    } else if (mode === 'day') {
      // Auto-select most recent day if no day selected
      if (selectedDay === 'all' && availableDates.length > 0) {
        const mostRecentDay = availableDates[availableDates.length - 1];
        setSelectedDay(mostRecentDay);
      }
    }
  }, [selectedMonth, selectedDay, availableMonths, availableDates]);

  // Get formatted period string
  const getFormattedPeriod = useCallback((): string => {
    if (selectedDay !== 'all') {
      // Specific day selected
      const date = new Date(selectedDay);
      return date.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      });
    }

    if (selectedMonths !== 'all') {
      // Multi-month or single month selected
      if (selectedMonths.length === 1) {
        return `${monthNames[selectedMonths[0] - 1]} ${selectedYear}`;
      }
      // Multi-month range
      const sortedMonths = [...selectedMonths].sort((a, b) => a - b);
      const firstMonth = sortedMonths[0];
      const lastMonth = sortedMonths[sortedMonths.length - 1];

      // Check if range spans across years (future enhancement)
      return `${monthNames[firstMonth - 1]} - ${monthNames[lastMonth - 1]} ${selectedYear}`;
    }

    // All months
    return `All Months (${selectedYear})`;
  }, [selectedYear, selectedMonths, selectedDay, monthNames]);

  // Get month string in YYYY-MM format for filtering (deprecated, for backward compatibility)
  const getMonthString = useCallback((): string | undefined => {
    if (selectedMonth === 'all') return undefined;
    return `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;
  }, [selectedYear, selectedMonth]);

  // Get month strings array in YYYY-MM format for filtering (new)
  const getMonthStrings = useCallback((): string[] | 'all' => {
    if (selectedMonths === 'all') return 'all';
    return selectedMonths.map(m => `${selectedYear}-${String(m).padStart(2, '0')}`);
  }, [selectedYear, selectedMonths]);

  // Navigation: Check if can navigate previous
  const canNavigatePrevious = useCallback((): boolean => {
    if (selectedMonths === 'all') {
      // In "All" view, check if there's a previous year with data
      const currentYearIndex = availableYears.indexOf(selectedYear);
      return currentYearIndex > 0;
    }

    // In month/range view, check if there's previous data
    const firstMonth = Math.min(...selectedMonths);
    if (firstMonth === 1) {
      // First month is January - check if previous year exists
      const currentYearIndex = availableYears.indexOf(selectedYear);
      return currentYearIndex > 0;
    }

    // Not January - can always go back
    return true;
  }, [selectedYear, selectedMonths, availableYears]);

  // Navigation: Check if can navigate next
  const canNavigateNext = useCallback((): boolean => {
    if (selectedMonths === 'all') {
      // In "All" view, check if there's a next year with data
      const currentYearIndex = availableYears.indexOf(selectedYear);
      return currentYearIndex < availableYears.length - 1;
    }

    // In month/range view, check if there's next data
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;

    const lastMonth = Math.max(...selectedMonths);
    if (selectedYear > currentYear) return false;
    if (selectedYear === currentYear && lastMonth >= currentMonth) return false;

    return true;
  }, [selectedYear, selectedMonths, availableYears]);

  // Navigate to previous month/year
  const navigatePrevious = useCallback(() => {
    if (!canNavigatePrevious()) return;

    if (selectedMonths === 'all') {
      // Navigate to previous year
      const currentYearIndex = availableYears.indexOf(selectedYear);
      if (currentYearIndex > 0) {
        setSelectedYear(availableYears[currentYearIndex - 1]);
      }
    } else {
      // Navigate to previous month range (shift entire range by 1 month back)
      const rangeSize = selectedMonths.length;
      const firstMonth = Math.min(...selectedMonths);

      if (firstMonth === 1) {
        // First month is January - go to December of previous year
        setSelectedYear(selectedYear - 1);
        const newMonths = Array.from({ length: rangeSize }, (_, i) => 13 - rangeSize + i);
        setSelectedMonthsState(newMonths);
        setSelectedMonth(newMonths[0]);
      } else {
        // Shift range back by 1 month
        const newMonths = selectedMonths.map(m => m - 1);
        setSelectedMonthsState(newMonths);
        setSelectedMonth(newMonths[0]);
      }
      setSelectedDay('all');
    }
  }, [selectedYear, selectedMonths, availableYears, canNavigatePrevious]);

  // Navigate to next month/year
  const navigateNext = useCallback(() => {
    if (!canNavigateNext()) return;

    if (selectedMonths === 'all') {
      // Navigate to next year
      const currentYearIndex = availableYears.indexOf(selectedYear);
      if (currentYearIndex < availableYears.length - 1) {
        setSelectedYear(availableYears[currentYearIndex + 1]);
      }
    } else {
      // Navigate to next month range (shift entire range by 1 month forward)
      const rangeSize = selectedMonths.length;
      const lastMonth = Math.max(...selectedMonths);

      if (lastMonth === 12) {
        // Last month is December - go to January of next year
        setSelectedYear(selectedYear + 1);
        const newMonths = Array.from({ length: rangeSize }, (_, i) => i + 1);
        setSelectedMonthsState(newMonths);
        setSelectedMonth(newMonths[0]);
      } else {
        // Shift range forward by 1 month
        const newMonths = selectedMonths.map(m => m + 1);
        setSelectedMonthsState(newMonths);
        setSelectedMonth(newMonths[0]);
      }
      setSelectedDay('all');
    }
  }, [selectedYear, selectedMonths, availableYears, canNavigateNext]);

  // Memoize context value
  const value = useMemo<PeriodContextValue>(() => ({
    selectedYear,
    selectedMonth,
    selectedMonths,
    selectedDay,
    viewMode,
    availableYears,
    availableMonths,
    availableDates,
    setYear,
    setMonth,
    setMonths,
    setDay,
    setViewMode: setViewModeWithSync,
    setAvailableData,
    navigatePrevious,
    navigateNext,
    canNavigatePrevious,
    canNavigateNext,
    getFormattedPeriod,
    getMonthString,
    getMonthStrings,
  }), [
    selectedYear,
    selectedMonth,
    selectedMonths,
    selectedDay,
    viewMode,
    availableYears,
    availableMonths,
    availableDates,
    setYear,
    setMonth,
    setMonths,
    setDay,
    setViewModeWithSync,
    setAvailableData,
    navigatePrevious,
    navigateNext,
    canNavigatePrevious,
    canNavigateNext,
    getFormattedPeriod,
    getMonthString,
    getMonthStrings,
  ]);

  return (
    <PeriodContext.Provider value={value}>
      {children}
    </PeriodContext.Provider>
  );
}

// Custom hook to use the period context
export function usePeriod() {
  const context = useContext(PeriodContext);
  if (context === undefined) {
    throw new Error('usePeriod must be used within a PeriodProvider');
  }
  return context;
}
