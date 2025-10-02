import { useState, useEffect } from 'react';
import { Scorecard } from '../ui/Scorecard';
import { LoadingState } from '../ui/LoadingState';
import { CumulativeBillingChart } from '../charts/CumulativeBillingChart';
import { HostingTypeChart } from '../charts/HostingTypeChart';
import { Server, DollarSign, Gift, Zap } from 'lucide-react';
import { MonthlyHostingCalculator } from './MonthlyHostingCalculator';
import { formatCurrency, formatMonthLabel } from '../../utils/formatting';
import {
  fetchWebsiteProperties,
  generateMonthlyBreakdown,
  calculateCreditProgress,
} from '../../services/hostingApi';
import type { WebsiteProperty, MonthlyHostingSummary } from '../../types/websiteProperty';

interface TurboHostingProps {
  onToggleMobileMenu?: () => void;
}

export function TurboHosting({ onToggleMobileMenu }: TurboHostingProps) {
  const [properties, setProperties] = useState<WebsiteProperty[]>([]);
  const [monthlyBreakdown, setMonthlyBreakdown] = useState<MonthlyHostingSummary[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load website properties on mount
  useEffect(() => {
    loadHostingData();
  }, []);

  async function loadHostingData() {
    try {
      setLoading(true);
      setError(null);
      const fetchedProperties = await fetchWebsiteProperties();
      setProperties(fetchedProperties);

      const breakdown = generateMonthlyBreakdown(fetchedProperties);
      setMonthlyBreakdown(breakdown);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load hosting data');
      console.error('Error loading hosting data:', err);
    } finally {
      setLoading(false);
    }
  }

  // Calculate metrics for selected month or all months
  const currentSummary = selectedMonth === 'all'
    ? {
        activeSites: monthlyBreakdown.reduce((sum, m) => Math.max(sum, m.activeSites), 0),
        grossMrr: monthlyBreakdown.reduce((sum, m) => sum + m.grossMrr, 0),
        netMrr: monthlyBreakdown.reduce((sum, m) => sum + m.netMrr, 0),
        freeCredits: monthlyBreakdown.reduce((sum, m) => Math.max(sum, m.freeCredits), 0),
      }
    : monthlyBreakdown.find((m) => m.month === selectedMonth) || {
        activeSites: 0,
        grossMrr: 0,
        netMrr: 0,
        freeCredits: 0,
      };

  const creditProgress = calculateCreditProgress(currentSummary.activeSites);

  // Available months for filter
  const availableMonths = monthlyBreakdown.map((m) => m.month);

  // Note: formatMonthLabel now imported from utils/formatting

  if (loading) {
    return <LoadingState variant="hosting" />;
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <p className="text-destructive font-semibold mb-2">Error Loading Data</p>
            <p className="text-sm text-muted-foreground">{error}</p>
            <button
              onClick={loadHostingData}
              className="mt-4 px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header - Responsive */}
      <header className="sticky top-0 z-10 bg-background border-b border-border">
        <div className="px-4 sm:px-6 lg:px-8 py-3 sm:py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
          <h1 className="text-xl sm:text-2xl font-bold">Turbo Hosting</h1>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 w-full sm:w-auto">
            {/* Month Filter */}
            <div className="flex items-center gap-2">
              <label htmlFor="month-select" className="text-sm font-medium">
                Period:
              </label>
              <select
                id="month-select"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="px-3 py-1.5 border border-input bg-background text-sm"
              >
                <option value="all">All Months</option>
                {availableMonths.map((month) => (
                  <option key={month} value={month}>
                    {formatMonthLabel(month)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content - Scrollable */}
      <main className="flex-1 overflow-auto">
        <div className="p-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-6 lg:space-y-8">
          {/* Scorecards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            <Scorecard
              title="Active Sites"
              value={currentSummary.activeSites}
              description={
                selectedMonth === 'all'
                  ? 'Peak active sites across all months'
                  : `Sites with active hosting in ${formatMonthLabel(selectedMonth)}`
              }
              icon={<Server className="h-4 w-4" />}
            />
            <Scorecard
              title="Gross MRR"
              value={formatCurrency(currentSummary.grossMrr)}
              description={
                selectedMonth === 'all'
                  ? 'Total gross revenue all months'
                  : 'Before free credits applied'
              }
              icon={<DollarSign className="h-4 w-4" />}
            />
            <Scorecard
              title="Net MRR"
              value={formatCurrency(currentSummary.netMrr)}
              description={
                selectedMonth === 'all'
                  ? 'Total net revenue all months'
                  : (
                    <span className="flex items-center gap-1">
                      <Zap className="h-3 w-3 inline" />
                      {currentSummary.freeCredits} free credit{currentSummary.freeCredits !== 1 ? 's' : ''} applied
                    </span>
                  )
              }
              icon={<Gift className="h-4 w-4" />}
            />
          </div>

          {/* Credit Progress - Only show for single month view */}
          {selectedMonth !== 'all' && currentSummary.freeCredits > 0 && (
            <div className="border bg-card p-4">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h3 className="text-sm font-semibold">
                    <Zap className="h-4 w-4 inline mr-1" />
                    Free Credit Progress
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {creditProgress.activeSites % 21}/21 sites toward next free credit
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold">{currentfSummary.freeCredits}</p>
                  <p className="text-xs text-muted-foreground">Credits Available</p>
                </div>
              </div>
              {/* Progress Bar */}
              <div className="w-full bg-muted h-2">
                <div
                  className="bg-foreground h-2 transition-all duration-300"
                  style={{ width: `${creditProgress.progressPercentage}%` }}
                />
              </div>
            </div>
          )}

          {/* Charts Section - Show when viewing all months */}
          {selectedMonth === 'all' && monthlyBreakdown.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
              {/* Cumulative Billing Chart - 2/3 width on desktop */}
              <div className="lg:col-span-2">
                <CumulativeBillingChart
                  data={monthlyBreakdown.map((m) => ({
                    month: m.month,
                    revenue: m.netMrr,
                  }))}
                />
              </div>

              {/* Hosting Type Chart - 1/3 width */}
              <div className="col-span-1">
                <HostingTypeChart
                  data={(() => {
                    // Get the most recent month (monthlyBreakdown is sorted chronologically)
                    const mostRecentMonth = monthlyBreakdown[monthlyBreakdown.length - 1];

                    if (!mostRecentMonth) {
                      return [];
                    }

                    // Collect unique site names from most recent month only
                    const uniqueSites = new Set<string>();
                    mostRecentMonth.charges.forEach((charge) => {
                      uniqueSites.add(charge.siteName);
                    });

                    // Count unique websites vs landing pages
                    let websites = 0;
                    let landingPages = 0;
                    uniqueSites.forEach((siteName) => {
                      if (siteName.includes('LP')) {
                        landingPages++;
                      } else {
                        websites++;
                      }
                    });

                    // Return single data point with unique counts
                    return [
                      {
                        month: mostRecentMonth.month,
                        websites,
                        landingPages,
                      },
                    ];
                  })()}
                />
              </div>
            </div>
          )}

          {/* Monthly Breakdown Table */}
          <MonthlyHostingCalculator
            monthlyBreakdown={selectedMonth === 'all' ? monthlyBreakdown : monthlyBreakdown.filter((m) => m.month === selectedMonth)}
          />
        </div>
      </main>
    </div>
  );
}