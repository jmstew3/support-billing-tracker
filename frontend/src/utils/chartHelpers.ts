/**
 * Chart Helper Utilities
 *
 * Reusable utilities for chart data transformation, formatting, and optimization.
 * Provides memoization and performance optimizations for chart components.
 *
 * Usage:
 * ```typescript
 * import { calculateYAxisDomain, formatChartCurrency, useChartData } from '@/utils/chartHelpers';
 *
 * const [min, max] = calculateYAxisDomain([100, 200, 300], 100);
 * const formatted = formatChartCurrency(5000); // "$5k"
 * const chartData = useChartData(rawData, transformData);
 * ```
 */

import { useMemo } from 'react';

// ============================================================================
// Y-AXIS CALCULATIONS
// ============================================================================

/**
 * Calculate optimal Y-axis domain with intelligent rounding
 *
 * @param values - Array of numeric values to analyze
 * @param roundTo - Rounding increment (default: auto-detected)
 * @returns Tuple of [min, max] for Y-axis domain
 *
 * @example
 * calculateYAxisDomain([100, 250, 380])
 * // Returns [0, 400] (auto-rounded to nearest 100)
 *
 * @example
 * calculateYAxisDomain([1200, 3500, 8900], 1000)
 * // Returns [0, 9000] (rounded to nearest 1000)
 */
export function calculateYAxisDomain(
  values: number[],
  roundTo?: number
): [number, number] {
  if (values.length === 0) return [0, 100];

  const max = Math.max(...values, 0);

  // Auto-detect rounding increment if not provided
  if (roundTo === undefined) {
    if (max <= 100) roundTo = 10;
    else if (max <= 1000) roundTo = 100;
    else if (max <= 10000) roundTo = 1000;
    else roundTo = 5000;
  }

  const roundedMax = Math.ceil(max / roundTo) * roundTo;

  // Ensure minimum range for visibility
  const minRange = roundTo * 2;
  const finalMax = Math.max(roundedMax, minRange);

  return [0, finalMax];
}

/**
 * Calculate Y-axis ticks for evenly spaced intervals
 *
 * @param domain - [min, max] tuple from calculateYAxisDomain
 * @param count - Desired number of ticks (default: 5)
 * @returns Array of tick values
 *
 * @example
 * calculateYAxisTicks([0, 10000], 5)
 * // Returns [0, 2500, 5000, 7500, 10000]
 */
export function calculateYAxisTicks(
  domain: [number, number],
  count: number = 5
): number[] {
  const [min, max] = domain;
  const interval = (max - min) / (count - 1);

  return Array.from({ length: count }, (_, i) => min + interval * i);
}

// ============================================================================
// CURRENCY FORMATTING
// ============================================================================

/**
 * Format currency value for chart axis display
 * Automatically abbreviates large values with K/M suffix
 *
 * @param value - Numeric value to format
 * @param options - Formatting options
 * @returns Formatted string (e.g., "$5k", "$1.2M")
 *
 * @example
 * formatChartCurrency(1500)      // "$1.5k"
 * formatChartCurrency(50000)     // "$50k"
 * formatChartCurrency(1500000)   // "$1.5M"
 * formatChartCurrency(250)       // "$250"
 */
export function formatChartCurrency(
  value: number,
  options: {
    showCents?: boolean;
    alwaysAbbreviate?: boolean;
  } = {}
): string {
  const { showCents = false, alwaysAbbreviate = false } = options;

  // Format millions
  if (value >= 1000000 || (alwaysAbbreviate && value >= 100000)) {
    const millions = value / 1000000;
    return `$${millions.toFixed(millions >= 10 ? 0 : 1)}M`;
  }

  // Format thousands
  if (value >= 1000 || alwaysAbbreviate) {
    const thousands = value / 1000;
    return `$${thousands.toFixed(thousands >= 10 ? 0 : 1)}k`;
  }

  // Format standard
  return `$${showCents ? value.toFixed(2) : value.toFixed(0)}`;
}

/**
 * Format percentage for chart display
 *
 * @param value - Decimal value (0.15 = 15%)
 * @param decimals - Number of decimal places
 * @returns Formatted percentage string
 *
 * @example
 * formatChartPercentage(0.156)     // "15.6%"
 * formatChartPercentage(0.156, 0)  // "16%"
 */
export function formatChartPercentage(
  value: number,
  decimals: number = 1
): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

// ============================================================================
// DATE FORMATTING
// ============================================================================

/**
 * Format month string for chart display (short version)
 *
 * @param monthStr - Month string in "YYYY-MM" format
 * @returns Formatted string (e.g., "Sep 2025")
 *
 * @example
 * formatChartMonth("2025-09")  // "Sep 2025"
 * formatChartMonth("all")      // "All"
 */
export function formatChartMonth(monthStr: string): string {
  if (monthStr === 'all') return 'All';

  const [year, month] = monthStr.split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1);

  return date.toLocaleDateString('en-US', {
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Format month string for chart display (very short - 3 letters)
 *
 * @param monthStr - Month string in "YYYY-MM" format
 * @returns Formatted string (e.g., "Sep")
 *
 * @example
 * formatChartMonthShort("2025-09")  // "Sep"
 */
export function formatChartMonthShort(monthStr: string): string {
  if (monthStr === 'all') return 'All';

  const [year, month] = monthStr.split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1);

  return date.toLocaleDateString('en-US', { month: 'short' });
}

/**
 * Format date for chart display
 *
 * @param dateStr - ISO date string
 * @param format - Format type ('short' | 'medium' | 'long')
 * @returns Formatted date string
 *
 * @example
 * formatChartDate("2025-09-15", "short")   // "Sep 15"
 * formatChartDate("2025-09-15", "medium")  // "Sep 15, 2025"
 * formatChartDate("2025-09-15", "long")    // "Mon, Sep 15"
 */
export function formatChartDate(
  dateStr: string,
  format: 'short' | 'medium' | 'long' = 'short'
): string {
  const date = new Date(dateStr);

  if (format === 'short') {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  }

  if (format === 'medium') {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  // long format
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

// ============================================================================
// PERFORMANCE OPTIMIZATION HOOKS
// ============================================================================

/**
 * Memoized chart data transformer
 * Prevents unnecessary recalculations on every render
 *
 * @param data - Raw data array
 * @param transformer - Transformation function
 * @returns Memoized transformed data
 *
 * @example
 * const chartData = useChartData(rawRequests, (data) =>
 *   data.map(r => ({ date: r.date, count: r.total }))
 * );
 */
export function useChartData<TInput, TOutput>(
  data: TInput[],
  transformer: (data: TInput[]) => TOutput[]
): TOutput[] {
  return useMemo(() => {
    if (!data || data.length === 0) return [];
    return transformer(data);
  }, [data, transformer]);
}

/**
 * Memoized Y-axis domain calculation
 * Prevents recalculation on every render
 *
 * @param values - Array of values to analyze
 * @param roundTo - Rounding increment (optional)
 * @returns Memoized [min, max] domain
 *
 * @example
 * const domain = useYAxisDomain([100, 200, 300]);
 * // Returns [0, 300] and only recalculates if values change
 */
export function useYAxisDomain(
  values: number[],
  roundTo?: number
): [number, number] {
  return useMemo(() => {
    return calculateYAxisDomain(values, roundTo);
  }, [values, roundTo]);
}

// ============================================================================
// DATA TRANSFORMATION HELPERS
// ============================================================================

/**
 * Sort monthly data chronologically
 *
 * @param data - Array of objects with 'month' property in YYYY-MM format
 * @returns Sorted array (oldest first)
 *
 * @example
 * sortByMonth([
 *   { month: '2025-09', value: 100 },
 *   { month: '2025-06', value: 50 }
 * ])
 * // Returns array with June first, September second
 */
export function sortByMonth<T extends { month: string }>(data: T[]): T[] {
  return [...data].sort((a, b) => a.month.localeCompare(b.month));
}

/**
 * Calculate cumulative values for array
 *
 * @param values - Array of numeric values
 * @returns Array of cumulative sums
 *
 * @example
 * calculateCumulative([10, 20, 30])
 * // Returns [10, 30, 60]
 */
export function calculateCumulative(values: number[]): number[] {
  let sum = 0;
  return values.map((value) => {
    sum += value;
    return sum;
  });
}

/**
 * Group data by month
 *
 * @param data - Array of objects with date property
 * @param dateKey - Key name for date field
 * @returns Map of month string to array of items
 *
 * @example
 * groupByMonth([
 *   { date: '2025-09-15', amount: 100 },
 *   { date: '2025-09-20', amount: 50 }
 * ], 'date')
 * // Returns Map: { '2025-09': [item1, item2] }
 */
export function groupByMonth<T extends Record<string, any>>(
  data: T[],
  dateKey: keyof T
): Map<string, T[]> {
  const grouped = new Map<string, T[]>();

  data.forEach((item) => {
    const date = new Date(item[dateKey] as string);
    const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

    if (!grouped.has(month)) {
      grouped.set(month, []);
    }
    grouped.get(month)!.push(item);
  });

  return grouped;
}

// ============================================================================
// CHART INTERACTION HELPERS
// ============================================================================

/**
 * Debounce function for chart interactions
 * Prevents excessive re-renders during pan/zoom operations
 *
 * @param func - Function to debounce
 * @param wait - Wait time in milliseconds
 * @returns Debounced function
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Throttle function for chart scroll events
 * Limits execution rate during continuous events
 *
 * @param func - Function to throttle
 * @param limit - Minimum time between executions (ms)
 * @returns Throttled function
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false;

  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}
