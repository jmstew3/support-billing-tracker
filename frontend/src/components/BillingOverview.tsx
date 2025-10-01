import { useState, useEffect } from 'react';
import { Scorecard } from './ui/Scorecard';
import { LoadingState } from './ui/LoadingState';
import { SiteFavicon } from './ui/SiteFavicon';
import { PageHeader } from './PageHeader';
import { usePeriod } from '../contexts/PeriodContext';
import { DollarSign, Ticket, FolderKanban, Server, ChevronDown, ChevronUp, Zap } from 'lucide-react';
import { generateComprehensiveBilling } from '../services/billingApi';
import { formatCurrency, formatCurrencyAccounting, formatMonthLabel } from '../utils/formatting';
import { CountBadge, CreditBadge, FreeBadge, BillingTypeBadge } from './ui/BillingBadge';
import {
  CATEGORY_COLORS,
  TABLE_REVENUE_TEXT_SIZE,
  TABLE_REVENUE_FONT_WEIGHT,
} from '../config/uiConstants';
import type { BillingSummary, MonthlyBillingSummary } from '../types/billing';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LabelList } from 'recharts';

export function BillingOverview() {
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

  // Calculate totals for filtered data
  const displayTotals =
    currentMonthString === 'all'
      ? {
          ...billingSummary,
          // Override totalHostingRevenue to sum all months for table display
          // (billingSummary.totalHostingRevenue is MRR = latest month only)
          totalHostingRevenue: billingSummary?.monthlyBreakdown.reduce(
            (sum, m) => sum + m.hostingRevenue,
            0
          ) || 0,
        }
      : {
          totalRevenue: filteredData.reduce((sum, m) => sum + m.totalRevenue, 0),
          totalTicketsRevenue: filteredData.reduce((sum, m) => sum + m.ticketsRevenue, 0),
          totalProjectsRevenue: filteredData.reduce((sum, m) => sum + m.projectsRevenue, 0),
          totalHostingRevenue: filteredData.reduce((sum, m) => sum + m.hostingRevenue, 0),
        };

  // Calculate free hours savings for display
  const totalFreeHoursSavings =
    currentMonthString === 'all'
      ? billingSummary?.monthlyBreakdown.reduce((sum, m) => sum + m.ticketsFreeHoursSavings, 0) || 0
      : filteredData.reduce((sum, m) => sum + m.ticketsFreeHoursSavings, 0);

  // Calculate free landing page savings for display
  const totalLandingPageSavings =
    currentMonthString === 'all'
      ? billingSummary?.monthlyBreakdown.reduce((sum, m) => sum + m.projectsLandingPageSavings, 0) || 0
      : filteredData.reduce((sum, m) => sum + m.projectsLandingPageSavings, 0);

  // Calculate free multi-form savings for display
  const totalMultiFormSavings =
    currentMonthString === 'all'
      ? billingSummary?.monthlyBreakdown.reduce((sum, m) => sum + m.projectsMultiFormSavings, 0) || 0
      : filteredData.reduce((sum, m) => sum + m.projectsMultiFormSavings, 0);

  // Calculate free basic form savings for display
  const totalBasicFormSavings =
    currentMonthString === 'all'
      ? billingSummary?.monthlyBreakdown.reduce((sum, m) => sum + m.projectsBasicFormSavings, 0) || 0
      : filteredData.reduce((sum, m) => sum + m.projectsBasicFormSavings, 0);

  // Calculate total project credits
  const totalProjectCredits = totalLandingPageSavings + totalMultiFormSavings + totalBasicFormSavings;

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
        title="Billing Overview"
        periodSelectorType="full"
        showViewToggle={false}
      />

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="p-8 space-y-8">
          {/* Summary Scorecards */}
          <div className="grid grid-cols-4 gap-6">
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
                      After {formatCurrency(totalFreeHoursSavings)} free hours credit
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
                    <span className="flex flex-col gap-0.5">
                      <span>After {formatCurrency(totalProjectCredits)} in credits:</span>
                      {totalLandingPageSavings > 0 && (
                        <span className="text-xs">• Landing page: {formatCurrency(totalLandingPageSavings)}</span>
                      )}
                      {totalMultiFormSavings > 0 && (
                        <span className="text-xs">• Multi-form: {formatCurrency(totalMultiFormSavings)}</span>
                      )}
                      {totalBasicFormSavings > 0 && (
                        <span className="text-xs">• Basic forms: {formatCurrency(totalBasicFormSavings)}</span>
                      )}
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
                currentMonthString === 'all' && billingSummary?.monthlyBreakdown.length
                  ? `As of ${formatMonthLabel(billingSummary.monthlyBreakdown[billingSummary.monthlyBreakdown.length - 1].month)}`
                  : 'Net hosting revenue'
              }
            />
          </div>

          {/* Monthly Revenue Chart */}
          <div className="border bg-card p-6">
            <h3 className="text-xl font-semibold mb-4">Monthly Revenue by Category</h3>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart
                data={billingSummary.monthlyBreakdown.map((month) => ({
                  month: formatMonthLabel(month.month),
                  Tickets: month.ticketsRevenue,
                  Projects: month.projectsRevenue,
                  Hosting: month.hostingRevenue,
                }))}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 12 }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  cursor={false}
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px',
                  }}
                />
                <Legend
                  wrapperStyle={{ paddingTop: '20px' }}
                  iconType="rect"
                />
                <Bar dataKey="Tickets" stackId="a" fill={CATEGORY_COLORS.tickets.primary} name="Support Tickets" />
                <Bar dataKey="Projects" stackId="a" fill={CATEGORY_COLORS.projects.primary} name="Projects" />
                <Bar dataKey="Hosting" stackId="a" fill={CATEGORY_COLORS.hosting.primary} name="Hosting">
                  <LabelList
                    dataKey={(entry: any) => entry.Tickets + entry.Projects + entry.Hosting}
                    position="top"
                    content={(props: any) => {
                      const { x, y, width, value } = props;
                      return (
                        <text x={x + width / 2} y={y - 4} fontSize="11" fontWeight="bold" fill="#374151" textAnchor="middle">
                          {formatCurrency(value)}
                        </text>
                      );
                    }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Monthly Breakdown Table */}
          <div className="border bg-card">
            <div className="relative w-full overflow-auto">
              <table className="w-full caption-bottom text-sm table-fixed">
                <colgroup>
                  <col style={{ width: '25%' }} />
                  <col style={{ width: '18.75%' }} />
                  <col style={{ width: '18.75%' }} />
                  <col style={{ width: '18.75%' }} />
                  <col style={{ width: '18.75%' }} />
                </colgroup>
                <thead className="[&_tr]:border-b sticky top-0 z-10 bg-background">
                  <tr className="border-b">
                    <th className="h-10 px-4 text-left align-middle font-medium text-muted-foreground">
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
                      <td className="py-4 px-6 text-right text-base">GRAND TOTAL</td>
                      <td className="py-4 px-4 text-right text-lg">
                        <span>{formatCurrencyAccounting(displayTotals?.totalTicketsRevenue || 0).symbol}</span>
                        <span className="tabular-nums">{formatCurrencyAccounting(displayTotals?.totalTicketsRevenue || 0).amount}</span>
                      </td>
                      <td className="py-4 px-4 text-right text-lg">
                        <span>{formatCurrencyAccounting(displayTotals?.totalProjectsRevenue || 0).symbol}</span>
                        <span className="tabular-nums">{formatCurrencyAccounting(displayTotals?.totalProjectsRevenue || 0).amount}</span>
                      </td>
                      <td className="py-4 px-4 text-right text-lg">
                        <span>{formatCurrencyAccounting(displayTotals?.totalHostingRevenue || 0).symbol}</span>
                        <span className="tabular-nums">{formatCurrencyAccounting(displayTotals?.totalHostingRevenue || 0).amount}</span>
                      </td>
                      <td className="py-4 px-4 text-right text-lg">
                        <span>{formatCurrencyAccounting(displayTotals?.totalRevenue || 0).symbol}</span>
                        <span className="tabular-nums">{formatCurrencyAccounting(displayTotals?.totalRevenue || 0).amount}</span>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
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
        className="bg-muted/50 hover:bg-muted/70 cursor-pointer border-b transition-colors divide-x"
        onClick={() => onToggleMonth(monthData.month)}
      >
        <td className="py-3 px-4">
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
        <td className={`py-3 px-4 text-right ${TABLE_REVENUE_TEXT_SIZE} ${TABLE_REVENUE_FONT_WEIGHT}`}>
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

  return (
    <>
      <tr
        className="bg-muted/40 hover:bg-muted/60 cursor-pointer border-b"
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
      >
        <td colSpan={5} className="py-2 px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              <Ticket className="h-4 w-4 text-muted-foreground" />
              <CountBadge
                text={`${monthData.ticketsCount} ${monthData.ticketsCount === 1 ? 'Ticket' : 'Tickets'}`}
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
          {monthData.ticketDetails.map((ticket) => (
            <tr key={ticket.id} className="border-b hover:bg-muted/30">
              <td className="py-2 px-12 text-xs text-muted-foreground">{ticket.date}</td>
              <td colSpan={2} className="py-2 px-4 text-xs">
                {ticket.description}
                {ticket.freeHoursApplied && ticket.freeHoursApplied > 0 && (
                  <span className="ml-2">
                    <CreditBadge text={`${ticket.freeHoursApplied}h free`} size="xs" />
                  </span>
                )}
              </td>
              <td className="py-2 px-4 text-xs text-right text-muted-foreground">
                {ticket.hours}h × {formatCurrency(ticket.rate)}/hr
              </td>
              <td className="py-2 px-4 text-right text-sm">
                {ticket.freeHoursApplied && ticket.freeHoursApplied > 0 ? (
                  <div className="flex flex-col items-end">
                    <span className="text-muted-foreground line-through text-xs">
                      <span>{formatCurrencyAccounting(ticket.amount).symbol}</span>
                      <span className="tabular-nums">{formatCurrencyAccounting(ticket.amount).amount}</span>
                    </span>
                    <span className="font-semibold text-green-600 dark:text-green-400">
                      <span>{formatCurrencyAccounting(ticket.netAmount || ticket.amount).symbol}</span>
                      <span className="tabular-nums">{formatCurrencyAccounting(ticket.netAmount || ticket.amount).amount}</span>
                    </span>
                  </div>
                ) : (
                  <span className="font-semibold">
                    <span>{formatCurrencyAccounting(ticket.amount).symbol}</span>
                    <span className="tabular-nums">{formatCurrencyAccounting(ticket.amount).amount}</span>
                  </span>
                )}
              </td>
            </tr>
          ))}

          {/* Free Hours Summary Row (if applicable) - shown after all tickets as a tally */}
          {hasFreeHours && (
            <tr className="bg-green-50 dark:bg-green-950/20 border-b">
              <td colSpan={3} className="py-2 px-12 text-xs font-medium">
                <Zap className="h-3 w-3 inline mr-1" />
                Free Support Hours Benefit
              </td>
              <td className="py-2 px-4 text-xs text-right text-muted-foreground">
                Gross: {formatCurrency(monthData.ticketsGrossRevenue)}
              </td>
              <td className="py-2 px-4 text-right text-xs">
                <div className="text-green-600 dark:text-green-400 font-semibold">
                  <Zap className="h-3 w-3 inline mr-0.5" />
                  -{formatCurrency(monthData.ticketsFreeHoursSavings)}
                </div>
                <div className="text-muted-foreground text-[10px]">
                  {monthData.ticketsFreeHoursApplied}h free
                </div>
              </td>
            </tr>
          )}
        </>
      )}
    </>
  );
}

// Projects Section Component
function ProjectsSection({ monthData, isExpanded, onToggle }: SectionProps) {
  return (
    <>
      <tr
        className="bg-muted/40 hover:bg-muted/60 cursor-pointer border-b"
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
      >
        <td colSpan={5} className="py-2 px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              <FolderKanban className="h-4 w-4 text-muted-foreground" />
              <CountBadge
                text={`${monthData.projectsCount} ${monthData.projectsCount === 1 ? 'Project' : 'Projects'}`}
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
        monthData.projectDetails.map((project) => (
          <tr key={project.id} className="border-b hover:bg-muted/30">
            <td className="py-2 px-12 text-xs text-muted-foreground">{project.completionDate}</td>
            <td colSpan={2} className="py-2 px-4 text-xs">
              <div className="flex items-center gap-2">
                <SiteFavicon websiteUrl={project.websiteUrl} size={14} />
                <span>{project.name}</span>
                {project.isFreeCredit && <FreeBadge size="xs" />}
              </div>
            </td>
            <td className="py-2 px-4 text-xs text-right text-muted-foreground">
              {project.category}
            </td>
            <td className="py-2 px-4 text-right text-sm">
              {project.isFreeCredit ? (
                <div className="flex flex-col items-end">
                  <span className="text-muted-foreground line-through text-xs">
                    <span>{formatCurrencyAccounting(project.originalAmount || 0).symbol}</span>
                    <span className="tabular-nums">{formatCurrencyAccounting(project.originalAmount || 0).amount}</span>
                  </span>
                  <span className="font-semibold text-green-600 dark:text-green-400">
                    -
                  </span>
                </div>
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
  return (
    <>
      <tr
        className="bg-muted/40 hover:bg-muted/60 cursor-pointer border-b"
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
      >
        <td colSpan={5} className="py-2 px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              <Server className="h-4 w-4 text-muted-foreground" />
              <CountBadge
                text={`${monthData.hostingSitesCount} ${monthData.hostingSitesCount === 1 ? 'Site' : 'Sites'}`}
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

      {isExpanded &&
        monthData.hostingDetails.map((hosting) => (
          <tr key={hosting.websitePropertyId} className="border-b hover:bg-muted/30">
            <td className="py-2 px-12 text-xs">
              <div className="flex items-center gap-2">
                <SiteFavicon websiteUrl={hosting.websiteUrl} size={14} />
                <span>{hosting.siteName}</span>
              </div>
            </td>
            <td className="py-2 px-4 text-xs">
              <BillingTypeBadge billingType={hosting.billingType} size="xs" />
            </td>
            <td className="py-2 px-4 text-xs text-right text-muted-foreground">
              {hosting.daysActive}/{hosting.daysInMonth} days
            </td>
            <td className="py-2 px-4 text-xs text-right text-muted-foreground">
              {hosting.creditApplied && (
                <span className="text-green-600 dark:text-green-400 font-semibold">FREE</span>
              )}
            </td>
            <td className="py-2 px-4 text-right text-sm font-semibold">
              {hosting.creditApplied ? (
                <span className="text-green-600 dark:text-green-400">
                  -
                </span>
              ) : (
                <>
                  <span>{formatCurrencyAccounting(hosting.netAmount).symbol}</span>
                  <span className="tabular-nums">{formatCurrencyAccounting(hosting.netAmount).amount}</span>
                </>
              )}
            </td>
          </tr>
        ))}
    </>
  );
}
