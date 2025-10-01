/**
 * Currency formatting utilities for consistent display across the application
 */

/**
 * Accounting format result - splits currency symbol and amount for alignment
 */
export interface AccountingFormat {
  symbol: string;
  amount: string;
}

/**
 * Format currency in standard string format (e.g., "$1,234.56")
 * Used for scorecards, charts, and inline displays
 */
export function formatCurrency(value: number): string {
  return `$${value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Format currency in accounting style for table alignment
 * Returns separate symbol and amount for proper decimal/dollar sign alignment
 *
 * Example usage in JSX:
 * ```tsx
 * const { symbol, amount } = formatCurrencyAccounting(1234.56);
 * <td className="text-right">
 *   <span>{symbol}</span>
 *   <span className="tabular-nums">{amount}</span>
 * </td>
 * ```
 */
export function formatCurrencyAccounting(value: number): AccountingFormat {
  const formatted = value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return {
    symbol: '$',
    amount: formatted,
  };
}

/**
 * Convert micros (1/1,000,000 of a dollar) to dollars
 * Used for Twenty CRM API values
 */
export function convertMicrosToDollars(micros: number): number {
  return micros / 1_000_000;
}
