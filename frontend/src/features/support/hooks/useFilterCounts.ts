/**
 * useFilterCounts Hook
 *
 * Calculates counts for all filter options based on current period requests.
 * Used to display counts next to checkbox options (e.g., "Support (45)").
 */

import { useMemo } from 'react';
import type { ChatRequest } from '../../../types/request';
import type { FilterCounts } from '../types/filters';
import { parseLocalDate, getDayOfWeek } from '../../../utils/supportHelpers';

interface UseFilterCountsParams {
  requests: ChatRequest[];
  selectedYear: number;
  selectedMonth: number | 'all';
  selectedDay: string | 'all';
}

/**
 * Hook to calculate filter option counts for display in the filter panel
 *
 * @param params - Parameters containing requests and current period selection
 * @returns FilterCounts object with counts for each filter type
 */
export function useFilterCounts({
  requests,
  selectedYear,
  selectedMonth,
  selectedDay,
}: UseFilterCountsParams): FilterCounts {
  return useMemo(() => {
    // Filter to active requests within current period
    const periodRequests = requests.filter((request) => {
      if (request.Status !== 'active') return false;

      const requestDate = parseLocalDate(request.Date);
      const requestYear = requestDate.getFullYear();
      const requestMonth = requestDate.getMonth() + 1;

      if (requestYear !== selectedYear) return false;
      if (selectedMonth !== 'all' && requestMonth !== selectedMonth) return false;
      if (selectedDay !== 'all' && request.Date !== selectedDay) return false;

      return true;
    });

    // Initialize count objects
    const source: Record<string, number> = {};
    const urgency: Record<string, number> = {};
    const category: Record<string, number> = {};
    const day: Record<string, number> = {};

    // Calculate counts for each filter type
    periodRequests.forEach((request) => {
      // Source counts
      const src = request.source || 'sms';
      source[src] = (source[src] || 0) + 1;

      // Urgency counts
      const urg = request.Urgency;
      if (urg) {
        urgency[urg] = (urgency[urg] || 0) + 1;
      }

      // Category counts
      const cat = request.Category || 'Support';
      category[cat] = (category[cat] || 0) + 1;

      // Day of week counts
      const dayOfWeek = getDayOfWeek(request.Date);
      if (dayOfWeek) {
        day[dayOfWeek] = (day[dayOfWeek] || 0) + 1;
      }
    });

    return { source, urgency, category, day };
  }, [requests, selectedYear, selectedMonth, selectedDay]);
}

/**
 * Calculate total active filter count for badge display
 *
 * @param filters - Current filter state
 * @returns Number of active filters
 */
export function calculateActiveFilterCount(filters: {
  categoryFilter: string[];
  urgencyFilter: string[];
  sourceFilter: string[];
  dateRange: { from: string | null; to: string | null };
  dayFilter: string[];
}): number {
  let count = 0;
  if (filters.categoryFilter.length > 0) count++;
  if (filters.urgencyFilter.length > 0) count++;
  if (filters.sourceFilter.length > 0) count++;
  if (filters.dateRange.from || filters.dateRange.to) count++;
  if (filters.dayFilter.length > 0) count++;
  return count;
}
