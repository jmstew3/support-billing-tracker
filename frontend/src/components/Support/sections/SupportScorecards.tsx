import { AlertCircle, DollarSign, Calendar, TrendingUp, BarChart3, Tag, Zap } from 'lucide-react';
import { Scorecard } from '../../ui/Scorecard';
import { formatCurrency } from '../../../utils/currency';
import type { ActivityMetrics } from '../hooks/useSupportMetrics';

interface CostData {
  totalCost: number;
  netTotalCost: number;
  freeHoursSavings: number;
  freeHoursApplied: number;
}

interface SupportScorecardsProps {
  billableCount: number;
  totalActiveCount: number;
  costs: CostData | null;
  activityMetrics: ActivityMetrics;
}

export function SupportScorecards({
  billableCount,
  totalActiveCount,
  costs,
  activityMetrics
}: SupportScorecardsProps) {
  const billablePercentage = totalActiveCount > 0
    ? Math.round((billableCount / totalActiveCount) * 100)
    : 0;

  const { mostActiveDay, mostActiveTimeRange, busiestDayOfWeek, topCategory } = activityMetrics;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      <Scorecard
        title="Billable Requests"
        value={billableCount}
        description={`${billablePercentage}% billable`}
        icon={<AlertCircle className="h-4 w-4 text-muted-foreground" />}
      />

      <Scorecard
        title="Total Cost"
        value={
          costs?.freeHoursSavings && costs.freeHoursSavings > 0 ? (
            <div className="flex items-center gap-2">
              <span>{formatCurrency(costs.netTotalCost)}</span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-950/30 text-green-700 dark:text-green-300">
                <Zap className="h-2.5 w-2.5 inline mr-0.5" />
                {costs.freeHoursApplied}h
              </span>
            </div>
          ) : (
            formatCurrency(costs?.totalCost || 0)
          )
        }
        description={
          costs?.freeHoursSavings && costs.freeHoursSavings > 0
            ? `Saved ${formatCurrency(costs.freeHoursSavings)} in free hours`
            : "Tiered pricing"
        }
        icon={<DollarSign className="h-4 w-4 text-muted-foreground" />}
      />

      <Scorecard
        title="Most Active Day"
        value={
          <div>
            <div>{mostActiveDay.displayText}</div>
            {mostActiveDay.subtitle && (
              <p className="text-xs text-muted-foreground mt-1">
                {mostActiveDay.subtitle}
              </p>
            )}
          </div>
        }
        description={`${mostActiveDay.count} requests${mostActiveDay.dates.length > 1 ? ' each' : ''}`}
        icon={<Calendar className="h-4 w-4 text-muted-foreground" />}
        valueClassName="!p-0"
      />

      <Scorecard
        title="Peak Time"
        value={mostActiveTimeRange.range.split(' (')[0]}
        description={`${mostActiveTimeRange.count} requests`}
        icon={<TrendingUp className="h-4 w-4 text-muted-foreground" />}
      />

      <Scorecard
        title="Busiest Day"
        value={busiestDayOfWeek.day}
        description={`${busiestDayOfWeek.count} requests on average`}
        icon={<BarChart3 className="h-4 w-4 text-muted-foreground" />}
      />

      <Scorecard
        title="Top Category"
        value={topCategory.category}
        description={`${topCategory.percentage}% of requests`}
        icon={<Tag className="h-4 w-4 text-muted-foreground" />}
      />
    </div>
  );
}
