/**
 * Support page helper functions for date/time parsing and formatting
 *
 * NOTE: This file re-exports from the consolidated timeUtils module.
 * Kept for backward compatibility - existing imports continue to work.
 * New code should import directly from '../shared/utils/time/timeUtils'.
 */

export {
  parseLocalDate,
  parseTimeToMinutes,
  getDayOfWeek,
  formatHour,
} from '../shared/utils/time/timeUtils';
