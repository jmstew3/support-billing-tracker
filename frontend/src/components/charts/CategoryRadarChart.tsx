import React, { useMemo } from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip, Legend } from 'recharts';

interface CategoryData {
  name: string;
  value: number;
  urgencyHigh?: number;
  urgencyMedium?: number;
  urgencyLow?: number;
  avgEffort?: number;
}

interface CategoryRadarChartProps {
  data: Array<CategoryData>;
  multiDimensional?: boolean;
}

const CategoryRadarChart: React.FC<CategoryRadarChartProps> = ({ data, multiDimensional = false }) => {
  // Define categories
  const categories = useMemo(() =>
    ['Non-billable', 'Support', 'Advisory', 'Forms', 'Hosting', 'Billing', 'Email', 'Website', 'Scripts', 'Migration'],
    []
  );

  // Memoize data transformation
  const { radarData, total, domainMax, ticks } = useMemo(() => {
    const max = Math.max(...data.map(d => d.value), 1);
    const totalRequests = data.reduce((acc, item) => acc + item.value, 0);

    // Calculate domain max and tick increment based on data size
    const calculateDomainAndTicks = (value: number) => {
      if (value <= 0) return { domainMax: 50, tickIncrement: 10 };

      // Determine appropriate increment based on max value
      let tickIncrement: number;
      let domainMax: number;

      if (value <= 10) {
        tickIncrement = 2;
        domainMax = Math.ceil(value / 2) * 2;
      } else if (value <= 25) {
        tickIncrement = 5;
        domainMax = Math.ceil(value / 5) * 5;
      } else if (value <= 50) {
        tickIncrement = 10;
        domainMax = Math.ceil(value / 10) * 10;
      } else if (value <= 100) {
        tickIncrement = 20;
        domainMax = Math.ceil(value / 20) * 20;
      } else {
        tickIncrement = 50;
        const remainder = value % 50;
        domainMax = remainder === 0 ? value : value + (50 - remainder);
      }

      return { domainMax, tickIncrement };
    };

    const { domainMax: calculatedDomainMax, tickIncrement } = calculateDomainAndTicks(max);

    // Generate tick values with appropriate increment
    const tickValues = [];
    for (let i = 0; i <= calculatedDomainMax; i += tickIncrement) {
      tickValues.push(i);
    }

    const transformed = categories.map(category => {
      const item = data.find(d => d.name === category);
      if (multiDimensional && item) {
        // For multi-dimensional view, normalize values to 0-100 scale
        const maxRequests = Math.max(...data.map(d => d.value), 1);
        return {
          category,
          volume: item.value ? (item.value / maxRequests) * 100 : 0,
          urgencyScore: item.urgencyHigh ?
            ((item.urgencyHigh * 3 + (item.urgencyMedium || 0) * 2 + (item.urgencyLow || 0)) / Math.max(item.value, 1)) * 33 : 0,
          complexity: item.avgEffort ? item.avgEffort * 100 : 0
        };
      }
      return {
        category,
        value: item ? item.value : 0
      };
    });

    return {
      radarData: transformed,
      total: totalRequests,
      domainMax: calculatedDomainMax,
      ticks: tickValues
    };
  }, [data, categories, multiDimensional]);

  // Custom tooltip with multi-dimensional support
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload[0]) {
      const categoryData = payload[0].payload;
      if (multiDimensional) {
        return (
          <div className="bg-white p-3 border rounded shadow-lg">
            <p className="font-semibold mb-1">{categoryData.category}</p>
            {payload.map((entry: any, index: number) => (
              <p key={index} className="text-sm" style={{ color: entry.color }}>
                {entry.name}: {entry.value.toFixed(1)}%
              </p>
            ))}
          </div>
        );
      } else {
        const percentage = total > 0 ? (categoryData.value / total * 100).toFixed(1) : '0.0';
        return (
          <div className="bg-white p-2 border rounded shadow-lg">
            <p className="font-semibold">{categoryData.category}</p>
            <p className="text-sm">{`Requests: ${categoryData.value}`}</p>
            <p className="text-xs text-gray-500">{`${percentage}%`}</p>
          </div>
        );
      }
    }
    return null;
  };

  if (multiDimensional) {
    // Multi-dimensional radar chart
    return (
      <div className="w-full h-full">
        <ResponsiveContainer width="100%" height={320}>
          <RadarChart data={radarData}>
            <PolarGrid
              stroke="#e5e7eb"
              strokeWidth={1}
              radialLines={true}
            />
            <PolarAngleAxis
              dataKey="category"
              tick={{ fontSize: 11 }}
              className="text-gray-600"
            />
            <PolarRadiusAxis
              angle={90}
              domain={[0, 100]}
              tick={{ fontSize: 10 }}
              tickCount={5}
              axisLine={false}
            />
            <Radar
              name="Volume"
              dataKey="volume"
              stroke="#000000"
              strokeWidth={2}
              fill="#000000"
              fillOpacity={0.2}
              animationDuration={800}
            />
            <Radar
              name="Urgency"
              dataKey="urgencyScore"
              stroke="#374151"
              strokeWidth={2}
              fill="#374151"
              fillOpacity={0.2}
              animationDuration={800}
            />
            <Radar
              name="Complexity"
              dataKey="complexity"
              stroke="#6B7280"
              strokeWidth={2}
              fill="#6B7280"
              fillOpacity={0.2}
              animationDuration={800}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ fontSize: '12px' }}
              iconType="circle"
            />
          </RadarChart>
        </ResponsiveContainer>
        <div className="mt-2 text-xs text-gray-500 text-center">
          Multi-Dimensional Analysis • Total Requests: {total}
        </div>
      </div>
    );
  }

  // Single-dimensional radar chart with category colors
  return (
    <div className="w-full h-full">
      <ResponsiveContainer width="100%" height={320}>
        <RadarChart data={radarData}>
          <PolarGrid
            stroke="#e5e7eb"
            strokeWidth={1}
            radialLines={true}
          />
          <PolarAngleAxis
            dataKey="category"
            tick={{ fontSize: 11 }}
            className="text-gray-600"
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, domainMax]}
            tick={{ fontSize: 10 }}
            ticks={ticks as any}
            axisLine={false}
          />
          <Radar
            name="Requests"
            dataKey="value"
            stroke="#374151"
            strokeWidth={2}
            fill="#374151"
            fillOpacity={0.35}
            animationDuration={800}
            animationEasing="ease-in-out"
          />
          <Tooltip content={<CustomTooltip />} />
        </RadarChart>
      </ResponsiveContainer>
      <div className="mt-2 text-xs text-gray-500 text-center">
        Total Requests: {total}
      </div>
    </div>
  );
};

export default CategoryRadarChart;