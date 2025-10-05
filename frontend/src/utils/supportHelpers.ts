/**
 * Support page helper functions for date/time parsing and formatting
 */

/**
 * Parse a date string (YYYY-MM-DD) manually to avoid timezone issues
 * JavaScript's new Date("2025-06-23") interprets as UTC midnight, causing timezone shift
 */
export function parseLocalDate(dateString: string): Date {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day); // month is 0-indexed
}

/**
 * Convert time string (e.g., "8:47 AM") to minutes since midnight
 * Used for time-based sorting and comparisons
 */
export function parseTimeToMinutes(timeStr: string): number {
  const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!match) return 0;

  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const period = match[3].toUpperCase();

  if (period === 'PM' && hours !== 12) hours += 12;
  if (period === 'AM' && hours === 12) hours = 0;

  return hours * 60 + minutes;
}

/**
 * Get day of week abbreviation from date string (YYYY-MM-DD)
 */
export function getDayOfWeek(dateString: string): string {
  const date = parseLocalDate(dateString);
  return date.toLocaleDateString('en-US', { weekday: 'short' });
}

/**
 * Format hour number (0-23) to 12-hour time string
 */
export function formatHour(hour: number): string {
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${displayHour} ${period}`;
}
