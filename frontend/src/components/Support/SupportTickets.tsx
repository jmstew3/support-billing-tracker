/**
 * SupportTickets - Main Support Ticket Management Component
 *
 * Refactored version using extracted components for better maintainability.
 * This orchestrator component delegates to specialized child components.
 */

import { useState, useEffect, useRef, useMemo } from 'react'
import { LoadingState } from '../ui/LoadingState'
import { ConfirmDialog } from '../shared/ConfirmDialog'

// Extracted sections
import { PageHeader } from '../shared/PageHeader'
import { SupportScorecards } from './sections/SupportScorecards'
import { CostTrackerCard } from './CostTrackerCard'
import { CategoryTrackerCard } from './CategoryTrackerCard'
import { CategoryDistributionChart } from './CategoryDistributionChart'
import { SupportChartsSection } from './sections/SupportChartsSection'
import { SupportTableSection } from './sections/SupportTableSection'
import { ArchivedRequestsSection } from './sections/ArchivedRequestsSection'

// Hooks
import { usePeriod } from '../../contexts/PeriodContext'
import { useSupportData } from './hooks/useSupportData'
import { useSupportFiltering } from './hooks/useSupportFiltering'
import { useSupportMetrics } from './hooks/useSupportMetrics'

// Utils
import { formatTime } from '../../utils/timeUtils'
import { parseLocalDate } from '../../utils/supportHelpers'
import { processDailyRequests, processCategoryData, calculateCosts } from '../../utils/dataProcessing'
import { updateRequest as updateRequestAPI, bulkUpdateRequests, deleteRequest } from '../../utils/api'

// Types
import type { ChatRequest } from '../../types/request'

// Constants - defined outside component to prevent recreation on every render
const CATEGORY_OPTIONS = [
  'Advisory',
  'Email',
  'Forms',
  'General',
  'Hosting',
  'Migration',
  'Non-billable',
  'Scripts',
  'Support',
  'Website'
]

const URGENCY_OPTIONS = ['HIGH', 'MEDIUM', 'LOW', 'PROMOTION']

interface SupportTicketsProps {
  onToggleMobileMenu?: () => void
}

export function SupportTickets({ onToggleMobileMenu }: SupportTicketsProps) {
  // ============================================================
  // STATE MANAGEMENT
  // ============================================================

  // Date filtering state from PeriodContext
  const {
    selectedYear,
    selectedMonth,
    selectedMonths,
    selectedDay,
    setDay,
    setAvailableData,
    viewMode,
    setViewMode
  } = usePeriod()

  // Note: viewMode is now managed by PeriodContext (accessed via usePeriod hook)

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState<number>(20)

  // Sorting state
  const [sortColumn, setSortColumn] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')

  // Filter state
  const [categoryFilter, setCategoryFilter] = useState<string[]>([])
  const [urgencyFilter, setUrgencyFilter] = useState<string[]>([])
  const [sourceFilter, setSourceFilter] = useState<string[]>([])
  const [dateFilter, setDateFilter] = useState<string>('all')
  const [dayFilter, setDayFilter] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [showFilters, setShowFilters] = useState({
    date: false,
    day: false,
    category: false,
    urgency: false,
    source: false
  })

  // Bulk selection state
  const [selectedRequestIds, setSelectedRequestIds] = useState<Set<number>>(new Set())
  const [selectAll, setSelectAll] = useState(false)
  const [stagedBulkCategory, setStagedBulkCategory] = useState<string>('')
  const [stagedBulkUrgency, setStagedBulkUrgency] = useState<string>('')
  const [stagedBulkHours, setStagedBulkHours] = useState<number | null>(null)

  // UI state
  const [hideNonBillable, setHideNonBillable] = useState<boolean>(() => {
    const saved = localStorage.getItem('hideNonBillable')
    return saved !== null ? JSON.parse(saved) : true
  })
  const [showArchived, setShowArchived] = useState(false)
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean
    requestIndex: number | null
  }>({
    isOpen: false,
    requestIndex: null
  })

  // Scroll position preservation
  const scrollPositionRef = useRef<number>(0)
  const shouldPreserveScrollRef = useRef<boolean>(false)

  // ============================================================
  // DATA HOOK - Centralized data management
  // ============================================================

  const {
    requests,
    setRequests,
    loading,
    apiAvailable,
    filteredAndSortedRequests,
    paginatedRequests,
    nonBillableRequests,
    archivedRequests,
    startIndex,
    endIndex,
    totalPages
  } = useSupportData({
    selectedYear,
    selectedMonth,
    selectedDay,
    sortColumn,
    sortDirection,
    categoryFilter,
    urgencyFilter,
    sourceFilter,
    dateFilter,
    dayFilter,
    searchQuery,
    currentPage,
    pageSize,
    hideNonBillable
  })

  // ============================================================
  // FILTERING HOOK - Filter management
  // ============================================================

  const {
    billableFilteredRequests
  } = useSupportFiltering(
    requests,
    {
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
    }
  )

  // ============================================================
  // METRICS HOOK - Calculations and analytics
  // ============================================================

  const {
    activityMetrics,
    monthlyCosts
  } = useSupportMetrics(
    billableFilteredRequests,
    selectedYear,
    selectedMonth,
    selectedMonths
  )

  // Activity metrics are passed directly to SupportScorecards component

  // ============================================================
  // CATEGORY BREAKDOWN WITH ALL ACTIVE REQUESTS
  // For Category Breakdown display only - includes Migration and Non-billable
  // ============================================================

  // Get all active requests (including Migration and Non-billable for category tracking)
  const allActiveRequests = useMemo(
    () => requests.filter(r => r.Status === 'active'),
    [requests]
  )

  // Calculate category breakdown from all active requests (shows Migration/Non-billable)
  const {
    categoryBreakdownData: allCategoryBreakdownData,
    monthlyCategoryData: allMonthlyCategoryData
  } = useSupportMetrics(
    allActiveRequests,
    selectedYear,
    selectedMonth,
    selectedMonths
  )

  // Calculate total category distribution for ALL active tickets (for CategoryDistributionChart)
  const totalCategoryData = useMemo(() => {
    const categories = {
      support: 0,
      hosting: 0,
      forms: 0,
      email: 0,
      migration: 0,
      advisory: 0,
      nonBillable: 0,
      website: 0,
      scripts: 0,
      total: 0,
    };

    allActiveRequests.forEach(request => {
      const category = request.Category || 'Support';
      categories.total++;

      switch (category.toLowerCase()) {
        case 'support':
          categories.support++;
          break;
        case 'hosting':
          categories.hosting++;
          break;
        case 'forms':
          categories.forms++;
          break;
        case 'email':
          categories.email++;
          break;
        case 'migration':
          categories.migration++;
          break;
        case 'advisory':
          categories.advisory++;
          break;
        case 'non-billable':
          categories.nonBillable++;
          break;
        case 'website':
          categories.website++;
          break;
        case 'scripts':
          categories.scripts++;
          break;
        default:
          categories.support++;
          break;
      }
    });

    return categories;
  }, [allActiveRequests]);

  // ============================================================
  // DERIVED STATE
  // ============================================================


  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  // Calculate available years from requests (memoized to prevent infinite re-renders)
  const availableYears = useMemo(() =>
    Array.from(new Set(
      requests.map(request => parseLocalDate(request.Date).getFullYear())
    )).sort((a, b) => b - a) // Sort descending (newest first)
  , [requests])

  // Calculate available months for selected year (memoized to prevent infinite re-renders)
  const availableMonthsForYear = useMemo(() =>
    Array.from(new Set(
      requests
        .filter(request => parseLocalDate(request.Date).getFullYear() === selectedYear)
        .map(request => parseLocalDate(request.Date).getMonth() + 1)
    )).sort((a, b) => a - b) // Sort ascending (Jan to Dec)
  , [requests, selectedYear])

  // Calculate available dates for selected year/month (memoized to prevent infinite re-renders)
  const availableDates = useMemo(() =>
    Array.from(new Set(
      requests
        .filter(request => {
          const requestDate = parseLocalDate(request.Date)
          const requestYear = requestDate.getFullYear()
          const requestMonth = requestDate.getMonth() + 1

          if (requestYear !== selectedYear) return false
          if (selectedMonth !== 'all' && requestMonth !== selectedMonth) return false

          return true
        })
        .map(request => request.Date)
    )).sort((a, b) => new Date(a).getTime() - new Date(b).getTime())
  , [requests, selectedYear, selectedMonth])

  // Calculate filtered costs (memoized to prevent infinite re-renders)
  const getCurrentMonthString = () => {
    if (selectedMonth === 'all') return undefined
    return `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`
  }

  const filteredCosts = useMemo(() =>
    calculateCosts(billableFilteredRequests, getCurrentMonthString()),
    [billableFilteredRequests, selectedMonth, selectedYear]
  )

  // Calculate calendar data (memoized)
  const calendarData = useMemo(() =>
    processDailyRequests(billableFilteredRequests),
    [billableFilteredRequests]
  )

  // Calculate category data (memoized)
  // Use allActiveRequests instead of billableFilteredRequests to ensure pie chart always has data
  const categoryData = useMemo(() =>
    processCategoryData(allActiveRequests),
    [allActiveRequests]
  )

  // ============================================================
  // PERSISTENCE - Save hideNonBillable preference
  // ============================================================

  useEffect(() => {
    localStorage.setItem('hideNonBillable', JSON.stringify(hideNonBillable))
  }, [hideNonBillable])

  // ============================================================
  // REGISTER AVAILABLE DATA WITH PERIOD CONTEXT
  // ============================================================

  useEffect(() => {
    setAvailableData(availableYears, availableMonthsForYear, availableDates)
  }, [availableYears, availableMonthsForYear, availableDates, setAvailableData])

  // ============================================================
  // SCROLL POSITION PRESERVATION
  // ============================================================

  useEffect(() => {
    if (shouldPreserveScrollRef.current && scrollPositionRef.current) {
      window.scrollTo(0, scrollPositionRef.current)
      shouldPreserveScrollRef.current = false
    }
  }, [filteredAndSortedRequests])

  const preserveScrollPosition = () => {
    scrollPositionRef.current = window.scrollY
    shouldPreserveScrollRef.current = true
  }

  // ============================================================
  // EVENT HANDLERS - View Mode (Now uses PeriodContext)
  // ============================================================
  // Note: This function is no longer needed as ViewModeToggle handles this via PeriodContext
  // Keeping for backward compatibility during migration, but can be removed later

  // ============================================================
  // EVENT HANDLERS - Calendar interactions
  // ============================================================

  const handleCalendarDateClick = (date: string) => {
    setDay(date)
    setViewMode('day')
    setCurrentPage(1)
  }

  const handleBackToCalendar = () => {
    setDay('all')
    setViewMode('month')
  }

  // ============================================================
  // EVENT HANDLERS - Table sorting and filtering
  // ============================================================

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(column)
      setSortDirection('asc')
    }
    setCurrentPage(1)
  }

  const toggleColumnFilter = (column: string) => {
    setShowFilters(prev => ({
      ...prev,
      [column]: !prev[column as keyof typeof prev]
    }))
  }

  const resetTableFilters = () => {
    setSortColumn(null)
    setSortDirection('asc')
    setCategoryFilter([])
    setUrgencyFilter([])
    setSourceFilter([])
    setDateFilter('all')
    setDayFilter([])
    setSearchQuery('')
  }

  // ============================================================
  // EVENT HANDLERS - Pagination
  // ============================================================

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    setSelectedRequestIds(new Set())
    setSelectAll(false)
  }

  const handlePageSizeChange = (size: number | 'all') => {
    setPageSize(typeof size === 'number' ? size : 999999)
    setCurrentPage(1)
    setSelectedRequestIds(new Set())
    setSelectAll(false)
  }

  // ============================================================
  // EVENT HANDLERS - Selection and bulk actions
  // ============================================================

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedRequestIds(new Set())
      setSelectAll(false)
    } else {
      const newSelectedIds = new Set<number>()
      paginatedRequests.forEach((request) => {
        const actualIndex = requests.findIndex(r =>
          r.Date === request.Date &&
          r.Time === request.Time &&
          r.Request_Summary === request.Request_Summary
        )
        if (actualIndex !== -1) {
          newSelectedIds.add(actualIndex)
        }
      })
      setSelectedRequestIds(newSelectedIds)
      setSelectAll(true)
    }
  }

  const handleSelectRequest = (index: number, event: React.ChangeEvent<HTMLInputElement>) => {
    event.stopPropagation()
    const newSelectedIds = new Set(selectedRequestIds)
    if (newSelectedIds.has(index)) {
      newSelectedIds.delete(index)
    } else {
      newSelectedIds.add(index)
    }
    setSelectedRequestIds(newSelectedIds)
    setSelectAll(newSelectedIds.size === paginatedRequests.length && paginatedRequests.length > 0)
  }

  const handleRowClick = (index: number, event: React.MouseEvent) => {
    if (
      (event.target as HTMLElement).closest('input') ||
      (event.target as HTMLElement).closest('select') ||
      (event.target as HTMLElement).closest('button')
    ) {
      return
    }

    const newSelectedIds = new Set(selectedRequestIds)
    if (newSelectedIds.has(index)) {
      newSelectedIds.delete(index)
    } else {
      newSelectedIds.add(index)
    }
    setSelectedRequestIds(newSelectedIds)
    setSelectAll(newSelectedIds.size === paginatedRequests.length && paginatedRequests.length > 0)
  }

  const clearStagedChanges = () => {
    setStagedBulkCategory('')
    setStagedBulkUrgency('')
    setStagedBulkHours(null)
  }

  const applyBulkChanges = async () => {
    if (selectedRequestIds.size === 0) return

    // Build the update object (same for all selected requests)
    const requestUpdates: Partial<ChatRequest> = {}

    if (stagedBulkCategory) {
      requestUpdates.Category = stagedBulkCategory
    }
    if (stagedBulkUrgency) {
      requestUpdates.Urgency = stagedBulkUrgency as 'HIGH' | 'MEDIUM' | 'LOW' | 'PROMOTION'
    }
    if (stagedBulkHours !== null) {
      requestUpdates.EstimatedHours = stagedBulkHours
    }

    if (Object.keys(requestUpdates).length === 0) return

    if (apiAvailable) {
      try {
        // Get the IDs of all selected requests
        const ids = Array.from(selectedRequestIds)
          .map(index => requests[index].id)
          .filter((id): id is number => id !== undefined)

        // Apply the same updates to all selected requests
        await bulkUpdateRequests(ids, requestUpdates)

        // Update local state
        setRequests(prevRequests => {
          const newRequests = [...prevRequests]
          selectedRequestIds.forEach(index => {
            newRequests[index] = { ...newRequests[index], ...requestUpdates }
          })
          return newRequests
        })
      } catch (error) {
        // Bulk update failed
      }
    } else {
      // Local-only mode: apply updates directly
      setRequests(prevRequests => {
        const newRequests = [...prevRequests]
        selectedRequestIds.forEach(index => {
          newRequests[index] = { ...newRequests[index], ...requestUpdates }
        })
        return newRequests
      })
    }

    clearStagedChanges()
    setSelectedRequestIds(new Set())
    setSelectAll(false)
  }

  // ============================================================
  // EVENT HANDLERS - Update and delete requests
  // ============================================================

  const updateRequest = async (index: number, field: string, value: any) => {
    if (apiAvailable) {
      const request = requests[index]
      if (!request || !request.id) {
        return
      }

      try {
        await updateRequestAPI(request.id, { [field]: value })

        setRequests(prevRequests => {
          const newRequests = [...prevRequests]
          newRequests[index] = { ...newRequests[index], [field]: value }
          return newRequests
        })
      } catch (error) {
        // Update failed
      }
    } else {
      setRequests(prevRequests => {
        const newRequests = [...prevRequests]
        newRequests[index] = { ...newRequests[index], [field]: value }
        return newRequests
      })
    }
  }

  const handleDeleteRequest = (index: number) => {
    setDeleteConfirmation({
      isOpen: true,
      requestIndex: index
    })
  }

  const confirmDelete = async () => {
    if (deleteConfirmation.requestIndex === null) return

    const index = deleteConfirmation.requestIndex
    const request = requests[index]

    if (apiAvailable && request.id) {
      try {
        await deleteRequest(request.id, false) // false = soft delete (archived)

        setRequests(prevRequests =>
          prevRequests.map((r, i) =>
            i === index ? { ...r, Status: 'deleted' } : r
          )
        )
      } catch (error) {
        // Delete failed
      }
    } else {
      setRequests(prevRequests =>
        prevRequests.filter((_, i) => i !== index)
      )
    }

    setDeleteConfirmation({ isOpen: false, requestIndex: null })
  }

  const cancelDelete = () => {
    setDeleteConfirmation({ isOpen: false, requestIndex: null })
  }

  const handleRestoreRequest = async (requestId: number | undefined, originalIndex: number) => {
    if (!requestId || !apiAvailable) return

    try {
      await updateRequestAPI(requestId, { Status: 'active' })

      setRequests(prevRequests =>
        prevRequests.map((r, i) =>
          i === originalIndex ? { ...r, Status: 'active' } : r
        )
      )
    } catch (error) {
      // Restore failed
    }
  }

  // ============================================================
  // UTILITY FUNCTIONS
  // ============================================================

  const formatUrgencyDisplay = (urgency: string) => {
    return urgency.charAt(0).toUpperCase() + urgency.slice(1).toLowerCase()
  }

  // ============================================================
  // RENDER
  // ============================================================

  if (loading) {
    return <LoadingState variant="dashboard" />
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header Section */}
      <PageHeader
        title="Support"
        showPeriodSelector={true}
        periodSelectorType="full"
        showViewToggle={true}
        viewOptions={['all', 'month', 'day']}
        onToggleMobileMenu={onToggleMobileMenu}
      />

      {/* Main Content Container */}
      <div className="flex-1 overflow-auto">
        <div className="p-4 sm:p-6 lg:p-8 space-y-6 sm:space-y-8">

          {/* Scorecards Section */}
          <SupportScorecards
            billableCount={billableFilteredRequests.length}
            totalActiveCount={requests.filter(r => r.Status === 'active').length}
            costs={filteredCosts}
            activityMetrics={activityMetrics}
          />

          {/* Cost Tracker */}
          {filteredCosts && (
            <div className="w-full">
              <CostTrackerCard
                costData={filteredCosts}
                monthlyCosts={monthlyCosts || undefined}
                selectedMonth={selectedMonth}
                selectedYear={selectedYear}
                gridSpan=""
              />
            </div>
          )}

          {/* Category Components Side by Side */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 w-full">
            {/* Category Breakdown Tracker */}
            {(allCategoryBreakdownData || allMonthlyCategoryData) && (
              <CategoryTrackerCard
                categoryData={allCategoryBreakdownData || undefined}
                monthlyCategoryData={allMonthlyCategoryData || undefined}
                selectedMonth={selectedMonth}
                selectedYear={selectedYear}
                gridSpan=""
              />
            )}

            {/* Category Distribution Chart (Simple Bar Chart) */}
            {totalCategoryData && totalCategoryData.total > 0 && (
              <CategoryDistributionChart
                categoryData={totalCategoryData}
                title="Category Distribution"
                description="Ticket volume by category (all active tickets)"
              />
            )}
          </div>

          {/* Charts Section */}
          <SupportChartsSection
            calendarData={calendarData}
            timeViewMode={viewMode}
            selectedDay={selectedDay}
            selectedMonth={selectedMonth}
            selectedYear={selectedYear}
            monthNames={monthNames}
            categoryData={categoryData}
            onCalendarDateClick={handleCalendarDateClick}
            onBackToCalendar={handleBackToCalendar}
          />

          {/* Table Section */}
          <SupportTableSection
            paginatedRequests={paginatedRequests}
            filteredAndSortedRequests={filteredAndSortedRequests}
            billableFilteredRequests={billableFilteredRequests}
            nonBillableRequests={nonBillableRequests}
            requests={requests}
            startIndex={startIndex}
            endIndex={endIndex}
            hideNonBillable={hideNonBillable}
            onHideNonBillableChange={setHideNonBillable}
            selectedRequestIds={selectedRequestIds}
            selectAll={selectAll}
            onSelectAll={handleSelectAll}
            onSelectRequest={handleSelectRequest}
            onRowClick={handleRowClick}
            onClearSelection={() => {
              setSelectedRequestIds(new Set())
              setSelectAll(false)
              clearStagedChanges()
            }}
            stagedBulkCategory={stagedBulkCategory}
            stagedBulkUrgency={stagedBulkUrgency}
            stagedBulkHours={stagedBulkHours}
            onStagedBulkCategoryChange={setStagedBulkCategory}
            onStagedBulkUrgencyChange={setStagedBulkUrgency}
            onStagedBulkHoursChange={setStagedBulkHours}
            onApplyBulkChanges={applyBulkChanges}
            onClearStagedChanges={clearStagedChanges}
            searchQuery={searchQuery}
            onSearchQueryChange={(query) => {
              setSearchQuery(query)
              setCurrentPage(1)
            }}
            sortColumn={sortColumn}
            sortDirection={sortDirection}
            onSort={handleSort}
            showFilters={showFilters}
            sourceFilter={sourceFilter}
            dateFilter={dateFilter}
            dayFilter={dayFilter}
            categoryFilter={categoryFilter}
            urgencyFilter={urgencyFilter}
            onToggleColumnFilter={toggleColumnFilter}
            onSourceFilterChange={(sources) => {
              preserveScrollPosition()
              setSourceFilter(sources)
              setCurrentPage(1)
              setSelectedRequestIds(new Set())
              setSelectAll(false)
            }}
            onDateFilterChange={(date) => {
              preserveScrollPosition()
              setDateFilter(date)
              setCurrentPage(1)
              setSelectedRequestIds(new Set())
              setSelectAll(false)
            }}
            onDayFilterChange={(days) => {
              preserveScrollPosition()
              setDayFilter(days)
              setCurrentPage(1)
              setSelectedRequestIds(new Set())
              setSelectAll(false)
            }}
            onCategoryFilterChange={(categories) => {
              preserveScrollPosition()
              setCategoryFilter(categories)
              setCurrentPage(1)
              setSelectedRequestIds(new Set())
              setSelectAll(false)
            }}
            onUrgencyFilterChange={(urgencies) => {
              preserveScrollPosition()
              setUrgencyFilter(urgencies)
              setCurrentPage(1)
              setSelectedRequestIds(new Set())
              setSelectAll(false)
            }}
            onResetFilters={resetTableFilters}
            availableDates={availableDates}
            availableDays={['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']}
            categoryOptions={CATEGORY_OPTIONS}
            urgencyOptions={URGENCY_OPTIONS}
            currentPage={currentPage}
            totalPages={totalPages}
            pageSize={pageSize}
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
            onUpdateRequest={updateRequest}
            onDeleteRequest={handleDeleteRequest}
            selectedYear={selectedYear}
            selectedMonth={selectedMonth}
            selectedDay={selectedDay}
            formatTime={formatTime}
            formatUrgencyDisplay={formatUrgencyDisplay}
            preserveScrollPosition={preserveScrollPosition}
          />

          {/* Archived Requests Section */}
          <ArchivedRequestsSection
            archivedRequests={archivedRequests}
            requests={requests}
            showArchived={showArchived}
            apiAvailable={apiAvailable}
            onToggleArchived={() => setShowArchived(!showArchived)}
            onRestoreRequest={handleRestoreRequest}
          />

        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteConfirmation.isOpen}
        title="Archive Request"
        message={apiAvailable
          ? `Are you sure you want to archive this request?

The request will be moved to the archived section and can be restored at any time.`
          : `Are you sure you want to delete this request?

⚠️ WARNING: This action is PERMANENT and cannot be undone in CSV mode.

The request will be completely removed and cannot be recovered.`}
        confirmText={apiAvailable ? "Archive Request" : "Delete Permanently"}
        cancelText="Cancel"
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
        isDestructive={!apiAvailable}
      />
    </div>
  )
}