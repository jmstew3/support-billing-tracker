import { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { formatCurrency, convertMicrosToDollars } from '../../services/projectsApi';
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

// Category colors using CSS variables
const CATEGORY_COLORS: Record<string, string> = {
  MIGRATION: 'hsl(217, 91%, 60%)',      // Blue
  LANDING_PAGE: 'hsl(142, 76%, 36%)',   // Green
  WEBSITE: 'hsl(45, 93%, 47%)',         // Yellow
  MULTI_FORM: 'hsl(27, 87%, 67%)',      // Orange
  BASIC_FORM: 'hsl(262, 52%, 47%)',     // Purple
};

export function ProjectRevenueChart({ monthlyBreakdown }: ProjectRevenueChartProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('category');

  // Sort data chronologically (oldest first)
  const sortedData = [...monthlyBreakdown].sort((a, b) => a.month.localeCompare(b.month));

  // Format month for display (e.g., "Jun 2025")
  function formatMonthLabel(monthStr: string) {
    const [year, month] = monthStr.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  }

  // Transform data for category view (stacked bars)
  const categoryData = sortedData.map((monthData) => {
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

    // Add total for reference
    categories.total = monthData.revenue;

    return categories;
  });

  // Transform data for monthly view (simple bars)
  const monthlyData = sortedData.map((monthData) => ({
    month: formatMonthLabel(monthData.month),
    monthKey: monthData.month,
    revenue: monthData.revenue,
    projectCount: monthData.projectCount,
  }));

  // Calculate max Y-axis value (round up to nearest $5k)
  const maxRevenue = Math.max(...sortedData.map((m) => m.revenue));
  const maxYAxis = Math.ceil(maxRevenue / 5000) * 5000;

  // Custom tooltip for category view
  const CategoryTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;

      // Filter out categories with 0 value
      const nonZeroCategories = payload.filter((entry: any) => entry.value > 0);

      return (
        <div className="border bg-card p-3 text-sm">
          <p className="font-semibold mb-2">{data.month}</p>
          {nonZeroCategories.map((entry: any) => (
            <div key={entry.dataKey} className="flex items-center justify-between gap-4 mb-1">
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3"
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-xs text-muted-foreground">
                  {CATEGORY_LABELS[entry.dataKey]}:
                </span>
              </div>
              <span className="text-xs font-medium text-foreground">
                {formatCurrency(entry.value)}
              </span>
            </div>
          ))}
          <div className="mt-2 pt-2 border-t">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground">Total:</span>
              <span className="text-xs font-semibold text-foreground">
                {formatCurrency(data.total)}
              </span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  // Custom tooltip for monthly view
  const MonthlyTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="border bg-card p-3 text-sm">
          <p className="font-semibold mb-2">{data.month}</p>
          <div className="flex items-center justify-between gap-4 mb-1">
            <span className="text-xs text-muted-foreground">Revenue:</span>
            <span className="text-xs font-medium text-foreground">
              {formatCurrency(data.revenue)}
            </span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-xs text-muted-foreground">Projects:</span>
            <span className="text-xs font-medium text-foreground">
              {data.projectCount}
            </span>
          </div>
        </div>
      );
    }
    return null;
  };

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

      <ResponsiveContainer width="100%" height={250}>
        {viewMode === 'category' ? (
          <BarChart data={categoryData} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="0" stroke="hsl(var(--border))" vertical={false} />
            <XAxis
              dataKey="month"
              stroke="hsl(var(--muted-foreground))"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: 'hsl(var(--border))' }}
            />
            <YAxis
              stroke="hsl(var(--muted-foreground))"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: 'hsl(var(--border))' }}
              domain={[0, maxYAxis]}
              tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
            />
            <Tooltip
              content={<CategoryTooltip />}
              cursor={{ fill: 'hsl(var(--muted))', opacity: 0.3 }}
            />
            <Legend
              wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
              iconType="square"
              iconSize={10}
              formatter={(value) => CATEGORY_LABELS[value] || value}
            />
            {Object.keys(CATEGORY_LABELS).map((category) => (
              <Bar
                key={category}
                dataKey={category}
                stackId="revenue"
                fill={CATEGORY_COLORS[category]}
                name={category}
              />
            ))}
          </BarChart>
        ) : (
          <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="0" stroke="hsl(var(--border))" vertical={false} />
            <XAxis
              dataKey="month"
              stroke="hsl(var(--muted-foreground))"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: 'hsl(var(--border))' }}
            />
            <YAxis
              stroke="hsl(var(--muted-foreground))"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: 'hsl(var(--border))' }}
              domain={[0, maxYAxis]}
              tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
            />
            <Tooltip
              content={<MonthlyTooltip />}
              cursor={{ fill: 'hsl(var(--muted))', opacity: 0.3 }}
            />
            <Bar
              dataKey="revenue"
              fill="hsl(var(--foreground))"
              name="Revenue"
            />
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}
