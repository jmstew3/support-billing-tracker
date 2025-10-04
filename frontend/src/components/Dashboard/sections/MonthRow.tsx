import { ChevronUp, ChevronDown } from 'lucide-react';
import { formatCurrencyAccounting } from '../../../utils/formatting';
import { TicketsSection } from './TicketsSection';
import { ProjectsSection } from './ProjectsSection';
import { HostingSection } from './HostingSection';
import type { MonthlyBillingSummary } from '../../../types/billing';

// Category colors and styling constants
const CATEGORY_COLORS = {
  tickets: {
    light: 'text-blue-700 dark:text-blue-400',
    dark: 'dark:text-blue-400',
  },
  projects: {
    light: 'text-yellow-700 dark:text-yellow-400',
    dark: 'dark:text-yellow-400',
  },
  hosting: {
    light: 'text-green-700 dark:text-green-400',
    dark: 'dark:text-green-400',
  },
};

const TABLE_REVENUE_TEXT_SIZE = 'text-sm';
const TABLE_REVENUE_FONT_WEIGHT = 'font-semibold';

interface MonthRowProps {
  monthData: MonthlyBillingSummary;
  isExpanded: boolean;
  onToggleMonth: (month: string) => void;
  onToggleSection: (month: string, section: 'tickets' | 'projects' | 'hosting') => void;
  isSectionExpanded: (month: string, section: 'tickets' | 'projects' | 'hosting') => boolean;
  formatMonthLabel: (month: string) => string;
}

/**
 * MonthRow Component
 *
 * Displays a single month's billing summary row with collapsible sections.
 * Shows revenue breakdown by category (tickets, projects, hosting) and allows
 * expansion to view detailed line items for each section.
 *
 * Extracted from Dashboard.tsx lines 493-583
 */
export function MonthRow({
  monthData,
  isExpanded,
  onToggleMonth,
  onToggleSection,
  isSectionExpanded,
  formatMonthLabel,
}: MonthRowProps) {
  return (
    <>
      {/* Month Header Row */}
      <tr
        className="bg-muted/50 hover:bg-muted/70 cursor-pointer border-b transition-colors"
        onClick={() => onToggleMonth(monthData.month)}
      >
        <td colSpan={3} className="py-3 px-4">
          <div className="flex items-center gap-2">
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            <span className="font-bold text-base">{formatMonthLabel(monthData.month)}</span>
          </div>
        </td>
        <td className={`py-3 px-4 text-right ${TABLE_REVENUE_TEXT_SIZE} ${TABLE_REVENUE_FONT_WEIGHT} ${CATEGORY_COLORS.tickets.light} ${CATEGORY_COLORS.tickets.dark}`}>
          {monthData.ticketsRevenue === 0 ? (
            <span>-</span>
          ) : (
            <>
              <span>{formatCurrencyAccounting(monthData.ticketsRevenue).symbol}</span>
              <span className="tabular-nums">{formatCurrencyAccounting(monthData.ticketsRevenue).amount}</span>
            </>
          )}
        </td>
        <td className={`py-3 px-4 text-right ${TABLE_REVENUE_TEXT_SIZE} ${TABLE_REVENUE_FONT_WEIGHT} ${CATEGORY_COLORS.projects.light} ${CATEGORY_COLORS.projects.dark}`}>
          {monthData.projectsRevenue === 0 ? (
            <span>-</span>
          ) : (
            <>
              <span>{formatCurrencyAccounting(monthData.projectsRevenue).symbol}</span>
              <span className="tabular-nums">{formatCurrencyAccounting(monthData.projectsRevenue).amount}</span>
            </>
          )}
        </td>
        <td className={`py-3 px-4 text-right ${TABLE_REVENUE_TEXT_SIZE} ${TABLE_REVENUE_FONT_WEIGHT} ${CATEGORY_COLORS.hosting.light} ${CATEGORY_COLORS.hosting.dark}`}>
          {monthData.hostingRevenue === 0 ? (
            <span>-</span>
          ) : (
            <>
              <span>{formatCurrencyAccounting(monthData.hostingRevenue).symbol}</span>
              <span className="tabular-nums">{formatCurrencyAccounting(monthData.hostingRevenue).amount}</span>
            </>
          )}
        </td>
        <td className="py-3 px-4 text-right text-base font-bold">
          <span>{formatCurrencyAccounting(monthData.totalRevenue).symbol}</span>
          <span className="tabular-nums">{formatCurrencyAccounting(monthData.totalRevenue).amount}</span>
        </td>
      </tr>

      {/* Expanded Month Details */}
      {isExpanded && (
        <>
          {/* Tickets Section */}
          {monthData.ticketsCount > 0 && (
            <TicketsSection
              monthData={monthData}
              isExpanded={isSectionExpanded(monthData.month, 'tickets')}
              onToggle={() => onToggleSection(monthData.month, 'tickets')}
            />
          )}

          {/* Projects Section */}
          {monthData.projectsCount > 0 && (
            <ProjectsSection
              monthData={monthData}
              isExpanded={isSectionExpanded(monthData.month, 'projects')}
              onToggle={() => onToggleSection(monthData.month, 'projects')}
            />
          )}

          {/* Hosting Section */}
          {monthData.hostingSitesCount > 0 && (
            <HostingSection
              monthData={monthData}
              isExpanded={isSectionExpanded(monthData.month, 'hosting')}
              onToggle={() => onToggleSection(monthData.month, 'hosting')}
            />
          )}
        </>
      )}
    </>
  );
}
