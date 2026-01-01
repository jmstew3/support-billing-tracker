/* eslint-disable @typescript-eslint/no-explicit-any */
import { formatCurrency } from '../../../services/projectsApi';

interface ProjectRevenueTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
  categoryLabels?: Record<string, string>;
}

/**
 * ProjectRevenueTooltip - Custom tooltip for project revenue charts
 *
 * Displays category breakdown with total for category view,
 * or simple revenue + project count for monthly view.
 */
export function ProjectRevenueTooltip({
  active,
  payload,
  label,
  categoryLabels = {},
}: ProjectRevenueTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  const data = payload[0].payload;

  // Check if this is category view (multiple bars) or monthly view (single bar)
  const isCategoryView = payload.length > 1 || payload.some(p => categoryLabels[p.dataKey]);

  if (isCategoryView) {
    // Category view: show breakdown by category
    const nonZeroCategories = payload.filter((entry) => entry.value > 0);

    if (nonZeroCategories.length === 0) return null;

    return (
      <div className="border bg-card p-3 text-sm shadow-lg">
        <p className="font-semibold mb-2">{label}</p>
        {nonZeroCategories.map((entry, index) => (
          <div key={`item-${index}`} className="flex items-center justify-between gap-4 mb-1">
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-sm"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-xs text-muted-foreground">
                {categoryLabels[entry.dataKey] || entry.name}:
              </span>
            </div>
            <span className="text-xs font-medium text-foreground">
              {formatCurrency(entry.value)}
            </span>
          </div>
        ))}
        {data.total && (
          <div className="mt-2 pt-2 border-t">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground">Total:</span>
              <span className="text-xs font-semibold text-foreground">
                {formatCurrency(data.total)}
              </span>
            </div>
          </div>
        )}
      </div>
    );
  } else {
    // Monthly view: show revenue and project count
    return (
      <div className="border bg-card p-3 text-sm shadow-lg">
        <p className="font-semibold mb-2">{label}</p>
        <div className="flex items-center justify-between gap-4 mb-1">
          <span className="text-xs text-muted-foreground">Revenue:</span>
          <span className="text-xs font-medium text-foreground">
            {formatCurrency(data.revenue)}
          </span>
        </div>
        {data.projectCount !== undefined && (
          <div className="flex items-center justify-between gap-4">
            <span className="text-xs text-muted-foreground">Projects:</span>
            <span className="text-xs font-medium text-foreground">
              {data.projectCount}
            </span>
          </div>
        )}
      </div>
    );
  }
}
