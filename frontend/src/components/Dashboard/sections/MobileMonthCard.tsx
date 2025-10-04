import { ChevronUp, ChevronDown, Ticket, FolderKanban, Server, Zap } from 'lucide-react';
import { SiteFavicon } from '../../ui/SiteFavicon';
import { formatCurrency } from '../../../utils/formatting';
import type { MonthlyBillingSummary } from '../../../types/billing';

interface MobileMonthCardProps {
  monthData: MonthlyBillingSummary;
  isExpanded: boolean;
  onToggleMonth: (month: string) => void;
  onToggleSection: (month: string, section: 'tickets' | 'projects' | 'hosting') => void;
  isSectionExpanded: (month: string, section: 'tickets' | 'projects' | 'hosting') => boolean;
  formatMonthLabel: (month: string) => string;
}

/**
 * MobileMonthCard Component
 *
 * Mobile-optimized card view for a single month's billing breakdown.
 * Shows collapsible sections for tickets, projects, and hosting with detailed line items.
 * Displays free credits and turbo discounts applied to each category.
 *
 * Extracted from Dashboard.tsx lines 476-728
 */
export function MobileMonthCard({
  monthData,
  isExpanded,
  onToggleMonth,
  onToggleSection,
  isSectionExpanded,
  formatMonthLabel,
}: MobileMonthCardProps) {
  return (
    <div className="border bg-card rounded-lg overflow-hidden">
      {/* Card Header */}
      <div
        className="bg-muted/50 p-4 cursor-pointer active:bg-muted/70"
        onClick={() => onToggleMonth(monthData.month)}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-base flex items-center gap-2">
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            {formatMonthLabel(monthData.month)}
          </h3>
          <span className="font-bold text-lg">{formatCurrency(monthData.totalRevenue)}</span>
        </div>

        {/* Revenue Breakdown */}
        <div className="space-y-1.5 text-sm">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground flex items-center gap-2">
              <Ticket className="h-3.5 w-3.5" />
              Tickets
            </span>
            <span className="font-medium text-blue-600 dark:text-blue-400">
              {monthData.ticketsRevenue === 0 ? '-' : formatCurrency(monthData.ticketsRevenue)}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground flex items-center gap-2">
              <FolderKanban className="h-3.5 w-3.5" />
              Projects
            </span>
            <span className="font-medium text-yellow-600 dark:text-yellow-400">
              {monthData.projectsRevenue === 0 ? '-' : formatCurrency(monthData.projectsRevenue)}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground flex items-center gap-2">
              <Server className="h-3.5 w-3.5" />
              Hosting
            </span>
            <span className="font-medium text-green-600 dark:text-green-400">
              {monthData.hostingRevenue === 0 ? '-' : formatCurrency(monthData.hostingRevenue)}
            </span>
          </div>
        </div>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="border-t">
          {/* Tickets Section */}
          {monthData.ticketsRevenue > 0 && (
            <div className="border-b">
              <div
                className="flex items-center justify-between p-3 bg-muted/20 cursor-pointer active:bg-muted/40"
                onClick={() => onToggleSection(monthData.month, 'tickets')}
              >
                <div className="flex items-center gap-2">
                  {isSectionExpanded(monthData.month, 'tickets') ? (
                    <ChevronUp className="h-3.5 w-3.5" />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5" />
                  )}
                  <Ticket className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <span className="font-medium text-sm">
                    {monthData.ticketsCount} Ticket{monthData.ticketsCount !== 1 ? 's' : ''}
                  </span>
                  {monthData.ticketsFreeHoursApplied > 0 && (
                    <span className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                      <Zap className="h-3 w-3" />
                      {monthData.ticketsFreeHoursApplied}h free
                    </span>
                  )}
                </div>
                <span className="font-semibold text-sm">{formatCurrency(monthData.ticketsRevenue)}</span>
              </div>
              {isSectionExpanded(monthData.month, 'tickets') && (
                <div className="p-3 space-y-2 text-xs bg-background">
                  {monthData.tickets?.map((ticket, idx) => (
                    <div key={idx} className="flex justify-between items-start py-1 border-b last:border-b-0">
                      <div className="flex-1 pr-2">
                        <div className="font-medium flex items-center gap-2">
                          <span className="text-muted-foreground w-6 text-center">{idx + 1}.</span>
                          <span>{ticket.summary}</span>
                        </div>
                        <div className="text-muted-foreground mt-0.5 ml-8">
                          {ticket.hours}h × ${ticket.rate}/hr
                        </div>
                      </div>
                      <div className="text-right font-semibold whitespace-nowrap">
                        {formatCurrency(ticket.amount)}
                      </div>
                    </div>
                  ))}
                  {monthData.ticketsFreeHoursSavings > 0 && (
                    <div className="pt-2 border-t bg-green-50 dark:bg-green-950/20 -mx-3 -mb-3 px-3 py-2">
                      <div className="flex justify-between items-center text-green-600 dark:text-green-400 font-semibold">
                        <span className="flex items-center gap-1">
                          <Zap className="h-3 w-3" />
                          Free Hours Credit
                        </span>
                        <span>-{formatCurrency(monthData.ticketsFreeHoursSavings)}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Projects Section */}
          {monthData.projectsRevenue > 0 && (
            <div className="border-b">
              <div
                className="flex items-center justify-between p-3 bg-muted/20 cursor-pointer active:bg-muted/40"
                onClick={() => onToggleSection(monthData.month, 'projects')}
              >
                <div className="flex items-center gap-2">
                  {isSectionExpanded(monthData.month, 'projects') ? (
                    <ChevronUp className="h-3.5 w-3.5" />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5" />
                  )}
                  <FolderKanban className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                  <span className="font-medium text-sm">
                    {monthData.projectsCount} Project{monthData.projectsCount !== 1 ? 's' : ''}
                  </span>
                  {(monthData.projectsLandingPageCredit > 0 || monthData.projectsMultiFormCredit > 0 || monthData.projectsBasicFormCredit > 0) && (
                    <span className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                      <Zap className="h-3 w-3" />
                      {monthData.projectsLandingPageCredit + monthData.projectsMultiFormCredit + monthData.projectsBasicFormCredit} free
                    </span>
                  )}
                </div>
                <span className="font-semibold text-sm">{formatCurrency(monthData.projectsRevenue)}</span>
              </div>
              {isSectionExpanded(monthData.month, 'projects') && (
                <div className="p-3 space-y-2 text-xs bg-background">
                  {monthData.projects?.map((project, idx) => (
                    <div key={idx} className="flex justify-between items-start py-1 border-b last:border-b-0">
                      <div className="flex-1 pr-2">
                        <div className="font-medium flex items-center gap-2">
                          <span className="text-muted-foreground w-6 text-center">{idx + 1}.</span>
                          {project.name}
                          {project.isFreeCredit && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-green-100 dark:bg-green-950/30 text-green-700 dark:text-green-300 ring-1 ring-inset ring-green-200 dark:ring-green-800">
                              FREE
                            </span>
                          )}
                        </div>
                        <div className="text-muted-foreground mt-0.5 ml-8">{project.category}</div>
                      </div>
                      <div className="text-right font-semibold whitespace-nowrap">
                        {project.isFreeCredit && project.originalAmount ? (
                          <div className="flex flex-col items-end">
                            <span className="line-through text-muted-foreground">{formatCurrency(project.originalAmount)}</span>
                            <span className="text-green-600 dark:text-green-400">{formatCurrency(project.amount)}</span>
                          </div>
                        ) : (
                          formatCurrency(project.amount)
                        )}
                      </div>
                    </div>
                  ))}
                  {(monthData.projectsLandingPageSavings > 0 || monthData.projectsMultiFormSavings > 0 || monthData.projectsBasicFormSavings > 0) && (
                    <div className="pt-2 border-t bg-green-50 dark:bg-green-950/20 -mx-3 -mb-3 px-3 py-2">
                      <div className="flex justify-between items-center text-green-600 dark:text-green-400 font-semibold">
                        <span className="flex items-center gap-1">
                          <Zap className="h-3 w-3" />
                          Project Credits
                        </span>
                        <span>-{formatCurrency(monthData.projectsLandingPageSavings + monthData.projectsMultiFormSavings + monthData.projectsBasicFormSavings)}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Hosting Section */}
          {monthData.hostingRevenue > 0 && (
            <div>
              <div
                className="flex items-center justify-between p-3 bg-muted/20 cursor-pointer active:bg-muted/40"
                onClick={() => onToggleSection(monthData.month, 'hosting')}
              >
                <div className="flex items-center gap-2">
                  {isSectionExpanded(monthData.month, 'hosting') ? (
                    <ChevronUp className="h-3.5 w-3.5" />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5" />
                  )}
                  <Server className="h-4 w-4 text-green-600 dark:text-green-400" />
                  <span className="font-medium text-sm">
                    {monthData.hostingSitesCount} Site{monthData.hostingSitesCount !== 1 ? 's' : ''}
                  </span>
                  {monthData.hostingFreeCredits > 0 && (
                    <span className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                      <Zap className="h-3 w-3" />
                      {monthData.hostingFreeCredits} free
                    </span>
                  )}
                </div>
                <span className="font-semibold text-sm">{formatCurrency(monthData.hostingRevenue)}</span>
              </div>
              {isSectionExpanded(monthData.month, 'hosting') && (
                <div className="p-3 space-y-2 text-xs bg-background">
                  {monthData.hosting?.map((hosting, idx) => (
                    <div key={idx} className="flex justify-between items-start py-1 border-b last:border-b-0">
                      <div className="flex-1 pr-2">
                        <div className="font-medium flex items-center gap-2">
                          <span className="text-muted-foreground w-6 text-center">{idx + 1}.</span>
                          <SiteFavicon url={hosting.url} size="xs" />
                          {hosting.name}
                          {hosting.creditApplied && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-green-100 dark:bg-green-950/30 text-green-700 dark:text-green-300 ring-1 ring-inset ring-green-200 dark:ring-green-800">
                              FREE
                            </span>
                          )}
                        </div>
                        <div className="text-muted-foreground mt-0.5 ml-8">
                          {hosting.billingType === 'FULL' ? 'Full Month' :
                           hosting.billingType === 'PRORATED_START' ? 'Prorated Start' :
                           hosting.billingType === 'PRORATED_END' ? 'Prorated End' : 'Inactive'}
                        </div>
                      </div>
                      <div className="text-right font-semibold whitespace-nowrap">
                        {hosting.creditApplied ? (
                          <span className="text-green-600 dark:text-green-400">FREE</span>
                        ) : (
                          formatCurrency(hosting.netAmount)
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
