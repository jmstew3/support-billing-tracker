import { Download } from 'lucide-react';
import { MonthRow } from './MonthRow';
import { GrandTotalRow } from './GrandTotalRow';
import { formatMonthLabel } from '../../../utils/formatting';
import type { MonthlyBillingSummary } from '../../../types/billing';

interface MonthlyBreakdownTableProps {
  filteredData: MonthlyBillingSummary[];
  expandedMonths: Set<string>;
  toggleMonth: (month: string) => void;
  toggleSection: (month: string, section: 'tickets' | 'projects' | 'hosting') => void;
  isSectionExpanded: (month: string, section: 'tickets' | 'projects' | 'hosting') => boolean;
  displayTotals: {
    totalRevenue: number;
    totalTicketsRevenue: number;
    totalProjectsRevenue: number;
    totalHostingRevenue: number;
  };
  onExport: () => void;
}

/**
 * MonthlyBreakdownTable Component
 *
 * Desktop-only table view showing monthly billing breakdown.
 * Displays expandable month rows with collapsible sections for tickets, projects, and hosting.
 * Shows grand totals when viewing multiple months.
 * Includes CSV export functionality.
 *
 * Extracted from Dashboard.tsx lines 352-410
 */
export function MonthlyBreakdownTable({
  filteredData,
  expandedMonths,
  toggleMonth,
  toggleSection,
  isSectionExpanded,
  displayTotals,
  onExport,
}: MonthlyBreakdownTableProps) {
  return (
    <div className="hidden md:block border bg-card">
      <div className="flex justify-between items-center p-4 border-b">
        <h3 className="font-semibold text-base">Monthly Breakdown</h3>
        <button
          onClick={onExport}
          className="px-3 py-1.5 text-sm border border-input bg-background hover:bg-accent hover:text-accent-foreground flex items-center gap-2 transition-colors"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>
      <div className="relative w-full overflow-auto">
        <table className="w-full caption-bottom text-sm">
          <thead className="[&_tr]:border-b sticky top-0 z-10 bg-background">
            <tr className="border-b">
              <th colSpan={3} className="h-10 px-4 text-left align-middle font-medium text-muted-foreground">
                Month
              </th>
              <th className="h-10 px-4 text-right align-middle font-medium text-muted-foreground">
                Tickets
              </th>
              <th className="h-10 px-4 text-right align-middle font-medium text-muted-foreground">
                Projects
              </th>
              <th className="h-10 px-4 text-right align-middle font-medium text-muted-foreground">
                Hosting
              </th>
              <th className="h-10 px-4 text-right align-middle font-medium text-muted-foreground">
                Total Revenue
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredData.map((monthData) => (
              <MonthRow
                key={monthData.month}
                monthData={monthData}
                isExpanded={expandedMonths.has(monthData.month)}
                onToggleMonth={toggleMonth}
                onToggleSection={toggleSection}
                isSectionExpanded={isSectionExpanded}
                formatMonthLabel={formatMonthLabel}
              />
            ))}

            {/* Grand Total Row */}
            {filteredData.length > 1 && (
              <GrandTotalRow
                totalTicketsRevenue={displayTotals?.totalTicketsRevenue || 0}
                totalProjectsRevenue={displayTotals?.totalProjectsRevenue || 0}
                totalHostingRevenue={displayTotals?.totalHostingRevenue || 0}
                totalRevenue={displayTotals?.totalRevenue || 0}
              />
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
