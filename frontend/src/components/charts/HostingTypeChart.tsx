/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMemo } from 'react';
import { BaseBarChart } from './BaseBarChart';
import { HOSTING_COLORS } from '../../config/chartConfig';
import { calculateYAxisDomain } from '../../utils/chartHelpers';

interface HostingTypeChartProps {
  data: Array<{
    month: string; // YYYY-MM format
    websites: number;
    landingPages: number;
  }>;
}

/**
 * HostingTypeChart - Displays distribution of hosting types
 *
 * Shows total count of websites vs landing pages across all months.
 * Uses BaseBarChart with custom colors per bar (Cell-based approach).
 */
export function HostingTypeChart({ data }: HostingTypeChartProps) {
  // Calculate totals and prepare chart data
  const chartData = useMemo(() => {
    // Sort data chronologically (oldest first)
    const sortedData = [...data].sort((a, b) => a.month.localeCompare(b.month));

    // Calculate totals
    const totalWebsites = sortedData.reduce((sum, item) => sum + item.websites, 0);
    const totalLandingPages = sortedData.reduce((sum, item) => sum + item.landingPages, 0);

    return [
      {
        name: 'Websites',
        value: totalWebsites,
      },
      {
        name: 'Landing Pages',
        value: totalLandingPages,
      },
    ];
  }, [data]);

  // Calculate Y-axis domain (round to nearest 10)
  const maxValue = Math.max(...chartData.map(d => d.value));
  const [, yMax] = calculateYAxisDomain([maxValue], 10);

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="border bg-card p-3 text-sm shadow-lg">
          <p className="font-semibold mb-1">{data.name}</p>
          <p className="text-xs text-muted-foreground">
            Total: <span className="font-medium text-foreground">{data.value}</span>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="border bg-card p-6">
      <div className="mb-4">
        <h3 className="text-md font-semibold mb-1">Hosting Type Distribution</h3>
        <p className="text-xs text-muted-foreground">
          Total websites vs landing pages
        </p>
      </div>
      <BaseBarChart
        data={chartData}
        bars={[
          {
            dataKey: 'value',
            name: 'Count',
            fill: HOSTING_COLORS.websites, // Default color (will be overridden by Cell logic if needed)
          },
        ]}
        xAxisKey="name"
        yAxisConfig={{
          domain: [0, yMax],
          allowDecimals: false,
        }}
        height={250}
        margin={{ top: 10, right: 10, left: -20, bottom: 5 }}
        showLegend={false}
        customTooltip={CustomTooltip}
      />
    </div>
  );
}
