/**
 * Centralized Formatting Utilities
 *
 * Single source of truth for date, currency, and other display formatting
 * across all dashboard pages.
 */

// Re-export currency utilities for convenience
export { formatCurrency, formatCurrencyAccounting, convertMicrosToDollars } from './currency';
export type { AccountingFormat } from './currency';

// ============================================================================
// DATE FORMATTING
// ============================================================================

/**
 * Format a month string (YYYY-MM) for display
 * @param monthStr - Month string in "YYYY-MM" format or "all"
 * @returns Formatted string like "September 2025" or "All Months"
 *
 * @example
 * formatMonthLabel("2025-09") // "September 2025"
 * formatMonthLabel("all")     // "All Months"
 */
export function formatMonthLabel(monthStr: string): string {
  if (monthStr === 'all') return 'All Months';
  const [year, month] = monthStr.split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1);
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

/**
 * Format a date string for display
 * @param dateString - ISO date string or null
 * @returns Formatted string like "Sep 15, 2025" or "Active" if null
 *
 * @example
 * formatDate("2025-09-15")  // "Sep 15, 2025"
 * formatDate(null)          // "Active"
 */
export function formatDate(dateString: string | null): string {
  if (!dateString) return 'Active';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Format a date string for display (short version)
 * @param dateString - ISO date string
 * @returns Formatted string like "Sep 15, 2025"
 *
 * @example
 * formatDateShort("2025-09-15")  // "Sep 15, 2025"
 */
export function formatDateShort(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Format a date string for display (long version with day of week)
 * @param dateString - ISO date string
 * @returns Formatted string like "Monday, Sep 15, 2025"
 *
 * @example
 * formatDateLong("2025-09-15")  // "Monday, Sep 15, 2025"
 */
export function formatDateLong(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

// ============================================================================
// NUMBER FORMATTING
// ============================================================================

/**
 * Format a number as a percentage
 * @param value - Decimal value (0.15 = 15%)
 * @param decimals - Number of decimal places (default: 1)
 * @returns Formatted string like "15.0%"
 *
 * @example
 * formatPercentage(0.15)     // "15.0%"
 * formatPercentage(0.1567, 2) // "15.67%"
 */
export function formatPercentage(value: number, decimals: number = 1): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

/**
 * Format a number with commas (no decimals)
 * @param value - Number to format
 * @returns Formatted string like "1,234"
 *
 * @example
 * formatNumber(1234)    // "1,234"
 * formatNumber(1234567) // "1,234,567"
 */
export function formatNumber(value: number): string {
  return value.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

/**
 * Format hours with optional suffix
 * @param hours - Number of hours
 * @param showSuffix - Whether to show "h" suffix (default: true)
 * @returns Formatted string like "2.5h" or "2.5"
 *
 * @example
 * formatHours(2.5)        // "2.5h"
 * formatHours(2.5, false) // "2.5"
 */
export function formatHours(hours: number, showSuffix: boolean = true): string {
  const formatted = hours.toFixed(2).replace(/\.?0+$/, ''); // Remove trailing zeros
  return showSuffix ? `${formatted}h` : formatted;
}

// ============================================================================
// PLURALIZATION HELPERS
// ============================================================================

/**
 * Pluralize a word based on count
 * @param count - Number to check
 * @param singular - Singular form of word
 * @param plural - Plural form of word (optional, defaults to singular + "s")
 * @returns Singular or plural form based on count
 *
 * @example
 * pluralize(1, "site")         // "site"
 * pluralize(2, "site")         // "sites"
 * pluralize(1, "property", "properties") // "property"
 * pluralize(5, "property", "properties") // "properties"
 */
export function pluralize(count: number, singular: string, plural?: string): string {
  return count === 1 ? singular : (plural || `${singular}s`);
}

/**
 * Format count with pluralized word
 * @param count - Number to display
 * @param singular - Singular form of word
 * @param plural - Plural form of word (optional, defaults to singular + "s")
 * @returns Formatted string like "1 site" or "5 sites"
 *
 * @example
 * formatCount(1, "site")         // "1 site"
 * formatCount(5, "site")         // "5 sites"
 * formatCount(1, "property", "properties") // "1 property"
 * formatCount(3, "property", "properties") // "3 properties"
 */
export function formatCount(count: number, singular: string, plural?: string): string {
  return `${count} ${pluralize(count, singular, plural)}`;
}
