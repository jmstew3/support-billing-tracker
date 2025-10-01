import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { DailyRequestCount } from '../types/request';
import { format, parseISO } from 'date-fns';

interface RequestBarChartProps {
  data: DailyRequestCount[];
  isHourlyView?: boolean;
}

export function RequestBarChart({ data, isHourlyView = false }: RequestBarChartProps) {
  const formattedData = data.map(item => {
    if (isHourlyView) {
      // For hourly data, item.date is already in format "07:00"
      return {
        ...item,
        date: item.date
      };
    } else {
      // For daily data, format the date
      try {
        return {
          ...item,
          date: format(parseISO(item.date), 'EEE, MMM dd')
        };
      } catch (error) {
        // If date parsing fails, use original
        return {
          ...item,
          date: item.date
        };
      }
    }
  });

  return (
    <div className="w-full min-h-[300px] sm:min-h-[350px] h-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={formattedData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
          <XAxis
            dataKey="date"
            angle={-45}
            textAnchor="end"
            height={80}
            interval={0}
            tick={{ fontSize: 10 }}
            className="text-xs sm:text-sm"
          />
          <YAxis
            allowDecimals={false}
            tickCount={6}
            tick={{ fontSize: 10 }}
            className="text-xs sm:text-sm"
          />
          <Tooltip
            contentStyle={{
              fontSize: '0.875rem',
              padding: '8px 12px',
              borderRadius: '6px'
            }}
          />
          <Legend
            wrapperStyle={{ fontSize: '0.75rem' }}
            iconSize={12}
          />
          <Bar dataKey="low" fill="#10b981" name="Low Priority" />
          <Bar dataKey="medium" fill="#f59e0b" name="Medium Priority" />
          <Bar dataKey="high" fill="#ef4444" name="High Priority" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
