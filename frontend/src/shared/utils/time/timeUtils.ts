/**
 * Consolidated time utility functions
 * Single source of truth for time/date operations
 *
 * This file consolidates the parseTimeToMinutes function that was duplicated in:
 * - utils/supportHelpers.ts
 * - utils/dataProcessing.ts
 * - services/billingApi.ts
 */

/**
 * Parse a date string (YYYY-MM-DD) manually to avoid timezone issues
 * JavaScript's new Date("2025-06-23") interprets as UTC midnight, causing timezone shift
 *
 * @param dateString - Date in YYYY-MM-DD format
 * @returns Date object in local timezone
 */
export function parseLocalDate(dateString: string): Date {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day); // month is 0-indexed
}

/**
 * Convert time string (e.g., "8:47 AM") to minutes since midnight
 * Used for time-based sorting and comparisons
 *
 * @param timeStr - Time in "H:MM AM/PM" format
 * @returns Minutes since midnight (0-1439)
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
 *
 * @param dateString - Date in YYYY-MM-DD format
 * @returns Day abbreviation (e.g., "Mon", "Tue")
 */
export function getDayOfWeek(dateString: string): string {
  const date = parseLocalDate(dateString);
  return date.toLocaleDateString('en-US', { weekday: 'short' });
}

/**
 * Format hour number (0-23) to 12-hour time string
 *
 * @param hour - Hour in 24-hour format (0-23)
 * @returns Time string (e.g., "8 AM", "3 PM")
 */
export function formatHour(hour: number): string {
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${displayHour} ${period}`;
}

/**
 * Format time from 24-hour to 12-hour with AM/PM
 *
 * @param time24 - Time in HH:MM:SS or HH:MM format (24-hour)
 * @returns Time in "H:MM AM/PM" format
 */
export function formatTime(time24: string): string {
  const [hours, minutes] = time24.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
}

/**
 * Convert UTC time to Eastern Time
 *
 * @param date - Date in YYYY-MM-DD format
 * @param time - Time in HH:MM:SS format (UTC)
 * @returns Time in "H:MM:SS AM/PM" format (Eastern Time)
 */
export function convertToEasternTime(date: string, time: string): string {
  try {
    // Combine date and time into a full datetime string
    const utcDateTime = `${date}T${time}Z`;
    const utcDate = new Date(utcDateTime);

    // Convert to Eastern Time
    const easternTime = utcDate.toLocaleString('en-US', {
      timeZone: 'America/New_York',
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });

    return easternTime;
  } catch (error) {
    // If conversion fails, return original time
    console.warn('Time conversion failed:', error);
    return time;
  }
}
