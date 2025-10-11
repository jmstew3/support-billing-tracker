import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { useMemo } from 'react';
import type { CategoryCount } from '../../types/request';

interface CategoryPieChartProps {
  data: CategoryCount[];
}

// Helper function to get CSS variable value
const getCSSVariableValue = (variableName: string) => {
  if (typeof window === 'undefined') return '';
  return getComputedStyle(document.documentElement).getPropertyValue(variableName).trim();
};

// Get colors - using black/grey shades for monochrome design
const getCategoryColors = (): Record<string, string> => ({
  'Support': '#000000',      // Black (darkest)
  'Hosting': '#1f2937',      // Gray-800
  'Forms': '#9ca3af',        // Gray-400
  'Billing': '#4b5563',      // Gray-600
  'Email': '#6b7280',        // Gray-500
  'Migration': '#374151',    // Gray-700
  'Non-billable': '#d1d5db', // Gray-300
  'Advisory': '#e5e7eb',     // Gray-200
  'Website': '#f3f4f6',      // Gray-100
  'Scripts': '#EAB308'       // Yellow
});

// All possible categories in order
const ALL_CATEGORIES = ['Support', 'Hosting', 'Forms', 'Billing', 'Email', 'Migration', 'Non-billable', 'Advisory', 'Website', 'Scripts'];

export function CategoryPieChart({ data }: CategoryPieChartProps) {
  // Get theme-aware colors
  const CATEGORY_COLORS = useMemo(() => getCategoryColors(), []);

  // Ensure data includes all categories with proper colors
  const completeData = ALL_CATEGORIES.map(category => {
    const existingData = data.find(d => d.name === category);
    return existingData || { name: category, value: 0, percentage: 0 };
  }).filter(item => item.value > 0); // Only show categories with data

  // Calculate total for percentage calculation
  const total = completeData.reduce((sum, entry) => sum + entry.value, 0);

  // Custom label with better positioning
  const renderCustomizedLabel = ({
    cx, cy, midAngle, innerRadius, outerRadius, name, value
  }: any) => {
    const percentage = ((value / total) * 100).toFixed(1);

    // Only show label if percentage is significant
    if (parseFloat(percentage) < 1) {
      return null;
    }

    const RADIAN = Math.PI / 180;
    // Position labels closer to the end of label lines
    const radius = innerRadius + (outerRadius - innerRadius) * 1.3;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    // Add slight offset for text based on position (left or right side)
    const xOffset = x > cx ? 3 : -3;

    return (
      <text
        x={x + xOffset}
        y={y}
        fill="#374151"
        textAnchor={x > cx ? 'start' : 'end'}
        dominantBaseline="central"
        className="text-xs font-medium"
        style={{ userSelect: 'none' }}
      >
        {`${name} (${percentage}%)`}
      </text>
    );
  };

  return (
    <div className="w-full min-h-[300px] h-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={completeData as any}
            cx="50%"
            cy="50%"
            labelLine={{
              stroke: '#94a3b8',
              strokeWidth: 1,
              strokeDasharray: '0',
            }}
            label={renderCustomizedLabel}
            outerRadius={100}
            fill="#8884d8"
            dataKey="value"
          >
            {completeData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[entry.name] || '#cccccc'} />
            ))}
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
      </ResponsiveContainer>
    </div>
  );
}
