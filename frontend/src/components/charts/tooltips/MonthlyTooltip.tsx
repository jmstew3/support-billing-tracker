/**
 * MonthlyTooltip Component
 *
 * Reusable tooltip for monthly data charts.
 * Displays month name with associated numeric values.
 *
 * Usage:
 * ```typescript
 * <BaseBarChart
 *   data={monthlyData}
 *   bars={[...]}
 *   customTooltip={MonthlyTooltip}
 * />
 * ```
 */

import { formatCurrency } from '../../../utils/formatting';

export interface MonthlyTooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    color: string;
    dataKey: string;
    payload: any;
  }>;
  label?: string;
}

/**
 * Standard tooltip for monthly breakdown charts
 * Shows month label and all bar values with colors
 */
export function MonthlyTooltip({ active, payload, label }: MonthlyTooltipProps) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  return (
    <div className="border bg-card p-3 text-sm shadow-lg">
      {/* Month Label */}
      <p className="font-semibold mb-2">{label}</p>

      {/* Values */}
      {payload.map((entry, index) => (
        <div
          key={`item-${index}`}
          className="flex items-center justify-between gap-4 mb-1"
        >
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-sm"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-xs text-muted-foreground">{entry.name}:</span>
          </div>
          <span className="text-xs font-medium text-foreground">
            {typeof entry.value === 'number'
              ? formatCurrency(entry.value)
              : entry.value}
          </span>
        </div>
      ))}

      {/* Total if multiple values */}
      {payload.length > 1 && (
        <div className="mt-2 pt-2 border-t border-border">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-foreground">Total:</span>
            <span className="text-xs font-semibold text-foreground">
              {formatCurrency(
                payload.reduce((sum, entry) => sum + (entry.value || 0), 0)
              )}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
