import { DollarSign, Ticket, FolderKanban, Server, Zap } from 'lucide-react';
import { Scorecard } from '../../../components/ui/Scorecard';
import { formatCurrency, formatMonthLabel } from '../../../utils/formatting';
import type { BillingSummary } from '../../../types/billing';

interface DashboardScorecardsProps {
  displayTotals: {
    totalRevenue: number;
    totalTicketsRevenue: number;
    totalProjectsRevenue: number;
    totalHostingRevenue: number;
  };
  totalFreeHoursSavings: number;
  totalProjectCredits: number;
  totalHostingCreditsSavings: number;
  totalDiscounts: number;
  averageTicketCost: number;
  averageProjectCost: number;
  averageHostingCost: number;
  currentMonthString: string;
  billingSummary: BillingSummary | null;
}

/**
 * DashboardScorecards Component
 *
 * Displays two rows of scorecards showing revenue metrics and averages.
 * First row: Total Revenue, Support Tickets, Project Revenue, Hosting MRR
 * Second row: Avg Ticket Cost, Avg Project Cost, Avg Hosting Cost, Total Discounts
 *
 * Extracted from Dashboard.tsx lines 245-339
 */
export function DashboardScorecards({
  displayTotals,
  totalFreeHoursSavings,
  totalProjectCredits,
  totalHostingCreditsSavings,
  totalDiscounts,
  averageTicketCost,
  averageProjectCost,
  averageHostingCost,
  currentMonthString,
  billingSummary,
}: DashboardScorecardsProps) {
  return (
    <>
      {/* Summary Scorecards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <Scorecard
          title="Total Revenue"
          value={formatCurrency(displayTotals?.totalRevenue || 0)}
          icon={<DollarSign className="h-4 w-4 text-muted-foreground" />}
          description="Combined revenue from all sources"
        />
        <Scorecard
          title="Support Tickets"
          value={formatCurrency(displayTotals?.totalTicketsRevenue || 0)}
          icon={<Ticket className="h-4 w-4 text-muted-foreground" />}
          description={
            totalFreeHoursSavings > 0
              ? (
                <span className="flex items-center gap-1">
                  <Zap className="h-3 w-3 inline" />
                  After {formatCurrency(totalFreeHoursSavings)} in Turbo hours credits
                </span>
              )
              : currentMonthString !== 'all' && currentMonthString < '2025-06'
              ? 'Not eligible for free hours credit'
              : 'Billable hours from tickets'
          }
        />
        <Scorecard
          title="Project Revenue"
          value={formatCurrency(displayTotals?.totalProjectsRevenue || 0)}
          icon={<FolderKanban className="h-4 w-4 text-muted-foreground" />}
          description={
            totalProjectCredits > 0
              ? (
                <span className="flex items-center gap-1">
                  <Zap className="h-3 w-3 inline" />
                  After {formatCurrency(totalProjectCredits)} in Turbo project credits
                </span>
              )
              : 'Ready to invoice projects'
          }
        />
        <Scorecard
          title={currentMonthString === 'all' ? 'Current Hosting MRR' : 'Hosting MRR'}
          value={formatCurrency(
            currentMonthString === 'all' && billingSummary
              ? billingSummary.totalHostingRevenue // Latest month MRR
              : displayTotals?.totalHostingRevenue || 0 // Filtered month(s) sum
          )}
          icon={<Server className="h-4 w-4 text-muted-foreground" />}
          description={
            totalHostingCreditsSavings > 0
              ? (
                <span className="flex items-center gap-1">
                  <Zap className="h-3 w-3 inline" />
                  After {formatCurrency(totalHostingCreditsSavings)} in Turbo hosting credits
                </span>
              )
              : currentMonthString === 'all' && billingSummary?.monthlyBreakdown.length
              ? `As of ${formatMonthLabel(billingSummary.monthlyBreakdown[billingSummary.monthlyBreakdown.length - 1].month)}`
              : 'Net hosting revenue'
          }
        />
      </div>

      {/* Average Costs and Total Discounts */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <Scorecard
          title="Avg Ticket Cost"
          value={formatCurrency(averageTicketCost)}
          icon={<Ticket className="h-4 w-4 text-muted-foreground" />}
          description="Per support ticket"
        />
        <Scorecard
          title="Avg Project Cost"
          value={formatCurrency(averageProjectCost)}
          icon={<FolderKanban className="h-4 w-4 text-muted-foreground" />}
          description="Per project"
        />
        <Scorecard
          title="Avg Hosting Cost"
          value={formatCurrency(averageHostingCost)}
          icon={<Server className="h-4 w-4 text-muted-foreground" />}
          description="Per site per month"
        />
        <Scorecard
          title="Total Discounts"
          value={formatCurrency(totalDiscounts)}
          icon={<Zap className="h-4 w-4 text-muted-foreground" />}
          description={
            <span className="flex items-center gap-1">
              <Zap className="h-3 w-3" />
              After all Turbo credits applied
            </span>
          }
        />
      </div>
    </>
  );
}
