import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';

// Type definitions
export type ViewMode = 'all' | 'month' | 'day';

export interface PeriodContextValue {
  // Period Selection
  selectedYear: number;
  selectedMonth: number | 'all';
  selectedDay: string | 'all';

  // View Mode (for pages that support it)
  viewMode: ViewMode;

  // Available data ranges (set by individual pages)
  availableYears: number[];
  availableMonths: number[];
  availableDates: string[];

  // Actions
  setYear: (year: number) => void;
  setMonth: (month: number | 'all') => void;
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
  getMonthString: () => string | undefined;
}

// Create context
const PeriodContext = createContext<PeriodContextValue | undefined>(undefined);

// Provider component
export function PeriodProvider({ children }: { children: React.ReactNode }) {
  // State
  const [selectedYear, setSelectedYear] = useState<number>(2025);
  const [selectedMonth, setSelectedMonth] = useState<number | 'all'>('all');
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
    setSelectedDay('all');
  }, []);

  const setMonth = useCallback((month: number | 'all') => {
    setSelectedMonth(month);
    // Reset day when changing month
    setSelectedDay('all');
    // Auto-update view mode based on month selection
    if (month === 'all') {
      setViewMode('all');
    } else if (viewMode === 'all') {
      setViewMode('month');
    }
  }, [viewMode]);

  const setDay = useCallback((day: string | 'all') => {
    setSelectedDay(day);
    // Auto-update view mode when selecting a day
    if (day !== 'all') {
      setViewMode('day');
    }
  }, []);

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

    if (selectedMonth !== 'all') {
      // Month selected
      return `${monthNames[selectedMonth - 1]} ${selectedYear}`;
    }

    // All months
    return `All Months (${selectedYear})`;
  }, [selectedYear, selectedMonth, selectedDay, monthNames]);

  // Get month string in YYYY-MM format for filtering
  const getMonthString = useCallback((): string | undefined => {
    if (selectedMonth === 'all') return undefined;
    return `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;
  }, [selectedYear, selectedMonth]);

  // Navigation: Check if can navigate previous
  const canNavigatePrevious = useCallback((): boolean => {
    if (selectedMonth === 'all') {
      // In "All" view, check if there's a previous year with data
      const currentYearIndex = availableYears.indexOf(selectedYear);
      return currentYearIndex > 0;
    }

    // In month view, check if there's previous data
    if (selectedMonth === 1) {
      // January - check if previous year exists
      const currentYearIndex = availableYears.indexOf(selectedYear);
      return currentYearIndex > 0;
    }

    // Not January - can always go back one month
    return true;
  }, [selectedYear, selectedMonth, availableYears]);

  // Navigation: Check if can navigate next
  const canNavigateNext = useCallback((): boolean => {
    if (selectedMonth === 'all') {
      // In "All" view, check if there's a next year with data
      const currentYearIndex = availableYears.indexOf(selectedYear);
      return currentYearIndex < availableYears.length - 1;
    }

    // In month view, check if there's next data
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;

    if (selectedYear > currentYear) return false;
    if (selectedYear === currentYear && selectedMonth >= currentMonth) return false;

    return true;
  }, [selectedYear, selectedMonth, availableYears]);

  // Navigate to previous month/year
  const navigatePrevious = useCallback(() => {
    if (!canNavigatePrevious()) return;

    if (selectedMonth === 'all') {
      // Navigate to previous year
      const currentYearIndex = availableYears.indexOf(selectedYear);
      if (currentYearIndex > 0) {
        setSelectedYear(availableYears[currentYearIndex - 1]);
      }
    } else {
      // Navigate to previous month
      if (selectedMonth === 1) {
        // Go to December of previous year
        setSelectedYear(selectedYear - 1);
        setSelectedMonth(12);
      } else {
        setSelectedMonth((selectedMonth as number) - 1);
      }
      setSelectedDay('all');
    }
  }, [selectedYear, selectedMonth, availableYears, canNavigatePrevious]);

  // Navigate to next month/year
  const navigateNext = useCallback(() => {
    if (!canNavigateNext()) return;

    if (selectedMonth === 'all') {
      // Navigate to next year
      const currentYearIndex = availableYears.indexOf(selectedYear);
      if (currentYearIndex < availableYears.length - 1) {
        setSelectedYear(availableYears[currentYearIndex + 1]);
      }
    } else {
      // Navigate to next month
      if (selectedMonth === 12) {
        // Go to January of next year
        setSelectedYear(selectedYear + 1);
        setSelectedMonth(1);
      } else {
        setSelectedMonth((selectedMonth as number) + 1);
      }
      setSelectedDay('all');
    }
  }, [selectedYear, selectedMonth, availableYears, canNavigateNext]);

  // Memoize context value
  const value = useMemo<PeriodContextValue>(() => ({
    selectedYear,
    selectedMonth,
    selectedDay,
    viewMode,
    availableYears,
    availableMonths,
    availableDates,
    setYear,
    setMonth,
    setDay,
    setViewMode,
    setAvailableData,
    navigatePrevious,
    navigateNext,
    canNavigatePrevious,
    canNavigateNext,
    getFormattedPeriod,
    getMonthString,
  }), [
    selectedYear,
    selectedMonth,
    selectedDay,
    viewMode,
    availableYears,
    availableMonths,
    availableDates,
    setYear,
    setMonth,
    setDay,
    setAvailableData,
    navigatePrevious,
    navigateNext,
    canNavigatePrevious,
    canNavigateNext,
    getFormattedPeriod,
    getMonthString,
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
