import type { ReactNode } from 'react';
import { DataTrackerCard } from '../../../../components/base/DataTrackerCard';
import { formatCurrency } from '../../../../utils/currency';
import { useChartVisibility } from '../../../../hooks/useChartVisibility';
import { Zap } from 'lucide-react';
import { CostTableBody } from './CostTableBody';
import { CostChartSection } from './CostChartSection';
import type { CostTrackerCardProps } from './types';
import { URGENCY_LEVELS } from './types';

/**
 * CostTrackerCard - Support ticket cost tracking component
 *
 * Features:
 * - Toggle between table and chart views
 * - Monthly breakdown view (when selectedMonth === 'all')
 * - Single period view (when selectedMonth is a number)
 * - Interactive urgency level filtering in chart view
 * - Free hours credit visualization
 *
 * @example
 * // Single month view
 * <CostTrackerCard
 *   costData={filteredCosts}
 *   selectedMonth={6}
 *   selectedYear={2025}
 * />
 *
 * @example
 * // All months view
 * <CostTrackerCard
 *   monthlyCosts={monthlyCostsArray}
 *   selectedMonth="all"
 *   selectedYear={2025}
 * />
 */
export function CostTrackerCard({
  costData,
  monthlyCosts,
  selectedMonth,
  selectedYear,
  title = 'Support Ticket Cost Tracker',
  description,
  initialViewType = 'table',
  gridSpan,
}: CostTrackerCardProps) {
  // Use shared chart visibility hook
  const {
    visible: visibleUrgencies,
    toggleCategory: toggleUrgency,
    resetFilters,
    isModified,
  } = useChartVisibility(URGENCY_LEVELS);

  /**
   * Get description based on view mode and data
   */
  const getDescription = (): string => {
    if (description) return description;

    if (selectedMonth === 'all') {
      return `Monthly breakdown for ${selectedYear}`;
    }

    if (costData?.freeHoursSavings && costData.freeHoursSavings > 0) {
      return `After ${formatCurrency(costData.freeHoursSavings)} free hours credit`;
    }

    return 'Cost breakdown by service tier (0.5 hour increments)';
  };

  /**
   * Badge component for free hours
   */
  const getBadge = (): ReactNode => {
    if (costData?.freeHoursSavings && costData.freeHoursSavings > 0) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-950/30 text-green-700 dark:text-green-300">
          <Zap className="h-3 w-3 inline mr-1" />
          {costData.freeHoursApplied}h free
        </span>
      );
    }
    return undefined;
  };

  /**
   * Render table view
   */
  const renderTable = () => (
    <CostTableBody
      costData={costData}
      monthlyCosts={monthlyCosts}
      selectedMonth={selectedMonth}
    />
  );

  /**
   * Render chart view
   */
  const renderChart = () => (
    <CostChartSection
      costData={costData}
      monthlyCosts={monthlyCosts}
      selectedMonth={selectedMonth}
      visibleUrgencies={visibleUrgencies}
      toggleUrgency={toggleUrgency}
      resetFilters={resetFilters}
      isModified={isModified}
    />
  );

  return (
    <DataTrackerCard
      title={title}
      description={getDescription()}
      badge={getBadge()}
      renderTable={renderTable}
      renderChart={renderChart}
      initialViewType={initialViewType}
      gridSpan={gridSpan}
    />
  );
}
