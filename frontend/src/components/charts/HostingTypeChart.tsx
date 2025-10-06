import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface HostingTypeChartProps {
  data: Array<{
    month: string; // YYYY-MM format
    websites: number;
    landingPages: number;
  }>;
}

export function HostingTypeChart({ data }: HostingTypeChartProps) {
  // Sort data chronologically (oldest first)
  const sortedData = [...data].sort((a, b) => a.month.localeCompare(b.month));

  // Calculate totals
  const totalWebsites = sortedData.reduce((sum, item) => sum + item.websites, 0);
  const totalLandingPages = sortedData.reduce((sum, item) => sum + item.landingPages, 0);

  // Prepare data for bar chart
  const chartData = [
    {
      name: 'Websites',
      value: totalWebsites,
      color: 'hsl(var(--foreground))',
    },
    {
      name: 'Landing Pages',
      value: totalLandingPages,
      color: 'hsl(var(--muted-foreground))',
    },
  ];

  // Calculate max Y-axis (round up to nearest 10)
  const maxValue = Math.max(totalWebsites, totalLandingPages);
  const maxYAxis = Math.ceil(maxValue / 10) * 10;

  // Custom tooltip (sharp edges, no shadow)
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="border bg-card p-3 text-sm">
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
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="0" stroke="hsl(var(--border))" vertical={false} />
          <XAxis
            dataKey="name"
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
            allowDecimals={false}
          />
          <Tooltip
            content={<CustomTooltip />}
            cursor={{ fill: 'hsl(var(--muted) / 0.3)' }}
          />
          <Bar dataKey="value" radius={[0, 0, 0, 0]}>
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
