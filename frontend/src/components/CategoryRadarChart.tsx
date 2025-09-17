import React from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from 'recharts';

interface CategoryRadarChartProps {
  data: Array<{ name: string; value: number }>;
}

const CategoryRadarChart: React.FC<CategoryRadarChartProps> = ({ data }) => {
  // Transform data for radar chart - ensure we have values for all categories
  const categories = ['Non-billable', 'Support', 'Advisory', 'Forms', 'Hosting', 'Billing', 'Email', 'General', 'Migration'];

  const radarData = categories.map(category => {
    const item = data.find(d => d.name === category);
    return {
      category,
      value: item ? item.value : 0,
      fullMark: Math.max(...data.map(d => d.value), 1) // Use max value for scale
    };
  });

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload[0]) {
      return (
        <div className="bg-white p-2 border rounded shadow-lg">
          <p className="font-semibold">{payload[0].payload.category}</p>
          <p className="text-sm">{`Requests: ${payload[0].value}`}</p>
          <p className="text-xs text-gray-500">
            {`${((payload[0].value / data.reduce((acc, item) => acc + item.value, 0)) * 100).toFixed(1)}%`}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full h-full">
      <h3 className="text-lg font-semibold mb-2">Request Categories Distribution</h3>
      <ResponsiveContainer width="100%" height={320}>
        <RadarChart data={radarData}>
          <PolarGrid
            stroke="#e5e7eb"
            strokeWidth={1}
            radialLines={true}
          />
          <PolarAngleAxis
            dataKey="category"
            tick={{ fontSize: 12 }}
            className="text-gray-600"
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 'dataMax']}
            tick={{ fontSize: 10 }}
            tickCount={5}
            axisLine={false}
          />
          <Radar
            name="Requests"
            dataKey="value"
            stroke="#3b82f6"
            strokeWidth={2}
            fill="#3b82f6"
            fillOpacity={0.4}
            animationDuration={800}
            animationEasing="ease-in-out"
          />
          <Tooltip content={<CustomTooltip />} />
        </RadarChart>
      </ResponsiveContainer>
      <div className="mt-2 text-xs text-gray-500 text-center">
        Total Requests: {data.reduce((acc, item) => acc + item.value, 0)}
      </div>
    </div>
  );
};

export default CategoryRadarChart;