/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * useSupportData Hook
 *
 * Centralizes data loading, filtering, sorting, and pagination for Support Tickets page
 *
 * Responsibilities:
 * - Load requests from API (SMS + Tickets) via React Query
 * - Filter requests by date/category/urgency/source/search
 * - Sort requests with multi-level chronological fallback
 * - Paginate filtered/sorted results
 * - Separate billable vs non-billable vs archived requests
 */

import { useState, useMemo, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { ChatRequest } from '../../../types/request'
import type { DateRangeFilter, BillingDateFilter } from '../types/filters'
import { fetchRequests, checkAPIHealth } from '../../../utils/api'
import { parseLocalDate, parseTimeToMinutes, getDayOfWeek } from '../../../utils/supportHelpers'
import { categorizeRequest } from '../../../utils/dataProcessing'
import { queryKeys } from '../../../lib/queryClient'

interface UseSupportDataProps {
  // Date filters
  selectedYear: number
  selectedMonth: number | 'all'
  selectedDay: string | 'all'

  // Column filters
  categoryFilter: string[]
  urgencyFilter: string[]
  sourceFilter: string[]
  dateRange: DateRangeFilter
  dayFilter: string[]
  billingDateFilter: BillingDateFilter
  hoursFilter: string[]

  // Search
  searchQuery: string

  // Visibility toggles
  hideNonBillable: boolean

  // Sorting
  sortColumn: string | null
  sortDirection: 'asc' | 'desc'

  // Pagination
  currentPage: number
  pageSize: number
}

interface UseSupportDataReturn {
  // Raw data
  requests: ChatRequest[]

  // Filtered/sorted data
  filteredAndSortedRequests: ChatRequest[]

  // Paginated data
  paginatedRequests: ChatRequest[]
  startIndex: number
  endIndex: number
  totalPages: number

  // Categorized data
  billableRequests: ChatRequest[]
  nonBillableRequests: ChatRequest[]
  archivedRequests: ChatRequest[]

  // Loading states
  loading: boolean
  apiAvailable: boolean

  // Data management
  setRequests: React.Dispatch<React.SetStateAction<ChatRequest[]>>
  reloadData: () => Promise<void>
}

/**
 * Fetches support requests from the API.
 * Checks API health first, then fetches all requests.
 */
async function fetchSupportRequests(): Promise<{ requests: ChatRequest[]; apiAvailable: boolean }> {
  const apiHealthy = await checkAPIHealth()

  if (apiHealthy) {
    const apiRequests = await fetchRequests({ status: 'all' })

    // Default existing data to 'sms' source if not specified
    const requestsWithSource = apiRequests.map(req => ({
      ...req,
      source: req.source || 'sms'
    }))

    return { requests: requestsWithSource, apiAvailable: true }
  }

  throw new Error('API is not available')
}

export function useSupportData(props: UseSupportDataProps): UseSupportDataReturn {
  const {
    selectedYear,
    selectedMonth,
    selectedDay,
    categoryFilter,
    urgencyFilter,
    sourceFilter,
    dateRange,
    dayFilter,
    billingDateFilter,
    hoursFilter,
    searchQuery,
    hideNonBillable,
    sortColumn,
    sortDirection,
    currentPage,
    pageSize
  } = props

  // Local state for optimistic updates
  const [localRequests, setLocalRequests] = useState<ChatRequest[] | null>(null)

  // Use React Query for data fetching
  const {
    data: queryData,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: queryKeys.requests.all,
    queryFn: fetchSupportRequests,
  })

  // Use local state if available (for optimistic updates), otherwise use query data
  // Wrapped in useMemo to stabilize reference for downstream useMemo dependencies
  const requests = useMemo(
    () => localRequests ?? queryData?.requests ?? [],
    [localRequests, queryData?.requests]
  )
  const apiAvailable = queryData?.apiAvailable ?? false
  const loading = isLoading

  // Provide setRequests for optimistic updates from parent components
  const setRequests: React.Dispatch<React.SetStateAction<ChatRequest[]>> = useCallback((action) => {
    setLocalRequests(prev => {
      const currentRequests = prev ?? queryData?.requests ?? []
      if (typeof action === 'function') {
        return action(currentRequests)
      }
      return action
    })
  }, [queryData?.requests])

  // Reload data function
  const reloadData = useCallback(async () => {
    setLocalRequests(null) // Clear optimistic state
    await refetch()
  }, [refetch])

  // Billable requests (active status, not Non-billable or Migration)
  const billableRequests = useMemo(() => {
    return requests.filter(request =>
      request.Status === 'active' &&
      request.Category !== 'Non-billable' &&
      request.Category !== 'Migration'
    )
  }, [requests])

  // Non-billable requests (active status, Non-billable or Migration)
  const nonBillableRequests = useMemo(() => {
    return requests.filter(request =>
      request.Status === 'active' &&
      (request.Category === 'Non-billable' || request.Category === 'Migration')
    )
  }, [requests])

  // Archived requests (deleted status, sorted chronologically)
  const archivedRequests = useMemo(() => {
    return requests
      .filter(request => request.Status === 'deleted')
      .sort((a, b) => {
        // Sort by date first
        const dateA = parseLocalDate(a.Date)
        const dateB = parseLocalDate(b.Date)
        if (dateA < dateB) return -1
        if (dateA > dateB) return 1

        // If dates are equal, sort by time
        const timeA = parseTimeToMinutes(a.Time)
        const timeB = parseTimeToMinutes(b.Time)
        return timeA - timeB
      })
  }, [requests])

  // Filter and sort requests
  const filteredAndSortedRequests = useMemo(() => {
    // First filter by year, month, day, column filters, and search query
    const filtered = requests.filter(request => {
      // Exclude deleted items from main table (only show active items)
      if (request.Status === 'deleted') return false

      const requestDate = parseLocalDate(request.Date)
      const requestYear = requestDate.getFullYear()
      const requestMonth = requestDate.getMonth() + 1 // JavaScript months are 0-indexed
      const requestDayOfWeek = getDayOfWeek(request.Date)

      // Apply non-billable filter if toggle is on (includes Migration which is billed at $0)
      if (hideNonBillable) {
        const isNonBillable = request.Category === 'Non-billable' || request.Category === 'Migration'
        if (isNonBillable) return false
      }

      // Date/time filters
      if (requestYear !== selectedYear) return false
      if (selectedMonth !== 'all' && requestMonth !== selectedMonth) return false
      if (selectedDay !== 'all' && request.Date !== selectedDay) return false

      // Column filters - updated for checkbox arrays
      if (categoryFilter.length > 0 && !categoryFilter.includes(request.Category || 'Support')) return false
      if (urgencyFilter.length > 0 && !urgencyFilter.includes(request.Urgency)) return false
      if (sourceFilter.length > 0 && !sourceFilter.includes(request.source || 'sms')) return false

      // Date range filtering
      if (dateRange.from || dateRange.to) {
        const requestDateStr = request.Date // YYYY-MM-DD format
        if (dateRange.from && requestDateStr < dateRange.from) return false
        if (dateRange.to && requestDateStr > dateRange.to) return false
      }

      if (dayFilter.length > 0 && !dayFilter.includes(requestDayOfWeek)) return false

      // Billing date presence filter
      if (billingDateFilter.hasValue === 'yes') {
        if (!request.BillingDate) return false
      } else if (billingDateFilter.hasValue === 'no') {
        if (request.BillingDate) return false
      }

      // Billing date range filter (only when hasValue is 'all' or 'yes')
      if (billingDateFilter.hasValue !== 'no' && (billingDateFilter.from || billingDateFilter.to)) {
        const billingDate = request.BillingDate
        if (!billingDate) return false // No billing date but range specified
        if (billingDateFilter.from && billingDate < billingDateFilter.from) return false
        if (billingDateFilter.to && billingDate > billingDateFilter.to) return false
      }

      // Hours range filter
      if (hoursFilter.length > 0) {
        const hours = request.EstimatedHours || 0
        const matchesRange = hoursFilter.some(range => {
          switch (range) {
            case '0-0.5': return hours >= 0 && hours < 0.5
            case '0.5-1': return hours >= 0.5 && hours < 1
            case '1-2': return hours >= 1 && hours < 2
            case '2-4': return hours >= 2 && hours < 4
            case '4+': return hours >= 4
            default: return false
          }
        })
        if (!matchesRange) return false
      }

      // Search filter - case-insensitive search in Request_Summary
      if (searchQuery.trim() !== '') {
        const searchLower = searchQuery.toLowerCase()
        const summary = request.Request_Summary?.toLowerCase() || ''
        if (!summary.includes(searchLower)) return false
      }

      return true
    })

    // Then sort with multi-level sorting (always maintain chronological order as secondary)
    if (!sortColumn) return filtered

    return filtered.sort((a, b) => {
      let aValue: any, bValue: any

      switch (sortColumn) {
        case 'Date':
          aValue = parseLocalDate(a.Date)
          bValue = parseLocalDate(b.Date)
          break
        case 'DayOfWeek':
          aValue = getDayOfWeek(a.Date)
          bValue = getDayOfWeek(b.Date)
          break
        case 'Time':
          aValue = parseTimeToMinutes(a.Time)
          bValue = parseTimeToMinutes(b.Time)
          break
        case 'Request_Summary':
          aValue = a.Request_Summary.toLowerCase()
          bValue = b.Request_Summary.toLowerCase()
          break
        case 'Category':
          aValue = (a.Category || categorizeRequest(a.Request_Summary)).toLowerCase()
          bValue = (b.Category || categorizeRequest(b.Request_Summary)).toLowerCase()
          break
        case 'Urgency': {
          // Sort by urgency level: HIGH > MEDIUM > LOW > PROMOTION
          const urgencyOrder = { 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1, 'PROMOTION': 0 }
          aValue = urgencyOrder[a.Urgency as keyof typeof urgencyOrder] || 0
          bValue = urgencyOrder[b.Urgency as keyof typeof urgencyOrder] || 0
          break
        }
        case 'EstimatedHours':
          aValue = a.EstimatedHours || 0
          bValue = b.EstimatedHours || 0
          break
        case 'BillingDate':
          // Sort by billing date, nulls last for ascending, first for descending
          aValue = a.BillingDate || ''
          bValue = b.BillingDate || ''
          // Handle null values specially - nulls go to end for asc, beginning for desc
          if (!a.BillingDate && b.BillingDate) return sortDirection === 'asc' ? 1 : -1
          if (a.BillingDate && !b.BillingDate) return sortDirection === 'asc' ? -1 : 1
          break
        default:
          return 0
      }

      // Primary sort by selected column
      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1

      // If primary values are equal, maintain chronological order
      // Secondary sort by date (always ascending for consistency)
      const dateA = parseLocalDate(a.Date)
      const dateB = parseLocalDate(b.Date)
      if (dateA < dateB) return -1
      if (dateA > dateB) return 1

      // If dates are also equal, tertiary sort by time (always ascending)
      const timeA = parseTimeToMinutes(a.Time)
      const timeB = parseTimeToMinutes(b.Time)
      if (timeA < timeB) return -1
      if (timeA > timeB) return 1

      return 0
    })
  }, [
    requests,
    selectedYear,
    selectedMonth,
    selectedDay,
    categoryFilter,
    urgencyFilter,
    sourceFilter,
    dateRange,
    dayFilter,
    billingDateFilter,
    hoursFilter,
    searchQuery,
    hideNonBillable,
    sortColumn,
    sortDirection
  ])

  // Pagination calculations
  const { paginatedRequests, startIndex, endIndex, totalPages } = useMemo(() => {
    const total = pageSize === filteredAndSortedRequests.length
      ? 1
      : Math.ceil(filteredAndSortedRequests.length / pageSize)

    const start = (currentPage - 1) * pageSize
    const end = pageSize === filteredAndSortedRequests.length
      ? filteredAndSortedRequests.length
      : Math.min(start + pageSize, filteredAndSortedRequests.length)

    const paginated = pageSize === filteredAndSortedRequests.length
      ? filteredAndSortedRequests
      : filteredAndSortedRequests.slice(start, end)

    return {
      paginatedRequests: paginated,
      startIndex: start,
      endIndex: end,
      totalPages: total
    }
  }, [filteredAndSortedRequests, currentPage, pageSize])

  return {
    // Raw data
    requests,

    // Filtered/sorted data
    filteredAndSortedRequests,

    // Paginated data
    paginatedRequests,
    startIndex,
    endIndex,
    totalPages,

    // Categorized data
    billableRequests,
    nonBillableRequests,
    archivedRequests,

    // Loading states
    loading,
    apiAvailable,

    // Data management
    setRequests,
    reloadData
  }
}
