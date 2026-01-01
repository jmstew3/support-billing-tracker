/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react';
import { BaseBarChart } from './BaseBarChart';
import { ProjectRevenueTooltip } from './tooltips/ProjectRevenueTooltip';
import { CATEGORY_COLORS } from '../../config/chartConfig';
import { useChartData, calculateYAxisDomain } from '../../utils/chartHelpers';
import { convertMicrosToDollars } from '../../services/projectsApi';
import type { Project } from '../../types/project';

interface ProjectRevenueChartProps {
  monthlyBreakdown: Array<{
    month: string; // YYYY-MM format
    revenue: number;
    projects: Project[];
    projectCount: number;
  }>;
}

type ViewMode = 'category' | 'monthly';

// Category display names
const CATEGORY_LABELS: Record<string, string> = {
  MIGRATION: 'Migration',
  LANDING_PAGE: 'Landing Page',
  WEBSITE: 'Website',
  MULTI_FORM: 'Multi-Form',
  BASIC_FORM: 'Basic Form',
};

/**
 * ProjectRevenueChart - Displays project revenue with category breakdown
 *
 * Supports two view modes:
 * - Category: Stacked bars showing revenue by project category
 * - Monthly: Simple bars showing total revenue per month
 *
 * Uses BaseBarChart with custom ProjectRevenueTooltip for both views.
 */
export function ProjectRevenueChart({ monthlyBreakdown }: ProjectRevenueChartProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('category');

  // Format month for display (e.g., "Jun 2025")
  const formatMonthLabel = (monthStr: string) => {
    const [year, month] = monthStr.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };

  // Transform data for category view (stacked bars)
  const categoryData = useChartData(monthlyBreakdown, (data) => {
    // Sort chronologically
    const sorted = [...data].sort((a, b) => a.month.localeCompare(b.month));

    return sorted.map((monthData) => {
      const categories: Record<string, any> = {
        month: formatMonthLabel(monthData.month),
        monthKey: monthData.month,
      };

      // Initialize all categories to 0
      Object.keys(CATEGORY_LABELS).forEach((cat) => {
        categories[cat] = 0;
      });

      // Sum revenue by category
      monthData.projects.forEach((project) => {
        const revenue = convertMicrosToDollars(project.revenueAmount.amountMicros);
        categories[project.projectCategory] = (categories[project.projectCategory] || 0) + revenue;
      });

      // Add total for tooltip
      categories.total = monthData.revenue;

      return categories;
    });
  });

  // Transform data for monthly view (simple bars)
  const monthlyData = useChartData(monthlyBreakdown, (data) => {
    const sorted = [...data].sort((a, b) => a.month.localeCompare(b.month));

    return sorted.map((monthData) => ({
      month: formatMonthLabel(monthData.month),
      monthKey: monthData.month,
      revenue: monthData.revenue,
      projectCount: monthData.projectCount,
    }));
  });

  // Calculate Y-axis domain (round to nearest $5k)
  const maxRevenue = Math.max(...monthlyBreakdown.map((m) => m.revenue));
  const [, yMax] = calculateYAxisDomain([maxRevenue], 5000);

  return (
    <div className="border bg-card p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-md font-semibold mb-1">
            {viewMode === 'category' ? 'Revenue by Category' : 'Monthly Revenue'}
          </h3>
          <p className="text-xs text-muted-foreground">
            {viewMode === 'category'
              ? 'Project revenue breakdown by category per month'
              : 'Total project revenue per month'}
          </p>
        </div>

        {/* Toggle Buttons */}
        <div className="flex border">
          <button
            onClick={() => setViewMode('category')}
            className={`px-3 py-1.5 text-xs font-medium transition-colors ${
              viewMode === 'category'
                ? 'bg-muted text-foreground'
                : 'bg-transparent text-muted-foreground hover:bg-muted/50'
            }`}
          >
            By Category
          </button>
          <button
            onClick={() => setViewMode('monthly')}
            className={`px-3 py-1.5 text-xs font-medium transition-colors border-l ${
              viewMode === 'monthly'
                ? 'bg-muted text-foreground'
                : 'bg-transparent text-muted-foreground hover:bg-muted/50'
            }`}
          >
            Monthly Totals
          </button>
        </div>
      </div>

      <div style={{ width: '100%', height: 300 }}>
        {viewMode === 'category' ? (
          <BaseBarChart
            data={categoryData}
            bars={Object.keys(CATEGORY_LABELS).map((category) => ({
              dataKey: category,
              name: category,
              fill: CATEGORY_COLORS[category as keyof typeof CATEGORY_COLORS],
              stackId: 'revenue',
            }))}
            xAxisKey="month"
            yAxisConfig={{
              domain: [0, yMax],
              formatter: (value) => `$${(value / 1000).toFixed(0)}k`,
            }}
            height={300}
            margin={{ top: 10, right: 10, left: 10, bottom: 5 }}
            showLegend={true}
            customTooltip={(props) => (
              <ProjectRevenueTooltip {...props} categoryLabels={CATEGORY_LABELS} />
            )}
          />
        ) : (
          <BaseBarChart
            data={monthlyData}
            bars={[
              {
                dataKey: 'revenue',
                name: 'Revenue',
                fill: 'hsl(var(--foreground))',
              },
            ]}
            xAxisKey="month"
            yAxisConfig={{
              domain: [0, yMax],
              formatter: (value) => `$${(value / 1000).toFixed(0)}k`,
            }}
            height={300}
            margin={{ top: 10, right: 10, left: 10, bottom: 5 }}
            showLegend={false}
            customTooltip={ProjectRevenueTooltip}
          />
        )}
      </div>
    </div>
  );
}
