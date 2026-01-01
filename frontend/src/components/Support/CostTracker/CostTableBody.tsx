import { TABLE_STYLES } from '../../base/DataTrackerCard';
import { formatCurrencyAccounting } from '../../../utils/currency';
import type { MonthlyCostData } from '../CostTrackerCard';

export interface CostTableBodyProps {
  /** Monthly breakdown data */
  monthlyCosts: MonthlyCostData[];
  /** Whether showing a single month */
  isSingleMonth: boolean;
}

/**
 * CostTableBody - Renders table rows for each urgency level
 *
 * Displays costs by urgency type (Promotion, Low, Medium, High) with hours
 * and free hours applied when applicable.
 */
export function CostTableBody({ monthlyCosts, isSingleMonth }: CostTableBodyProps) {

  /**
   * Renders a cell with cost and hours information
   */
  const renderCostCell = (
    amount: number,
    hours: number,
    freeHours: number,
    key: string,
    className: string
  ) => {
    return (
      <td key={key} className={className}>
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
  };

  /**
   * Calculates and renders total column for urgency row
   */
  const renderTotalColumn = (
    getCost: (m: MonthlyCostData) => number,
    getHours: (m: MonthlyCostData) => number,
    getFreeHours: (m: MonthlyCostData) => number
  ) => {
    const totalAmount = monthlyCosts.reduce((sum, m) => sum + getCost(m), 0);
    const totalHours = monthlyCosts.reduce((sum, m) => sum + getHours(m), 0);
    const totalFreeHours = monthlyCosts.reduce((sum, m) => sum + getFreeHours(m), 0);

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
  };

  return (
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
          return renderCostCell(
            amount,
            hours,
            freeHours,
            `promotion-${monthData.year}-${monthData.month}`,
            TABLE_STYLES.cellWithBorder
          );
        })}
        {!isSingleMonth && (
          <td className={TABLE_STYLES.cellBoldWithBorder}>
            {renderTotalColumn(
              (m) => m.costs.promotionalNetCost !== undefined ? m.costs.promotionalNetCost : m.costs.promotionalCost,
              (m) => m.costs.promotionalHours,
              (m) => m.costs.promotionalFreeHours || 0
            )}
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
          return renderCostCell(
            amount,
            hours,
            freeHours,
            `low-${monthData.year}-${monthData.month}`,
            TABLE_STYLES.cellWithBorder
          );
        })}
        {!isSingleMonth && (
          <td className={TABLE_STYLES.cellBoldWithBorder}>
            {renderTotalColumn(
              (m) => m.costs.regularNetCost !== undefined ? m.costs.regularNetCost : m.costs.regularCost,
              (m) => m.costs.regularHours,
              (m) => m.costs.regularFreeHours || 0
            )}
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
          return renderCostCell(
            amount,
            hours,
            freeHours,
            `medium-${monthData.year}-${monthData.month}`,
            TABLE_STYLES.cellWithBorder
          );
        })}
        {!isSingleMonth && (
          <td className={TABLE_STYLES.cellBoldWithBorder}>
            {renderTotalColumn(
              (m) => m.costs.sameDayNetCost !== undefined ? m.costs.sameDayNetCost : m.costs.sameDayCost,
              (m) => m.costs.sameDayHours,
              (m) => m.costs.sameDayFreeHours || 0
            )}
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
          return renderCostCell(
            amount,
            hours,
            freeHours,
            `high-${monthData.year}-${monthData.month}`,
            TABLE_STYLES.cellWithBorder
          );
        })}
        {!isSingleMonth && (
          <td className={TABLE_STYLES.cellBoldWithBorder}>
            {renderTotalColumn(
              (m) => m.costs.emergencyNetCost !== undefined ? m.costs.emergencyNetCost : m.costs.emergencyCost,
              (m) => m.costs.emergencyHours,
              (m) => m.costs.emergencyFreeHours || 0
            )}
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
  );
}
