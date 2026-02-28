import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '../../../components/shared/PageHeader';
import { usePeriod } from '../../../contexts/PeriodContext';
import { Scorecard } from '../../../components/ui/Scorecard';
import { LoadingState } from '../../../components/ui/LoadingState';
import { MonthlyRevenueChart } from '../../../components/charts/MonthlyRevenueChart';
import { HostingTypeChart } from '../../../components/charts/HostingTypeChart';
import { Server, DollarSign, Gift, Zap } from 'lucide-react';
import { MonthlyHostingCalculator } from './MonthlyHostingCalculator';
import { formatCurrency, formatMonthLabel } from '../../../utils/formatting';
import {
  fetchWebsiteProperties,
  generateMonthlyBreakdown,
  calculateCreditProgress,
} from '../../../services/hostingApi';
import { queryKeys } from '../../../lib/queryClient';
import type { MonthlyHostingSummary } from '../../../types/websiteProperty';

interface TurboHostingProps {
  onToggleMobileMenu?: () => void;
}

/**
 * Fetches hosting data and computes monthly breakdown in one query function.
 */
async function fetchHostingData(): Promise<MonthlyHostingSummary[]> {
  const fetchedProperties = await fetchWebsiteProperties();
  return generateMonthlyBreakdown(fetchedProperties);
}

export function TurboHosting({ onToggleMobileMenu }: TurboHostingProps) {
  // Use PeriodContext for month selection
  const { selectedYear, selectedMonth: contextMonth } = usePeriod();

  // Convert PeriodContext month format to TurboHosting format (YYYY-MM or 'all')
  const selectedMonthStr = contextMonth === 'all'
    ? 'all'
    : `${selectedYear}-${String(contextMonth).padStart(2, '0')}`;

  // Load hosting data with React Query
  const {
    data: monthlyBreakdown = [],
    isLoading: loading,
    error: queryError,
    refetch: refetchHostingData,
  } = useQuery({
    queryKey: queryKeys.hosting.properties(),
    queryFn: fetchHostingData,
  });

  const error = queryError instanceof Error ? queryError.message : queryError ? 'Failed to load hosting data' : null;

  // Calculate metrics for selected month or all months
  const currentSummary = selectedMonthStr === 'all'
    ? {
        activeSites: monthlyBreakdown.reduce((sum, m) => Math.max(sum, m.activeSites), 0),
        grossMrr: monthlyBreakdown.reduce((sum, m) => sum + m.grossMrr, 0),
        netMrr: monthlyBreakdown.reduce((sum, m) => sum + m.netMrr, 0),
        freeCredits: monthlyBreakdown.reduce((sum, m) => Math.max(sum, m.freeCredits), 0),
      }
    : monthlyBreakdown.find((m) => m.month === selectedMonthStr) || {
        activeSites: 0,
        grossMrr: 0,
        netMrr: 0,
        freeCredits: 0,
      };

  const creditProgress = calculateCreditProgress(currentSummary.activeSites);

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
              onClick={() => refetchHostingData()}
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
      {/* Header */}
      <PageHeader
        title="Turbo Hosting"
        showPeriodSelector={true}
        periodSelectorType="simple"
        showViewToggle={false}
        onToggleMobileMenu={onToggleMobileMenu}
      />

      {/* Main Content - Scrollable */}
      <div className="flex-1 overflow-auto">
        <div className="p-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-6 lg:space-y-8">
          {/* Scorecards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            <Scorecard
              title="Active Sites"
              value={currentSummary.activeSites}
              description={
                selectedMonthStr === 'all'
                  ? 'Peak active sites across all months'
                  : `Sites with active hosting in ${formatMonthLabel(selectedMonthStr)}`
              }
              icon={<Server className="h-4 w-4" />}
            />
            <Scorecard
              title="Gross MRR"
              value={formatCurrency(currentSummary.grossMrr)}
              description={
                selectedMonthStr === 'all'
                  ? 'Total gross revenue all months'
                  : 'Before free credits applied'
              }
              icon={<DollarSign className="h-4 w-4" />}
            />
            <Scorecard
              title="Net MRR"
              value={formatCurrency(currentSummary.netMrr)}
              description={
                selectedMonthStr === 'all'
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
          {selectedMonthStr !== 'all' && currentSummary.freeCredits > 0 && (
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
                  <p className="text-lg font-bold">{currentSummary.freeCredits}</p>
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
          {selectedMonthStr === 'all' && monthlyBreakdown.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
              {/* Monthly Revenue Chart - 2/3 width on desktop */}
              <div className="lg:col-span-2">
                <MonthlyRevenueChart
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
            monthlyBreakdown={selectedMonthStr === 'all' ? monthlyBreakdown : monthlyBreakdown.filter((m) => m.month === selectedMonthStr)}
          />
        </div>
      </div>
    </div>
  );
}
