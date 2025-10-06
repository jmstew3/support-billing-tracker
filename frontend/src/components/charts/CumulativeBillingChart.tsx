import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { formatCurrency } from '../../services/projectsApi';

interface CumulativeBillingChartProps {
  data: Array<{
    month: string; // YYYY-MM format
    revenue: number;
  }>;
}

export function CumulativeBillingChart({ data }: CumulativeBillingChartProps) {
  // Sort data chronologically (oldest first)
  const sortedData = [...data].sort((a, b) => a.month.localeCompare(b.month));

  // Calculate cumulative values
  let cumulative = 0;
  const cumulativeData = sortedData.map((item) => {
    cumulative += item.revenue;
    return {
      month: item.month,
      monthLabel: formatMonthLabel(item.month),
      revenue: item.revenue,
      cumulative: cumulative,
    };
  });

  // Calculate max Y-axis value (round up to nearest $10k)
  const maxCumulative = cumulativeData[cumulativeData.length - 1]?.cumulative || 0;
  const maxYAxis = Math.ceil(maxCumulative / 10000) * 10000;

  // Format month for display (e.g., "Sep 2025")
  function formatMonthLabel(monthStr: string) {
    const [year, month] = monthStr.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  }

  // Custom tooltip (sharp edges, no shadow)
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="border bg-card p-3 text-sm">
          <p className="font-semibold mb-1">{data.monthLabel}</p>
          <p className="text-xs text-muted-foreground">
            Month: <span className="font-medium text-foreground">{formatCurrency(data.revenue)}</span>
          </p>
          <p className="text-xs text-muted-foreground">
            Total: <span className="font-medium text-foreground">{formatCurrency(data.cumulative)}</span>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="border bg-card p-6">
      <div className="mb-4">
        <h3 className="text-md font-semibold mb-1">Cumulative Billing</h3>
        <p className="text-xs text-muted-foreground">
          Total billing accumulation over time
        </p>
      </div>
      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={cumulativeData} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="0" stroke="hsl(var(--border))" vertical={false} />
          <XAxis
            dataKey="monthLabel"
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
            ticks={[0, maxYAxis / 4, maxYAxis / 2, (maxYAxis * 3) / 4, maxYAxis]}
            tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
          />
          <Tooltip
            content={<CustomTooltip />}
            cursor={{ stroke: 'hsl(var(--border))', strokeWidth: 1, strokeDasharray: '4 4' }}
          />
          <Line
            type="monotone"
            dataKey="cumulative"
            stroke="hsl(var(--foreground))"
            strokeWidth={2}
            dot={{
              fill: 'hsl(var(--background))',
              stroke: 'hsl(var(--foreground))',
              strokeWidth: 2,
              r: 3,
            }}
            activeDot={{
              fill: 'hsl(var(--foreground))',
              stroke: 'hsl(var(--background))',
              strokeWidth: 2,
              r: 5,
            }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}