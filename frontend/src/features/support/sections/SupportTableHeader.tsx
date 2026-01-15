/**
 * SupportTableHeader Component
 *
 * Displays the table header with sortable columns.
 * Inline filters have been moved to the FilterPanel component.
 *
 * Features:
 * - Select all checkbox
 * - Sortable columns (Date, Day, Time, Summary, Category, Urgency, Hours)
 */

import { TableHead, TableHeader, TableRow } from '../../../components/ui/table'
import { ArrowUp, ArrowDown, Info } from 'lucide-react'

export interface SupportTableHeaderProps {
  // Selection
  selectAll: boolean
  onSelectAll: () => void

  // Sorting
  sortColumn: string | null
  sortDirection: 'asc' | 'desc'
  onSort: (column: string) => void
}

export function SupportTableHeader({
  selectAll,
  onSelectAll,
  sortColumn,
  sortDirection,
  onSort
}: SupportTableHeaderProps) {

  const getSortIcon = (column: string) => {
    if (sortColumn !== column) return null
    return sortDirection === 'asc' ? (
      <ArrowUp className="w-3 h-3" />
    ) : (
      <ArrowDown className="w-3 h-3" />
    )
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

        {/* Source Column */}
        <TableHead className="w-16 text-center">
          <span className="text-xs">Source</span>
        </TableHead>

        {/* Website URL Column */}
        <TableHead className="w-16 text-center">
          <span className="text-xs">URL</span>
        </TableHead>

        {/* Date Column with Sort */}
        <TableHead className="min-w-[110px]">
          <button
            onClick={() => onSort('Date')}
            className="flex items-center space-x-1 hover:text-blue-600 transition-colors"
          >
            <span>Date</span>
            {getSortIcon('Date')}
          </button>
        </TableHead>

        {/* Day Column with Sort */}
        <TableHead className="w-20">
          <button
            onClick={() => onSort('DayOfWeek')}
            className="flex items-center space-x-1 hover:text-blue-600 transition-colors"
          >
            <span>Day</span>
            {getSortIcon('DayOfWeek')}
          </button>
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

        {/* Category Column with Sort */}
        <TableHead>
          <button
            onClick={() => onSort('Category')}
            className="flex items-center space-x-1 hover:text-blue-600 transition-colors"
          >
            <span>Category</span>
            {getSortIcon('Category')}
          </button>
        </TableHead>

        {/* Urgency Column with Sort */}
        <TableHead>
          <button
            onClick={() => onSort('Urgency')}
            className="flex items-center space-x-1 hover:text-blue-600 transition-colors"
          >
            <span>Urgency</span>
            {getSortIcon('Urgency')}
          </button>
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

        {/* Billing Date Column with Sort */}
        <TableHead className="min-w-[120px]">
          <div className="flex items-center space-x-1">
            <button
              onClick={() => onSort('BillingDate')}
              className="flex items-center space-x-1 hover:text-blue-600 transition-colors"
            >
              <span>Billing Date</span>
              {getSortIcon('BillingDate')}
            </button>
            <span title="Override the original date for billing purposes. Click to edit.">
              <Info className="w-3 h-3 text-gray-400 cursor-help" />
            </span>
          </div>
        </TableHead>

        {/* Actions Column */}
        <TableHead className="w-20">Actions</TableHead>
      </TableRow>
    </TableHeader>
  )
}
