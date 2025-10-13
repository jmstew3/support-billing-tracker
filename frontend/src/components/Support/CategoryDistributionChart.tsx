import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LabelList,
  Cell,
} from 'recharts';
import { CHART_STYLES } from '../base/DataTrackerCard';

/**
 * CategoryDistributionChart - Simple bar chart showing ticket volume by category
 *
 * Purpose: Quick visual summary of which categories receive the most tickets
 * Layout: X-axis = category names, Y-axis = ticket count
 * Style: Inherits styling from CategoryTrackerCard
 *
 * Features:
 * - Static display (no toggles or filtering)
 * - Sorted by count descending (busiest categories first)
 * - Only shows categories with non-zero counts
 * - Color-coded bars matching CategoryTrackerCard palette
 * - Tooltip with count and percentage
 * - Bar labels on top
 *
 * @example
 * <CategoryDistributionChart
 *   categoryData={allCategoryBreakdownData}
 *   title="Category Distribution"
 *   description="Ticket volume by category"
 * />
 */

// Category color palette (matching CategoryTrackerCard)
const CATEGORY_COLORS = {
  support: '#3B82F6',      // Blue
  hosting: '#10B981',      // Green
  forms: '#EC4899',        // Pink
  email: '#8B5CF6',        // Purple
  migration: '#F59E0B',    // Orange
  advisory: '#06B6D4',     // Cyan
  nonBillable: '#9CA3AF',  // Gray-400
  website: '#F97316',      // Dark Orange
  scripts: '#EAB308',      // Yellow
} as const;

// Category display names (matching CategoryTrackerCard)
const CATEGORY_NAMES: Record<string, string> = {
  support: 'Support',
  hosting: 'Hosting',
  forms: 'Forms',
  email: 'Email',
  migration: 'Migration',
  advisory: 'Advisory',
  nonBillable: 'Non-billable',
  website: 'Website',
  scripts: 'Scripts',
};

/**
 * Type definitions
 */
export interface CategoryData {
  support: number;
  hosting: number;
  forms: number;
  email: number;
  migration: number;
  advisory: number;
  nonBillable: number;
  website: number;
  scripts: number;
  total: number;
}

export interface CategoryDistributionChartProps {
  /** Category data to display */
  categoryData: CategoryData;
  /** Optional custom title */
  title?: string;
  /** Optional custom description */
  description?: string;
}

export function CategoryDistributionChart({
  categoryData,
  title = 'Category Distribution',
  description = 'Ticket volume by category',
}: CategoryDistributionChartProps) {
  // Transform data for chart
  const categoryKeys = Object.keys(CATEGORY_NAMES) as Array<keyof typeof CATEGORY_NAMES>;
  const chartData = categoryKeys
    .map(key => ({
      name: CATEGORY_NAMES[key],
      count: categoryData[key],
      key: key,
    }))
    .filter(item => item.count > 0)  // Only show categories with data
    .sort((a, b) => b.count - a.count);  // Sort by count descending

  // Calculate max value for Y-axis (add 10% padding)
  const maxValue = Math.max(...chartData.map(d => d.count));
  const yAxisMax = Math.ceil(maxValue * 1.1);

  return (
    <Card className="w-full flex flex-col h-full">
      <CardHeader className="pb-3">
        <CardTitle>{title}</CardTitle>
        <CardDescription className="text-xs mt-1">
          {description}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col">
        <div className="w-full h-full min-h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid {...CHART_STYLES.cartesianGrid} />
              <XAxis
                dataKey="name"
                {...CHART_STYLES.xAxis}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis
                domain={[0, yAxisMax]}
                allowDecimals={false}
                {...CHART_STYLES.yAxis}
              />
              <Tooltip
                cursor={false}
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    const percentage = categoryData.total > 0
                      ? ((data.count / categoryData.total) * 100).toFixed(1)
                      : '0.0';

                    return (
                      <div style={CHART_STYLES.tooltipContainer}>
                        <p style={CHART_STYLES.tooltipTitle}>{data.name}</p>
                        <p style={{ ...CHART_STYLES.tooltipItem, color: '#374151' }}>
                          Count: {data.count}
                        </p>
                        <p style={{ ...CHART_STYLES.tooltipItem, color: '#374151' }}>
                          Percentage: {percentage}%
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="count" name="Tickets">
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={CATEGORY_COLORS[entry.key]}
                  />
                ))}
                <LabelList
                  dataKey="count"
                  position="top"
                  style={{ fontSize: '12px', fontWeight: 'bold', fill: '#374151' }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
