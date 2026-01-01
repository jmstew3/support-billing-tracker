import { TABLE_STYLES } from '../../base/DataTrackerCard';

export interface CostTableHeaderProps {
  /** Monthly breakdown data */
  monthlyCosts: Array<{ month: string; year: number }>;
  /** Whether showing a single month */
  isSingleMonth: boolean;
}

/**
 * CostTableHeader - Renders the header row for cost tables
 *
 * Displays month columns for multi-month view or simple headers for single-month view.
 */
export function CostTableHeader({ monthlyCosts, isSingleMonth }: CostTableHeaderProps) {
  return (
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
  );
}
