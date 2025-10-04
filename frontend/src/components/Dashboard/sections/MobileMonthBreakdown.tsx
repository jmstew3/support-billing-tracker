import { Ticket, FolderKanban, Server } from 'lucide-react';
import { MobileMonthCard } from './MobileMonthCard';
import { formatCurrency, formatMonthLabel } from '../../../utils/formatting';
import type { MonthlyBillingSummary } from '../../../types/billing';

interface MobileMonthBreakdownProps {
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
}

/**
 * MobileMonthBreakdown Component
 *
 * Mobile-only view showing monthly billing breakdown as stacked cards.
 * Displays grand totals card when viewing multiple months.
 *
 * Extracted from Dashboard.tsx lines 412-459
 */
export function MobileMonthBreakdown({
  filteredData,
  expandedMonths,
  toggleMonth,
  toggleSection,
  isSectionExpanded,
  displayTotals,
}: MobileMonthBreakdownProps) {
  return (
    <div className="md:hidden space-y-3">
      {filteredData.map((monthData) => (
        <MobileMonthCard
          key={monthData.month}
          monthData={monthData}
          isExpanded={expandedMonths.has(monthData.month)}
          onToggleMonth={toggleMonth}
          onToggleSection={toggleSection}
          isSectionExpanded={isSectionExpanded}
          formatMonthLabel={formatMonthLabel}
        />
      ))}

      {/* Grand Total Card for Mobile */}
      {filteredData.length > 1 && (
        <div className="border-2 border-black dark:border-white bg-black text-white dark:bg-black dark:text-white p-4 rounded-lg">
          <h3 className="font-bold text-base mb-3">GRAND TOTALS</h3>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm flex items-center gap-2">
                <Ticket className="h-4 w-4" />
                Tickets
              </span>
              <span className="font-bold text-base">{formatCurrency(displayTotals?.totalTicketsRevenue || 0)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm flex items-center gap-2">
                <FolderKanban className="h-4 w-4" />
                Projects
              </span>
              <span className="font-bold text-base">{formatCurrency(displayTotals?.totalProjectsRevenue || 0)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm flex items-center gap-2">
                <Server className="h-4 w-4" />
                Hosting
              </span>
              <span className="font-bold text-base">{formatCurrency(displayTotals?.totalHostingRevenue || 0)}</span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-white/30">
              <span className="font-bold">Total Revenue</span>
              <span className="font-bold text-lg">{formatCurrency(displayTotals?.totalRevenue || 0)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
