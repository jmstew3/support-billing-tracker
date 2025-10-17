import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LabelList,
  Cell,
} from 'recharts';
import { CHART_STYLES } from '../base/DataTrackerCard';
import { ToggleGroup } from '../ui/toggle-group';
import { CustomCategoryTick } from './CustomAxisTicks';

/**
 * CategoryDistributionChart - Category visualization with bar/pie chart toggle
 *
 * Purpose: Quick visual summary of which categories receive the most tickets
 * Layout: Toggle between horizontal bar chart and pie chart
 * Style: Inherits styling from CategoryTrackerCard
 *
 * Features:
 * - Bar/Pie chart toggle for different visualization styles
 * - Sorted by count descending (busiest categories first)
 * - Only shows categories with non-zero counts
 * - Color-coded bars/slices matching CategoryTrackerCard palette
 * - Tooltip with count and percentage
 * - Bar labels on end, pie labels with percentages
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
  /** Initial chart type (default: 'bar') */
  initialChartType?: 'pie' | 'bar';
}

export function CategoryDistributionChart({
  categoryData,
  title = 'Category Distribution',
  description = 'Ticket volume by category',
  initialChartType = 'bar',
}: CategoryDistributionChartProps) {
  // Chart type state
  const [chartType, setChartType] = useState<'pie' | 'bar'>(initialChartType);
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

  // Calculate max value for X-axis (add 10% padding)
  const maxValue = Math.max(...chartData.map(d => d.count));
  const xAxisMax = Math.ceil(maxValue * 1.1);

  // Transform data for pie chart (CategoryCount[] format)
  const pieChartData = chartData.map(item => ({
    name: item.name,
    value: item.count,
    percentage: categoryData.total > 0
      ? Math.round((item.count / categoryData.total) * 100)
      : 0,
  }));

  return (
    <Card className="w-full flex flex-col h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription className="text-xs mt-1">
              {description}
            </CardDescription>
          </div>
          <ToggleGroup
            options={[
              { value: 'bar', label: 'Bar' },
              { value: 'pie', label: 'Pie' }
            ]}
            value={chartType}
            onValueChange={(value) => setChartType(value as 'pie' | 'bar')}
            size="sm"
          />
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col">
        <div className="w-full h-[500px]">
          <ResponsiveContainer width="100%" height={500}>
            {chartType === 'bar' ? (
              <BarChart
                data={chartData}
                layout="horizontal"
                margin={{ top: 20, right: 30, left: 10, bottom: 20 }}
              >
                <CartesianGrid {...CHART_STYLES.cartesianGrid} />
                <XAxis
                  type="category"
                  dataKey="name"
                  tick={<CustomCategoryTick maxCharsPerLine={10} />}
                  height={120}
                  interval={0}
                />
                <YAxis
                  type="number"
                  domain={[0, xAxisMax]}
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
                    style={{ fontSize: '16px', fontWeight: 'bold', fill: '#374151' }}
                  />
                </Bar>
              </BarChart>
            ) : (
              <PieChart>
                <Pie
                  data={pieChartData}
                  cx="50%"
                  cy="50%"
                  outerRadius="80%"
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percentage }) => `${name} (${percentage}%)`}
                >
                  {pieChartData.map((entry, index) => {
                    // Find matching color for this category
                    const categoryKey = Object.keys(CATEGORY_NAMES).find(
                      key => CATEGORY_NAMES[key as keyof typeof CATEGORY_NAMES] === entry.name
                    ) as keyof typeof CATEGORY_COLORS;

                    return (
                      <Cell
                        key={`cell-${index}`}
                        fill={CATEGORY_COLORS[categoryKey] || '#9CA3AF'}
                      />
                    );
                  })}
                </Pie>
                <Tooltip
                  formatter={(value: number, name: string) => [`${value} requests`, name]}
                  contentStyle={{
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    border: '1px solid #e5e7eb',
                    borderRadius: '6px',
                    padding: '8px 12px'
                  }}
                />
              </PieChart>
            )}
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
