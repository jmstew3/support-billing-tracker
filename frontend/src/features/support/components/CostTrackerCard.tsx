import { useState, type ReactNode } from 'react';
<<<<<<< HEAD:frontend/src/features/support/components/CostTrackerCard.tsx
import { DataTrackerCard, TABLE_STYLES, CHART_STYLES } from '../../../components/base/DataTrackerCard';
import { formatCurrency, formatCurrencyAccounting } from '../../../utils/currency';
import { PRICING_CONFIG } from '../../../config/pricing';
=======
import { DataTrackerCard, TABLE_STYLES } from '../base/DataTrackerCard';
import { formatCurrencyAccounting, formatCurrency } from '../../utils/currency';
import { PRICING_CONFIG } from '../../config/pricing';
>>>>>>> d236e87 (refactor: Implement architectural improvements with service layer abstraction):frontend/src/components/Support/CostTrackerCard.tsx
import { Zap } from 'lucide-react';

// Import extracted components
import { CostTableHeader, CostTableBody, CostChartSection } from './CostTracker';

/**
 * Type definitions for the Cost Tracker component
 */
export interface CostData {
  promotionalHours: number;
  promotionalCost: number;
  regularHours: number;
  regularCost: number;
  sameDayHours: number;
  sameDayCost: number;
  emergencyHours: number;
  emergencyCost: number;
  totalCost: number;
  grossTotalCost?: number;
  netTotalCost?: number;
  freeHoursApplied?: number;
  freeHoursSavings?: number;
  // Net costs per category (after free hours)
  regularNetCost?: number;
  sameDayNetCost?: number;
  emergencyNetCost?: number;
  promotionalNetCost?: number;
  // Free hours applied per category
  regularFreeHours?: number;
  sameDayFreeHours?: number;
  emergencyFreeHours?: number;
  promotionalFreeHours?: number;
}

export interface MonthlyCostData {
  month: string;
  year: number;
  costs: CostData;
}

export interface CostTrackerCardProps {
  /** Single period cost data (when viewing a specific month) */
  costData?: CostData;
  /** Monthly breakdown cost data (when viewing all months) */
  monthlyCosts?: MonthlyCostData[];
  /** Selected month ('all' for yearly view, or month number) */
  selectedMonth: number | 'all';
  /** Selected year */
  selectedYear: number;
  /** Optional custom title */
  title?: string;
  /** Optional custom description */
  description?: string;
  /** Initial view type (default: 'table') */
  initialViewType?: 'table' | 'chart';
  /** Optional grid span classes for layout control */
  gridSpan?: string;
}

/**
 * CostTrackerCard - Support ticket cost tracking component (REFACTORED)
 *
 * Features:
 * - Toggle between table and chart views
 * - Monthly breakdown view (when selectedMonth === 'all')
 * - Single period view (when selectedMonth is a number)
 * - Interactive urgency level filtering in chart view
 * - Free hours credit visualization
 *
 * Architecture:
 * - Container component orchestrating child components
 * - CostTableHeader: Header row rendering
 * - CostTableBody: Table body with urgency rows
 * - CostChartSection: Recharts visualization
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
  const [visibleUrgencies, setVisibleUrgencies] = useState<Record<string, boolean>>({
    Promotion: true,
    Low: true,
    Medium: true,
    High: true,
  });

  // ============================================================
  // HELPER FUNCTIONS
  // ============================================================

  // Determine description based on view mode
  const getDescription = () => {
    if (description) return description;

    if (selectedMonth === 'all') {
      return `Monthly breakdown for ${selectedYear}`;
    }

    if (costData?.freeHoursSavings && costData.freeHoursSavings > 0) {
      return `After ${formatCurrency(costData.freeHoursSavings)} free hours credit`;
    }

    return 'Cost breakdown by service tier (0.5 hour increments)';
  };

  // Badge component for free hours
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

  // Toggle urgency visibility
  const toggleUrgency = (urgency: string) => {
    setVisibleUrgencies(prev => ({
      ...prev,
      [urgency]: !prev[urgency],
    }));
  };

  // Reset all urgencies to visible
  const resetFilters = () => {
    setVisibleUrgencies({
      Promotion: true,
      Low: true,
      Medium: true,
      High: true,
    });
  };

  // Check if filters have been modified
  const isModified = Object.values(visibleUrgencies).some(value => !value);

  // ============================================================
  // TABLE RENDERING
  // ============================================================

  // Render monthly breakdown table
  const renderMonthlyTable = () => {
    if (!monthlyCosts || monthlyCosts.length === 0) return null;

    const isSingleMonth = monthlyCosts.length === 1;

    return (
      <div className={TABLE_STYLES.container}>
        <table className={TABLE_STYLES.table}>
          <CostTableHeader
            monthlyCosts={monthlyCosts}
            isSingleMonth={isSingleMonth}
          />
          <CostTableBody
            monthlyCosts={monthlyCosts}
            isSingleMonth={isSingleMonth}
          />
        </table>
      </div>
    );
  };

  // Render single period table
  const renderSinglePeriodTable = () => {
    if (!costData) return null;

    return (
      <div className={TABLE_STYLES.container}>
        <table className={TABLE_STYLES.table}>
          <thead>
            <tr className={TABLE_STYLES.headerRow}>
              <th className={TABLE_STYLES.headerCell}>Service Type</th>
              <th className={TABLE_STYLES.headerCellWithBorder}>Rate</th>
              <th className={TABLE_STYLES.headerCellWithBorder}>Hours</th>
              <th className={TABLE_STYLES.headerCellWithBorder}>Cost</th>
            </tr>
          </thead>
          <tbody>
            <tr className={TABLE_STYLES.row}>
              <td className={TABLE_STYLES.cell}>Promotion</td>
              <td className={TABLE_STYLES.cellWithBorder}>$125/hr</td>
              <td className={TABLE_STYLES.cellBoldWithBorder}>
                {costData.promotionalHours === 0 ? '-' : (
                  <>
                    {costData.promotionalHours.toFixed(2)}
                    {costData.promotionalFreeHours && costData.promotionalFreeHours > 0 && (
                      <span className="text-xs text-green-600 dark:text-green-400 ml-1">
                        (-{costData.promotionalFreeHours.toFixed(2)}h free)
                      </span>
                    )}
                  </>
                )}
              </td>
              <td className={TABLE_STYLES.cellBoldWithBorder}>
                {(() => {
                  const amount = costData.promotionalNetCost !== undefined
                    ? costData.promotionalNetCost
                    : costData.promotionalCost;
                  return amount === 0 ? (
                    '-'
                  ) : (
                    <>
                      <span>{formatCurrencyAccounting(amount).symbol}</span>
                      <span className="tabular-nums">{formatCurrencyAccounting(amount).amount}</span>
                    </>
                  );
                })()}
              </td>
            </tr>
            <tr className={TABLE_STYLES.row}>
              <td className={TABLE_STYLES.cell}>Low</td>
              <td className={TABLE_STYLES.cellWithBorder}>${PRICING_CONFIG.tiers[1].rate}/hr</td>
              <td className={TABLE_STYLES.cellBoldWithBorder}>
                {costData.regularHours === 0 ? '-' : (
                  <>
                    {costData.regularHours.toFixed(2)}
                    {costData.regularFreeHours && costData.regularFreeHours > 0 && (
                      <span className="text-xs text-green-600 dark:text-green-400 ml-1">
                        (-{costData.regularFreeHours.toFixed(2)}h free)
                      </span>
                    )}
                  </>
                )}
              </td>
              <td className={TABLE_STYLES.cellBoldWithBorder}>
                {(() => {
                  const amount = costData.regularNetCost !== undefined
                    ? costData.regularNetCost
                    : costData.regularCost;
                  return amount === 0 ? (
                    '-'
                  ) : (
                    <>
                      <span>{formatCurrencyAccounting(amount).symbol}</span>
                      <span className="tabular-nums">{formatCurrencyAccounting(amount).amount}</span>
                    </>
                  );
                })()}
              </td>
            </tr>
            <tr className={TABLE_STYLES.row}>
              <td className={TABLE_STYLES.cell}>Medium</td>
              <td className={TABLE_STYLES.cellWithBorder}>${PRICING_CONFIG.tiers[2].rate}/hr</td>
              <td className={TABLE_STYLES.cellBoldWithBorder}>
                {costData.sameDayHours === 0 ? '-' : (
                  <>
                    {costData.sameDayHours.toFixed(2)}
                    {costData.sameDayFreeHours && costData.sameDayFreeHours > 0 && (
                      <span className="text-xs text-green-600 dark:text-green-400 ml-1">
                        (-{costData.sameDayFreeHours.toFixed(2)}h free)
                      </span>
                    )}
                  </>
                )}
              </td>
              <td className={TABLE_STYLES.cellBoldWithBorder}>
                {(() => {
                  const amount = costData.sameDayNetCost !== undefined
                    ? costData.sameDayNetCost
                    : costData.sameDayCost;
                  return amount === 0 ? (
                    '-'
                  ) : (
                    <>
                      <span>{formatCurrencyAccounting(amount).symbol}</span>
                      <span className="tabular-nums">{formatCurrencyAccounting(amount).amount}</span>
                    </>
                  );
                })()}
              </td>
            </tr>
            <tr className={TABLE_STYLES.row}>
              <td className={TABLE_STYLES.cell}>High</td>
              <td className={TABLE_STYLES.cellWithBorder}>${PRICING_CONFIG.tiers[3].rate}/hr</td>
              <td className={TABLE_STYLES.cellBoldWithBorder}>
                {costData.emergencyHours === 0 ? '-' : (
                  <>
                    {costData.emergencyHours.toFixed(2)}
                    {costData.emergencyFreeHours && costData.emergencyFreeHours > 0 && (
                      <span className="text-xs text-green-600 dark:text-green-400 ml-1">
                        (-{costData.emergencyFreeHours.toFixed(2)}h free)
                      </span>
                    )}
                  </>
                )}
              </td>
              <td className={TABLE_STYLES.cellBoldWithBorder}>
                {(() => {
                  const amount = costData.emergencyNetCost !== undefined
                    ? costData.emergencyNetCost
                    : costData.emergencyCost;
                  return amount === 0 ? (
                    '-'
                  ) : (
                    <>
                      <span>{formatCurrencyAccounting(amount).symbol}</span>
                      <span className="tabular-nums">{formatCurrencyAccounting(amount).amount}</span>
                    </>
                  );
                })()}
              </td>
            </tr>
            {/* Free Hours Deduction Row (if applicable) */}
            {costData.freeHoursSavings && costData.freeHoursSavings > 0 && (
              <tr className={TABLE_STYLES.rowSuccess}>
                <td className={TABLE_STYLES.cellSmall + ' font-medium'}>Free Support Hours Benefit</td>
                <td className={TABLE_STYLES.cellSmall + ' text-muted-foreground border-l border-border/40'}>-</td>
                <td className={TABLE_STYLES.cellSmall + ' text-muted-foreground border-l border-border/40'}>
                  {costData.freeHoursApplied}h free
                </td>
                <td className={TABLE_STYLES.cellSmall + ' border-l border-border/40'}>
                  <div className={TABLE_STYLES.successText}>
                    -<span>{formatCurrencyAccounting(costData.freeHoursSavings).symbol}</span>
                    <span className="tabular-nums">{formatCurrencyAccounting(costData.freeHoursSavings).amount}</span>
                  </div>
                </td>
              </tr>
            )}
            <tr className={TABLE_STYLES.totalRow}>
              <td className={TABLE_STYLES.cell}>{costData.freeHoursSavings && costData.freeHoursSavings > 0 ? 'Net Total' : 'Total'}</td>
              <td className={TABLE_STYLES.cellWithBorder}>-</td>
              <td className={TABLE_STYLES.cellWithBorder}>
                {(costData.regularHours + costData.sameDayHours + costData.emergencyHours + costData.promotionalHours).toFixed(2)}
              </td>
              <td className={TABLE_STYLES.cellWithBorder}>
                <span className={TABLE_STYLES.badge}>
                  <span>{formatCurrencyAccounting(costData.freeHoursSavings && costData.freeHoursSavings > 0 ? costData.netTotalCost || 0 : costData.totalCost).symbol}</span>
                  <span className="tabular-nums">{formatCurrencyAccounting(costData.freeHoursSavings && costData.freeHoursSavings > 0 ? costData.netTotalCost || 0 : costData.totalCost).amount}</span>
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  };

  // ============================================================
  // RENDER
  // ============================================================

  // Main render logic
  const renderTable = () => {
    return selectedMonth === 'all' && monthlyCosts && monthlyCosts.length > 0
      ? renderMonthlyTable()
      : renderSinglePeriodTable();
  };

  const renderChart = () => {
    return (
      <CostChartSection
        monthlyCosts={monthlyCosts}
        costData={costData}
        selectedMonth={selectedMonth}
        visibleUrgencies={visibleUrgencies}
        onToggleUrgency={toggleUrgency}
        onResetFilters={resetFilters}
        isModified={isModified}
      />
    );
  };

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
