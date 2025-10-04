import { formatCurrencyAccounting } from '../../../utils/formatting';

interface GrandTotalRowProps {
  totalTicketsRevenue: number;
  totalProjectsRevenue: number;
  totalHostingRevenue: number;
  totalRevenue: number;
}

/**
 * GrandTotalRow Component
 *
 * Displays the grand totals row for the billing overview table.
 * Shows sum of all tickets, projects, and hosting revenue across all filtered months.
 *
 * Extracted from Dashboard.tsx lines 402-423
 */
export function GrandTotalRow({
  totalTicketsRevenue,
  totalProjectsRevenue,
  totalHostingRevenue,
  totalRevenue,
}: GrandTotalRowProps) {
  return (
    <tr className="bg-black text-white dark:bg-black dark:text-white border-t-2 font-bold divide-x divide-white/20 dark:divide-white/20">
      <td colSpan={3} className="py-4 px-4 text-left text-lg whitespace-nowrap">
        GRAND TOTALS
      </td>
      <td className="py-4 px-4 text-right text-lg font-bold whitespace-nowrap">
        <span>{formatCurrencyAccounting(totalTicketsRevenue).symbol}</span>
        <span className="tabular-nums">{formatCurrencyAccounting(totalTicketsRevenue).amount}</span>
      </td>
      <td className="py-4 px-4 text-right text-lg font-bold whitespace-nowrap">
        <span>{formatCurrencyAccounting(totalProjectsRevenue).symbol}</span>
        <span className="tabular-nums">{formatCurrencyAccounting(totalProjectsRevenue).amount}</span>
      </td>
      <td className="py-4 px-4 text-right text-lg font-bold whitespace-nowrap">
        <span>{formatCurrencyAccounting(totalHostingRevenue).symbol}</span>
        <span className="tabular-nums">{formatCurrencyAccounting(totalHostingRevenue).amount}</span>
      </td>
      <td className="py-4 px-4 text-right text-lg font-bold whitespace-nowrap">
        <span>{formatCurrencyAccounting(totalRevenue).symbol}</span>
        <span className="tabular-nums">{formatCurrencyAccounting(totalRevenue).amount}</span>
      </td>
    </tr>
  );
}
