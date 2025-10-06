/**
 * SupportTableSection Component
 *
 * Main table orchestrator for support requests
 *
 * Features:
 * - Search bar with clear button
 * - Active filters display with remove buttons
 * - Billable toggle switch
 * - Bulk selection and actions toolbar
 * - Sortable table with inline filters
 * - Editable cells for category, urgency, hours
 * - Pagination controls
 * - Reset filters button
 */

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../ui/card'
import { Table, TableBody } from '../../ui/table'
import { SupportTableHeader } from './SupportTableHeader'
import { SupportTableRow } from './SupportTableRow'
import { Pagination } from '../../shared/Pagination'
import { Search, X, ArrowUp } from 'lucide-react'
import type { ChatRequest } from '../../../types/request'

export interface SupportTableSectionProps {
  // Data
  paginatedRequests: ChatRequest[]
  filteredAndSortedRequests: ChatRequest[]
  billableFilteredRequests: ChatRequest[]
  nonBillableRequests: ChatRequest[]
  requests: ChatRequest[]
  startIndex: number
  endIndex: number

  // Billable toggle
  hideNonBillable: boolean
  onHideNonBillableChange: (hide: boolean) => void

  // Selection
  selectedRequestIds: Set<number>
  selectAll: boolean
  onSelectAll: () => void
  onSelectRequest: (index: number, event: React.ChangeEvent<HTMLInputElement>) => void
  onRowClick: (index: number, event: React.MouseEvent) => void
  onClearSelection: () => void

  // Bulk actions
  stagedBulkCategory: string
  stagedBulkUrgency: string
  stagedBulkHours: number | null
  onStagedBulkCategoryChange: (category: string) => void
  onStagedBulkUrgencyChange: (urgency: string) => void
  onStagedBulkHoursChange: (hours: number | null) => void
  onApplyBulkChanges: () => void
  onClearStagedChanges: () => void

  // Search
  searchQuery: string
  onSearchQueryChange: (query: string) => void

  // Sorting
  sortColumn: string | null
  sortDirection: 'asc' | 'desc'
  onSort: (column: string) => void

  // Filters
  showFilters: {
    source: boolean
    date: boolean
    day: boolean
    category: boolean
    urgency: boolean
  }
  sourceFilter: string[]
  dateFilter: string
  dayFilter: string[]
  categoryFilter: string[]
  urgencyFilter: string[]
  onToggleColumnFilter: (column: string) => void
  onSourceFilterChange: (sources: string[]) => void
  onDateFilterChange: (date: string) => void
  onDayFilterChange: (days: string[]) => void
  onCategoryFilterChange: (categories: string[]) => void
  onUrgencyFilterChange: (urgencies: string[]) => void
  onResetFilters: () => void

  // Filter options
  availableDates: string[]
  availableDays: string[]
  categoryOptions: string[]
  urgencyOptions: string[]

  // Pagination
  currentPage: number
  totalPages: number
  pageSize: number
  onPageChange: (page: number) => void
  onPageSizeChange: (size: number | 'all') => void

  // Request actions
  onUpdateRequest: (index: number, field: string, value: any) => void
  onDeleteRequest: (index: number) => void

  // Year/month/day for header
  selectedYear: number
  selectedMonth: number | 'all'
  selectedDay: string | 'all'

  // Utilities
  formatTime: (time: string) => string
  formatUrgencyDisplay: (urgency: string) => string
  preserveScrollPosition: () => void
}

export function SupportTableSection({
  paginatedRequests,
  filteredAndSortedRequests,
  billableFilteredRequests,
  nonBillableRequests,
  requests,
  startIndex,
  endIndex,
  hideNonBillable,
  onHideNonBillableChange,
  selectedRequestIds,
  selectAll,
  onSelectAll,
  onSelectRequest,
  onRowClick,
  onClearSelection,
  stagedBulkCategory,
  stagedBulkUrgency,
  stagedBulkHours,
  onStagedBulkCategoryChange,
  onStagedBulkUrgencyChange,
  onStagedBulkHoursChange,
  onApplyBulkChanges,
  onClearStagedChanges,
  searchQuery,
  onSearchQueryChange,
  sortColumn,
  sortDirection,
  onSort,
  showFilters,
  sourceFilter,
  dateFilter,
  dayFilter,
  categoryFilter,
  urgencyFilter,
  onToggleColumnFilter,
  onSourceFilterChange,
  onDateFilterChange,
  onDayFilterChange,
  onCategoryFilterChange,
  onUrgencyFilterChange,
  onResetFilters,
  availableDates,
  availableDays,
  categoryOptions,
  urgencyOptions,
  currentPage,
  totalPages,
  pageSize,
  onPageChange,
  onPageSizeChange,
  onUpdateRequest,
  onDeleteRequest,
  selectedYear,
  selectedMonth,
  selectedDay,
  formatTime,
  formatUrgencyDisplay,
  preserveScrollPosition
}: SupportTableSectionProps) {

  const hasActiveFilters = sortColumn !== null ||
    categoryFilter.length > 0 ||
    urgencyFilter.length > 0 ||
    dateFilter !== 'all' ||
    dayFilter.length > 0 ||
    searchQuery !== ''

  return (
    <Card>
      {/* Sticky Header for Billable Requests */}
      <CardHeader className="sticky top-0 z-30 bg-card border-b border-border rounded-t-lg">
        <div className="space-y-3">
          {/* Title Row */}
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>Billable Requests</CardTitle>
              <CardDescription>Complete list of support requests - click category or urgency to edit</CardDescription>
            </div>
            <div className="flex items-center space-x-4">
              {/* Toggle for Non-Billable Items */}
              <div className="flex flex-col space-y-1">
                <label className="flex items-center cursor-pointer group">
                  {/* OFF indicator */}
                  <span className={`text-xs font-medium mr-2 transition-opacity ${hideNonBillable ? 'text-muted-foreground/50' : 'text-muted-foreground'}`}>
                    OFF
                  </span>

                  {/* Toggle Switch */}
                  <div className="relative">
                    <input
                      type="checkbox"
                      role="switch"
                      checked={hideNonBillable}
                      onChange={(e) => onHideNonBillableChange(e.target.checked)}
                      aria-checked={hideNonBillable}
                      aria-label={`Show only billable items. Currently ${hideNonBillable ? 'showing only billable' : 'showing all'} items`}
                      className="sr-only"
                      id="billable-toggle"
                    />
                    <div className={`block w-12 h-7 rounded-full transition-all duration-300 ${
                      hideNonBillable
                        ? 'bg-black dark:bg-black'
                        : 'bg-gray-300 dark:bg-gray-600'
                    }`}>
                      <div className={`absolute left-0.5 top-0.5 bg-white dark:bg-gray-200 w-6 h-6 rounded-full transition-transform duration-300 ${
                        hideNonBillable ? 'transform translate-x-5' : ''
                      }`}>
                      </div>
                    </div>
                  </div>

                  {/* ON indicator */}
                  <span className={`text-xs font-medium ml-2 mr-3 transition-opacity ${hideNonBillable ? 'text-black dark:text-white font-semibold' : 'text-muted-foreground/50'}`}>
                    ON
                  </span>

                  {/* Label with count */}
                  <span className="text-xs font-medium text-foreground">
                    Show only billable
                    {nonBillableRequests.length > 0 && (
                      <span className="text-muted-foreground ml-1">
                        ({hideNonBillable ? billableFilteredRequests.length : filteredAndSortedRequests.length} of {requests.filter(r => r.Status === 'active').length})
                      </span>
                    )}
                  </span>
                </label>

                {/* Helper text */}
                {nonBillableRequests.length > 0 && (
                  <p className="text-xs text-muted-foreground pl-16">
                    {hideNonBillable
                      ? `Hiding ${nonBillableRequests.length} non-billable and migration items`
                      : 'Showing all items including non-billable'}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Bulk Selection UI */}
          {selectedRequestIds.size > 0 && (
            <div className="flex items-center space-x-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <span className="text-xs font-medium text-blue-900">
                {selectedRequestIds.size} selected{selectedRequestIds.size === paginatedRequests.length && paginatedRequests.length < filteredAndSortedRequests.length ? ' (current page)' : ''}:
              </span>

              {/* Bulk Category Change */}
              <div className="flex items-center space-x-1">
                <span className="text-xs text-muted-foreground">Category:</span>
                <select
                  value={stagedBulkCategory}
                  onChange={(e) => onStagedBulkCategoryChange(e.target.value)}
                  className="text-xs text-foreground border border-border rounded px-2 py-1 bg-background min-w-[100px]"
                >
                  <option value="">Change to...</option>
                  {categoryOptions.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>

              {/* Bulk Urgency Change */}
              <div className="flex items-center space-x-1">
                <span className="text-xs text-muted-foreground">Urgency:</span>
                <select
                  value={stagedBulkUrgency}
                  onChange={(e) => onStagedBulkUrgencyChange(e.target.value)}
                  className="text-xs text-foreground border border-border rounded px-2 py-1 bg-background min-w-[120px]"
                >
                  <option value="">Change to...</option>
                  {urgencyOptions.map(urgency => (
                    <option key={urgency} value={urgency}>{urgency}</option>
                  ))}
                </select>
              </div>

              {/* Bulk Hours Change */}
              <div className="flex items-center space-x-1">
                <span className="text-xs text-muted-foreground">Hours:</span>
                <input
                  type="number"
                  step="0.25"
                  min="0"
                  max="20"
                  value={stagedBulkHours !== null ? stagedBulkHours : ''}
                  onChange={(e) => {
                    const value = e.target.value
                    if (value === '') {
                      onStagedBulkHoursChange(null)
                    } else {
                      const numValue = parseFloat(value)
                      onStagedBulkHoursChange(isNaN(numValue) ? null : numValue)
                    }
                  }}
                  placeholder="Set hours..."
                  className="text-xs text-foreground border border-border rounded px-2 py-1 bg-background min-w-[90px]"
                />
              </div>

              {/* Action Buttons */}
              {(stagedBulkCategory || stagedBulkUrgency || stagedBulkHours !== null) ? (
                <>
                  <button
                    onClick={onApplyBulkChanges}
                    className="text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 transition-colors font-medium"
                  >
                    Apply Changes
                  </button>
                  <button
                    onClick={onClearStagedChanges}
                    className="text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded hover:bg-accent transition-colors"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <button
                  onClick={onClearSelection}
                  className="text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded hover:bg-accent transition-colors"
                >
                  Clear Selection
                </button>
              )}
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="overflow-visible">
        {/* Table Actions */}
        <div className="flex items-center justify-between mb-4 pt-4">
          <div className="flex items-center space-x-4 flex-1">
            {/* Search Bar */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search requests..."
                value={searchQuery}
                onChange={(e) => onSearchQueryChange(e.target.value)}
                className="w-full pl-9 pr-8 py-2 text-xs border border-border rounded-md focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
              {searchQuery && (
                <button
                  onClick={() => onSearchQueryChange('')}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {hasActiveFilters && (
              <button
                onClick={onResetFilters}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium"
              >
                Reset Filters
              </button>
            )}
          </div>

          <div className="text-xs text-muted-foreground">
            <span>Showing {filteredAndSortedRequests.length} requests</span>
          </div>
        </div>

        {/* Active Filters Display */}
        {(categoryFilter.length > 0 || urgencyFilter.length > 0 || sourceFilter.length > 0 || dateFilter !== 'all' || dayFilter.length > 0) && (
          <div className="flex flex-wrap gap-2 mb-4">
            {/* Category Filters */}
            {categoryFilter.map(category => (
              <div key={`category-${category}`} className="inline-flex items-center gap-1.5 sm:gap-2 px-2 py-1 sm:px-3 sm:py-1.5 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded text-xs">
                <ArrowUp className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                <span className="text-muted-foreground">Category:</span>
                <span className="font-medium text-blue-600 dark:text-blue-400">{category}</span>
                <button
                  onClick={() => {
                    onCategoryFilterChange(categoryFilter.filter(c => c !== category))
                  }}
                  className="ml-1 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}

            {/* Urgency Filters */}
            {urgencyFilter.map(urgency => (
              <div key={`urgency-${urgency}`} className="inline-flex items-center gap-1.5 sm:gap-2 px-2 py-1 sm:px-3 sm:py-1.5 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded text-xs">
                <ArrowUp className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                <span className="text-muted-foreground">Urgency:</span>
                <span className="font-medium text-blue-600 dark:text-blue-400">{urgency}</span>
                <button
                  onClick={() => {
                    onUrgencyFilterChange(urgencyFilter.filter(u => u !== urgency))
                  }}
                  className="ml-1 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}

            {/* Source Filters */}
            {sourceFilter.map(source => (
              <div key={`source-${source}`} className="inline-flex items-center gap-1.5 sm:gap-2 px-2 py-1 sm:px-3 sm:py-1.5 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded text-xs">
                <ArrowUp className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                <span className="text-muted-foreground">Source:</span>
                <span className="font-medium text-blue-600 dark:text-blue-400 capitalize">{source === 'sms' ? 'Text' : source}</span>
                <button
                  onClick={() => {
                    onSourceFilterChange(sourceFilter.filter(s => s !== source))
                  }}
                  className="ml-1 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}

            {/* Day Filters */}
            {dayFilter.map(day => (
              <div key={`day-${day}`} className="inline-flex items-center gap-1.5 sm:gap-2 px-2 py-1 sm:px-3 sm:py-1.5 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded text-xs">
                <ArrowUp className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                <span className="text-muted-foreground">Day:</span>
                <span className="font-medium text-blue-600 dark:text-blue-400">{day}</span>
                <button
                  onClick={() => {
                    onDayFilterChange(dayFilter.filter(d => d !== day))
                  }}
                  className="ml-1 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}

            {/* Date Filter */}
            {dateFilter !== 'all' && (
              <div className="inline-flex items-center gap-1.5 sm:gap-2 px-2 py-1 sm:px-3 sm:py-1.5 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded text-xs">
                <ArrowUp className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                <span className="text-muted-foreground">Date:</span>
                <span className="font-medium text-blue-600 dark:text-blue-400">{dateFilter}</span>
                <button
                  onClick={() => {
                    onDateFilterChange('all')
                  }}
                  className="ml-1 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* Table */}
        <div className="overflow-x-auto -mx-4 sm:-mx-0">
          <div className="inline-block min-w-full align-middle">
            <Table>
              <SupportTableHeader
                selectAll={selectAll}
                onSelectAll={onSelectAll}
                sortColumn={sortColumn}
                sortDirection={sortDirection}
                onSort={onSort}
                showFilters={showFilters}
                sourceFilter={sourceFilter}
                dateFilter={dateFilter}
                dayFilter={dayFilter}
                categoryFilter={categoryFilter}
                urgencyFilter={urgencyFilter}
                availableDates={availableDates}
                availableDays={availableDays}
                categoryOptions={categoryOptions}
                urgencyOptions={urgencyOptions}
                onToggleColumnFilter={onToggleColumnFilter}
                onSourceFilterChange={onSourceFilterChange}
                onDateFilterChange={onDateFilterChange}
                onDayFilterChange={onDayFilterChange}
                onCategoryFilterChange={onCategoryFilterChange}
                onUrgencyFilterChange={onUrgencyFilterChange}
                requests={requests}
                selectedYear={selectedYear}
                selectedMonth={selectedMonth}
                selectedDay={selectedDay}
                formatUrgencyDisplay={formatUrgencyDisplay}
                preserveScrollPosition={preserveScrollPosition}
              />
              <TableBody>
                {paginatedRequests.map((request, paginatedIndex) => {
                  const filteredIndex = startIndex + paginatedIndex
                  // Find the actual index in the original requests array
                  const actualIndex = requests.findIndex(r =>
                    r.Date === request.Date &&
                    r.Time === request.Time &&
                    r.Request_Summary === request.Request_Summary
                  )
                  return (
                    <SupportTableRow
                      key={filteredIndex}
                      request={request}
                      index={actualIndex}
                      paginatedIndex={paginatedIndex}
                      startIndex={startIndex}
                      isSelected={selectedRequestIds.has(actualIndex)}
                      categoryOptions={categoryOptions}
                      urgencyOptions={urgencyOptions}
                      onSelectRequest={onSelectRequest}
                      onRowClick={onRowClick}
                      onUpdateRequest={onUpdateRequest}
                      onDeleteRequest={onDeleteRequest}
                      formatTime={formatTime}
                      formatUrgencyDisplay={formatUrgencyDisplay}
                    />
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Pagination */}
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          pageSize={pageSize}
          totalItems={filteredAndSortedRequests.length}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
        />
      </CardContent>
    </Card>
  )
}
