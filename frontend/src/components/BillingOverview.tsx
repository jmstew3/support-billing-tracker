import { useState, useEffect } from 'react';
import { Scorecard } from './ui/Scorecard';
import { LoadingState } from './ui/LoadingState';
import { DollarSign, Ticket, FolderKanban, Server, ChevronDown, ChevronUp } from 'lucide-react';
import {
  generateComprehensiveBilling,
  formatCurrency,
} from '../services/billingApi';
import type { BillingSummary, MonthlyBillingSummary } from '../types/billing';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LabelList } from 'recharts';

export function BillingOverview() {
  const [billingSummary, setBillingSummary] = useState<BillingSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string>('all');

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

      // Expand all months by default
      const allMonths = new Set(data.monthlyBreakdown.map((m) => m.month));
      setExpandedMonths(allMonths);

      // Default to latest month
      if (data.monthlyBreakdown.length > 0) {
        setSelectedMonth(data.monthlyBreakdown[data.monthlyBreakdown.length - 1].month);
      }
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

  // Format month for display
  function formatMonthLabel(monthStr: string) {
    if (monthStr === 'all') return 'All Months';
    const [year, month] = monthStr.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }

  // Filter data based on selected month
  const filteredData =
    billingSummary && selectedMonth !== 'all'
      ? billingSummary.monthlyBreakdown.filter((m) => m.month === selectedMonth)
      : billingSummary?.monthlyBreakdown || [];

  // Calculate totals for filtered data
  const displayTotals =
    selectedMonth === 'all'
      ? billingSummary
      : {
          totalRevenue: filteredData.reduce((sum, m) => sum + m.totalRevenue, 0),
          totalTicketsRevenue: filteredData.reduce((sum, m) => sum + m.ticketsRevenue, 0),
          totalProjectsRevenue: filteredData.reduce((sum, m) => sum + m.projectsRevenue, 0),
          totalHostingRevenue: filteredData.reduce((sum, m) => sum + m.hostingRevenue, 0),
        };

  // Calculate free hours savings for display
  const totalFreeHoursSavings =
    selectedMonth === 'all'
      ? billingSummary?.monthlyBreakdown.reduce((sum, m) => sum + m.ticketsFreeHoursSavings, 0) || 0
      : filteredData.reduce((sum, m) => sum + m.ticketsFreeHoursSavings, 0);

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
      <div className="sticky top-0 z-10 bg-background border-b">
        <div className="px-8 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold">Comprehensive Billing Overview</h1>
          <div className="flex items-center gap-4">
            <label htmlFor="month-select" className="text-sm font-medium">
              Month:
            </label>
            <select
              id="month-select"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-3 py-1.5 border border-input bg-background text-sm"
            >
              <option value="all">All Months</option>
              {billingSummary.monthlyBreakdown.map((m) => (
                <option key={m.month} value={m.month}>
                  {formatMonthLabel(m.month)}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

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
                  ? `After ${formatCurrency(totalFreeHoursSavings)} free hours credit`
                  : 'Billable hours from tickets'
              }
            />
            <Scorecard
              title="Project Revenue"
              value={formatCurrency(displayTotals?.totalProjectsRevenue || 0)}
              icon={<FolderKanban className="h-4 w-4 text-muted-foreground" />}
              description="Ready to invoice projects"
            />
            <Scorecard
              title="Hosting MRR"
              value={formatCurrency(displayTotals?.totalHostingRevenue || 0)}
              icon={<Server className="h-4 w-4 text-muted-foreground" />}
              description="Net hosting revenue"
            />
          </div>

          {/* Monthly Revenue Chart */}
          <div className="border bg-card p-6">
            <h3 className="text-lg font-semibold mb-4">Monthly Revenue by Category</h3>
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
                <Bar dataKey="Tickets" stackId="a" fill="#3b82f6" name="Support Tickets" />
                <Bar dataKey="Projects" stackId="a" fill="#f59e0b" name="Projects" />
                <Bar dataKey="Hosting" stackId="a" fill="#10b981" name="Hosting">
                  <LabelList
                    dataKey={(entry: any) => entry.Tickets + entry.Projects + entry.Hosting}
                    position="top"
                    formatter={(value: number) => formatCurrency(value)}
                    style={{ fontSize: '11px', fontWeight: 'bold', fill: '#374151' }}
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
                <thead className="[&_tr]:border-b">
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
                    <tr className="bg-muted/60 border-t-2 font-bold">
                      <td className="py-4 px-4 text-left text-base">GRAND TOTAL</td>
                      <td className="py-4 px-4 text-right text-lg">
                        {formatCurrency(displayTotals?.totalTicketsRevenue || 0)}
                      </td>
                      <td className="py-4 px-4 text-right text-lg">
                        {formatCurrency(displayTotals?.totalProjectsRevenue || 0)}
                      </td>
                      <td className="py-4 px-4 text-right text-lg">
                        {formatCurrency(displayTotals?.totalHostingRevenue || 0)}
                      </td>
                      <td className="py-4 px-4 text-right text-lg">
                        {formatCurrency(displayTotals?.totalRevenue || 0)}
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
        className="bg-muted/50 hover:bg-muted/70 cursor-pointer border-b transition-colors"
        onClick={() => onToggleMonth(monthData.month)}
      >
        <td className="py-3 px-4">
          <div className="flex items-center gap-2">
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            <span className="font-bold text-base">{formatMonthLabel(monthData.month)}</span>
          </div>
        </td>
        <td className="py-3 px-4 text-right font-semibold text-blue-600 dark:text-blue-400">
          {formatCurrency(monthData.ticketsRevenue)}
        </td>
        <td className="py-3 px-4 text-right font-semibold text-yellow-600 dark:text-yellow-400">
          {formatCurrency(monthData.projectsRevenue)}
        </td>
        <td className="py-3 px-4 text-right font-semibold text-green-600 dark:text-green-400">
          {formatCurrency(monthData.hostingRevenue)}
        </td>
        <td className="py-3 px-4 text-right font-bold text-base">
          {formatCurrency(monthData.totalRevenue)}
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
        className="bg-blue-50 dark:bg-blue-950/30 hover:bg-blue-100 dark:hover:bg-blue-950/50 cursor-pointer border-b"
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
      >
        <td colSpan={5} className="py-2 px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              <Ticket className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <span className="font-semibold text-sm">
                Support Tickets ({monthData.ticketsCount})
              </span>
              {hasFreeHours && (
                <span className="text-xs text-green-600 dark:text-green-400 font-medium">
                  ({monthData.ticketsFreeHoursApplied}h free applied)
                </span>
              )}
            </div>
            <span className="font-semibold text-blue-600 dark:text-blue-400">
              {formatCurrency(monthData.ticketsRevenue)}
            </span>
          </div>
        </td>
      </tr>

      {isExpanded && (
        <>
          {/* Free Hours Summary Row (if applicable) */}
          {hasFreeHours && (
            <tr className="bg-green-50 dark:bg-green-950/20 border-b">
              <td colSpan={3} className="py-2 px-12 text-xs font-medium">
                Free Support Hours Benefit
              </td>
              <td className="py-2 px-4 text-xs text-right text-muted-foreground">
                Gross: {formatCurrency(monthData.ticketsGrossRevenue)}
              </td>
              <td className="py-2 px-4 text-right text-xs">
                <div className="text-green-600 dark:text-green-400 font-semibold">
                  -{formatCurrency(monthData.ticketsFreeHoursSavings)}
                </div>
                <div className="text-muted-foreground text-[10px]">
                  ({monthData.ticketsFreeHoursApplied} free hrs)
                </div>
              </td>
            </tr>
          )}

          {/* Individual Ticket Rows */}
          {monthData.ticketDetails.map((ticket) => (
            <tr key={ticket.id} className="border-b hover:bg-muted/30">
              <td className="py-2 px-12 text-xs text-muted-foreground">{ticket.date}</td>
              <td colSpan={2} className="py-2 px-4 text-xs">
                {ticket.description}
                {ticket.freeHoursApplied && ticket.freeHoursApplied > 0 && (
                  <span className="ml-2 text-[10px] text-green-600 dark:text-green-400 font-medium">
                    ({ticket.freeHoursApplied}h free)
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
                      {formatCurrency(ticket.amount)}
                    </span>
                    <span className="font-semibold text-green-600 dark:text-green-400">
                      {formatCurrency(ticket.netAmount || ticket.amount)}
                    </span>
                  </div>
                ) : (
                  <span className="font-semibold">{formatCurrency(ticket.amount)}</span>
                )}
              </td>
            </tr>
          ))}
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
        className="bg-yellow-50 dark:bg-yellow-950/30 hover:bg-yellow-100 dark:hover:bg-yellow-950/50 cursor-pointer border-b"
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
      >
        <td colSpan={5} className="py-2 px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              <FolderKanban className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
              <span className="font-semibold text-sm">
                Projects ({monthData.projectsCount})
              </span>
            </div>
            <span className="font-semibold text-yellow-600 dark:text-yellow-400">
              {formatCurrency(monthData.projectsRevenue)}
            </span>
          </div>
        </td>
      </tr>

      {isExpanded &&
        monthData.projectDetails.map((project) => (
          <tr key={project.id} className="border-b hover:bg-muted/30">
            <td className="py-2 px-12 text-xs text-muted-foreground">{project.completionDate}</td>
            <td colSpan={2} className="py-2 px-4 text-xs">
              {project.name}
            </td>
            <td className="py-2 px-4 text-xs text-right text-muted-foreground">
              {project.category}
            </td>
            <td className="py-2 px-4 text-right text-sm font-semibold">
              {formatCurrency(project.amount)}
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
        className="bg-green-50 dark:bg-green-950/30 hover:bg-green-100 dark:hover:bg-green-950/50 cursor-pointer border-b"
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
      >
        <td colSpan={5} className="py-2 px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              <Server className="h-4 w-4 text-green-600 dark:text-green-400" />
              <span className="font-semibold text-sm">
                Hosting ({monthData.hostingSitesCount} sites)
              </span>
            </div>
            <span className="font-semibold text-green-600 dark:text-green-400">
              {formatCurrency(monthData.hostingRevenue)}
            </span>
          </div>
        </td>
      </tr>

      {isExpanded &&
        monthData.hostingDetails.map((hosting) => (
          <tr key={hosting.websitePropertyId} className="border-b hover:bg-muted/30">
            <td className="py-2 px-12 text-xs">{hosting.siteName}</td>
            <td className="py-2 px-4 text-xs text-muted-foreground">
              {hosting.billingType === 'FULL'
                ? 'Full Month'
                : hosting.billingType === 'PRORATED_START'
                ? 'Prorated Start'
                : hosting.billingType === 'PRORATED_END'
                ? 'Prorated End'
                : 'Inactive'}
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
                <span className="text-green-600 dark:text-green-400">{formatCurrency(0)}</span>
              ) : (
                formatCurrency(hosting.netAmount)
              )}
            </td>
          </tr>
        ))}
    </>
  );
}
