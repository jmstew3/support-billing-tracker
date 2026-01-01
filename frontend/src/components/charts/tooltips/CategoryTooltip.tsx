/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * CategoryTooltip Component
 *
 * Reusable tooltip for category-based stacked bar charts.
 * Only shows categories with non-zero values for cleaner display.
 *
 * Usage:
 * ```typescript
 * <BaseBarChart
 *   data={categoryData}
 *   bars={categoryBars}
 *   customTooltip={CategoryTooltip}
 * />
 * ```
 */

import { formatCurrency } from '../../../utils/formatting';

export interface CategoryTooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    color: string;
    dataKey: string;
    payload: any;
  }>;
  label?: string;
  /** Optional map of category keys to display names */
  categoryLabels?: Record<string, string>;
}

/**
 * Tooltip for category breakdown charts
 * Filters out zero values and shows total
 */
export function CategoryTooltip({
  active,
  payload,
  label,
  categoryLabels = {},
}: CategoryTooltipProps) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  // Filter out categories with 0 value
  const nonZeroCategories = payload.filter((entry) => entry.value > 0);

  if (nonZeroCategories.length === 0) {
    return null;
  }

  // Calculate total
  const total = nonZeroCategories.reduce((sum, entry) => sum + entry.value, 0);

  // Get display name for category
  const getCategoryLabel = (dataKey: string, defaultName: string): string => {
    return categoryLabels[dataKey] || defaultName;
  };

  return (
    <div className="border bg-card p-3 text-sm shadow-lg">
      {/* Label (usually month or period) */}
      <p className="font-semibold mb-2">{label}</p>

      {/* Non-zero categories */}
      {nonZeroCategories.map((entry, index) => (
        <div
          key={`category-${index}`}
          className="flex items-center justify-between gap-4 mb-1"
        >
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-sm"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-xs text-muted-foreground">
              {getCategoryLabel(entry.dataKey, entry.name)}:
            </span>
          </div>
          <span className="text-xs font-medium text-foreground">
            {formatCurrency(entry.value)}
          </span>
        </div>
      ))}

      {/* Total */}
      {nonZeroCategories.length > 1 && (
        <div className="mt-2 pt-2 border-t border-border">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-foreground">Total:</span>
            <span className="text-xs font-semibold text-foreground">
              {formatCurrency(total)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
