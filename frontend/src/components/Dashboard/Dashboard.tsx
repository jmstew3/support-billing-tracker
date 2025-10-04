import { useState, useEffect } from 'react';
import { Scorecard } from '../ui/Scorecard';
import { LoadingState } from '../ui/LoadingState';
import { SiteFavicon } from '../ui/SiteFavicon';
import { PageHeader } from '../shared/PageHeader';
import { RevenueTrackerCard } from './RevenueTrackerCard';
import { usePeriod } from '../../contexts/PeriodContext';
import { useBillingCalculations } from './hooks/useBillingCalculations';
import { DollarSign, Ticket, FolderKanban, Server, ChevronDown, ChevronUp, Zap, Download } from 'lucide-react';
import { generateComprehensiveBilling } from '../../services/billingApi';
import { formatCurrency, formatCurrencyAccounting, formatMonthLabel } from '../../utils/formatting';
import { exportMonthlyBreakdownDetailedData, type MonthlyBreakdownExportData } from '../../utils/csvExport';
import { CountBadge, CreditBadge, BillingTypeBadge } from '../ui/BillingBadge';
import {
  CATEGORY_COLORS,
  TABLE_REVENUE_TEXT_SIZE,
  TABLE_REVENUE_FONT_WEIGHT,
} from '../../config/uiConstants';
import type { BillingSummary, MonthlyBillingSummary } from '../../types/billing';

interface DashboardProps {
  onToggleMobileMenu?: () => void;
}

export function Dashboard({ onToggleMobileMenu }: DashboardProps) {
  const { selectedYear, selectedMonth, setAvailableData } = usePeriod();
  const [billingSummary, setBillingSummary] = useState<BillingSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Track which sections are expanded
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set());
  const [expandedSections, setExpandedSections] = useState<Map<string, Set<string>>>(new Map());

  // Load comprehensive billing data on mount
  useEffect(() => {
    loadBillingData();
  }, []);

  async function loadBillingData() {
    try {
      setLoading(true);
      setError(null);
      const data = await generateComprehensiveBilling();
      setBillingSummary(data);

      // Register available data with context
      const months = data.monthlyBreakdown.map(m => {
        const [, month] = m.month.split('-').map(Number);
        return month;
      });
      const years = Array.from(new Set(data.monthlyBreakdown.map(m => parseInt(m.month.split('-')[0]))));
      setAvailableData(years, months, []);

      // Start with all months expanded (Level 1 visible)
      const allMonths = new Set(data.monthlyBreakdown.map((m) => m.month));
      setExpandedMonths(allMonths);

      // Start with all sections (tickets/projects/hosting) collapsed (Level 2 visible but contents hidden)
      setExpandedSections(new Map());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load billing data');
      console.error('Error loading billing data:', err);
    } finally {
      setLoading(false);
    }
  }

  // Toggle month expansion
  const toggleMonth = (month: string) => {
    setExpandedMonths((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(month)) {
        newSet.delete(month);
      } else {
        newSet.add(month);
      }
      return newSet;
    });
  };

  // Toggle section expansion (tickets, projects, hosting within a month)
  const toggleSection = (month: string, section: 'tickets' | 'projects' | 'hosting') => {
    setExpandedSections((prev) => {
      const newMap = new Map(prev);
      if (!newMap.has(month)) {
        newMap.set(month, new Set());
      }
      const monthSections = new Set(newMap.get(month)!); // Create new Set to avoid mutation
      if (monthSections.has(section)) {
        monthSections.delete(section);
      } else {
        monthSections.add(section);
      }
      newMap.set(month, monthSections);
      return newMap;
    });
  };

  // Check if section is expanded
  const isSectionExpanded = (month: string, section: 'tickets' | 'projects' | 'hosting') => {
    return expandedSections.get(month)?.has(section) || false;
  };

  // Note: formatMonthLabel now imported from utils/formatting

  // Filter data based on selected month from context
  // Convert context values to month string format (YYYY-MM)
  const currentMonthString = selectedMonth === 'all'
    ? 'all'
    : `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;

  const filteredData =
    billingSummary && currentMonthString !== 'all'
      ? billingSummary.monthlyBreakdown.filter((m) => m.month === currentMonthString)
      : billingSummary?.monthlyBreakdown || [];

  // Calculate all billing metrics using custom hook
  const {
    displayTotals,
    totalFreeHoursSavings,
    totalProjectCredits,
    averageTicketCost,
    averageProjectCost,
    averageHostingCost,
    totalHostingCreditsSavings,
    totalDiscounts
  } = useBillingCalculations({
    billingSummary,
    filteredData,
    currentMonthString
  });

  // Handle Monthly Breakdown export
  const handleExportMonthlyBreakdown = () => {
    if (!filteredData || filteredData.length === 0) return;

    const exportData: MonthlyBreakdownExportData = {
      months: filteredData.map(m => ({
        month: m.month,
        ticketsRevenue: m.ticketsRevenue,
        projectsRevenue: m.projectsRevenue,
        hostingRevenue: m.hostingRevenue,
        totalRevenue: m.totalRevenue,
        // Include all detailed line items
        ticketsCount: m.ticketsCount,
        ticketDetails: m.ticketDetails?.map(t => ({
          date: t.date,
          description: t.description,
          urgency: t.urgency,
          hours: t.hours,
          rate: t.rate,
          amount: t.amount,
          netAmount: t.netAmount,
          freeHoursApplied: t.freeHoursApplied,
        })),
        ticketsGrossRevenue: m.ticketsGrossRevenue,
        ticketsFreeHoursApplied: m.ticketsFreeHoursApplied,
        ticketsFreeHoursSavings: m.ticketsFreeHoursSavings,
        projectsCount: m.projectsCount,
        projectDetails: m.projectDetails?.map(p => ({
          name: p.name,
          completionDate: p.completionDate,
          category: p.category,
          amount: p.amount,
          originalAmount: p.originalAmount,
          isFreeCredit: p.isFreeCredit,
        })),
        projectsGrossRevenue: m.projectsGrossRevenue,
        projectsLandingPageCredit: m.projectsLandingPageCredit,
        projectsLandingPageSavings: m.projectsLandingPageSavings,
        projectsMultiFormCredit: m.projectsMultiFormCredit,
        projectsMultiFormSavings: m.projectsMultiFormSavings,
        projectsBasicFormCredit: m.projectsBasicFormCredit,
        projectsBasicFormSavings: m.projectsBasicFormSavings,
        hostingSitesCount: m.hostingSitesCount,
        hostingDetails: m.hostingDetails?.map(h => ({
          name: h.siteName,
          billingType: h.billingType,
          grossAmount: h.grossAmount,
          creditAmount: h.creditAmount,
          netAmount: h.netAmount,
          hostingStart: h.hostingStart,
          hostingEnd: h.hostingEnd,
        })),
        hostingGross: m.hostingGross,
        hostingCreditsApplied: m.hostingCreditsApplied,
      })),
    };

    // Add totals if viewing multiple months
    if (filteredData.length > 1 && displayTotals) {
      exportData.totals = {
        tickets: displayTotals.totalTicketsRevenue || 0,
        projects: displayTotals.totalProjectsRevenue || 0,
        hosting: displayTotals.totalHostingRevenue || 0,
        total: displayTotals.totalRevenue || 0,
      };
    }

    // Determine period for filename
    const selectedPeriod = currentMonthString === 'all' ? 'all' : currentMonthString;
    exportMonthlyBreakdownDetailedData(exportData, selectedPeriod);
  };

  if (loading) {
    return <LoadingState variant="overview" />;
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <p className="text-destructive font-semibold mb-2">Error Loading Data</p>
            <p className="text-sm text-muted-foreground">{error}</p>
            <button
              onClick={loadBillingData}
              className="mt-4 px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!billingSummary) {
    return null;
  }

  return (
    <div className="flex flex-col h-full">
      {/* Sticky Header */}
      <PageHeader
        title="Dashboard"
        periodSelectorType="full"
        showViewToggle={false}
        onToggleMobileMenu={onToggleMobileMenu}
      />

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="p-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-6 lg:space-y-8">
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

          {/* New Row - Average Costs and Total Discounts */}
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

          {/* Monthly Revenue by Category - RevenueTrackerCard */}
          <div className="w-full">
            <RevenueTrackerCard
              monthlyData={filteredData}
              selectedYear={selectedYear}
              title={currentMonthString === 'all' ? 'Monthly Revenue by Category' : `${formatMonthLabel(currentMonthString)} Revenue Breakdown`}
              initialViewType="table"
              gridSpan=""
            />
          </div>

          {/* Monthly Breakdown - Desktop Table */}
          <div className="hidden md:block border bg-card">
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="font-semibold text-base">Monthly Breakdown</h3>
              <button
                onClick={handleExportMonthlyBreakdown}
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
                    <tr className="bg-black text-white dark:bg-black dark:text-white border-t-2 font-bold divide-x divide-white/20 dark:divide-white/20">
                      <td colSpan={3} className="py-4 px-4 text-left text-lg whitespace-nowrap">GRAND TOTALS</td>
                      <td className="py-4 px-4 text-right text-lg font-bold whitespace-nowrap">
                        <span>{formatCurrencyAccounting(displayTotals?.totalTicketsRevenue || 0).symbol}</span>
                        <span className="tabular-nums">{formatCurrencyAccounting(displayTotals?.totalTicketsRevenue || 0).amount}</span>
                      </td>
                      <td className="py-4 px-4 text-right text-lg font-bold whitespace-nowrap">
                        <span>{formatCurrencyAccounting(displayTotals?.totalProjectsRevenue || 0).symbol}</span>
                        <span className="tabular-nums">{formatCurrencyAccounting(displayTotals?.totalProjectsRevenue || 0).amount}</span>
                      </td>
                      <td className="py-4 px-4 text-right text-lg font-bold whitespace-nowrap">
                        <span>{formatCurrencyAccounting(displayTotals?.totalHostingRevenue || 0).symbol}</span>
                        <span className="tabular-nums">{formatCurrencyAccounting(displayTotals?.totalHostingRevenue || 0).amount}</span>
                      </td>
                      <td className="py-4 px-4 text-right text-lg font-bold whitespace-nowrap">
                        <span>{formatCurrencyAccounting(displayTotals?.totalRevenue || 0).symbol}</span>
                        <span className="tabular-nums">{formatCurrencyAccounting(displayTotals?.totalRevenue || 0).amount}</span>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Monthly Breakdown - Mobile Cards */}
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
        </div>
      </main>
    </div>
  );
}

// Month Row Component with nested sections
interface MonthRowProps {
  monthData: MonthlyBillingSummary;
  isExpanded: boolean;
  onToggleMonth: (month: string) => void;
  onToggleSection: (month: string, section: 'tickets' | 'projects' | 'hosting') => void;
  isSectionExpanded: (month: string, section: 'tickets' | 'projects' | 'hosting') => boolean;
  formatMonthLabel: (month: string) => string;
}

function MonthRow({
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

// Tickets Section Component
interface SectionProps {
  monthData: MonthlyBillingSummary;
  isExpanded: boolean;
  onToggle: () => void;
}

function TicketsSection({ monthData, isExpanded, onToggle }: SectionProps) {
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
                <td className="py-2 px-4 text-xs text-muted-foreground w-32">{ticket.date}</td>
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

// Projects Section Component
function ProjectsSection({ monthData, isExpanded, onToggle }: SectionProps) {
  // Format category for display (e.g., "LANDING_PAGE" -> "Landing Page")
  const formatCategory = (category: string) => {
    return category
      .split('_')
      .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
      .join(' ');
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
              <FolderKanban className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Projects</span>
              <CountBadge
                text={`${monthData.projectsCount}`}
                size="xs"
              />
              {monthData.projectsLandingPageCredit > 0 && (
                <CreditBadge
                  text={`${monthData.projectsLandingPageCredit} Free Landing Page Credit`}
                  size="xs"
                />
              )}
              {monthData.projectsMultiFormCredit > 0 && (
                <CreditBadge
                  text={`${monthData.projectsMultiFormCredit} Free Multi-Form`}
                  size="xs"
                />
              )}
              {monthData.projectsBasicFormCredit > 0 && (
                <CreditBadge
                  text={`${monthData.projectsBasicFormCredit} Free Basic Form${monthData.projectsBasicFormCredit > 1 ? 's' : ''}`}
                  size="xs"
                />
              )}
            </div>
            <span className="font-medium text-muted-foreground">
              {monthData.projectsRevenue === 0 ? '-' : formatCurrency(monthData.projectsRevenue)}
            </span>
          </div>
        </td>
      </tr>

      {isExpanded &&
        monthData.projectDetails.map((project, idx) => (
          <tr key={project.id} className="border-b divide-x hover:bg-muted/30">
            <td className="py-3 px-2 text-right text-muted-foreground text-xs w-8">
              {idx + 1}
            </td>
            <td className="py-2 px-4 text-xs text-muted-foreground w-32">{project.completionDate}</td>
            <td className="py-2 px-4 text-xs">
              <div className="flex items-center gap-2">
                <SiteFavicon websiteUrl={project.websiteUrl} size={14} />
                <span>{project.name}</span>
                {project.isFreeCredit && <Zap className="h-4 w-4 inline text-green-600 dark:text-green-400" />}
              </div>
            </td>
            <td className="py-2 px-4 text-xs text-left text-muted-foreground w-28">
              {formatCategory(project.category)}
            </td>
            <td className="py-2 px-4 text-xs text-right text-muted-foreground w-28">
              <span>{formatCurrencyAccounting(project.originalAmount || project.amount).symbol}</span>
              <span className="tabular-nums">{formatCurrencyAccounting(project.originalAmount || project.amount).amount}</span>
            </td>
            <td className="py-2 px-4 text-xs text-right text-muted-foreground w-28">
              {project.isFreeCredit && (
                <>
                  <span>-{formatCurrencyAccounting(project.originalAmount || project.amount).symbol}</span>
                  <span className="tabular-nums">{formatCurrencyAccounting(project.originalAmount || project.amount).amount}</span>
                </>
              )}
            </td>
            <td className="py-2 px-4 text-right text-sm w-32">
              {project.isFreeCredit ? (
                <span className="text-green-600 dark:text-green-400">
                  <span>{formatCurrencyAccounting(0).symbol}</span>
                  <span className="tabular-nums">{formatCurrencyAccounting(0).amount}</span>
                </span>
              ) : (
                <span className="font-semibold">
                  <span>{formatCurrencyAccounting(project.amount).symbol}</span>
                  <span className="tabular-nums">{formatCurrencyAccounting(project.amount).amount}</span>
                </span>
              )}
            </td>
          </tr>
        ))}
    </>
  );
}

// Hosting Section Component
function HostingSection({ monthData, isExpanded, onToggle }: SectionProps) {
  // Helper function to get effective billing period start date for display
  const getEffectiveBillingDate = (hosting: typeof monthData.hostingDetails[0], currentMonth: string): string => {
    const hostingStartMonth = hosting.hostingStart?.substring(0, 7) || '';

    // If this is the first month (prorated start), show actual start date
    if (hostingStartMonth === currentMonth) {
      // Extract just the date portion (YYYY-MM-DD) from potential ISO timestamp
      return hosting.hostingStart?.substring(0, 10) || `${currentMonth}-01`;
    }

    // For all subsequent months (FULL billing), show 1st of current month
    const [targetYear, targetMonth] = currentMonth.split('-');
    return `${targetYear}-${targetMonth}-01`;
  };

  // Sort hosting details by effective billing date, then alphabetically by site name
  const sortedHostingDetails = [...monthData.hostingDetails].sort((a, b) => {
    const dateA = getEffectiveBillingDate(a, monthData.month);
    const dateB = getEffectiveBillingDate(b, monthData.month);

    // Sort by date first
    if (dateA !== dateB) {
      return dateA.localeCompare(dateB);
    }

    // If same date, sort alphabetically by site name
    return a.siteName.localeCompare(b.siteName);
  });

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
              <Server className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Sites Hosted</span>
              <CountBadge
                text={`${monthData.hostingSitesCount}`}
                size="xs"
              />
              {monthData.hostingCreditsApplied > 0 && (
                <CreditBadge
                  text={`${monthData.hostingCreditsApplied} free credit${monthData.hostingCreditsApplied !== 1 ? 's' : ''}`}
                  size="xs"
                />
              )}
            </div>
            <span className="font-medium text-muted-foreground">
              {monthData.hostingRevenue === 0 ? '-' : formatCurrency(monthData.hostingRevenue)}
            </span>
          </div>
        </td>
      </tr>

      {isExpanded && (
        <>
          {sortedHostingDetails.map((hosting, idx) => (
            <tr key={hosting.websitePropertyId} className="border-b divide-x hover:bg-muted/30">
              <td className="py-3 px-2 text-right text-muted-foreground text-xs w-8">
                {idx + 1}
              </td>
              <td className="py-2 px-4 text-xs text-muted-foreground">
                {getEffectiveBillingDate(hosting, monthData.month)}
              </td>
              <td className="py-2 px-4 text-xs">
                <div className="flex items-center gap-2">
                  <SiteFavicon websiteUrl={hosting.websiteUrl} size={14} />
                  <span>{hosting.siteName}</span>
                </div>
              </td>
              <td className="py-2 px-4 text-xs">
                <BillingTypeBadge billingType={hosting.billingType} size="xs" />
              </td>
              <td className="py-2 px-4 text-xs text-left text-muted-foreground">
                {hosting.daysActive}/{hosting.daysInMonth} days
              </td>
              <td className="py-2 px-4 text-xs text-center text-muted-foreground">
                {hosting.creditApplied && (
                  <div className="flex items-center justify-center gap-1">
                    <Zap className="w-3 h-3 text-green-600 dark:text-green-400 fill-green-600 dark:fill-green-400" />
                    <span className="text-green-600 dark:text-green-400 font-semibold">FREE</span>
                  </div>
                )}
              </td>
              <td className="py-2 px-4 text-right text-sm font-semibold">
                <span>{formatCurrencyAccounting(hosting.netAmount).symbol}</span>
                <span className="tabular-nums">{formatCurrencyAccounting(hosting.netAmount).amount}</span>
              </td>
            </tr>
          ))}

          {/* Gross Total Row */}
          <tr className="bg-black text-white dark:bg-black dark:text-white border-b border-t-2">
            <td colSpan={6} className="py-2 px-12 text-xs font-semibold">
              Gross Total
            </td>
            <td className="py-2 px-4 text-right text-xs font-semibold">
              {formatCurrency(monthData.hostingGross)}
            </td>
          </tr>

          {/* Free Hosting Credit Row (if applicable) */}
          {monthData.hostingCreditsApplied > 0 && (
            <>
              <tr className="bg-green-50 dark:bg-green-950/20 border-b">
                <td colSpan={6} className="py-2 px-12 text-xs font-medium text-green-700 dark:text-green-400">
                  <Zap className="h-3 w-3 inline mr-1 fill-green-600 dark:fill-green-400" />
                  Free Hosting Credit ({monthData.hostingCreditsApplied} site{monthData.hostingCreditsApplied !== 1 ? 's' : ''})
                </td>
                <td className="py-2 px-4 text-right text-xs font-semibold text-green-700 dark:text-green-400">
                  -{formatCurrency(monthData.hostingGross - monthData.hostingRevenue)}
                </td>
              </tr>

              {/* Net Billable Row */}
              <tr className="bg-blue-50 dark:bg-blue-950/20 border-b border-t">
                <td colSpan={6} className="py-2 px-12 text-xs font-semibold text-blue-700 dark:text-blue-400">
                  Net Billable
                </td>
                <td className="py-2 px-4 text-right text-xs font-semibold text-blue-700 dark:text-blue-400">
                  {formatCurrency(monthData.hostingRevenue)}
                </td>
              </tr>
            </>
          )}
        </>
      )}
    </>
  );
}

// Mobile Month Card Component
interface MobileMonthCardProps {
  monthData: MonthlyBillingSummary;
  isExpanded: boolean;
  onToggleMonth: (month: string) => void;
  onToggleSection: (month: string, section: 'tickets' | 'projects' | 'hosting') => void;
  isSectionExpanded: (month: string, section: 'tickets' | 'projects' | 'hosting') => boolean;
  formatMonthLabel: (month: string) => string;
}

function MobileMonthCard({
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
