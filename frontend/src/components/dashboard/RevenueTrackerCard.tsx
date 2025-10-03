import { useState, type ReactNode } from 'react';
import { DataTrackerCard, TABLE_STYLES, CHART_STYLES } from '../base/DataTrackerCard';
import { formatCurrency, formatCurrencyAccounting } from '../../utils/formatting';
import type { MonthlyBillingSummary } from '../../types/billing';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LabelList,
} from 'recharts';

/**
 * RevenueTrackerCard Props
 */
export interface RevenueTrackerCardProps {
  /** Monthly billing data */
  monthlyData: MonthlyBillingSummary[];
  /** Selected year for display */
  selectedYear: number;
  /** Optional custom title */
  title?: string;
  /** Optional custom description */
  description?: string;
  /** Initial view type (default: 'table') */
  initialViewType?: 'table' | 'chart';
  /** Optional grid span classes for layout control */
  gridSpan?: string;
}

/**
 * RevenueTrackerCard - Revenue tracking by category (Tickets, Projects, Hosting)
 *
 * Features:
 * - Monthly breakdown view showing revenue by category
 * - Toggle between table and chart views
 * - Interactive category filtering in chart view
 * - Totals row/column for easy reference
 *
 * @example
 * <RevenueTrackerCard
 *   monthlyData={billingSummary.monthlyBreakdown}
 *   selectedYear={2025}
 * />
 */
export function RevenueTrackerCard({
  monthlyData,
  selectedYear,
  title = 'Revenue Tracker',
  description,
  initialViewType = 'table',
  gridSpan,
}: RevenueTrackerCardProps) {
  const [visibleCategories, setVisibleCategories] = useState<Record<string, boolean>>({
    Tickets: true,
    Projects: true,
    Hosting: true,
  });

  // Get description
  const getDescription = () => {
    if (description) return description;
    return `Monthly breakdown for ${selectedYear}`;
  };

  // Toggle category visibility
  const toggleCategory = (category: string) => {
    setVisibleCategories(prev => ({
      ...prev,
      [category]: !prev[category],
    }));
  };

  // Reset all categories to visible
  const resetFilters = () => {
    setVisibleCategories({
      Tickets: true,
      Projects: true,
      Hosting: true,
    });
  };

  // Check if filters have been modified
  const isModified = Object.values(visibleCategories).some(value => !value);

  // Calculate totals
  const calculateTotals = () => {
    return {
      tickets: monthlyData.reduce((sum, m) => sum + m.ticketsRevenue, 0),
      projects: monthlyData.reduce((sum, m) => sum + m.projectsRevenue, 0),
      hosting: monthlyData.reduce((sum, m) => sum + m.hostingRevenue, 0),
      total: monthlyData.reduce((sum, m) => sum + m.totalRevenue, 0),
      // Count totals
      ticketsCount: monthlyData.reduce((sum, m) => sum + m.ticketsCount, 0),
      projectsCount: monthlyData.reduce((sum, m) => sum + m.projectsCount, 0),
      hostingCount: monthlyData.reduce((sum, m) => sum + m.hostingSitesCount, 0),
    };
  };

  // Render table
  const renderTable = (): ReactNode => {
    if (!monthlyData || monthlyData.length === 0) {
      return <div className="text-center text-muted-foreground py-8">No data available</div>;
    }

    const totals = calculateTotals();

    return (
      <div className={TABLE_STYLES.container}>
          <table className={TABLE_STYLES.table}>
            <thead>
              <tr className={TABLE_STYLES.headerRow}>
                <th className={TABLE_STYLES.headerCell}>Category</th>
              {monthlyData.map((month) => {
                // Parse date manually to avoid timezone issues
                const [year, monthNum] = month.month.split('-').map(Number);
                const date = new Date(year, monthNum - 1, 1); // monthNum is 1-indexed, Date() month is 0-indexed
                return (
                  <th key={month.month} className={TABLE_STYLES.headerCellWithBorder}>
                    {date.toLocaleDateString('en-US', { month: 'short' })}
                  </th>
                );
              })}
              <th className={TABLE_STYLES.headerCellWithBorder}>Count</th>
              <th className={TABLE_STYLES.headerCellWithBorder}>Total</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {/* Tickets Row */}
            <tr className={TABLE_STYLES.row}>
              <td className={TABLE_STYLES.cell}>Tickets</td>
              {monthlyData.map((month) => (
                <td key={`tickets-${month.month}`} className={TABLE_STYLES.cellWithBorder}>
                  {month.ticketsRevenue === 0 ? (
                    '-'
                  ) : (
                    <>
                      <span>{formatCurrencyAccounting(month.ticketsRevenue).symbol}</span>
                      <span className="tabular-nums">{formatCurrencyAccounting(month.ticketsRevenue).amount}</span>
                    </>
                  )}
                </td>
              ))}
              <td className={TABLE_STYLES.cellWithBorder + ' text-center'}>
                {totals.ticketsCount}
              </td>
              <td className={TABLE_STYLES.cellBoldWithBorder}>
                {totals.tickets === 0 ? (
                  '-'
                ) : (
                  <>
                    <span>{formatCurrencyAccounting(totals.tickets).symbol}</span>
                    <span className="tabular-nums">{formatCurrencyAccounting(totals.tickets).amount}</span>
                  </>
                )}
              </td>
            </tr>

            {/* Projects Row */}
            <tr className={TABLE_STYLES.row}>
              <td className={TABLE_STYLES.cell}>Projects</td>
              {monthlyData.map((month) => (
                <td key={`projects-${month.month}`} className={TABLE_STYLES.cellWithBorder}>
                  {month.projectsRevenue === 0 ? (
                    '-'
                  ) : (
                    <>
                      <span>{formatCurrencyAccounting(month.projectsRevenue).symbol}</span>
                      <span className="tabular-nums">{formatCurrencyAccounting(month.projectsRevenue).amount}</span>
                    </>
                  )}
                </td>
              ))}
              <td className={TABLE_STYLES.cellWithBorder + ' text-center'}>
                {totals.projectsCount}
              </td>
              <td className={TABLE_STYLES.cellBoldWithBorder}>
                {totals.projects === 0 ? (
                  '-'
                ) : (
                  <>
                    <span>{formatCurrencyAccounting(totals.projects).symbol}</span>
                    <span className="tabular-nums">{formatCurrencyAccounting(totals.projects).amount}</span>
                  </>
                )}
              </td>
            </tr>

            {/* Hosting Row */}
            <tr className={TABLE_STYLES.row}>
              <td className={TABLE_STYLES.cell}>Hosting</td>
              {monthlyData.map((month) => (
                <td key={`hosting-${month.month}`} className={TABLE_STYLES.cellWithBorder}>
                  {month.hostingRevenue === 0 ? (
                    '-'
                  ) : (
                    <>
                      <span>{formatCurrencyAccounting(month.hostingRevenue).symbol}</span>
                      <span className="tabular-nums">{formatCurrencyAccounting(month.hostingRevenue).amount}</span>
                    </>
                  )}
                </td>
              ))}
              <td className={TABLE_STYLES.cellWithBorder + ' text-center'}>
                {totals.hostingCount}
              </td>
              <td className={TABLE_STYLES.cellBoldWithBorder}>
                {totals.hosting === 0 ? (
                  '-'
                ) : (
                  <>
                    <span>{formatCurrencyAccounting(totals.hosting).symbol}</span>
                    <span className="tabular-nums">{formatCurrencyAccounting(totals.hosting).amount}</span>
                  </>
                )}
              </td>
            </tr>

            {/* Total Row */}
            <tr className={TABLE_STYLES.rowHighlight}>
              <td className={TABLE_STYLES.cell}>Total</td>
              {monthlyData.map((month) => (
                <td key={`total-${month.month}`} className={TABLE_STYLES.cellWithBorder}>
                  <span>{formatCurrencyAccounting(month.totalRevenue).symbol}</span>
                  <span className="tabular-nums">{formatCurrencyAccounting(month.totalRevenue).amount}</span>
                </td>
              ))}
              <td className={TABLE_STYLES.cellWithBorder}></td>
              <td className={TABLE_STYLES.cellWithBorder}>
                <span>{formatCurrencyAccounting(totals.total).symbol}</span>
                <span className="tabular-nums">{formatCurrencyAccounting(totals.total).amount}</span>
              </td>
            </tr>
            </tbody>
          </table>
      </div>
    );
  };

  // Render chart
  const renderChart = (): ReactNode => {
    if (!monthlyData || monthlyData.length === 0) {
      return <div className="text-center text-muted-foreground py-8">No data available</div>;
    }

    const chartData = monthlyData.map(month => {
      // Parse date manually to avoid timezone issues
      const [year, monthNum] = month.month.split('-').map(Number);
      const date = new Date(year, monthNum - 1, 1); // monthNum is 1-indexed, Date() month is 0-indexed
      return {
        month: date.toLocaleDateString('en-US', { month: 'short' }),
        Tickets: month.ticketsRevenue,
        Projects: month.projectsRevenue,
        Hosting: month.hostingRevenue,
        total: month.totalRevenue,
        // Count data for line chart
        ticketsCount: month.ticketsCount,
        projectsCount: month.projectsCount,
        hostingCount: month.hostingSitesCount,
        totalCount: month.ticketsCount + month.projectsCount + month.hostingSitesCount,
      };
    });

    // Only show count line when viewing all months
    const showCountLine = monthlyData.length > 1;

    return (
      <ResponsiveContainer width="100%" height={400}>
        <ComposedChart data={chartData}>
          <CartesianGrid {...CHART_STYLES.cartesianGrid} />
          <XAxis dataKey="month" {...CHART_STYLES.xAxis} />
          <YAxis
            yAxisId="revenue"
            tickFormatter={(value) => `$${(value).toLocaleString()}`}
            {...CHART_STYLES.yAxis}
          />
          {showCountLine && (
            <YAxis
              yAxisId="count"
              orientation="right"
              tickFormatter={(value) => value.toString()}
              label={{ value: 'Count', angle: 90, position: 'insideRight' }}
              {...CHART_STYLES.yAxisSecondary}
            />
          )}
          <Tooltip
            cursor={false}
            content={({ active, payload, label }) => {
              if (active && payload && payload.length) {
                const data = payload[0].payload;

                const orderMap: Record<string, number> = {
                  'Tickets': 1,
                  'Projects': 2,
                  'Hosting': 3,
                };

                const sortedPayload = payload
                  .filter((entry: any) => entry.dataKey !== 'total' && entry.dataKey !== 'totalCount' && !entry.dataKey.includes('Count'))
                  .sort((a: any, b: any) => {
                    return (orderMap[a.name] || 999) - (orderMap[b.name] || 999);
                  });

                return (
                  <div style={CHART_STYLES.tooltipContainer}>
                    <p style={CHART_STYLES.tooltipTitle}>{label}</p>
                    {sortedPayload.map((entry: any, index: number) => (
                      <p key={`item-${index}`} style={{ ...CHART_STYLES.tooltipItem, color: entry.color }}>
                        {entry.name}: {formatCurrency(entry.value)}
                      </p>
                    ))}
                    <div style={CHART_STYLES.tooltipDivider}>
                      <p style={{ color: '#111827', fontWeight: 'bold' }}>
                        Total Revenue: {formatCurrency(data.total)}
                      </p>
                      {showCountLine && (
                        <p style={{ color: '#8B5CF6', fontWeight: 'bold' }}>
                          Total Count: {data.totalCount}
                        </p>
                      )}
                    </div>
                  </div>
                );
              }
              return null;
            }}
          />
          <Legend
            wrapperStyle={CHART_STYLES.legendWrapper}
            iconType="rect"
            content={(props) => {
              const { payload } = props;
              const customOrder = ['Tickets', 'Projects', 'Hosting'];
              const orderedPayload = customOrder.map(key =>
                payload?.find(item => item.value === key)
              ).filter((item): item is NonNullable<typeof item> => item !== null && item !== undefined);

              return (
                <div>
                  <ul style={CHART_STYLES.legendList}>
                    {orderedPayload.map((entry, index) => entry ? (
                      <li
                        key={`item-${index}`}
                        onClick={() => toggleCategory(entry.value || '')}
                        style={{
                          ...CHART_STYLES.legendItem,
                          opacity: visibleCategories[entry.value || ''] ? 1 : 0.35,
                        }}
                      >
                        <span style={{
                          ...CHART_STYLES.legendIcon(visibleCategories[entry.value || '']),
                          backgroundColor: entry.color,
                        }} />
                        <span style={CHART_STYLES.legendText(visibleCategories[entry.value || ''])}>
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
          <Bar yAxisId="revenue" dataKey="Tickets" stackId="a" fill={visibleCategories.Tickets ? CHART_STYLES.barColors.tickets : CHART_STYLES.barColors.disabled} />
          <Bar yAxisId="revenue" dataKey="Projects" stackId="a" fill={visibleCategories.Projects ? CHART_STYLES.barColors.projects : CHART_STYLES.barColors.disabled} />
          <Bar yAxisId="revenue" dataKey="Hosting" stackId="a" fill={visibleCategories.Hosting ? CHART_STYLES.barColors.hosting : CHART_STYLES.barColors.disabled}>
            <LabelList
              dataKey="total"
              position="top"
              content={(props: any) => {
                const { x, y, width, value } = props;
                if (!value || value <= 0) return null;
                return (
                  <text x={x + width / 2} y={y - 5} fill="#374151" textAnchor="middle" fontSize="12" fontWeight="bold">
                    {formatCurrency(value)}
                  </text>
                );
              }}
            />
          </Bar>
          {showCountLine && (
            <Line
              yAxisId="count"
              type="monotone"
              dataKey="totalCount"
              stroke="#8B5CF6"
              strokeWidth={2}
              dot={{ fill: '#8B5CF6', r: 4 }}
              name="Total Count"
              activeDot={{ r: 6 }}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    );
  };

  return (
    <DataTrackerCard
      title={title}
      description={getDescription()}
      renderTable={renderTable}
      renderChart={renderChart}
      initialViewType={initialViewType}
      gridSpan={gridSpan}
    />
  );
}
