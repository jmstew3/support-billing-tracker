import { useState } from 'react';
import { ChevronUp, ChevronDown, Ticket, Zap } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { formatCurrency, formatCurrencyAccounting } from '../../../utils/formatting';
import { CountBadge, CreditBadge } from '../../../components/ui/BillingBadge';
import type { MonthlyBillingSummary } from '../../../types/billing';

interface TicketsSectionProps {
  monthData: MonthlyBillingSummary;
  isExpanded: boolean;
  onToggle: () => void;
}

/**
 * TicketsSection Component
 *
 * Displays support tickets section within a month breakdown.
 * Shows individual ticket details, gross total, free hours benefit, and net billable.
 *
 * Extracted from Dashboard.tsx lines 589-723
 */
export function TicketsSection({ monthData, isExpanded, onToggle }: TicketsSectionProps) {
  const hasFreeHours = monthData.ticketsFreeHoursApplied > 0;
  const [expandedTickets, setExpandedTickets] = useState<Set<string>>(new Set());

  const toggleTicketDescription = (ticketId: string) => {
    setExpandedTickets((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(ticketId)) {
        newSet.delete(ticketId);
      } else {
        newSet.add(ticketId);
      }
      return newSet;
    });
  };

  return (
    <>
      <tr
        className="bg-muted/40 hover:bg-muted/60 cursor-pointer border-b"
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
      >
        <td colSpan={7} className="py-2 px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              <Ticket className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Tickets</span>
              <CountBadge
                text={`${monthData.ticketsCount}`}
                size="xs"
              />
              {hasFreeHours && (
                <CreditBadge
                  text={`${monthData.ticketsFreeHoursApplied}h free`}
                  size="xs"
                />
              )}
            </div>
            <span className="font-medium text-muted-foreground">
              {monthData.ticketsRevenue === 0 ? '-' : formatCurrency(monthData.ticketsRevenue)}
            </span>
          </div>
        </td>
      </tr>

      {isExpanded && (
        <>
          {/* Individual Ticket Rows */}
          {monthData.ticketDetails.map((ticket, idx) => {
            const isTicketExpanded = expandedTickets.has(ticket.id);
            return (
              <tr key={ticket.id} className="border-b divide-x hover:bg-muted/30">
                <td className="py-3 px-2 text-right text-muted-foreground text-xs w-8">
                  {idx + 1}
                </td>
                <td className="py-2 px-4 text-xs text-muted-foreground w-32">
                  {format(parseISO(ticket.date), 'MMM d, yyyy')}
                </td>
                <td className="py-2 px-4 text-xs">
                  <div
                    className={`cursor-pointer ${!isTicketExpanded ? 'line-clamp-2' : ''}`}
                    onClick={() => toggleTicketDescription(ticket.id)}
                  >
                    {ticket.description}
                  </div>
                </td>
                <td className="py-2 px-4 text-xs text-left text-muted-foreground w-24">
                  {ticket.urgency}
                </td>
                <td className="py-2 px-4 text-xs text-right text-muted-foreground w-28">
                  {formatCurrency(ticket.rate)}/hr
                </td>
                <td className="py-2 px-4 text-xs text-right text-muted-foreground w-20">
                  {ticket.hours.toFixed(2)}h
                </td>
                <td className="py-2 px-4 text-right text-sm w-32">
                  <span className="font-semibold">
                    <span>{formatCurrencyAccounting(ticket.amount).symbol}</span>
                    <span className="tabular-nums">{formatCurrencyAccounting(ticket.amount).amount}</span>
                  </span>
                </td>
              </tr>
            );
          })}

          {/* Gross Total Row */}
          <tr className="bg-black text-white dark:bg-black dark:text-white border-b border-t-2">
            <td colSpan={5} className="py-2 px-12 text-xs font-semibold">
              Gross Total
            </td>
            <td className="py-2 px-4 text-xs text-right font-semibold">
              {monthData.ticketDetails.reduce((sum, ticket) => sum + ticket.hours, 0).toFixed(2)}h
            </td>
            <td className="py-2 px-4 text-right text-xs font-semibold">
              {formatCurrency(monthData.ticketsGrossRevenue)}
            </td>
          </tr>

          {/* Free Hours Offset Row (if applicable) - shown as negative line item */}
          {hasFreeHours && (
            <>
              <tr className="bg-green-50 dark:bg-green-950/20 border-b">
                <td colSpan={5} className="py-2 px-12 text-xs font-medium text-green-700 dark:text-green-400">
                  <Zap className="h-3 w-3 inline mr-1 fill-green-600 dark:fill-green-400" />
                  Free Support Hours Benefit
                </td>
                <td className="py-2 px-4 text-xs text-right font-semibold text-green-700 dark:text-green-400">
                  -{monthData.ticketsFreeHoursApplied.toFixed(2)}h
                </td>
                <td className="py-2 px-4 text-right text-xs font-semibold text-green-700 dark:text-green-400">
                  -{formatCurrency(monthData.ticketsFreeHoursSavings)}
                </td>
              </tr>

              {/* Net Billable Row - shows final amount client pays */}
              <tr className="bg-blue-50 dark:bg-blue-950/20 border-b border-t">
                <td colSpan={5} className="py-2 px-12 text-xs font-semibold text-blue-700 dark:text-blue-400">
                  Net Billable
                </td>
                <td className="py-2 px-4 text-xs text-right font-semibold text-blue-700 dark:text-blue-400">
                  {(monthData.ticketDetails.reduce((sum, ticket) => sum + ticket.hours, 0) - monthData.ticketsFreeHoursApplied).toFixed(2)}h
                </td>
                <td className="py-2 px-4 text-right text-xs font-semibold text-blue-700 dark:text-blue-400">
                  {formatCurrency(monthData.ticketsRevenue)}
                </td>
              </tr>
            </>
          )}
        </>
      )}
    </>
  );
}
