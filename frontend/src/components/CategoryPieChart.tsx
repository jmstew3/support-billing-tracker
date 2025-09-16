import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import type { CategoryCount } from '../types/request';

interface CategoryPieChartProps {
  data: CategoryCount[];
}

// Define consistent colors for each category
const CATEGORY_COLORS: { [key: string]: string } = {
  'Support': '#8884d8',
  'Hosting': '#82ca9d',
  'Forms': '#ffc658',
  'Billing': '#ff7c7c',
  'Email': '#8dd1e1',
  'Migration': '#d084d0',
  'Non-billable': '#ffb347',
  'Advisory': '#87ceeb',
  'General': '#98d8c8'
};

// All possible categories in order
const ALL_CATEGORIES = ['Support', 'Hosting', 'Forms', 'Billing', 'Email', 'Migration', 'Non-billable', 'Advisory', 'General'];

export function CategoryPieChart({ data }: CategoryPieChartProps) {
  // Ensure data includes all categories with proper colors
  const completeData = ALL_CATEGORIES.map(category => {
    const existingData = data.find(d => d.name === category);
    return existingData || { name: category, value: 0, percentage: 0 };
  }).filter(item => item.value > 0); // Only show categories with data

  // Calculate total for percentage calculation
  const total = completeData.reduce((sum, entry) => sum + entry.value, 0);

  // Custom label with better positioning
  const renderCustomizedLabel = ({
    cx, cy, midAngle, innerRadius, outerRadius, name, value, index
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
    <ResponsiveContainer width="100%" height={400}>
      <PieChart>
        <Pie
          data={completeData}
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
  );
}
