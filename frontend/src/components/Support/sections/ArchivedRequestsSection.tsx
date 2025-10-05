/**
 * ArchivedRequestsSection Component
 *
 * Displays archived (deleted) support requests with restore capability
 *
 * Features:
 * - Collapsible section with count indicator
 * - Chevron icon animation on expand/collapse
 * - Read-only table view of archived requests
 * - Source icon display with tooltips
 * - Restore button for each request
 * - Opacity styling to indicate archived state
 * - Only shown when API is available and archived requests exist
 */

import { Card, CardContent } from '../../ui/card'
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '../../ui/table'
import { TooltipProvider, Tooltip as UITooltip, TooltipTrigger, TooltipContent } from '../../ui/tooltip'
import { ChevronRight, Archive, RotateCcw, MessageCircle, Ticket, Mail, Phone } from 'lucide-react'
import type { ChatRequest } from '../../../types/request'
import { parseLocalDate } from '../../../utils/supportHelpers'

export interface ArchivedRequestsSectionProps {
  archivedRequests: ChatRequest[]
  requests: ChatRequest[]
  showArchived: boolean
  apiAvailable: boolean
  onToggleArchived: () => void
  onRestoreRequest: (requestId: number | undefined, originalIndex: number) => void
}

export function ArchivedRequestsSection({
  archivedRequests,
  requests,
  showArchived,
  apiAvailable,
  onToggleArchived,
  onRestoreRequest
}: ArchivedRequestsSectionProps) {
  // Only render if API is available and there are archived requests
  if (!apiAvailable || archivedRequests.length === 0) {
    return null
  }

  return (
    <Card className="mt-4">
      <CardContent className="p-4">
        <div
          className="flex items-center justify-between cursor-pointer"
          onClick={onToggleArchived}
        >
          <div className="flex items-center space-x-2">
            <ChevronRight className={`w-4 h-4 transition-transform ${showArchived ? 'rotate-90' : ''}`} />
            <Archive className="w-4 h-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold text-muted-foreground">
              Archived Requests ({archivedRequests.length})
            </h3>
          </div>
          <span className="text-sm text-muted-foreground">
            Click to {showArchived ? 'hide' : 'show'}
          </span>
        </div>

        {showArchived && (
          <div className="mt-4 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Source</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Summary</TableHead>
                  <TableHead>Urgency</TableHead>
                  <TableHead className="w-20">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {archivedRequests.map((request) => {
                  const originalIndex = requests.findIndex(r => r === request)
                  return (
                    <TableRow key={originalIndex} className="opacity-60">
                      <TableCell className="text-center">
                        <TooltipProvider>
                          <UITooltip>
                            <TooltipTrigger asChild>
                              <div className="inline-flex items-center justify-center">
                                {request.source === 'ticket' ? (
                                  <Ticket className="h-4 w-4 text-gray-600 dark:text-gray-400" aria-label="Request via Ticket System" />
                                ) : request.source === 'email' ? (
                                  <Mail className="h-4 w-4 text-gray-600 dark:text-gray-400" aria-label="Request via Email" />
                                ) : request.source === 'phone' ? (
                                  <Phone className="h-4 w-4 text-gray-600 dark:text-gray-400" aria-label="Request via Phone" />
                                ) : (
                                  <MessageCircle className="h-4 w-4 text-gray-600 dark:text-gray-400" aria-label="Request via Text" />
                                )}
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Via {request.source === 'sms' ? 'Text' : request.source === 'ticket' ? 'Ticket System' : request.source === 'email' ? 'Email' : request.source === 'phone' ? 'Phone' : 'Text'}</p>
                            </TooltipContent>
                          </UITooltip>
                        </TooltipProvider>
                      </TableCell>
                      <TableCell className="text-sm">
                        {parseLocalDate(request.Date).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-sm">{request.Time}</TableCell>
                      <TableCell>
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          {request.Category || 'Support'}
                        </span>
                      </TableCell>
                      <TableCell className="max-w-md">
                        <div className="text-sm text-muted-foreground whitespace-normal break-words">
                          {request.Request_Summary}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          request.Urgency === 'HIGH'
                            ? 'bg-gray-800 text-white dark:bg-gray-200 dark:text-gray-900'
                            : request.Urgency === 'MEDIUM'
                            ? 'bg-gray-600 text-white dark:bg-gray-400 dark:text-gray-900'
                            : request.Urgency === 'PROMOTION'
                            ? 'bg-gray-500 text-white dark:bg-gray-500 dark:text-white'
                            : 'bg-gray-300 text-gray-800 dark:bg-gray-600 dark:text-gray-200'
                        }`}>
                          {request.Urgency}
                        </span>
                      </TableCell>
                      <TableCell>
                        <button
                          onClick={() => onRestoreRequest(request.id, originalIndex)}
                          className="p-1.5 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-all duration-200"
                          title="Restore request"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
