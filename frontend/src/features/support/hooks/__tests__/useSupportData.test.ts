/**
 * Tests for useSupportData hook
 * Validates data loading, filtering, sorting, and pagination logic
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import { useSupportData } from '../useSupportData'
import type { ChatRequest } from '../../../../types/request'
import * as api from '../../../../utils/api'

// Mock the API module
vi.mock('../../../../utils/api', () => ({
  fetchRequests: vi.fn(),
  checkAPIHealth: vi.fn(),
  updateRequest: vi.fn(),
  bulkUpdateRequests: vi.fn(),
  deleteRequest: vi.fn()
}))

// Sample test data
const createMockRequest = (overrides: Partial<ChatRequest> = {}): ChatRequest => ({
  Date: '2025-06-23',
  Time: '8:00 AM',
  Request_Summary: 'Test request',
  Urgency: 'MEDIUM',
  Category: 'Support',
  EstimatedHours: 0.5,
  Status: 'active',
  source: 'sms',
  ...overrides
})

const mockRequests: ChatRequest[] = [
  createMockRequest({ Date: '2025-06-23', Time: '8:00 AM', Urgency: 'HIGH', Category: 'Support' }),
  createMockRequest({ Date: '2025-06-23', Time: '9:00 AM', Urgency: 'MEDIUM', Category: 'Hosting' }),
  createMockRequest({ Date: '2025-06-24', Time: '10:00 AM', Urgency: 'LOW', Category: 'Forms' }),
  createMockRequest({ Date: '2025-06-25', Time: '11:00 AM', Urgency: 'MEDIUM', Category: 'Support', Status: 'deleted' }),
  createMockRequest({ Date: '2025-06-26', Time: '12:00 PM', Urgency: 'HIGH', Category: 'Non-billable' }),
  createMockRequest({ Date: '2025-06-27', Time: '1:00 PM', Urgency: 'MEDIUM', Category: 'Migration' }),
  createMockRequest({ Date: '2025-05-15', Time: '2:00 PM', Urgency: 'LOW', Category: 'Support' }), // Different month
  createMockRequest({ Date: '2025-06-28', Time: '3:00 PM', Urgency: 'MEDIUM', Category: 'Support', source: 'ticket' }),
]

// Create a wrapper with QueryClientProvider for renderHook
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
    },
  })
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children)
  }
}

describe('useSupportData', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Data Loading', () => {
    it('should load data from API on mount', async () => {
      const mockCheckHealth = vi.mocked(api.checkAPIHealth)
      const mockFetchRequests = vi.mocked(api.fetchRequests)

      mockCheckHealth.mockResolvedValue(true)
      mockFetchRequests.mockResolvedValue(mockRequests)

      const { result } = renderHook(() => useSupportData({
        selectedYear: 2025,
        selectedMonth: 'all',
        selectedDay: 'all',
        categoryFilter: [],
        urgencyFilter: [],
        sourceFilter: [],
        dateRange: { from: null, to: null },
        dayFilter: [],
        billingDateFilter: { from: null, to: null, hasValue: 'all' },
        hoursFilter: [],
        searchQuery: '',
        hideNonBillable: false,
        sortColumn: null,
        sortDirection: 'asc',
        currentPage: 1,
        pageSize: 20
      }), { wrapper: createWrapper() })

      // Initially loading
      expect(result.current.loading).toBe(true)

      // Wait for data to load
      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(mockCheckHealth).toHaveBeenCalled()
      expect(mockFetchRequests).toHaveBeenCalledWith({ status: 'all' })
      expect(result.current.requests).toHaveLength(8)
      expect(result.current.apiAvailable).toBe(true)
    })

    it('should default source to "sms" if not specified', async () => {
      const requestsWithoutSource = [
        { ...createMockRequest(), source: undefined }
      ]

      vi.mocked(api.checkAPIHealth).mockResolvedValue(true)
      vi.mocked(api.fetchRequests).mockResolvedValue(requestsWithoutSource as ChatRequest[])

      const { result } = renderHook(() => useSupportData({
        selectedYear: 2025,
        selectedMonth: 'all',
        selectedDay: 'all',
        categoryFilter: [],
        urgencyFilter: [],
        sourceFilter: [],
        dateRange: { from: null, to: null },
        dayFilter: [],
        billingDateFilter: { from: null, to: null, hasValue: 'all' },
        hoursFilter: [],
        searchQuery: '',
        hideNonBillable: false,
        sortColumn: null,
        sortDirection: 'asc',
        currentPage: 1,
        pageSize: 20
      }), { wrapper: createWrapper() })

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.requests[0].source).toBe('sms')
    })

    it('should handle API failure gracefully', async () => {
      vi.mocked(api.checkAPIHealth).mockResolvedValue(false)

      const { result } = renderHook(() => useSupportData({
        selectedYear: 2025,
        selectedMonth: 'all',
        selectedDay: 'all',
        categoryFilter: [],
        urgencyFilter: [],
        sourceFilter: [],
        dateRange: { from: null, to: null },
        dayFilter: [],
        billingDateFilter: { from: null, to: null, hasValue: 'all' },
        hoursFilter: [],
        searchQuery: '',
        hideNonBillable: false,
        sortColumn: null,
        sortDirection: 'asc',
        currentPage: 1,
        pageSize: 20
      }), { wrapper: createWrapper() })

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      // With React Query, a failed fetch results in empty data and apiAvailable=false
      expect(result.current.apiAvailable).toBe(false)
      expect(result.current.requests).toHaveLength(0)
    })
  })

  describe('Request Categorization', () => {
    beforeEach(async () => {
      vi.mocked(api.checkAPIHealth).mockResolvedValue(true)
      vi.mocked(api.fetchRequests).mockResolvedValue(mockRequests)
    })

    it('should separate billable requests (active, not Non-billable/Migration)', async () => {
      const { result } = renderHook(() => useSupportData({
        selectedYear: 2025,
        selectedMonth: 'all',
        selectedDay: 'all',
        categoryFilter: [],
        urgencyFilter: [],
        sourceFilter: [],
        dateRange: { from: null, to: null },
        dayFilter: [],
        billingDateFilter: { from: null, to: null, hasValue: 'all' },
        hoursFilter: [],
        searchQuery: '',
        hideNonBillable: false,
        sortColumn: null,
        sortDirection: 'asc',
        currentPage: 1,
        pageSize: 20
      }), { wrapper: createWrapper() })

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      // Should have 5 billable requests (Support, Hosting, Forms, Support-ticket, Support-May)
      // Excludes: deleted (1), Non-billable (1), Migration (1)
      expect(result.current.billableRequests).toHaveLength(5)
      expect(result.current.billableRequests.every(r => r.Status === 'active')).toBe(true)
      expect(result.current.billableRequests.every(r =>
        r.Category !== 'Non-billable' && r.Category !== 'Migration'
      )).toBe(true)
    })

    it('should separate non-billable requests (Non-billable or Migration)', async () => {
      const { result } = renderHook(() => useSupportData({
        selectedYear: 2025,
        selectedMonth: 'all',
        selectedDay: 'all',
        categoryFilter: [],
        urgencyFilter: [],
        sourceFilter: [],
        dateRange: { from: null, to: null },
        dayFilter: [],
        billingDateFilter: { from: null, to: null, hasValue: 'all' },
        hoursFilter: [],
        searchQuery: '',
        hideNonBillable: false,
        sortColumn: null,
        sortDirection: 'asc',
        currentPage: 1,
        pageSize: 20
      }), { wrapper: createWrapper() })

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      // Should have 2 non-billable requests
      expect(result.current.nonBillableRequests).toHaveLength(2)
      expect(result.current.nonBillableRequests.every(r =>
        r.Category === 'Non-billable' || r.Category === 'Migration'
      )).toBe(true)
    })

    it('should separate archived requests (deleted status)', async () => {
      const { result } = renderHook(() => useSupportData({
        selectedYear: 2025,
        selectedMonth: 'all',
        selectedDay: 'all',
        categoryFilter: [],
        urgencyFilter: [],
        sourceFilter: [],
        dateRange: { from: null, to: null },
        dayFilter: [],
        billingDateFilter: { from: null, to: null, hasValue: 'all' },
        hoursFilter: [],
        searchQuery: '',
        hideNonBillable: false,
        sortColumn: null,
        sortDirection: 'asc',
        currentPage: 1,
        pageSize: 20
      }), { wrapper: createWrapper() })

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      // Should have 1 archived request
      expect(result.current.archivedRequests).toHaveLength(1)
      expect(result.current.archivedRequests[0].Status).toBe('deleted')
    })

    it('should sort archived requests chronologically', async () => {
      const archivedRequests = [
        createMockRequest({ Date: '2025-06-25', Time: '2:00 PM', Status: 'deleted' }),
        createMockRequest({ Date: '2025-06-23', Time: '10:00 AM', Status: 'deleted' }),
        createMockRequest({ Date: '2025-06-23', Time: '9:00 AM', Status: 'deleted' }),
      ]

      vi.mocked(api.fetchRequests).mockResolvedValue(archivedRequests)

      const { result } = renderHook(() => useSupportData({
        selectedYear: 2025,
        selectedMonth: 'all',
        selectedDay: 'all',
        categoryFilter: [],
        urgencyFilter: [],
        sourceFilter: [],
        dateRange: { from: null, to: null },
        dayFilter: [],
        billingDateFilter: { from: null, to: null, hasValue: 'all' },
        hoursFilter: [],
        searchQuery: '',
        hideNonBillable: false,
        sortColumn: null,
        sortDirection: 'asc',
        currentPage: 1,
        pageSize: 20
      }), { wrapper: createWrapper() })

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      const archived = result.current.archivedRequests
      expect(archived[0].Date).toBe('2025-06-23')
      expect(archived[0].Time).toBe('9:00 AM')
      expect(archived[1].Date).toBe('2025-06-23')
      expect(archived[1].Time).toBe('10:00 AM')
      expect(archived[2].Date).toBe('2025-06-25')
    })
  })

  describe('Filtering', () => {
    beforeEach(async () => {
      vi.mocked(api.checkAPIHealth).mockResolvedValue(true)
      vi.mocked(api.fetchRequests).mockResolvedValue(mockRequests)
    })

    it('should filter by year', async () => {
      const { result } = renderHook(() => useSupportData({
        selectedYear: 2024, // Different year
        selectedMonth: 'all',
        selectedDay: 'all',
        categoryFilter: [],
        urgencyFilter: [],
        sourceFilter: [],
        dateRange: { from: null, to: null },
        dayFilter: [],
        billingDateFilter: { from: null, to: null, hasValue: 'all' },
        hoursFilter: [],
        searchQuery: '',
        hideNonBillable: false,
        sortColumn: null,
        sortDirection: 'asc',
        currentPage: 1,
        pageSize: 20
      }), { wrapper: createWrapper() })

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      // No requests from 2024
      expect(result.current.filteredAndSortedRequests).toHaveLength(0)
    })

    it('should filter by month', async () => {
      const { result } = renderHook(() => useSupportData({
        selectedYear: 2025,
        selectedMonth: 6, // June
        selectedDay: 'all',
        categoryFilter: [],
        urgencyFilter: [],
        sourceFilter: [],
        dateRange: { from: null, to: null },
        dayFilter: [],
        billingDateFilter: { from: null, to: null, hasValue: 'all' },
        hoursFilter: [],
        searchQuery: '',
        hideNonBillable: false,
        sortColumn: null,
        sortDirection: 'asc',
        currentPage: 1,
        pageSize: 20
      }), { wrapper: createWrapper() })

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      // Should have 6 June requests (excludes May and deleted)
      expect(result.current.filteredAndSortedRequests).toHaveLength(6)
      expect(result.current.filteredAndSortedRequests.every(r =>
        r.Date.startsWith('2025-06')
      )).toBe(true)
    })

    it('should filter by specific day', async () => {
      const { result } = renderHook(() => useSupportData({
        selectedYear: 2025,
        selectedMonth: 6,
        selectedDay: '2025-06-23',
        categoryFilter: [],
        urgencyFilter: [],
        sourceFilter: [],
        dateRange: { from: null, to: null },
        dayFilter: [],
        billingDateFilter: { from: null, to: null, hasValue: 'all' },
        hoursFilter: [],
        searchQuery: '',
        hideNonBillable: false,
        sortColumn: null,
        sortDirection: 'asc',
        currentPage: 1,
        pageSize: 20
      }), { wrapper: createWrapper() })

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      // Should have 2 requests on June 23
      expect(result.current.filteredAndSortedRequests).toHaveLength(2)
      expect(result.current.filteredAndSortedRequests.every(r =>
        r.Date === '2025-06-23'
      )).toBe(true)
    })

    it('should filter by category', async () => {
      const { result } = renderHook(() => useSupportData({
        selectedYear: 2025,
        selectedMonth: 'all',
        selectedDay: 'all',
        categoryFilter: ['Support'],
        urgencyFilter: [],
        sourceFilter: [],
        dateRange: { from: null, to: null },
        dayFilter: [],
        billingDateFilter: { from: null, to: null, hasValue: 'all' },
        hoursFilter: [],
        searchQuery: '',
        hideNonBillable: false,
        sortColumn: null,
        sortDirection: 'asc',
        currentPage: 1,
        pageSize: 20
      }), { wrapper: createWrapper() })

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      // Should have 3 Support requests (excludes deleted)
      expect(result.current.filteredAndSortedRequests).toHaveLength(3)
      expect(result.current.filteredAndSortedRequests.every(r =>
        r.Category === 'Support'
      )).toBe(true)
    })

    it('should filter by urgency', async () => {
      const { result } = renderHook(() => useSupportData({
        selectedYear: 2025,
        selectedMonth: 'all',
        selectedDay: 'all',
        categoryFilter: [],
        urgencyFilter: ['HIGH'],
        sourceFilter: [],
        dateRange: { from: null, to: null },
        dayFilter: [],
        billingDateFilter: { from: null, to: null, hasValue: 'all' },
        hoursFilter: [],
        searchQuery: '',
        hideNonBillable: false,
        sortColumn: null,
        sortDirection: 'asc',
        currentPage: 1,
        pageSize: 20
      }), { wrapper: createWrapper() })

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      // Should have 2 HIGH urgency requests
      expect(result.current.filteredAndSortedRequests).toHaveLength(2)
      expect(result.current.filteredAndSortedRequests.every(r =>
        r.Urgency === 'HIGH'
      )).toBe(true)
    })

    it('should filter by source', async () => {
      const { result } = renderHook(() => useSupportData({
        selectedYear: 2025,
        selectedMonth: 'all',
        selectedDay: 'all',
        categoryFilter: [],
        urgencyFilter: [],
        sourceFilter: ['ticket'],
        dateRange: { from: null, to: null },
        dayFilter: [],
        billingDateFilter: { from: null, to: null, hasValue: 'all' },
        hoursFilter: [],
        searchQuery: '',
        hideNonBillable: false,
        sortColumn: null,
        sortDirection: 'asc',
        currentPage: 1,
        pageSize: 20
      }), { wrapper: createWrapper() })

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      // Should have 1 ticket source request
      expect(result.current.filteredAndSortedRequests).toHaveLength(1)
      expect(result.current.filteredAndSortedRequests[0].source).toBe('ticket')
    })

    it('should filter by search query', async () => {
      const specificRequests = [
        createMockRequest({ Request_Summary: 'Fix website bug' }),
        createMockRequest({ Request_Summary: 'Update hosting plan' }),
        createMockRequest({ Request_Summary: 'Website redesign' }),
      ]

      vi.mocked(api.fetchRequests).mockResolvedValue(specificRequests)

      const { result } = renderHook(() => useSupportData({
        selectedYear: 2025,
        selectedMonth: 'all',
        selectedDay: 'all',
        categoryFilter: [],
        urgencyFilter: [],
        sourceFilter: [],
        dateRange: { from: null, to: null },
        dayFilter: [],
        billingDateFilter: { from: null, to: null, hasValue: 'all' },
        hoursFilter: [],
        searchQuery: 'website',
        hideNonBillable: false,
        sortColumn: null,
        sortDirection: 'asc',
        currentPage: 1,
        pageSize: 20
      }), { wrapper: createWrapper() })

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      // Should find 2 requests with "website" (case-insensitive)
      expect(result.current.filteredAndSortedRequests).toHaveLength(2)
      expect(result.current.filteredAndSortedRequests.every(r =>
        r.Request_Summary.toLowerCase().includes('website')
      )).toBe(true)
    })

    it('should hide non-billable items when toggle is on', async () => {
      const { result } = renderHook(() => useSupportData({
        selectedYear: 2025,
        selectedMonth: 'all',
        selectedDay: 'all',
        categoryFilter: [],
        urgencyFilter: [],
        sourceFilter: [],
        dateRange: { from: null, to: null },
        dayFilter: [],
        billingDateFilter: { from: null, to: null, hasValue: 'all' },
        hoursFilter: [],
        searchQuery: '',
        hideNonBillable: true, // Toggle ON
        sortColumn: null,
        sortDirection: 'asc',
        currentPage: 1,
        pageSize: 20
      }), { wrapper: createWrapper() })

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      // Should exclude Non-billable and Migration (5 billable requests)
      expect(result.current.filteredAndSortedRequests).toHaveLength(5)
      expect(result.current.filteredAndSortedRequests.every(r =>
        r.Category !== 'Non-billable' && r.Category !== 'Migration'
      )).toBe(true)
    })

    it('should combine multiple filters (AND logic)', async () => {
      const { result } = renderHook(() => useSupportData({
        selectedYear: 2025,
        selectedMonth: 6,
        selectedDay: 'all',
        categoryFilter: ['Support'],
        urgencyFilter: ['MEDIUM'],
        sourceFilter: [],
        dateRange: { from: null, to: null },
        dayFilter: [],
        billingDateFilter: { from: null, to: null, hasValue: 'all' },
        hoursFilter: [],
        searchQuery: '',
        hideNonBillable: false,
        sortColumn: null,
        sortDirection: 'asc',
        currentPage: 1,
        pageSize: 20
      }), { wrapper: createWrapper() })

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      // Should have 1 request: June + Support + MEDIUM (excludes deleted and ticket)
      expect(result.current.filteredAndSortedRequests).toHaveLength(1)
      const request = result.current.filteredAndSortedRequests[0]
      expect(request.Date.startsWith('2025-06')).toBe(true)
      expect(request.Category).toBe('Support')
      expect(request.Urgency).toBe('MEDIUM')
    })
  })

  describe('Sorting', () => {
    beforeEach(async () => {
      vi.mocked(api.checkAPIHealth).mockResolvedValue(true)
      vi.mocked(api.fetchRequests).mockResolvedValue(mockRequests)
    })

    it('should return unsorted when sortColumn is null', async () => {
      const { result } = renderHook(() => useSupportData({
        selectedYear: 2025,
        selectedMonth: 6,
        selectedDay: 'all',
        categoryFilter: [],
        urgencyFilter: [],
        sourceFilter: [],
        dateRange: { from: null, to: null },
        dayFilter: [],
        billingDateFilter: { from: null, to: null, hasValue: 'all' },
        hoursFilter: [],
        searchQuery: '',
        hideNonBillable: false,
        sortColumn: null,
        sortDirection: 'asc',
        currentPage: 1,
        pageSize: 20
      }), { wrapper: createWrapper() })

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      // Should maintain original filter order (no sort applied)
      const dates = result.current.filteredAndSortedRequests.map(r => r.Date)
      expect(dates).toEqual(['2025-06-23', '2025-06-23', '2025-06-24', '2025-06-26', '2025-06-27', '2025-06-28'])
    })

    it('should sort by Urgency (HIGH > MEDIUM > LOW)', async () => {
      const { result } = renderHook(() => useSupportData({
        selectedYear: 2025,
        selectedMonth: 6,
        selectedDay: 'all',
        categoryFilter: [],
        urgencyFilter: [],
        sourceFilter: [],
        dateRange: { from: null, to: null },
        dayFilter: [],
        billingDateFilter: { from: null, to: null, hasValue: 'all' },
        hoursFilter: [],
        searchQuery: '',
        hideNonBillable: false,
        sortColumn: 'Urgency',
        sortDirection: 'desc', // HIGH first
        currentPage: 1,
        pageSize: 20
      }), { wrapper: createWrapper() })

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      const urgencies = result.current.filteredAndSortedRequests.map(r => r.Urgency)
      // Should have HIGH, HIGH, MEDIUM, MEDIUM, MEDIUM, LOW order
      expect(urgencies[0]).toBe('HIGH')
      expect(urgencies[1]).toBe('HIGH')
      expect(['MEDIUM', 'LOW']).toContain(urgencies[5])
    })

    it('should sort by Category alphabetically', async () => {
      const { result } = renderHook(() => useSupportData({
        selectedYear: 2025,
        selectedMonth: 6,
        selectedDay: 'all',
        categoryFilter: [],
        urgencyFilter: [],
        sourceFilter: [],
        dateRange: { from: null, to: null },
        dayFilter: [],
        billingDateFilter: { from: null, to: null, hasValue: 'all' },
        hoursFilter: [],
        searchQuery: '',
        hideNonBillable: false,
        sortColumn: 'Category',
        sortDirection: 'asc',
        currentPage: 1,
        pageSize: 20
      }), { wrapper: createWrapper() })

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      const categories = result.current.filteredAndSortedRequests.map(r => r.Category)
      // Should be alphabetically sorted: Forms, Hosting, Migration, Non-billable, Support, Support
      expect(categories[0]).toBe('Forms')
      expect(categories[1]).toBe('Hosting')
    })

    it('should maintain chronological order as secondary sort', async () => {
      // Create requests with same urgency but different times
      const sameUrgencyRequests = [
        createMockRequest({ Date: '2025-06-25', Time: '2:00 PM', Urgency: 'MEDIUM' }),
        createMockRequest({ Date: '2025-06-23', Time: '10:00 AM', Urgency: 'MEDIUM' }),
        createMockRequest({ Date: '2025-06-23', Time: '9:00 AM', Urgency: 'MEDIUM' }),
      ]

      vi.mocked(api.fetchRequests).mockResolvedValue(sameUrgencyRequests)

      const { result } = renderHook(() => useSupportData({
        selectedYear: 2025,
        selectedMonth: 'all',
        selectedDay: 'all',
        categoryFilter: [],
        urgencyFilter: [],
        sourceFilter: [],
        dateRange: { from: null, to: null },
        dayFilter: [],
        billingDateFilter: { from: null, to: null, hasValue: 'all' },
        hoursFilter: [],
        searchQuery: '',
        hideNonBillable: false,
        sortColumn: 'Urgency',
        sortDirection: 'asc',
        currentPage: 1,
        pageSize: 20
      }), { wrapper: createWrapper() })

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      // Should be sorted chronologically when urgency is same
      const sorted = result.current.filteredAndSortedRequests
      expect(sorted[0].Date).toBe('2025-06-23')
      expect(sorted[0].Time).toBe('9:00 AM')
      expect(sorted[1].Date).toBe('2025-06-23')
      expect(sorted[1].Time).toBe('10:00 AM')
      expect(sorted[2].Date).toBe('2025-06-25')
    })
  })

  describe('Pagination', () => {
    beforeEach(async () => {
      vi.mocked(api.checkAPIHealth).mockResolvedValue(true)

      // Create 25 requests for pagination testing
      const manyRequests = Array.from({ length: 25 }, (_, i) =>
        createMockRequest({
          Date: '2025-06-23',
          Time: `${8 + Math.floor(i / 60)}:${(i % 60).toString().padStart(2, '0')} AM`,
          Request_Summary: `Request ${i + 1}`
        })
      )

      vi.mocked(api.fetchRequests).mockResolvedValue(manyRequests)
    })

    it('should paginate correctly with pageSize=20', async () => {
      const { result } = renderHook(() => useSupportData({
        selectedYear: 2025,
        selectedMonth: 'all',
        selectedDay: 'all',
        categoryFilter: [],
        urgencyFilter: [],
        sourceFilter: [],
        dateRange: { from: null, to: null },
        dayFilter: [],
        billingDateFilter: { from: null, to: null, hasValue: 'all' },
        hoursFilter: [],
        searchQuery: '',
        hideNonBillable: false,
        sortColumn: null,
        sortDirection: 'asc',
        currentPage: 1,
        pageSize: 20
      }), { wrapper: createWrapper() })

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.totalPages).toBe(2) // 25 items / 20 per page = 2 pages
      expect(result.current.paginatedRequests).toHaveLength(20)
      expect(result.current.startIndex).toBe(0)
      expect(result.current.endIndex).toBe(20)
    })

    it('should handle page 2 correctly', async () => {
      const { result } = renderHook(() => useSupportData({
        selectedYear: 2025,
        selectedMonth: 'all',
        selectedDay: 'all',
        categoryFilter: [],
        urgencyFilter: [],
        sourceFilter: [],
        dateRange: { from: null, to: null },
        dayFilter: [],
        billingDateFilter: { from: null, to: null, hasValue: 'all' },
        hoursFilter: [],
        searchQuery: '',
        hideNonBillable: false,
        sortColumn: null,
        sortDirection: 'asc',
        currentPage: 2,
        pageSize: 20
      }), { wrapper: createWrapper() })

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.paginatedRequests).toHaveLength(5) // Remaining 5 items
      expect(result.current.startIndex).toBe(20)
      expect(result.current.endIndex).toBe(25)
    })

    it('should handle "show all" (pageSize equals total)', async () => {
      const { result } = renderHook(() => useSupportData({
        selectedYear: 2025,
        selectedMonth: 'all',
        selectedDay: 'all',
        categoryFilter: [],
        urgencyFilter: [],
        sourceFilter: [],
        dateRange: { from: null, to: null },
        dayFilter: [],
        billingDateFilter: { from: null, to: null, hasValue: 'all' },
        hoursFilter: [],
        searchQuery: '',
        hideNonBillable: false,
        sortColumn: null,
        sortDirection: 'asc',
        currentPage: 1,
        pageSize: 25 // Same as total count
      }), { wrapper: createWrapper() })

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.totalPages).toBe(1)
      expect(result.current.paginatedRequests).toHaveLength(25)
      expect(result.current.filteredAndSortedRequests).toBe(result.current.paginatedRequests)
    })
  })
})
