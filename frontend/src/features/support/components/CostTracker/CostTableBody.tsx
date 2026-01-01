import { TABLE_STYLES } from '../../../../components/base/DataTrackerCard';
import { formatCurrencyAccounting } from '../../../../utils/currency';
import { PRICING_CONFIG } from '../../../../config/pricing';
import type { CostTableBodyProps, CostData, MonthlyCostData } from './types';

/**
 * Renders a cost cell with amount and hours breakdown
 */
function CostCell({
  amount,
  hours,
  freeHours = 0,
  isBold = false,
}: {
  amount: number;
  hours: number;
  freeHours?: number;
  isBold?: boolean;
}) {
  const cellClass = isBold ? TABLE_STYLES.cellBoldWithBorder : TABLE_STYLES.cellWithBorder;

  if (amount === 0 && hours === 0) {
    return <td className={cellClass}>-</td>;
  }

  return (
    <td className={cellClass}>
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
    </td>
  );
}

/**
 * Helper to get net cost for a category
 */
function getNetCost(costs: CostData, category: 'promotional' | 'regular' | 'sameDay' | 'emergency'): number {
  switch (category) {
    case 'promotional':
      return costs.promotionalNetCost !== undefined ? costs.promotionalNetCost : costs.promotionalCost;
    case 'regular':
      return costs.regularNetCost !== undefined ? costs.regularNetCost : costs.regularCost;
    case 'sameDay':
      return costs.sameDayNetCost !== undefined ? costs.sameDayNetCost : costs.sameDayCost;
    case 'emergency':
      return costs.emergencyNetCost !== undefined ? costs.emergencyNetCost : costs.emergencyCost;
  }
}

/**
 * Helper to get free hours for a category
 */
function getFreeHours(costs: CostData, category: 'promotional' | 'regular' | 'sameDay' | 'emergency'): number {
  switch (category) {
    case 'promotional':
      return costs.promotionalFreeHours || 0;
    case 'regular':
      return costs.regularFreeHours || 0;
    case 'sameDay':
      return costs.sameDayFreeHours || 0;
    case 'emergency':
      return costs.emergencyFreeHours || 0;
  }
}

/**
 * Monthly table row rendering
 */
function MonthlyRow({
  label,
  category,
  monthlyCosts,
  isSingleMonth,
}: {
  label: string;
  category: 'promotional' | 'regular' | 'sameDay' | 'emergency';
  monthlyCosts: MonthlyCostData[];
  isSingleMonth: boolean;
}) {
  const hoursKey = `${category}Hours` as keyof CostData;

  // Calculate totals
  const totalAmount = monthlyCosts.reduce((sum, m) => sum + getNetCost(m.costs, category), 0);
  const totalHours = monthlyCosts.reduce((sum, m) => sum + (m.costs[hoursKey] as number || 0), 0);
  const totalFreeHours = monthlyCosts.reduce((sum, m) => sum + getFreeHours(m.costs, category), 0);

  return (
    <tr className={TABLE_STYLES.row}>
      <td className={TABLE_STYLES.cell}>{label}</td>
      {monthlyCosts.map((monthData) => (
        <CostCell
          key={`${label}-${monthData.year}-${monthData.month}`}
          amount={getNetCost(monthData.costs, category)}
          hours={monthData.costs[hoursKey] as number || 0}
          freeHours={getFreeHours(monthData.costs, category)}
        />
      ))}
      {!isSingleMonth && (
        <CostCell
          amount={totalAmount}
          hours={totalHours}
          freeHours={totalFreeHours}
          isBold={true}
        />
      )}
    </tr>
  );
}

/**
 * Renders the monthly breakdown table
 */
export function MonthlyTable({ monthlyCosts }: { monthlyCosts: MonthlyCostData[] }) {
  if (!monthlyCosts || monthlyCosts.length === 0) return null;

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
          <MonthlyRow label="Promotion" category="promotional" monthlyCosts={monthlyCosts} isSingleMonth={isSingleMonth} />
          <MonthlyRow label="Low" category="regular" monthlyCosts={monthlyCosts} isSingleMonth={isSingleMonth} />
          <MonthlyRow label="Medium" category="sameDay" monthlyCosts={monthlyCosts} isSingleMonth={isSingleMonth} />
          <MonthlyRow label="High" category="emergency" monthlyCosts={monthlyCosts} isSingleMonth={isSingleMonth} />

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
                <CostCell
                  key={`total-${monthData.year}-${monthData.month}`}
                  amount={totalCost}
                  hours={totalHours}
                  freeHours={totalFreeHours}
                />
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
}

/**
 * Renders the single period cost table
 */
export function SinglePeriodTable({ costData }: { costData: CostData }) {
  if (!costData) return null;

  const rows = [
    { label: 'Promotion', rate: '$125/hr', hours: costData.promotionalHours, freeHours: costData.promotionalFreeHours, cost: getNetCost(costData, 'promotional') },
    { label: 'Low', rate: `$${PRICING_CONFIG.tiers[1].rate}/hr`, hours: costData.regularHours, freeHours: costData.regularFreeHours, cost: getNetCost(costData, 'regular') },
    { label: 'Medium', rate: `$${PRICING_CONFIG.tiers[2].rate}/hr`, hours: costData.sameDayHours, freeHours: costData.sameDayFreeHours, cost: getNetCost(costData, 'sameDay') },
    { label: 'High', rate: `$${PRICING_CONFIG.tiers[3].rate}/hr`, hours: costData.emergencyHours, freeHours: costData.emergencyFreeHours, cost: getNetCost(costData, 'emergency') },
  ];

  const totalHours = costData.regularHours + costData.sameDayHours + costData.emergencyHours + costData.promotionalHours;
  const hasFreeHours = costData.freeHoursSavings && costData.freeHoursSavings > 0;
  const displayTotal = hasFreeHours ? costData.netTotalCost || 0 : costData.totalCost;

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
          {rows.map((row) => (
            <tr key={row.label} className={TABLE_STYLES.row}>
              <td className={TABLE_STYLES.cell}>{row.label}</td>
              <td className={TABLE_STYLES.cellWithBorder}>{row.rate}</td>
              <td className={TABLE_STYLES.cellBoldWithBorder}>
                {row.hours === 0 ? '-' : (
                  <>
                    {row.hours.toFixed(2)}
                    {row.freeHours && row.freeHours > 0 && (
                      <span className="text-xs text-green-600 dark:text-green-400 ml-1">
                        (-{row.freeHours.toFixed(2)}h free)
                      </span>
                    )}
                  </>
                )}
              </td>
              <td className={TABLE_STYLES.cellBoldWithBorder}>
                {row.cost === 0 ? '-' : (
                  <>
                    <span>{formatCurrencyAccounting(row.cost).symbol}</span>
                    <span className="tabular-nums">{formatCurrencyAccounting(row.cost).amount}</span>
                  </>
                )}
              </td>
            </tr>
          ))}

          {/* Free Hours Deduction Row */}
          {hasFreeHours && (
            <tr className={TABLE_STYLES.rowSuccess}>
              <td className={TABLE_STYLES.cellSmall + ' font-medium'}>Free Support Hours Benefit</td>
              <td className={TABLE_STYLES.cellSmall + ' text-muted-foreground border-l border-border/40'}>-</td>
              <td className={TABLE_STYLES.cellSmall + ' text-muted-foreground border-l border-border/40'}>
                {costData.freeHoursApplied}h free
              </td>
              <td className={TABLE_STYLES.cellSmall + ' border-l border-border/40'}>
                <div className={TABLE_STYLES.successText}>
                  -<span>{formatCurrencyAccounting(costData.freeHoursSavings!).symbol}</span>
                  <span className="tabular-nums">{formatCurrencyAccounting(costData.freeHoursSavings!).amount}</span>
                </div>
              </td>
            </tr>
          )}

          {/* Total Row */}
          <tr className={TABLE_STYLES.totalRow}>
            <td className={TABLE_STYLES.cell}>{hasFreeHours ? 'Net Total' : 'Total'}</td>
            <td className={TABLE_STYLES.cellWithBorder}>-</td>
            <td className={TABLE_STYLES.cellWithBorder}>{totalHours.toFixed(2)}</td>
            <td className={TABLE_STYLES.cellWithBorder}>
              <span className={TABLE_STYLES.badge}>
                <span>{formatCurrencyAccounting(displayTotal).symbol}</span>
                <span className="tabular-nums">{formatCurrencyAccounting(displayTotal).amount}</span>
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

/**
 * Combined table body component that renders either monthly or single period table
 */
export function CostTableBody({ costData, monthlyCosts, selectedMonth }: CostTableBodyProps) {
  if (selectedMonth === 'all' && monthlyCosts && monthlyCosts.length > 0) {
    return <MonthlyTable monthlyCosts={monthlyCosts} />;
  }

  if (costData) {
    return <SinglePeriodTable costData={costData} />;
  }

  return null;
}
