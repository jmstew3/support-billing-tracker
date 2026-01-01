/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMemo } from 'react';
import type { ChatRequest } from '../../../types/request';
import { parseLocalDate, parseTimeToMinutes, getDayOfWeek } from '../../../utils/supportHelpers';
import { categorizeRequest } from '../../../utils/dataProcessing';

export interface FilterOptions {
  selectedYear: number;
  selectedMonth: number | 'all';
  selectedDay: string | 'all';
  categoryFilter: string[];
  urgencyFilter: string[];
  sourceFilter: string[];
  dateFilter: string | 'all';
  dayFilter: string[];
  searchQuery: string;
  hideNonBillable: boolean;
  sortColumn: string | null;
  sortDirection: 'asc' | 'desc';
}

export interface PaginationOptions {
  currentPage: number;
  pageSize: number;
}

export function useSupportFiltering(
  requests: ChatRequest[],
  filters: FilterOptions,
  pagination?: PaginationOptions
) {
  // Separate billable and non-billable requests
  const billableRequests = useMemo(
    () => requests.filter(request =>
      request.Status === 'active' &&
      request.Category !== 'Non-billable' &&
      request.Category !== 'Migration'
    ),
    [requests]
  );

  const nonBillableRequests = useMemo(
    () => requests.filter(request =>
      request.Status === 'active' &&
      (request.Category === 'Non-billable' || request.Category === 'Migration')
    ),
    [requests]
  );

  const archivedRequests = useMemo(
    () => requests.filter(request => request.Status === 'deleted'),
    [requests]
  );

  // Filter and sort requests
  const filteredAndSortedRequests = useMemo(() => {
    // First filter by all criteria
    const filtered = requests.filter(request => {
      // Exclude deleted items from main table (only show active items)
      if (request.Status === 'deleted') return false;

      const requestDate = parseLocalDate(request.Date);
      const requestYear = requestDate.getFullYear();
      const requestMonth = requestDate.getMonth() + 1; // JavaScript months are 0-indexed
      const requestDayOfWeek = getDayOfWeek(request.Date);

      // Apply non-billable filter if toggle is on (includes Migration which is billed at $0)
      if (filters.hideNonBillable) {
        const isNonBillable = request.Category === 'Non-billable' || request.Category === 'Migration';
        if (isNonBillable) return false;
      }

      // Date/time filters
      if (requestYear !== filters.selectedYear) return false;
      if (filters.selectedMonth !== 'all' && requestMonth !== filters.selectedMonth) return false;
      if (filters.selectedDay !== 'all' && request.Date !== filters.selectedDay) return false;

      // Column filters - updated for checkbox arrays
      if (filters.categoryFilter.length > 0 && !filters.categoryFilter.includes(request.Category || 'Support')) return false;
      if (filters.urgencyFilter.length > 0 && !filters.urgencyFilter.includes(request.Urgency)) return false;
      if (filters.sourceFilter.length > 0 && !filters.sourceFilter.includes(request.source || 'sms')) return false;
      if (filters.dateFilter !== 'all' && request.Date !== filters.dateFilter) return false;
      if (filters.dayFilter.length > 0 && !filters.dayFilter.includes(requestDayOfWeek)) return false;

      // Search filter - case-insensitive search in Request_Summary
      if (filters.searchQuery.trim() !== '') {
        const searchLower = filters.searchQuery.toLowerCase();
        const summary = request.Request_Summary?.toLowerCase() || '';
        if (!summary.includes(searchLower)) return false;
      }

      return true;
    });

    // Then sort with multi-level sorting (always maintain chronological order as secondary)
    if (!filters.sortColumn) return filtered;

    return filtered.sort((a, b) => {
      let aValue: any, bValue: any;

      switch (filters.sortColumn) {
        case 'Date':
          aValue = parseLocalDate(a.Date);
          bValue = parseLocalDate(b.Date);
          break;
        case 'DayOfWeek':
          aValue = getDayOfWeek(a.Date);
          bValue = getDayOfWeek(b.Date);
          break;
        case 'Time':
          aValue = parseTimeToMinutes(a.Time);
          bValue = parseTimeToMinutes(b.Time);
          break;
        case 'Request_Summary':
          aValue = a.Request_Summary.toLowerCase();
          bValue = b.Request_Summary.toLowerCase();
          break;
        case 'Category':
          aValue = (a.Category || categorizeRequest(a.Request_Summary)).toLowerCase();
          bValue = (b.Category || categorizeRequest(b.Request_Summary)).toLowerCase();
          break;
        case 'Urgency': {
          // Sort by urgency level: HIGH > MEDIUM > LOW
          const urgencyOrder = { 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1 };
          aValue = urgencyOrder[a.Urgency as keyof typeof urgencyOrder] || 0;
          bValue = urgencyOrder[b.Urgency as keyof typeof urgencyOrder] || 0;
          break;
        }
        default:
          return 0;
      }

      // Primary sort by selected column
      if (aValue < bValue) return filters.sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return filters.sortDirection === 'asc' ? 1 : -1;

      // If primary values are equal, maintain chronological order
      // Secondary sort by date (always ascending for consistency)
      const dateA = parseLocalDate(a.Date);
      const dateB = parseLocalDate(b.Date);
      if (dateA < dateB) return -1;
      if (dateA > dateB) return 1;

      // If dates are also equal, tertiary sort by time (always ascending)
      const timeA = parseTimeToMinutes(a.Time);
      const timeB = parseTimeToMinutes(b.Time);
      if (timeA < timeB) return -1;
      if (timeA > timeB) return 1;

      return 0;
    });
  }, [requests, filters]);

  // Filter billable requests by date for cost/category calculations
  const billableFilteredRequests = useMemo(() => {
    return billableRequests.filter(request => {
      const requestDate = parseLocalDate(request.Date);
      const requestYear = requestDate.getFullYear();
      const requestMonth = requestDate.getMonth() + 1;

      if (requestYear !== filters.selectedYear) return false;
      if (filters.selectedMonth !== 'all' && requestMonth !== filters.selectedMonth) return false;

      return true;
    });
  }, [billableRequests, filters.selectedYear, filters.selectedMonth]);

  // Pagination
  const paginatedRequests = useMemo(() => {
    if (!pagination) return filteredAndSortedRequests;

    const { currentPage, pageSize } = pagination;
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = pageSize === filteredAndSortedRequests.length
      ? filteredAndSortedRequests.length
      : Math.min(startIndex + pageSize, filteredAndSortedRequests.length);

    return pageSize === filteredAndSortedRequests.length
      ? filteredAndSortedRequests
      : filteredAndSortedRequests.slice(startIndex, endIndex);
  }, [filteredAndSortedRequests, pagination]);

  return {
    billableRequests,
    nonBillableRequests,
    archivedRequests,
    filteredAndSortedRequests,
    billableFilteredRequests,
    paginatedRequests,
  };
}
