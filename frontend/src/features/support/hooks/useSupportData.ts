/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * useSupportData Hook
 *
 * Centralizes data loading, filtering, sorting, and pagination for Support Tickets page
 *
 * Responsibilities:
 * - Load requests from API (SMS + Tickets)
 * - Filter requests by date/category/urgency/source/search
 * - Sort requests with multi-level chronological fallback
 * - Paginate filtered/sorted results
 * - Separate billable vs non-billable vs archived requests
 */

import { useState, useEffect, useMemo } from 'react'
import type { ChatRequest } from '../../../types/request'
import { fetchRequests, checkAPIHealth } from '../../../utils/api'
import { parseLocalDate, parseTimeToMinutes, getDayOfWeek } from '../../../utils/supportHelpers'
import { categorizeRequest } from '../../../utils/dataProcessing'

interface UseSupportDataProps {
  // Date filters
  selectedYear: number
  selectedMonth: number | 'all'
  selectedDay: string | 'all'

  // Column filters
  categoryFilter: string[]
  urgencyFilter: string[]
  sourceFilter: string[]
  dateFilter: string
  dayFilter: string[]

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

export function useSupportData(props: UseSupportDataProps): UseSupportDataReturn {
  const {
    selectedYear,
    selectedMonth,
    selectedDay,
    categoryFilter,
    urgencyFilter,
    sourceFilter,
    dateFilter,
    dayFilter,
    searchQuery,
    hideNonBillable,
    sortColumn,
    sortDirection,
    currentPage,
    pageSize
  } = props

  // State
  const [requests, setRequests] = useState<ChatRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [apiAvailable, setApiAvailable] = useState(false)

  // Load data function
  const loadData = async () => {
    console.log('useSupportData: Loading data...')
    try {
      // Check if API is available
      const apiHealthy = await checkAPIHealth()
      console.log('useSupportData: API health check result:', apiHealthy)

      if (apiHealthy) {
        // Use API to load data
        console.log('useSupportData: Loading from API...')
        setApiAvailable(true)

        // Fetch all requests regardless of status
        const apiRequests = await fetchRequests({ status: 'all' })
        console.log('useSupportData: Received from API:', { count: apiRequests.length })

        // Default existing data to 'sms' source if not specified
        const requestsWithSource = apiRequests.map(req => ({
          ...req,
          source: req.source || 'sms'
        }))

        console.log(`useSupportData: Total requests: ${requestsWithSource.length}`)

        // Keep ALL requests (including deleted) for archive functionality
        setRequests(requestsWithSource)
      } else {
        throw new Error('API is not available')
      }

      setLoading(false)
    } catch (error) {
      console.error('useSupportData: Error loading data:', error)
      setApiAvailable(false)

      // Use sample data for development
      const sampleData: ChatRequest[] = [
        {
          Date: '2025-05-15',
          Time: '07:14 AM',
          Request_Summary: 'Sample request - API connection failed',
          Urgency: 'HIGH',
          Category: 'Support',
          EstimatedHours: 0.5
        }
      ]
      setRequests(sampleData)
      setLoading(false)
    }
  }

  // Load data on mount
  useEffect(() => {
    loadData()
  }, [])

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
      if (dateFilter !== 'all' && request.Date !== dateFilter) return false
      if (dayFilter.length > 0 && !dayFilter.includes(requestDayOfWeek)) return false

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
    dateFilter,
    dayFilter,
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
    reloadData: loadData
  }
}
