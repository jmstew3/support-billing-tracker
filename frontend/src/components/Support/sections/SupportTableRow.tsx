/**
 * SupportTableRow Component
 *
 * Displays a single support request row with editable fields
 *
 * Features:
 * - Checkbox for selection
 * - Source icon with tooltip
 * - Editable category, urgency, and hours
 * - Delete action button
 * - Special styling for non-billable requests
 */

import { TableCell, TableRow } from '../../ui/table'
import { EditableCell } from '../../shared/EditableCell'
import { EditableNumberCell } from '../../shared/EditableNumberCell'
import { TooltipProvider, Tooltip as UITooltip, TooltipTrigger, TooltipContent } from '../../ui/tooltip'
import { Trash2, MessageCircle, Ticket, Mail, Phone, Clipboard } from 'lucide-react'
import type { ChatRequest } from '../../../types/request'
import { getDayOfWeek } from '../../../utils/supportHelpers'
import { categorizeRequest } from '../../../utils/dataProcessing'

export interface SupportTableRowProps {
  request: ChatRequest
  index: number
  paginatedIndex: number
  startIndex: number
  isSelected: boolean
  categoryOptions: string[]
  urgencyOptions: string[]
  onSelectRequest: (index: number, event: React.ChangeEvent<HTMLInputElement>) => void
  onRowClick: (index: number, event: React.MouseEvent) => void
  onUpdateRequest: (index: number, field: string, value: any) => void
  onDeleteRequest: (index: number) => void
  formatTime: (time: string) => string
  formatUrgencyDisplay: (urgency: string) => string
}

export function SupportTableRow({
  request,
  index,
  paginatedIndex,
  startIndex,
  isSelected,
  categoryOptions,
  urgencyOptions,
  onSelectRequest,
  onRowClick,
  onUpdateRequest,
  onDeleteRequest,
  formatTime,
  formatUrgencyDisplay
}: SupportTableRowProps) {
  const isNonBillable = request.Category === 'Non-billable' || request.Category === 'Migration'
  const filteredIndex = startIndex + paginatedIndex

  return (
    <TableRow
      className={`cursor-pointer transition-colors ${
        isNonBillable ? 'opacity-50 bg-gray-50' : ''
      } ${
        isSelected ? 'bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30' : 'hover:bg-gray-50/50 dark:hover:bg-gray-800/30'
      }`}
      onClick={(e) => onRowClick(index, e)}
    >
      <TableCell>
        <input
          type="checkbox"
          checked={isSelected}
          onChange={(e) => onSelectRequest(index, e)}
          className="rounded border-border focus:ring-blue-500"
        />
      </TableCell>
      <TableCell className="text-center">
        <TooltipProvider>
          <UITooltip>
            <TooltipTrigger asChild>
              <div className="inline-flex items-center justify-center">
                {request.source === 'ticket' ? (
                  <Ticket className="h-4 w-4 text-green-600 dark:text-green-400" aria-label="Request via Twenty CRM" />
                ) : request.source === 'fluent' ? (
                  <Clipboard className="h-4 w-4 text-purple-600 dark:text-purple-400" aria-label="Request via FluentSupport" />
                ) : request.source === 'email' ? (
                  <Mail className="h-4 w-4 text-orange-600 dark:text-orange-400" aria-label="Request via Email" />
                ) : request.source === 'phone' ? (
                  <Phone className="h-4 w-4 text-red-600 dark:text-red-400" aria-label="Request via Phone" />
                ) : (
                  <MessageCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" aria-label="Request via Text" />
                )}
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Via {request.source === 'sms' ? 'Text' : request.source === 'ticket' ? 'Twenty CRM' : request.source === 'fluent' ? 'FluentSupport' : request.source === 'email' ? 'Email' : request.source === 'phone' ? 'Phone' : 'Text'}</p>
            </TooltipContent>
          </UITooltip>
        </TooltipProvider>
      </TableCell>
      <TableCell className={`text-xs ${isNonBillable ? 'text-gray-400' : ''}`}>
        {request.Date.includes('T') ? request.Date.split('T')[0] : request.Date}
      </TableCell>
      <TableCell className={`text-xs ${isNonBillable ? 'text-muted-foreground opacity-60' : 'text-muted-foreground'}`}>
        {getDayOfWeek(request.Date)}
      </TableCell>
      <TableCell className={`text-xs ${isNonBillable ? 'text-gray-400' : ''}`}>
        {formatTime(request.Time)}
      </TableCell>
      <TableCell className="min-w-[200px] max-w-md">
        <div className={`text-xs whitespace-pre-wrap break-words ${isNonBillable ? 'text-gray-400' : ''}`}>
          {request.Request_Summary}
        </div>
      </TableCell>
      <TableCell className="min-w-[150px]">
        <EditableCell
          key={`category-${filteredIndex}-${isNonBillable}`}
          value={request.Category || categorizeRequest(request.Request_Summary)}
          options={categoryOptions}
          onSave={(newValue) => {
            console.log('Category EditableCell onSave called with:', newValue)
            onUpdateRequest(index, 'Category', newValue)
          }}
        />
      </TableCell>
      <TableCell className="min-w-[120px]">
        {isNonBillable ? (
          <span className="px-2 py-1 text-xs text-gray-400 bg-gray-100 rounded-full">
            N/A
          </span>
        ) : (
          <EditableCell
            key={`urgency-${filteredIndex}-${isNonBillable}`}
            value={request.Urgency}
            options={urgencyOptions}
            onSave={(newValue) => {
              console.log('Urgency EditableCell onSave called with:', newValue)
              onUpdateRequest(index, 'Urgency', newValue)
            }}
            formatDisplayValue={formatUrgencyDisplay}
          />
        )}
      </TableCell>
      <TableCell>
        {isNonBillable ? (
          <span className="px-2 py-1 text-xs text-gray-400 bg-gray-100 rounded-full">
            N/A
          </span>
        ) : (
          <EditableNumberCell
            value={request.EstimatedHours != null ? request.EstimatedHours : 0.50}
            urgency={request.Urgency}
            onSave={(newValue) => {
              console.log('Hours EditableNumberCell onSave called with:', newValue)
              onUpdateRequest(index, 'EstimatedHours', newValue)
            }}
          />
        )}
      </TableCell>
      <TableCell>
        <button
          onClick={(e) => {
            e.stopPropagation()
            onDeleteRequest(index)
          }}
          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-all duration-200"
          title="Delete request"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </TableCell>
    </TableRow>
  )
}
