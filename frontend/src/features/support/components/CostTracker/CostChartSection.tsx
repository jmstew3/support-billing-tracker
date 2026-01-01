/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  ResponsiveContainer,
  ComposedChart,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LabelList,
} from 'recharts';
import { CHART_STYLES } from '../../../../components/base/DataTrackerCard';
import { formatCurrency } from '../../../../utils/currency';
import type { CostChartSectionProps, MonthlyChartData, SinglePeriodChartData, MonthlyCostData, CostData } from './types';
import { URGENCY_LEVELS } from './types';

/**
 * Renders the chart legend with toggle functionality
 */
function ChartLegend({
  visibleUrgencies,
  toggleUrgency,
  resetFilters,
  isModified,
}: {
  visibleUrgencies: Record<string, boolean>;
  toggleUrgency: (urgency: string) => void;
  resetFilters: () => void;
  isModified: boolean;
}) {
  return (
    <Legend
      wrapperStyle={CHART_STYLES.legendWrapper}
      iconType="rect"
      content={(props) => {
        const { payload } = props;
        const orderedPayload = URGENCY_LEVELS.map(key =>
          payload?.find(item => item.value === key)
        ).filter((item): item is NonNullable<typeof item> => item !== null && item !== undefined);

        return (
          <div>
            <ul style={CHART_STYLES.legendList}>
              {orderedPayload.map((entry, index) => entry ? (
                <li
                  key={`item-${index}`}
                  onClick={() => toggleUrgency(entry.value || '')}
                  style={{
                    ...CHART_STYLES.legendItem,
                    opacity: visibleUrgencies[entry.value || ''] ? 1 : 0.35,
                  }}
                >
                  <span style={{
                    ...CHART_STYLES.legendIcon(visibleUrgencies[entry.value || '']),
                    backgroundColor: entry.color,
                  }} />
                  <span style={CHART_STYLES.legendText(visibleUrgencies[entry.value || ''])}>
                    {entry.value}
                  </span>
                </li>
              ) : null)}

              {isModified && (
                <>
                  <li style={{
                    width: '1px',
                    height: '20px',
                    backgroundColor: '#E5E7EB',
                    margin: '0 10px'
                  }} />
                  <li
                    onClick={resetFilters}
                    style={CHART_STYLES.resetButton}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = '#3B82F6';
                      e.currentTarget.style.backgroundColor = '#EFF6FF';
                      e.currentTarget.style.borderColor = '#BFDBFE';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = '#6B7280';
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.borderColor = 'transparent';
                    }}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
                      <path d="M21 3v5h-5" />
                      <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
                      <path d="M8 21H3v-5" />
                    </svg>
                    Reset
                  </li>
                </>
              )}
            </ul>
          </div>
        );
      }}
    />
  );
}

/**
 * Transform monthly cost data into chart data format
 */
function transformMonthlyData(monthlyCosts: MonthlyCostData[]): MonthlyChartData[] {
  return monthlyCosts.map(month => ({
    month: month.month.substring(0, 3),
    Promotion: month.costs.promotionalNetCost !== undefined ? month.costs.promotionalNetCost : month.costs.promotionalCost,
    Low: month.costs.regularNetCost !== undefined ? month.costs.regularNetCost : month.costs.regularCost,
    Medium: month.costs.sameDayNetCost !== undefined ? month.costs.sameDayNetCost : month.costs.sameDayCost,
    High: month.costs.emergencyNetCost !== undefined ? month.costs.emergencyNetCost : month.costs.emergencyCost,
    totalCost: month.costs.grossTotalCost || month.costs.totalCost,
    netTotalCost: month.costs.netTotalCost || month.costs.totalCost,
    freeHoursApplied: month.costs.freeHoursApplied || 0,
    freeHoursSavings: month.costs.freeHoursSavings || 0,
    totalHours: month.costs.promotionalHours + month.costs.regularHours + month.costs.sameDayHours + month.costs.emergencyHours,
  }));
}

/**
 * Transform single period cost data into chart data format
 */
function transformSinglePeriodData(costData: CostData, visibleUrgencies: Record<string, boolean>): SinglePeriodChartData[] {
  return [
    {
      name: 'Promotion',
      hours: costData.promotionalHours || 0,
      cost: (costData.promotionalNetCost !== undefined ? costData.promotionalNetCost : costData.promotionalCost) || 0,
      visible: visibleUrgencies.Promotion,
    },
    {
      name: 'Low',
      hours: costData.regularHours || 0,
      cost: (costData.regularNetCost !== undefined ? costData.regularNetCost : costData.regularCost) || 0,
      visible: visibleUrgencies.Low,
    },
    {
      name: 'Medium',
      hours: costData.sameDayHours || 0,
      cost: (costData.sameDayNetCost !== undefined ? costData.sameDayNetCost : costData.sameDayCost) || 0,
      visible: visibleUrgencies.Medium,
    },
    {
      name: 'High',
      hours: costData.emergencyHours || 0,
      cost: (costData.emergencyNetCost !== undefined ? costData.emergencyNetCost : costData.emergencyCost) || 0,
      visible: visibleUrgencies.High,
    },
  ];
}

/**
 * Get bar color based on urgency level and visibility
 */
function getBarColor(name: string, visible: boolean): string {
  if (!visible) return CHART_STYLES.barColors.disabled;
  switch (name) {
    case 'Promotion': return CHART_STYLES.barColors.promotion;
    case 'Low': return CHART_STYLES.barColors.low;
    case 'Medium': return CHART_STYLES.barColors.medium;
    case 'High': return CHART_STYLES.barColors.high;
    default: return CHART_STYLES.barColors.disabled;
  }
}

/**
 * Renders the monthly stacked bar chart
 */
function MonthlyChart({
  chartData,
  visibleUrgencies,
  toggleUrgency,
  resetFilters,
  isModified,
}: {
  chartData: MonthlyChartData[];
  visibleUrgencies: Record<string, boolean>;
  toggleUrgency: (urgency: string) => void;
  resetFilters: () => void;
  isModified: boolean;
}) {
  const maxValue = Math.max(...chartData.map(d => d.netTotalCost || d.totalCost));
  const yAxisMax = maxValue + 250;

  return (
    <div style={{ width: '100%', minHeight: 400 }}>
      <ResponsiveContainer width="100%" height={400}>
        <ComposedChart data={chartData}>
          <CartesianGrid {...CHART_STYLES.cartesianGrid} />
          <XAxis dataKey="month" {...CHART_STYLES.xAxis} />
          <YAxis
            yAxisId="cost"
            domain={[0, yAxisMax]}
            tickFormatter={(value) => `$${(value).toLocaleString()}`}
            {...CHART_STYLES.yAxis}
          />
          <YAxis
            yAxisId="hours"
            orientation="right"
            tickFormatter={(value) => `${value}h`}
            {...CHART_STYLES.yAxisSecondary}
          />
          <Tooltip
            cursor={false}
            content={({ active, payload, label }) => {
              if (active && payload && payload.length) {
                const data = payload[0].payload as MonthlyChartData;
                const hasFreeHours = data.freeHoursSavings > 0;

                const orderMap: Record<string, number> = {
                  'Promotion': 1,
                  'Low': 2,
                  'Medium': 3,
                  'High': 4
                };

                const sortedPayload = payload
                  .filter((entry: any) => !['totalHours', 'totalCost', 'netTotalCost', 'freeHoursApplied', 'freeHoursSavings'].includes(entry.dataKey as string))
                  .sort((a: any, b: any) => (orderMap[a.name] || 999) - (orderMap[b.name] || 999));

                return (
                  <div style={CHART_STYLES.tooltipContainer}>
                    <p style={CHART_STYLES.tooltipTitle}>{label}</p>
                    {sortedPayload.map((entry: any, index: number) => (
                      <p key={`item-${index}`} style={{ ...CHART_STYLES.tooltipItem, color: entry.color }}>
                        {entry.name}: {formatCurrency(entry.value)}
                      </p>
                    ))}
                    <div style={CHART_STYLES.tooltipDivider}>
                      {hasFreeHours ? (
                        <>
                          <p style={{ color: '#6B7280', fontSize: '12px', margin: '4px 0' }}>
                            Gross: {formatCurrency(data.totalCost)}
                          </p>
                          <p style={{ color: '#059669', fontSize: '12px', margin: '4px 0' }}>
                            Free Hours: -{formatCurrency(data.freeHoursSavings)} ({data.freeHoursApplied}h)
                          </p>
                          <p style={{ color: '#111827', fontWeight: 'bold', marginTop: '4px' }}>
                            Net Cost: {formatCurrency(data.netTotalCost)}
                          </p>
                        </>
                      ) : (
                        <p style={{ color: '#111827', fontWeight: 'bold' }}>
                          Total Cost: {formatCurrency(data.totalCost)}
                        </p>
                      )}
                    </div>
                  </div>
                );
              }
              return null;
            }}
          />
          <ChartLegend
            visibleUrgencies={visibleUrgencies}
            toggleUrgency={toggleUrgency}
            resetFilters={resetFilters}
            isModified={isModified}
          />
          <Bar yAxisId="cost" dataKey="High" stackId="a" fill={visibleUrgencies.High ? CHART_STYLES.barColors.high : CHART_STYLES.barColors.disabled} />
          <Bar yAxisId="cost" dataKey="Medium" stackId="a" fill={visibleUrgencies.Medium ? CHART_STYLES.barColors.medium : CHART_STYLES.barColors.disabled} />
          <Bar yAxisId="cost" dataKey="Low" stackId="a" fill={visibleUrgencies.Low ? CHART_STYLES.barColors.low : CHART_STYLES.barColors.disabled} />
          <Bar yAxisId="cost" dataKey="Promotion" stackId="a" fill={visibleUrgencies.Promotion ? CHART_STYLES.barColors.promotion : CHART_STYLES.barColors.disabled}>
            <LabelList
              dataKey="netTotalCost"
              position="top"
              content={(props: any) => {
                const { x, y, width, index } = props;
                const entry = chartData[index];

                const visibleTotal = (visibleUrgencies.Promotion ? entry.Promotion : 0) +
                  (visibleUrgencies.Low ? entry.Low : 0) +
                  (visibleUrgencies.Medium ? entry.Medium : 0) +
                  (visibleUrgencies.High ? entry.High : 0);

                if (visibleTotal <= 0) return null;

                return (
                  <text x={x + width / 2} y={y - 5} fill="#374151" textAnchor="middle" fontSize="12" fontWeight="bold">
                    {formatCurrency(visibleTotal)}
                  </text>
                );
              }}
            />
          </Bar>
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

/**
 * Renders the single period bar chart
 */
function SinglePeriodChart({
  chartData,
  visibleUrgencies,
  toggleUrgency,
  resetFilters,
  isModified,
}: {
  chartData: SinglePeriodChartData[];
  visibleUrgencies: Record<string, boolean>;
  toggleUrgency: (urgency: string) => void;
  resetFilters: () => void;
  isModified: boolean;
}) {
  const maxValue = Math.max(...chartData.map(d => d.cost), 0);
  const yAxisMax = Math.max(maxValue + 250, 500);

  const hasData = chartData.some(d => d.cost > 0);
  if (!hasData) {
    return (
      <div style={{ padding: '20px', border: '2px dashed #F59E0B', borderRadius: '8px', backgroundColor: '#FEF3C7' }}>
        <h3 style={{ color: '#92400E', marginBottom: '10px' }}>No Cost Data Available</h3>
        <p style={{ color: '#78350F', marginBottom: '10px' }}>The chart cannot be displayed because all cost values are zero.</p>
        <details style={{ color: '#78350F' }}>
          <summary style={{ cursor: 'pointer', fontWeight: 'bold' }}>View Raw Data (Debug)</summary>
          <pre style={{ backgroundColor: '#FFFBEB', padding: '10px', borderRadius: '4px', overflow: 'auto' }}>
            {JSON.stringify(chartData, null, 2)}
          </pre>
        </details>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', minHeight: 400, border: '1px solid #E5E7EB', borderRadius: '8px', padding: '10px' }}>
      <ResponsiveContainer width="100%" height={400}>
        <BarChart data={chartData} barSize={50} barCategoryGap="20%">
          <CartesianGrid {...CHART_STYLES.cartesianGrid} />
          <XAxis dataKey="name" {...CHART_STYLES.xAxis} />
          <YAxis
            domain={[0, yAxisMax]}
            tickFormatter={(value) => `$${(value).toLocaleString()}`}
            {...CHART_STYLES.yAxis}
          />
          <Tooltip
            cursor={false}
            content={({ active, payload, label }) => {
              if (active && payload && payload.length) {
                const data = payload[0].payload as SinglePeriodChartData;
                const totalCost = chartData.reduce((sum, item) => sum + item.cost, 0);
                const totalHours = chartData.reduce((sum, item) => sum + item.hours, 0);

                return (
                  <div style={CHART_STYLES.tooltipContainer}>
                    <p style={CHART_STYLES.tooltipTitle}>{label}</p>
                    <p style={{ ...CHART_STYLES.tooltipItem, color: '#374151' }}>
                      Cost: {formatCurrency(data.cost)}
                    </p>
                    <p style={{ ...CHART_STYLES.tooltipItem, color: '#374151' }}>
                      Hours: {data.hours.toFixed(2)}
                    </p>
                    <div style={CHART_STYLES.tooltipDivider}>
                      <p style={{ color: '#111827', fontSize: '12px' }}>
                        Total: {formatCurrency(totalCost)} ({totalHours.toFixed(2)}h)
                      </p>
                    </div>
                  </div>
                );
              }
              return null;
            }}
          />
          <ChartLegend
            visibleUrgencies={visibleUrgencies}
            toggleUrgency={toggleUrgency}
            resetFilters={resetFilters}
            isModified={isModified}
          />
          <Bar dataKey="cost" name="Cost" isAnimationActive={false}>
            {chartData.map((entry, index) => (
              <Cell key={`bar-${index}`} fill={getBarColor(entry.name, entry.visible)} />
            ))}
            <LabelList
              dataKey="cost"
              position="top"
              content={(props: any) => {
                const { x, y, width, index } = props;
                const visibleTotal = chartData
                  .filter(entry => visibleUrgencies[entry.name])
                  .reduce((sum, entry) => sum + entry.cost, 0);

                const visibleBars = chartData.filter(entry => visibleUrgencies[entry.name]);
                const lastVisibleIndex = chartData.indexOf(visibleBars[visibleBars.length - 1]);

                if (index !== lastVisibleIndex || visibleTotal <= 0) return null;

                return (
                  <text x={x + width / 2} y={y - 5} fill="#374151" textAnchor="middle" fontSize="12" fontWeight="bold">
                    {formatCurrency(visibleTotal)}
                  </text>
                );
              }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/**
 * Combined chart section component that renders either monthly or single period chart
 */
export function CostChartSection({
  costData,
  monthlyCosts,
  selectedMonth,
  visibleUrgencies,
  toggleUrgency,
  resetFilters,
  isModified,
}: CostChartSectionProps) {
  if (selectedMonth === 'all' && monthlyCosts && monthlyCosts.length > 0) {
    const chartData = transformMonthlyData(monthlyCosts);
    return (
      <MonthlyChart
        chartData={chartData}
        visibleUrgencies={visibleUrgencies}
        toggleUrgency={toggleUrgency}
        resetFilters={resetFilters}
        isModified={isModified}
      />
    );
  }

  if (costData) {
    const chartData = transformSinglePeriodData(costData, visibleUrgencies);
    return (
      <SinglePeriodChart
        chartData={chartData}
        visibleUrgencies={visibleUrgencies}
        toggleUrgency={toggleUrgency}
        resetFilters={resetFilters}
        isModified={isModified}
      />
    );
  }

  return null;
}
