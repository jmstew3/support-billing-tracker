import { useState, type ReactNode } from 'react';
import { DataTrackerCard, TABLE_STYLES, CHART_STYLES } from '../../../components/base/DataTrackerCard';
import { formatCurrency, formatCurrencyAccounting } from '../../../utils/currency';
import { PRICING_CONFIG } from '../../../config/pricing';
import { Zap } from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LabelList,
} from 'recharts';

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
  const [visibleUrgencies, setVisibleUrgencies] = useState<Record<string, boolean>>({
    Promotion: true,
    Low: true,
    Medium: true,
    High: true,
  });

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

  // Render monthly breakdown table
  const renderMonthlyTable = () => {
    if (!monthlyCosts || monthlyCosts.length === 0) return null;

    // Check if we're showing a single month
    const isSingleMonth = monthlyCosts.length === 1;

    return (
      <div className={TABLE_STYLES.container}>
        <table className={TABLE_STYLES.table}>
          <thead>
            <tr className={TABLE_STYLES.headerRow}>
              <th className={TABLE_STYLES.headerCell}>Urgency</th>
              {!isSingleMonth && monthlyCosts.map((monthData) => (
                <th key={`${monthData.year}-${monthData.month}`} className={TABLE_STYLES.headerCellWithBorder}>
                  {monthData.month.substring(0, 3)}
                </th>
              ))}
              {isSingleMonth && (
                <th className={TABLE_STYLES.headerCellWithBorder}>Amount</th>
              )}
              {!isSingleMonth && (
                <th className={TABLE_STYLES.headerCellWithBorder}>Total</th>
              )}
            </tr>
          </thead>
          <tbody className="text-sm">
            {/* Promotion Row */}
            <tr className={TABLE_STYLES.row}>
              <td className={TABLE_STYLES.cell}>Promotion</td>
              {monthlyCosts.map((monthData) => {
                const amount = monthData.costs.promotionalNetCost !== undefined
                  ? monthData.costs.promotionalNetCost
                  : monthData.costs.promotionalCost;
                const hours = monthData.costs.promotionalHours;
                const freeHours = monthData.costs.promotionalFreeHours || 0;
                return (
                  <td key={`promotion-${monthData.year}-${monthData.month}`} className={TABLE_STYLES.cellWithBorder}>
                    {amount === 0 && hours === 0 ? (
                      '-'
                    ) : (
                      <div className="flex flex-col">
                        <div>
                          <span>{formatCurrencyAccounting(amount).symbol}</span>
                          <span className="tabular-nums">{formatCurrencyAccounting(amount).amount}</span>
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {hours.toFixed(2)}h
                          {freeHours > 0 && (
                            <span className="text-green-600 dark:text-green-400 ml-1">
                              (-{freeHours.toFixed(2)}h free)
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </td>
                );
              })}
              {!isSingleMonth && (
                <td className={TABLE_STYLES.cellBoldWithBorder}>
                  {(() => {
                    const totalAmount = monthlyCosts.reduce((sum, m) => {
                      const amount = m.costs.promotionalNetCost !== undefined
                        ? m.costs.promotionalNetCost
                        : m.costs.promotionalCost;
                      return sum + amount;
                    }, 0);
                    const totalHours = monthlyCosts.reduce((sum, m) => sum + m.costs.promotionalHours, 0);
                    const totalFreeHours = monthlyCosts.reduce((sum, m) => sum + (m.costs.promotionalFreeHours || 0), 0);
                    return totalAmount === 0 && totalHours === 0 ? (
                      '-'
                    ) : (
                      <div className="flex flex-col">
                        <div>
                          <span>{formatCurrencyAccounting(totalAmount).symbol}</span>
                          <span className="tabular-nums">{formatCurrencyAccounting(totalAmount).amount}</span>
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {totalHours.toFixed(2)}h
                          {totalFreeHours > 0 && (
                            <span className="text-green-600 dark:text-green-400 ml-1">
                              (-{totalFreeHours.toFixed(2)}h free)
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </td>
              )}
            </tr>
            {/* Low Row */}
            <tr className={TABLE_STYLES.row}>
              <td className={TABLE_STYLES.cell}>Low</td>
              {monthlyCosts.map((monthData) => {
                const amount = monthData.costs.regularNetCost !== undefined
                  ? monthData.costs.regularNetCost
                  : monthData.costs.regularCost;
                const hours = monthData.costs.regularHours;
                const freeHours = monthData.costs.regularFreeHours || 0;
                return (
                  <td key={`low-${monthData.year}-${monthData.month}`} className={TABLE_STYLES.cellWithBorder}>
                    {amount === 0 && hours === 0 ? (
                      '-'
                    ) : (
                      <div className="flex flex-col">
                        <div>
                          <span>{formatCurrencyAccounting(amount).symbol}</span>
                          <span className="tabular-nums">{formatCurrencyAccounting(amount).amount}</span>
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {hours.toFixed(2)}h
                          {freeHours > 0 && (
                            <span className="text-green-600 dark:text-green-400 ml-1">
                              (-{freeHours.toFixed(2)}h free)
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </td>
                );
              })}
              {!isSingleMonth && (
                <td className={TABLE_STYLES.cellBoldWithBorder}>
                  {(() => {
                    const totalAmount = monthlyCosts.reduce((sum, m) => {
                      const amount = m.costs.regularNetCost !== undefined
                        ? m.costs.regularNetCost
                        : m.costs.regularCost;
                      return sum + amount;
                    }, 0);
                    const totalHours = monthlyCosts.reduce((sum, m) => sum + m.costs.regularHours, 0);
                    const totalFreeHours = monthlyCosts.reduce((sum, m) => sum + (m.costs.regularFreeHours || 0), 0);
                    return totalAmount === 0 && totalHours === 0 ? (
                      '-'
                    ) : (
                      <div className="flex flex-col">
                        <div>
                          <span>{formatCurrencyAccounting(totalAmount).symbol}</span>
                          <span className="tabular-nums">{formatCurrencyAccounting(totalAmount).amount}</span>
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {totalHours.toFixed(2)}h
                          {totalFreeHours > 0 && (
                            <span className="text-green-600 dark:text-green-400 ml-1">
                              (-{totalFreeHours.toFixed(2)}h free)
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </td>
              )}
            </tr>
            {/* Medium Row */}
            <tr className={TABLE_STYLES.row}>
              <td className={TABLE_STYLES.cell}>Medium</td>
              {monthlyCosts.map((monthData) => {
                const amount = monthData.costs.sameDayNetCost !== undefined
                  ? monthData.costs.sameDayNetCost
                  : monthData.costs.sameDayCost;
                const hours = monthData.costs.sameDayHours;
                const freeHours = monthData.costs.sameDayFreeHours || 0;
                return (
                  <td key={`medium-${monthData.year}-${monthData.month}`} className={TABLE_STYLES.cellWithBorder}>
                    {amount === 0 && hours === 0 ? (
                      '-'
                    ) : (
                      <div className="flex flex-col">
                        <div>
                          <span>{formatCurrencyAccounting(amount).symbol}</span>
                          <span className="tabular-nums">{formatCurrencyAccounting(amount).amount}</span>
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {hours.toFixed(2)}h
                          {freeHours > 0 && (
                            <span className="text-green-600 dark:text-green-400 ml-1">
                              (-{freeHours.toFixed(2)}h free)
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </td>
                );
              })}
              {!isSingleMonth && (
                <td className={TABLE_STYLES.cellBoldWithBorder}>
                  {(() => {
                    const totalAmount = monthlyCosts.reduce((sum, m) => {
                      const amount = m.costs.sameDayNetCost !== undefined
                        ? m.costs.sameDayNetCost
                        : m.costs.sameDayCost;
                      return sum + amount;
                    }, 0);
                    const totalHours = monthlyCosts.reduce((sum, m) => sum + m.costs.sameDayHours, 0);
                    const totalFreeHours = monthlyCosts.reduce((sum, m) => sum + (m.costs.sameDayFreeHours || 0), 0);
                    return totalAmount === 0 && totalHours === 0 ? (
                      '-'
                    ) : (
                      <div className="flex flex-col">
                        <div>
                          <span>{formatCurrencyAccounting(totalAmount).symbol}</span>
                          <span className="tabular-nums">{formatCurrencyAccounting(totalAmount).amount}</span>
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {totalHours.toFixed(2)}h
                          {totalFreeHours > 0 && (
                            <span className="text-green-600 dark:text-green-400 ml-1">
                              (-{totalFreeHours.toFixed(2)}h free)
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </td>
              )}
            </tr>
            {/* High Row */}
            <tr className={TABLE_STYLES.row}>
              <td className={TABLE_STYLES.cell}>High</td>
              {monthlyCosts.map((monthData) => {
                const amount = monthData.costs.emergencyNetCost !== undefined
                  ? monthData.costs.emergencyNetCost
                  : monthData.costs.emergencyCost;
                const hours = monthData.costs.emergencyHours;
                const freeHours = monthData.costs.emergencyFreeHours || 0;
                return (
                  <td key={`high-${monthData.year}-${monthData.month}`} className={TABLE_STYLES.cellWithBorder}>
                    {amount === 0 && hours === 0 ? (
                      '-'
                    ) : (
                      <div className="flex flex-col">
                        <div>
                          <span>{formatCurrencyAccounting(amount).symbol}</span>
                          <span className="tabular-nums">{formatCurrencyAccounting(amount).amount}</span>
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {hours.toFixed(2)}h
                          {freeHours > 0 && (
                            <span className="text-green-600 dark:text-green-400 ml-1">
                              (-{freeHours.toFixed(2)}h free)
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </td>
                );
              })}
              {!isSingleMonth && (
                <td className={TABLE_STYLES.cellBoldWithBorder}>
                  {(() => {
                    const totalAmount = monthlyCosts.reduce((sum, m) => {
                      const amount = m.costs.emergencyNetCost !== undefined
                        ? m.costs.emergencyNetCost
                        : m.costs.emergencyCost;
                      return sum + amount;
                    }, 0);
                    const totalHours = monthlyCosts.reduce((sum, m) => sum + m.costs.emergencyHours, 0);
                    const totalFreeHours = monthlyCosts.reduce((sum, m) => sum + (m.costs.emergencyFreeHours || 0), 0);
                    return totalAmount === 0 && totalHours === 0 ? (
                      '-'
                    ) : (
                      <div className="flex flex-col">
                        <div>
                          <span>{formatCurrencyAccounting(totalAmount).symbol}</span>
                          <span className="tabular-nums">{formatCurrencyAccounting(totalAmount).amount}</span>
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {totalHours.toFixed(2)}h
                          {totalFreeHours > 0 && (
                            <span className="text-green-600 dark:text-green-400 ml-1">
                              (-{totalFreeHours.toFixed(2)}h free)
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </td>
              )}
            </tr>
            {/* Total Row */}
            <tr className={TABLE_STYLES.rowHighlight}>
              <td className={TABLE_STYLES.cell}>Total</td>
              {monthlyCosts.map((monthData) => {
                const totalCost = monthData.costs.freeHoursSavings && monthData.costs.freeHoursSavings > 0
                  ? monthData.costs.netTotalCost || 0
                  : monthData.costs.totalCost;
                const totalHours = monthData.costs.promotionalHours + monthData.costs.regularHours +
                  monthData.costs.sameDayHours + monthData.costs.emergencyHours;
                const totalFreeHours = (monthData.costs.promotionalFreeHours || 0) +
                  (monthData.costs.regularFreeHours || 0) +
                  (monthData.costs.sameDayFreeHours || 0) +
                  (monthData.costs.emergencyFreeHours || 0);
                return (
                  <td key={`total-${monthData.year}-${monthData.month}`} className={TABLE_STYLES.cellWithBorder}>
                    <div className="flex flex-col">
                      <div>
                        <span>{formatCurrencyAccounting(totalCost).symbol}</span>
                        <span className="tabular-nums">{formatCurrencyAccounting(totalCost).amount}</span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {totalHours.toFixed(2)}h
                        {totalFreeHours > 0 && (
                          <span className="text-green-600 dark:text-green-400 ml-1">
                            (-{totalFreeHours.toFixed(2)}h free)
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                );
              })}
              {!isSingleMonth && (
                <td className={TABLE_STYLES.cellWithBorder}>
                  {(() => {
                    const grandTotalCost = monthlyCosts.reduce((sum, m) => {
                      const amount = m.costs.freeHoursSavings && m.costs.freeHoursSavings > 0
                        ? m.costs.netTotalCost || 0
                        : m.costs.totalCost;
                      return sum + amount;
                    }, 0);
                    const grandTotalHours = monthlyCosts.reduce((sum, m) =>
                      sum + m.costs.promotionalHours + m.costs.regularHours +
                      m.costs.sameDayHours + m.costs.emergencyHours, 0);
                    const grandTotalFreeHours = monthlyCosts.reduce((sum, m) =>
                      sum + (m.costs.promotionalFreeHours || 0) + (m.costs.regularFreeHours || 0) +
                      (m.costs.sameDayFreeHours || 0) + (m.costs.emergencyFreeHours || 0), 0);
                    return (
                      <div className="flex flex-col">
                        <div>
                          <span>{formatCurrencyAccounting(grandTotalCost).symbol}</span>
                          <span className="tabular-nums">{formatCurrencyAccounting(grandTotalCost).amount}</span>
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {grandTotalHours.toFixed(2)}h
                          {grandTotalFreeHours > 0 && (
                            <span className="text-green-600 dark:text-green-400 ml-1">
                              (-{grandTotalFreeHours.toFixed(2)}h free)
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </td>
              )}
            </tr>
          </tbody>
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

  // Render monthly chart
  const renderMonthlyChart = () => {
    if (!monthlyCosts || monthlyCosts.length === 0) return null;

    const chartData = monthlyCosts.map(month => ({
      month: month.month.substring(0, 3),
      Promotion: month.costs.promotionalNetCost !== undefined ? month.costs.promotionalNetCost : month.costs.promotionalCost,
      Low: month.costs.regularNetCost !== undefined ? month.costs.regularNetCost : month.costs.regularCost,
      Medium: month.costs.sameDayNetCost !== undefined ? month.costs.sameDayNetCost : month.costs.sameDayCost,
      High: month.costs.emergencyNetCost !== undefined ? month.costs.emergencyNetCost : month.costs.emergencyCost,
      totalCost: month.costs.grossTotalCost || month.costs.totalCost,
      netTotalCost: month.costs.netTotalCost || month.costs.totalCost,
      freeHoursApplied: month.costs.freeHoursApplied || 0,
      freeHoursSavings: month.costs.freeHoursSavings || 0,
      totalHours: month.costs.promotionalHours + month.costs.regularHours + month.costs.sameDayHours + month.costs.emergencyHours,
    }));

    // Calculate max value for Y-axis domain (add $250 padding for labels)
    const maxValue = Math.max(...chartData.map(d => d.netTotalCost || d.totalCost));
    const yAxisMax = maxValue + 250;

    return (
      <div style={{ width: '100%', minHeight: 400 }}>
        <ResponsiveContainer width="100%" height={400}>
          <ComposedChart data={chartData}>
          <CartesianGrid {...CHART_STYLES.cartesianGrid} />
          <XAxis dataKey="month" {...CHART_STYLES.xAxis} />
          <YAxis
            yAxisId="cost"
            domain={[0, yAxisMax]}
            tickFormatter={(value) => `$${(value).toLocaleString()}`}
            {...CHART_STYLES.yAxis}
          />
          <YAxis
            yAxisId="hours"
            orientation="right"
            tickFormatter={(value) => `${value}h`}
            {...CHART_STYLES.yAxisSecondary}
          />
          <Tooltip
            cursor={false}
            content={({ active, payload, label }) => {
              if (active && payload && payload.length) {
                const data = payload[0].payload;
                const hasFreeHours = data.freeHoursSavings > 0;

                const orderMap: Record<string, number> = {
                  'Promotion': 1,
                  'Low': 2,
                  'Medium': 3,
                  'High': 4
                };

                const sortedPayload = payload
                  .filter((entry: any) => entry.dataKey !== 'totalHours' && entry.dataKey !== 'totalCost' && entry.dataKey !== 'netTotalCost' && entry.dataKey !== 'freeHoursApplied' && entry.dataKey !== 'freeHoursSavings')
                  .sort((a: any, b: any) => {
                    return (orderMap[a.name] || 999) - (orderMap[b.name] || 999);
                  });

                return (
                  <div style={CHART_STYLES.tooltipContainer}>
                    <p style={CHART_STYLES.tooltipTitle}>{label}</p>
                    {sortedPayload.map((entry: any, index: number) => (
                      <p key={`item-${index}`} style={{ ...CHART_STYLES.tooltipItem, color: entry.color }}>
                        {entry.name}: {formatCurrency(entry.value)}
                      </p>
                    ))}
                    <div style={CHART_STYLES.tooltipDivider}>
                      {hasFreeHours ? (
                        <>
                          <p style={{ color: '#6B7280', fontSize: '12px', margin: '4px 0' }}>
                            Gross: {formatCurrency(data.totalCost)}
                          </p>
                          <p style={{ color: '#059669', fontSize: '12px', margin: '4px 0' }}>
                            Free Hours: -{formatCurrency(data.freeHoursSavings)} ({data.freeHoursApplied}h)
                          </p>
                          <p style={{ color: '#111827', fontWeight: 'bold', marginTop: '4px' }}>
                            Net Cost: {formatCurrency(data.netTotalCost)}
                          </p>
                        </>
                      ) : (
                        <p style={{ color: '#111827', fontWeight: 'bold' }}>
                          Total Cost: {formatCurrency(data.totalCost)}
                        </p>
                      )}
                    </div>
                  </div>
                );
              }
              return null;
            }}
          />
          <Legend
            wrapperStyle={CHART_STYLES.legendWrapper}
            iconType="rect"
            content={(props) => {
              const { payload } = props;
              const customOrder = ['Promotion', 'Low', 'Medium', 'High'];
              const orderedPayload = customOrder.map(key =>
                payload?.find(item => item.value === key)
              ).filter((item): item is NonNullable<typeof item> => item !== null && item !== undefined);

              return (
                <div>
                  <ul style={CHART_STYLES.legendList}>
                    {orderedPayload.map((entry, index) => entry ? (
                      <li
                        key={`item-${index}`}
                        onClick={() => toggleUrgency(entry.value || '')}
                        style={{
                          ...CHART_STYLES.legendItem,
                          opacity: visibleUrgencies[entry.value || ''] ? 1 : 0.35,
                        }}
                      >
                        <span style={{
                          ...CHART_STYLES.legendIcon(visibleUrgencies[entry.value || '']),
                          backgroundColor: entry.color,
                        }} />
                        <span style={CHART_STYLES.legendText(visibleUrgencies[entry.value || ''])}>
                          {entry.value}
                        </span>
                      </li>
                    ) : null)}

                    {isModified && (
                      <>
                        <li style={{
                          width: '1px',
                          height: '20px',
                          backgroundColor: '#E5E7EB',
                          margin: '0 10px'
                        }} />
                        <li
                          onClick={resetFilters}
                          style={CHART_STYLES.resetButton}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.color = '#3B82F6';
                            e.currentTarget.style.backgroundColor = '#EFF6FF';
                            e.currentTarget.style.borderColor = '#BFDBFE';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.color = '#6B7280';
                            e.currentTarget.style.backgroundColor = 'transparent';
                            e.currentTarget.style.borderColor = 'transparent';
                          }}
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
                            <path d="M21 3v5h-5" />
                            <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
                            <path d="M8 21H3v-5" />
                          </svg>
                          Reset
                        </li>
                      </>
                    )}
                  </ul>
                </div>
              );
            }}
          />
          <Bar yAxisId="cost" dataKey="High" stackId="a" fill={visibleUrgencies.High ? CHART_STYLES.barColors.high : CHART_STYLES.barColors.disabled} />
          <Bar yAxisId="cost" dataKey="Medium" stackId="a" fill={visibleUrgencies.Medium ? CHART_STYLES.barColors.medium : CHART_STYLES.barColors.disabled} />
          <Bar yAxisId="cost" dataKey="Low" stackId="a" fill={visibleUrgencies.Low ? CHART_STYLES.barColors.low : CHART_STYLES.barColors.disabled} />
          <Bar yAxisId="cost" dataKey="Promotion" stackId="a" fill={visibleUrgencies.Promotion ? CHART_STYLES.barColors.promotion : CHART_STYLES.barColors.disabled}>
            <LabelList
              dataKey="netTotalCost"
              position="top"
              content={(props: any) => {
                const { x, y, width, index } = props;
                const entry = chartData[index];

                // Calculate visible total by summing only visible urgency levels
                const visibleTotal = (visibleUrgencies.Promotion ? entry.Promotion : 0) +
                                   (visibleUrgencies.Low ? entry.Low : 0) +
                                   (visibleUrgencies.Medium ? entry.Medium : 0) +
                                   (visibleUrgencies.High ? entry.High : 0);

                if (visibleTotal <= 0) return null;

                return (
                  <text x={x + width / 2} y={y - 5} fill="#374151" textAnchor="middle" fontSize="12" fontWeight="bold">
                    {formatCurrency(visibleTotal)}
                  </text>
                );
              }}
            />
          </Bar>
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
  };

  // Render single period chart - FIXED VERSION
  const renderSinglePeriodChart = () => {
    if (!costData) return null;

    // Restructure data: one array item per urgency level (with null safety)
    const chartData = [
      {
        name: 'Promotion',
        hours: costData.promotionalHours || 0,
        cost: (costData.promotionalNetCost !== undefined ? costData.promotionalNetCost : costData.promotionalCost) || 0,
        visible: visibleUrgencies.Promotion
      },
      {
        name: 'Low',
        hours: costData.regularHours || 0,
        cost: (costData.regularNetCost !== undefined ? costData.regularNetCost : costData.regularCost) || 0,
        visible: visibleUrgencies.Low
      },
      {
        name: 'Medium',
        hours: costData.sameDayHours || 0,
        cost: (costData.sameDayNetCost !== undefined ? costData.sameDayNetCost : costData.sameDayCost) || 0,
        visible: visibleUrgencies.Medium
      },
      {
        name: 'High',
        hours: costData.emergencyHours || 0,
        cost: (costData.emergencyNetCost !== undefined ? costData.emergencyNetCost : costData.emergencyCost) || 0,
        visible: visibleUrgencies.High
      },
    ];

    // Calculate max value for Y-axis domain (add $250 padding for labels)
    const maxValue = Math.max(...chartData.map(d => d.cost), 0);
    const yAxisMax = Math.max(maxValue + 250, 500); // Minimum $500 Y-axis to prevent rendering issues

    // Define color mapping function
    const getBarColor = (name: string, visible: boolean) => {
      if (!visible) return CHART_STYLES.barColors.disabled;
      switch(name) {
        case 'Promotion': return CHART_STYLES.barColors.promotion;
        case 'Low': return CHART_STYLES.barColors.low;
        case 'Medium': return CHART_STYLES.barColors.medium;
        case 'High': return CHART_STYLES.barColors.high;
        default: return CHART_STYLES.barColors.disabled;
      }
    };

    // Emergency fallback: Check if there's any data to display
    const hasData = chartData.some(d => d.cost > 0);
    if (!hasData) {
      return (
        <div style={{ padding: '20px', border: '2px dashed #F59E0B', borderRadius: '8px', backgroundColor: '#FEF3C7' }}>
          <h3 style={{ color: '#92400E', marginBottom: '10px' }}>⚠️ No Cost Data Available</h3>
          <p style={{ color: '#78350F', marginBottom: '10px' }}>The chart cannot be displayed because all cost values are zero.</p>
          <details style={{ color: '#78350F' }}>
            <summary style={{ cursor: 'pointer', fontWeight: 'bold' }}>View Raw Data (Debug)</summary>
            <pre style={{ backgroundColor: '#FFFBEB', padding: '10px', borderRadius: '4px', overflow: 'auto' }}>
              {JSON.stringify(chartData, null, 2)}
            </pre>
          </details>
        </div>
      );
    }

    return (
      <div style={{ width: '100%', minHeight: 400, border: '1px solid #E5E7EB', borderRadius: '8px', padding: '10px' }}>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart
            data={chartData}
            barSize={50}
            barCategoryGap="20%"
          >
            <CartesianGrid {...CHART_STYLES.cartesianGrid} />
            <XAxis dataKey="name" {...CHART_STYLES.xAxis} />
            <YAxis
              domain={[0, yAxisMax]}
              tickFormatter={(value) => `$${(value).toLocaleString()}`}
              {...CHART_STYLES.yAxis}
            />
            <Tooltip
              cursor={false}
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  const allData = chartData;
                  const totalCost = allData.reduce((sum, item) => sum + item.cost, 0);
                  const totalHours = allData.reduce((sum, item) => sum + item.hours, 0);

                  return (
                    <div style={CHART_STYLES.tooltipContainer}>
                      <p style={CHART_STYLES.tooltipTitle}>{label}</p>
                      <p style={{ ...CHART_STYLES.tooltipItem, color: '#374151' }}>
                        Cost: {formatCurrency(data.cost)}
                      </p>
                      <p style={{ ...CHART_STYLES.tooltipItem, color: '#374151' }}>
                        Hours: {data.hours.toFixed(2)}
                      </p>
                      <div style={CHART_STYLES.tooltipDivider}>
                        <p style={{ color: '#111827', fontSize: '12px' }}>
                          Total: {formatCurrency(totalCost)} ({totalHours.toFixed(2)}h)
                        </p>
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Legend
              wrapperStyle={CHART_STYLES.legendWrapper}
              iconType="rect"
              content={(props) => {
                const { payload } = props;
                const customOrder = ['Promotion', 'Low', 'Medium', 'High'];
                const orderedPayload = customOrder.map(key =>
                  payload?.find(item => item.value === key)
                ).filter((item): item is NonNullable<typeof item> => item !== null && item !== undefined);

                return (
                  <div>
                    <ul style={CHART_STYLES.legendList}>
                      {orderedPayload.map((entry, index) => entry ? (
                        <li
                          key={`item-${index}`}
                          onClick={() => toggleUrgency(entry.value || '')}
                          style={{
                            ...CHART_STYLES.legendItem,
                            opacity: visibleUrgencies[entry.value || ''] ? 1 : 0.35,
                          }}
                        >
                          <span style={{
                            ...CHART_STYLES.legendIcon(visibleUrgencies[entry.value || '']),
                            backgroundColor: entry.color,
                          }} />
                          <span style={CHART_STYLES.legendText(visibleUrgencies[entry.value || ''])}>
                            {entry.value}
                          </span>
                        </li>
                      ) : null)}

                      {isModified && (
                        <>
                          <li style={{
                            width: '1px',
                            height: '20px',
                            backgroundColor: '#E5E7EB',
                            margin: '0 10px'
                          }} />
                          <li
                            onClick={resetFilters}
                            style={CHART_STYLES.resetButton}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.color = '#3B82F6';
                              e.currentTarget.style.backgroundColor = '#EFF6FF';
                              e.currentTarget.style.borderColor = '#BFDBFE';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.color = '#6B7280';
                              e.currentTarget.style.backgroundColor = 'transparent';
                              e.currentTarget.style.borderColor = 'transparent';
                            }}
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
                              <path d="M21 3v5h-5" />
                              <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
                              <path d="M8 21H3v-5" />
                            </svg>
                            Reset
                          </li>
                        </>
                      )}
                    </ul>
                  </div>
                );
              }}
            />
            <Bar
              dataKey="cost"
              name="Cost"
              isAnimationActive={false}
            >
              {chartData.map((entry, index) => (
                <Cell
                  key={`bar-${index}`}
                  fill={getBarColor(entry.name, entry.visible)}
                />
              ))}
              <LabelList
                dataKey="cost"
                position="top"
                content={(props: any) => {
                  const { x, y, width, index } = props;
                  // Calculate visible total by summing only visible urgency levels
                  const visibleTotal = chartData
                    .filter(entry => visibleUrgencies[entry.name])
                    .reduce((sum, entry) => sum + entry.cost, 0);

                  // Only show label on the topmost visible bar (last in stack order)
                  const visibleBars = chartData.filter(entry => visibleUrgencies[entry.name]);
                  const lastVisibleIndex = chartData.indexOf(visibleBars[visibleBars.length - 1]);

                  if (index !== lastVisibleIndex || visibleTotal <= 0) return null;

                  return (
                    <text
                      x={x + width / 2}
                      y={y - 5}
                      fill="#374151"
                      textAnchor="middle"
                      fontSize="12"
                      fontWeight="bold"
                    >
                      {formatCurrency(visibleTotal)}
                    </text>
                  );
                }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  };

  // Main render logic
  const renderTable = () => {
    return selectedMonth === 'all' && monthlyCosts && monthlyCosts.length > 0
      ? renderMonthlyTable()
      : renderSinglePeriodTable();
  };

  const renderChart = () => {
    return selectedMonth === 'all' && monthlyCosts && monthlyCosts.length > 0
      ? renderMonthlyChart()
      : renderSinglePeriodChart();
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
