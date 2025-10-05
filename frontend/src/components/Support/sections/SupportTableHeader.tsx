/**
 * SupportTableHeader Component
 *
 * Displays the table header with sortable columns and filter dropdowns
 *
 * Features:
 * - Select all checkbox
 * - Sortable columns (Date, Day, Time, Summary, Category, Urgency, Hours)
 * - Inline filter dropdowns (Source, Date, Day, Category, Urgency)
 * - Filter toggle buttons
 * - Count display in category filter
 */

import { TableHead, TableHeader, TableRow } from '../../ui/table'
import { Filter, ArrowUp, ArrowDown, ChevronDown, Info } from 'lucide-react'
import type { ChatRequest } from '../../../types/request'
import { parseLocalDate } from '../../../utils/supportHelpers'

export interface SupportTableHeaderProps {
  // Selection
  selectAll: boolean
  onSelectAll: () => void

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

  // Filter options
  availableDates: string[]
  availableDays: string[]
  categoryOptions: string[]
  urgencyOptions: string[]

  // Filter handlers
  onToggleColumnFilter: (column: string) => void
  onSourceFilterChange: (sources: string[]) => void
  onDateFilterChange: (date: string) => void
  onDayFilterChange: (days: string[]) => void
  onCategoryFilterChange: (categories: string[]) => void
  onUrgencyFilterChange: (urgencies: string[]) => void

  // For category count calculation
  requests: ChatRequest[]
  selectedYear: number
  selectedMonth: number | 'all'
  selectedDay: string | 'all'

  // Utilities
  formatUrgencyDisplay: (urgency: string) => string
  preserveScrollPosition: () => void
}

export function SupportTableHeader({
  selectAll,
  onSelectAll,
  sortColumn,
  sortDirection,
  onSort,
  showFilters,
  sourceFilter,
  dateFilter,
  dayFilter,
  categoryFilter,
  urgencyFilter,
  availableDates,
  availableDays,
  categoryOptions,
  urgencyOptions,
  onToggleColumnFilter,
  onSourceFilterChange,
  onDateFilterChange,
  onDayFilterChange,
  onCategoryFilterChange,
  onUrgencyFilterChange,
  requests,
  selectedYear,
  selectedMonth,
  selectedDay,
  formatUrgencyDisplay,
  preserveScrollPosition
}: SupportTableHeaderProps) {

  const getSortIcon = (column: string) => {
    if (sortColumn !== column) return null
    return sortDirection === 'asc' ? (
      <ArrowUp className="w-3 h-3" />
    ) : (
      <ArrowDown className="w-3 h-3" />
    )
  }

  const handleFilterChange = (
    type: 'source' | 'date' | 'day' | 'category' | 'urgency',
    value: string,
    checked?: boolean
  ) => {
    preserveScrollPosition()

    switch (type) {
      case 'source':
        const newSourceFilter = checked
          ? [...sourceFilter, value]
          : sourceFilter.filter(s => s !== value)
        onSourceFilterChange(newSourceFilter)
        break
      case 'date':
        onDateFilterChange(value)
        break
      case 'day':
        const newDayFilter = checked
          ? [...dayFilter, value]
          : dayFilter.filter(d => d !== value)
        onDayFilterChange(newDayFilter)
        break
      case 'category':
        const newCategoryFilter = checked
          ? [...categoryFilter, value]
          : categoryFilter.filter(c => c !== value)
        onCategoryFilterChange(newCategoryFilter)
        break
      case 'urgency':
        const newUrgencyFilter = checked
          ? [...urgencyFilter, value]
          : urgencyFilter.filter(u => u !== value)
        onUrgencyFilterChange(newUrgencyFilter)
        break
    }
  }

  const getCategoryCount = (category: string) => {
    return requests.filter(request => {
      const requestDate = parseLocalDate(request.Date)
      const requestYear = requestDate.getFullYear()
      const requestMonth = requestDate.getMonth() + 1
      if (requestYear !== selectedYear) return false
      if (selectedMonth !== 'all' && requestMonth !== selectedMonth) return false
      if (selectedDay !== 'all' && request.Date !== selectedDay) return false
      return request.Category === category
    }).length
  }

  return (
    <TableHeader>
      <TableRow>
        {/* Select All Checkbox */}
        <TableHead className="w-12">
          <input
            type="checkbox"
            checked={selectAll}
            onChange={onSelectAll}
            className="rounded border-border focus:ring-blue-500"
            title="Select all visible requests on this page"
          />
        </TableHead>

        {/* Source Column with Filter */}
        <TableHead className="w-16">
          <div className="space-y-1">
            <div className="flex items-center justify-center">
              <button
                onClick={() => onToggleColumnFilter('source')}
                className="p-1 hover:bg-gray-100 rounded transition-colors"
                title="Toggle source filter"
              >
                <Filter className={`w-3 h-3 transition-colors ${
                  showFilters.source ? 'text-blue-600 dark:text-blue-400' : 'text-muted-foreground hover:text-foreground'
                }`} />
              </button>
            </div>
            <div className="flex items-center justify-center">
              <span className="text-xs">Source</span>
            </div>
            {showFilters.source && (
              <div className="w-full text-xs border border-border rounded p-2 bg-card">
                {['sms', 'ticket', 'email', 'phone'].map(source => (
                  <label key={source} className="flex items-center space-x-1 mb-1 cursor-pointer hover:bg-muted/50 rounded px-1">
                    <input
                      type="checkbox"
                      checked={sourceFilter.includes(source)}
                      onChange={(e) => handleFilterChange('source', source, e.target.checked)}
                      className="rounded border-border text-blue-600 dark:text-blue-400 focus:ring-blue-500 focus:ring-2"
                    />
                    <span className="capitalize">
                      {source === 'sms' ? 'Text' : source === 'email' ? 'Email' : source === 'phone' ? 'Phone' : 'Ticket'}
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </TableHead>

        {/* Date Column with Sort and Filter */}
        <TableHead className="min-w-[110px]">
          <div className="space-y-1">
            <div className="flex items-center justify-center">
              <button
                onClick={() => onToggleColumnFilter('date')}
                className="p-1 hover:bg-gray-100 rounded transition-colors"
                title="Toggle date filter"
              >
                <Filter className={`w-3 h-3 transition-colors ${
                  showFilters.date ? 'text-blue-600 dark:text-blue-400' : 'text-muted-foreground hover:text-foreground'
                }`} />
              </button>
            </div>
            <div className="flex items-center space-x-1">
              <button
                onClick={() => onSort('Date')}
                className="flex items-center space-x-1 hover:text-blue-600 transition-colors"
              >
                <span>Date</span>
                {getSortIcon('Date')}
              </button>
            </div>
            {showFilters.date && (
              <select
                value={dateFilter}
                onChange={(e) => handleFilterChange('date', e.target.value)}
                className="w-full text-xs text-foreground border border-border rounded px-1 py-0.5 bg-background"
              >
                <option value="all">All Dates</option>
                {availableDates.map(date => (
                  <option key={date} value={date}>{date}</option>
                ))}
              </select>
            )}
          </div>
        </TableHead>

        {/* Day Column with Sort and Filter */}
        <TableHead className="w-20">
          <div className="space-y-1">
            <div className="flex items-center justify-center">
              <button
                onClick={() => onToggleColumnFilter('day')}
                className="p-1 hover:bg-gray-100 rounded transition-colors"
                title="Toggle day filter"
              >
                <Filter className={`w-3 h-3 transition-colors ${
                  showFilters.day ? 'text-blue-600 dark:text-blue-400' : 'text-muted-foreground hover:text-foreground'
                }`} />
              </button>
            </div>
            <div className="flex items-center space-x-1">
              <button
                onClick={() => onSort('DayOfWeek')}
                className="flex items-center space-x-1 hover:text-blue-600 transition-colors"
              >
                <span>Day</span>
                {getSortIcon('DayOfWeek')}
              </button>
            </div>
            {showFilters.day && (
              <div className="w-full text-xs border border-border rounded p-2 bg-card">
                {availableDays.map(day => (
                  <label key={day} className="flex items-center space-x-1 hover:bg-accent p-1 rounded cursor-pointer">
                    <input
                      type="checkbox"
                      checked={dayFilter.includes(day)}
                      onChange={(e) => handleFilterChange('day', day, e.target.checked)}
                      className="rounded border-border text-blue-600 dark:text-blue-400 focus:ring-blue-500 focus:ring-2"
                    />
                    <span>{day}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </TableHead>

        {/* Time Column with Sort */}
        <TableHead>
          <button
            onClick={() => onSort('Time')}
            className="flex items-center space-x-1 hover:text-blue-600 transition-colors"
          >
            <span>Time</span>
            {getSortIcon('Time')}
          </button>
        </TableHead>

        {/* Request Summary Column with Sort */}
        <TableHead>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => onSort('Request_Summary')}
              className="flex items-center space-x-1 hover:text-blue-600 transition-colors"
            >
              <span>Request Summary</span>
              {getSortIcon('Request_Summary')}
            </button>
            <div
              className="flex items-center space-x-1 cursor-help hover:text-blue-600 transition-colors"
              title="Full request text is always visible with line wrapping"
            >
              <Info className="w-3 h-3 text-gray-400" />
            </div>
          </div>
        </TableHead>

        {/* Category Column with Sort and Filter */}
        <TableHead>
          <div className="space-y-1">
            <div className="flex items-center justify-center">
              <button
                onClick={() => onToggleColumnFilter('category')}
                className="p-1 hover:bg-gray-100 rounded transition-colors"
                title="Toggle category filter"
              >
                <Filter className={`w-3 h-3 transition-colors ${
                  showFilters.category ? 'text-blue-600 dark:text-blue-400' : 'text-muted-foreground hover:text-foreground'
                }`} />
              </button>
            </div>
            <div className="flex items-center space-x-1">
              <button
                onClick={() => onSort('Category')}
                className="flex items-center space-x-1 hover:text-blue-600 transition-colors"
              >
                <span>Category</span>
                {getSortIcon('Category')}
              </button>
              <ChevronDown className="w-3 h-3 text-gray-400" />
            </div>
            {showFilters.category && (
              <div className="w-full text-xs border border-border rounded p-2 bg-card max-h-40 overflow-y-auto">
                {categoryOptions.map(category => {
                  const count = getCategoryCount(category)
                  return (
                    <label key={category} className="flex items-center space-x-1 hover:bg-accent p-1 rounded cursor-pointer">
                      <input
                        type="checkbox"
                        checked={categoryFilter.includes(category)}
                        onChange={(e) => handleFilterChange('category', category, e.target.checked)}
                        className="rounded border-border text-blue-600 dark:text-blue-400 focus:ring-blue-500 focus:ring-2"
                      />
                      <span className="truncate">{category}</span>
                      {count > 0 && (
                        <span className="text-muted-foreground ml-auto">({count})</span>
                      )}
                    </label>
                  )
                })}
              </div>
            )}
          </div>
        </TableHead>

        {/* Urgency Column with Sort and Filter */}
        <TableHead>
          <div className="space-y-1">
            <div className="flex items-center justify-center">
              <button
                onClick={() => onToggleColumnFilter('urgency')}
                className="p-1 hover:bg-gray-100 rounded transition-colors"
                title="Toggle urgency filter"
              >
                <Filter className={`w-3 h-3 transition-colors ${
                  showFilters.urgency ? 'text-blue-600 dark:text-blue-400' : 'text-muted-foreground hover:text-foreground'
                }`} />
              </button>
            </div>
            <div className="flex items-center space-x-1">
              <button
                onClick={() => onSort('Urgency')}
                className="flex items-center space-x-1 hover:text-blue-600 transition-colors"
              >
                <span>Urgency</span>
                {getSortIcon('Urgency')}
              </button>
              <ChevronDown className="w-3 h-3 text-gray-400" />
            </div>
            {showFilters.urgency && (
              <div className="w-full text-xs border border-border rounded p-2 bg-card">
                {urgencyOptions.map(urgency => (
                  <label key={urgency} className="flex items-center space-x-1 hover:bg-accent p-1 rounded cursor-pointer">
                    <input
                      type="checkbox"
                      checked={urgencyFilter.includes(urgency)}
                      onChange={(e) => handleFilterChange('urgency', urgency, e.target.checked)}
                      className="rounded border-border text-blue-600 dark:text-blue-400 focus:ring-blue-500 focus:ring-2"
                    />
                    <span>{formatUrgencyDisplay(urgency)}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </TableHead>

        {/* Hours Column with Sort */}
        <TableHead>
          <button
            onClick={() => onSort('EstimatedHours')}
            className="flex items-center space-x-1 hover:text-blue-600 transition-colors"
          >
            <span>Hours</span>
            {getSortIcon('EstimatedHours')}
          </button>
        </TableHead>

        {/* Actions Column */}
        <TableHead className="w-20">Actions</TableHead>
      </TableRow>
    </TableHeader>
  )
}
