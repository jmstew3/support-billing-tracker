import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { useMemo } from 'react';
import type { Project } from '../../types/project';

interface ProjectCategoryPieChartProps {
  projects: Project[];
}

// Project category colors (monochrome grayscale theme - 0% saturation, sharp edges)
const CATEGORY_COLORS: Record<string, string> = {
  'MIGRATION': '#000000',   // pure black (darkest)
  'LANDING_PAGE': '#1f2937', // gray-800 (very dark)
  'WEBSITE': '#4b5563',     // gray-600 (medium)
  'MULTI_FORM': '#6b7280',  // gray-500 (medium-light)
  'BASIC_FORM': '#9ca3af',  // gray-400 (lighter)
};

export function ProjectCategoryPieChart({ projects }: ProjectCategoryPieChartProps) {
  // Calculate category counts and revenue
  const categoryData = useMemo(() => {
    const counts: Record<string, { count: number; revenue: number }> = {
      'MIGRATION': { count: 0, revenue: 0 },
      'LANDING_PAGE': { count: 0, revenue: 0 },
      'WEBSITE': { count: 0, revenue: 0 },
      'MULTI_FORM': { count: 0, revenue: 0 },
      'BASIC_FORM': { count: 0, revenue: 0 },
    };

    projects.forEach(project => {
      const category = project.projectCategory || 'WEBSITE';
      if (counts[category]) {
        counts[category].count++;
        const revenue = parseInt(project.revenueAmount.amountMicros, 10) / 1_000_000;
        counts[category].revenue += revenue;
      }
    });

    // Convert to chart data format
    return Object.entries(counts)
      .filter(([_, data]) => data.count > 0)
      .map(([category, data]) => ({
        name: formatCategoryName(category),
        value: data.count,
        revenue: data.revenue,
        category: category,
      }));
  }, [projects]);

  const total = categoryData.reduce((sum, entry) => sum + entry.value, 0);

  // Format category name for display
  function formatCategoryName(category: string): string {
    switch (category) {
      case 'LANDING_PAGE':
        return 'Landing Pages';
      case 'MIGRATION':
        return 'Migrations';
      case 'WEBSITE':
        return 'Websites';
      case 'MULTI_FORM':
        return 'Multi-Forms';
      case 'BASIC_FORM':
        return 'Basic Forms';
      default:
        return category;
    }
  }

  // Custom label
  const renderCustomizedLabel = ({
    cx, cy, midAngle, innerRadius, outerRadius, name, value
  }: any) => {
    const percentage = ((value / total) * 100).toFixed(1);

    // Only show label if percentage >= 5%
    if (parseFloat(percentage) < 5) {
      return null;
    }

    const RADIAN = Math.PI / 180;
    const radius = outerRadius + 30;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    // Determine text anchor based on position
    const textAnchor = x > cx ? 'start' : 'end';

    return (
      <g>
        {/* Callout line */}
        <line
          x1={cx + (outerRadius + 5) * Math.cos(-midAngle * RADIAN)}
          y1={cy + (outerRadius + 5) * Math.sin(-midAngle * RADIAN)}
          x2={x}
          y2={y}
          stroke="hsl(var(--muted-foreground))"
          strokeWidth={1}
          opacity={0.5}
        />
        {/* Label text */}
        <text
          x={x}
          y={y}
          fill="hsl(var(--foreground))"
          textAnchor={textAnchor}
          dominantBaseline="central"
          className="text-xs font-medium"
        >
          {`${name} (${value})`}
        </text>
        <text
          x={x}
          y={y + 14}
          fill="hsl(var(--muted-foreground))"
          textAnchor={textAnchor}
          dominantBaseline="central"
          className="text-[10px]"
        >
          {`${percentage}%`}
        </text>
      </g>
    );
  };

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-background border border-border p-3 shadow-lg">
          <p className="font-semibold text-sm mb-1">{data.name}</p>
          <p className="text-xs text-muted-foreground">
            {data.value} {data.value === 1 ? 'project' : 'projects'}
          </p>
          <p className="text-xs text-muted-foreground">
            ${data.revenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
      );
    }
    return null;
  };

  if (categoryData.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
        No category data available
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={categoryData}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={renderCustomizedLabel}
          outerRadius={80}
          dataKey="value"
          animationBegin={0}
          animationDuration={800}
        >
          {categoryData.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={CATEGORY_COLORS[entry.category] || '#64748b'}
            />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
      </PieChart>
    </ResponsiveContainer>
  );
}
