import { useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import { BaseBarChart } from './BaseBarChart';
import { URGENCY_COLORS } from '../../config/chartConfig';
import type { DailyRequestCount } from '../../types/request';

interface RequestBarChartProps {
  data: DailyRequestCount[];
  isHourlyView?: boolean;
}

/**
 * RequestBarChart - Displays request counts by urgency level
 *
 * Uses BaseBarChart with urgency color palette. Supports both daily and hourly views
 * with appropriate date formatting.
 *
 * @param data - Daily or hourly request counts with urgency breakdown
 * @param isHourlyView - True for hourly format, false for daily format
 */
export function RequestBarChart({ data, isHourlyView = false }: RequestBarChartProps) {
  // Format dates based on view mode
  const formattedData = useMemo(() => {
    return data.map(item => {
      if (isHourlyView) {
        // Hourly data already in format "07:00"
        return {
          ...item,
          date: item.date
        };
      } else {
        // Format daily dates as "Wed, Jan 15"
        try {
          return {
            ...item,
            date: format(parseISO(item.date), 'EEE, MMM dd')
          };
        } catch {
          // If date parsing fails, use original
          return {
            ...item,
            date: item.date
          };
        }
      }
    });
  }, [data, isHourlyView]);

  return (
    <div className="w-full min-h-[300px] sm:min-h-[350px] h-full">
      <BaseBarChart
        data={formattedData}
        bars={[
          { dataKey: 'low', name: 'Low Priority', fill: URGENCY_COLORS.low, stackId: 'urgency' },
          { dataKey: 'medium', name: 'Medium Priority', fill: URGENCY_COLORS.medium, stackId: 'urgency' },
          { dataKey: 'high', name: 'High Priority', fill: URGENCY_COLORS.high, stackId: 'urgency' },
        ]}
        xAxisKey="date"
        xAxisConfig={{
          angle: -45,
          height: 80,
          interval: 0,
        }}
        yAxisConfig={{
          allowDecimals: false,
          tickCount: 6,
        }}
        height="standard"
        margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
        showLegend={true}
      />
    </div>
  );
}
