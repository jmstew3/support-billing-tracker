import { useState } from 'react';
import { DataTrackerCard, TABLE_STYLES, CHART_STYLES } from '../base/DataTrackerCard';
import { CustomMonthTick, CustomCategoryTick } from './CustomAxisTicks';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LabelList,
} from 'recharts';

/**
 * Type definitions for the Category Tracker component
 */
export interface CategoryData {
  support: number;
  hosting: number;
  forms: number;
  email: number;
  migration: number;
  advisory: number;
  nonBillable: number;
  website: number;
  scripts: number;
  total: number;
}

export interface MonthlyCategoryData {
  month: string;
  year: number;
  categories: CategoryData;
}

export interface CategoryTrackerCardProps {
  /** Single period category data (when viewing a specific month) */
  categoryData?: CategoryData;
  /** Monthly breakdown category data (when viewing all months) */
  monthlyCategoryData?: MonthlyCategoryData[];
  /** Selected month ('all' for yearly view, or month number) */
  selectedMonth: number | 'all';
  /** Selected year */
  selectedYear: number;
  /** Optional custom title */
  title?: string;
  /** Optional custom description */
  description?: string;
  /** Initial view type (default: 'chart') */
  initialViewType?: 'table' | 'chart';
  /** Optional grid span classes for layout control */
  gridSpan?: string;
}

// Category color palette (using distinct colors for each category)
const CATEGORY_COLORS = {
  support: '#3B82F6',      // Blue
  hosting: '#10B981',      // Green
  forms: '#EC4899',        // Pink
  email: '#8B5CF6',        // Purple
  migration: '#F59E0B',    // Orange
  advisory: '#06B6D4',     // Cyan
  nonBillable: '#9CA3AF',  // Gray-400 (lighter gray)
  website: '#F97316',      // Dark Orange
  scripts: '#EAB308',      // Yellow
  disabled: '#D1D5DB',     // Gray for disabled/filtered items
} as const;

// Category display names
const CATEGORY_NAMES: Record<keyof Omit<CategoryData, 'total'>, string> = {
  support: 'Support',
  hosting: 'Hosting',
  forms: 'Forms',
  email: 'Email',
  migration: 'Migration',
  advisory: 'Advisory',
  nonBillable: 'Non-billable',
  website: 'Website',
  scripts: 'Scripts',
};

/**
 * CategoryTrackerCard - Support ticket category breakdown component
 *
 * Features:
 * - Toggle between table and chart views
 * - Monthly breakdown view (when selectedMonth === 'all')
 * - Single period view (when selectedMonth is a number)
 * - Interactive category filtering in chart view
 *
 * @example
 * // Single month view
 * <CategoryTrackerCard
 *   categoryData={categoryCounts}
 *   selectedMonth={6}
 *   selectedYear={2025}
 * />
 *
 * @example
 * // All months view
 * <CategoryTrackerCard
 *   monthlyCategoryData={monthlyCategoryArray}
 *   selectedMonth="all"
 *   selectedYear={2025}
 * />
 */
export function CategoryTrackerCard({
  categoryData,
  monthlyCategoryData,
  selectedMonth,
  selectedYear,
  title = 'Category Breakdown',
  description,
  initialViewType = 'chart',
  gridSpan,
}: CategoryTrackerCardProps) {
  const [visibleCategories, setVisibleCategories] = useState<Record<string, boolean>>({
    Support: true,
    Hosting: true,
    Forms: true,
    Email: true,
    Migration: true,
    Advisory: true,
    'Non-billable': true,
    Website: true,
    Scripts: true,
  });

  // Determine description based on view mode
  const getDescription = () => {
    if (description) return description;

    if (selectedMonth === 'all') {
      return `Monthly category distribution for ${selectedYear}`;
    }

    return 'Ticket count by category';
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
      Support: true,
      Hosting: true,
      Forms: true,
      Email: true,
      Migration: true,
      Advisory: true,
      'Non-billable': true,
      Website: true,
      Scripts: true,
    });
  };

  // Check if filters have been modified
  const isModified = Object.values(visibleCategories).some(value => !value);

  // Render monthly breakdown table
  const renderMonthlyTable = () => {
    if (!monthlyCategoryData || monthlyCategoryData.length === 0) return null;

    // Check if we're showing a single month
    const isSingleMonth = monthlyCategoryData.length === 1;

    const categoryKeys = Object.keys(CATEGORY_NAMES) as Array<keyof typeof CATEGORY_NAMES>;

    return (
      <div className={TABLE_STYLES.container}>
        <table className={TABLE_STYLES.table}>
          <thead>
            <tr className={TABLE_STYLES.headerRow}>
              <th className={TABLE_STYLES.headerCell}>Category</th>
              {!isSingleMonth && monthlyCategoryData.map((monthData) => (
                <th key={`${monthData.year}-${monthData.month}`} className={TABLE_STYLES.headerCellWithBorder}>
                  {monthData.month.substring(0, 3)}
                </th>
              ))}
              {isSingleMonth && (
                <th className={TABLE_STYLES.headerCellWithBorder}>Count</th>
              )}
              {!isSingleMonth && (
                <th className={TABLE_STYLES.headerCellWithBorder}>Total</th>
              )}
            </tr>
          </thead>
          <tbody className="text-sm">
            {/* Category Rows */}
            {categoryKeys.map((categoryKey) => {
              const categoryName = CATEGORY_NAMES[categoryKey];
              return (
                <tr key={categoryKey} className={TABLE_STYLES.row}>
                  <td className={TABLE_STYLES.cell}>{categoryName}</td>
                  {monthlyCategoryData.map((monthData) => {
                    const count = monthData.categories[categoryKey];
                    return (
                      <td key={`${categoryKey}-${monthData.year}-${monthData.month}`} className={TABLE_STYLES.cellWithBorder}>
                        {count === 0 ? '-' : count}
                      </td>
                    );
                  })}
                  {!isSingleMonth && (
                    <td className={TABLE_STYLES.cellBoldWithBorder}>
                      {(() => {
                        const total = monthlyCategoryData.reduce((sum, m) => sum + m.categories[categoryKey], 0);
                        return total === 0 ? '-' : total;
                      })()}
                    </td>
                  )}
                </tr>
              );
            })}
            {/* Total Row */}
            <tr className={TABLE_STYLES.rowHighlight}>
              <td className={TABLE_STYLES.cell}>Total</td>
              {monthlyCategoryData.map((monthData) => (
                <td key={`total-${monthData.year}-${monthData.month}`} className={TABLE_STYLES.cellWithBorder}>
                  {monthData.categories.total}
                </td>
              ))}
              {!isSingleMonth && (
                <td className={TABLE_STYLES.cellWithBorder}>
                  {monthlyCategoryData.reduce((sum, m) => sum + m.categories.total, 0)}
                </td>
              )}
            </tr>
          </tbody>
        </table>
      </div>
    );
  };

  // Render single period table
  const renderSinglePeriodTable = () => {
    if (!categoryData) return null;

    const categoryKeys = Object.keys(CATEGORY_NAMES) as Array<keyof typeof CATEGORY_NAMES>;

    return (
      <div className={TABLE_STYLES.container}>
        <table className={TABLE_STYLES.table}>
          <thead>
            <tr className={TABLE_STYLES.headerRow}>
              <th className={TABLE_STYLES.headerCell}>Category</th>
              <th className={TABLE_STYLES.headerCellWithBorder}>Count</th>
              <th className={TABLE_STYLES.headerCellWithBorder}>Percentage</th>
            </tr>
          </thead>
          <tbody>
            {categoryKeys.map((categoryKey) => {
              const count = categoryData[categoryKey];
              const percentage = categoryData.total > 0 ? ((count / categoryData.total) * 100).toFixed(1) : '0.0';
              return (
                <tr key={categoryKey} className={TABLE_STYLES.row}>
                  <td className={TABLE_STYLES.cell}>{CATEGORY_NAMES[categoryKey]}</td>
                  <td className={TABLE_STYLES.cellBoldWithBorder}>{count === 0 ? '-' : count}</td>
                  <td className={TABLE_STYLES.cellWithBorder}>{count === 0 ? '-' : `${percentage}%`}</td>
                </tr>
              );
            })}
            <tr className={TABLE_STYLES.totalRow}>
              <td className={TABLE_STYLES.cell}>Total</td>
              <td className={TABLE_STYLES.cellWithBorder}>{categoryData.total}</td>
              <td className={TABLE_STYLES.cellWithBorder}>100%</td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  };

  // Render monthly chart
  const renderMonthlyChart = () => {
    if (!monthlyCategoryData || monthlyCategoryData.length === 0) return null;

    const chartData = monthlyCategoryData.map(month => ({
      month: month.month.substring(0, 3),
      Support: month.categories.support,
      Hosting: month.categories.hosting,
      Forms: month.categories.forms,
      Email: month.categories.email,
      Migration: month.categories.migration,
      Advisory: month.categories.advisory,
      'Non-billable': month.categories.nonBillable,
      Website: month.categories.website,
      Scripts: month.categories.scripts,
      total: month.categories.total,
    }));

    // Calculate max value for Y-axis domain
    const maxValue = Math.max(...chartData.map(d => d.total));
    const yAxisMax = Math.ceil(maxValue * 1.1); // Add 10% padding

    return (
      <div style={{ width: '100%', minHeight: 480 }}>
        <ResponsiveContainer width="100%" height={480}>
          <ComposedChart
            data={chartData}
            margin={{ top: 20, right: 30, left: 10, bottom: 20 }}
          >
          <CartesianGrid {...CHART_STYLES.cartesianGrid} />
          <XAxis
            dataKey="month"
            tick={<CustomMonthTick />}
            height={100}
            interval={0}
          />
          <YAxis
            domain={[0, yAxisMax]}
            allowDecimals={false}
            {...CHART_STYLES.yAxis}
          />
          <Tooltip
            cursor={false}
            content={({ active, payload, label }) => {
              if (active && payload && payload.length) {
                const data = payload[0].payload;

                const categoryOrder = ['Support', 'Hosting', 'Forms', 'Email', 'Migration', 'Advisory', 'Non-billable', 'Website', 'Scripts'];

                const sortedPayload = payload
                  .filter((entry: any) => entry.dataKey !== 'total')
                  .sort((a: any, b: any) => {
                    return categoryOrder.indexOf(a.dataKey) - categoryOrder.indexOf(b.dataKey);
                  });

                return (
                  <div style={CHART_STYLES.tooltipContainer}>
                    <p style={CHART_STYLES.tooltipTitle}>{label}</p>
                    {sortedPayload.map((entry: any, index: number) => (
                      <p key={`item-${index}`} style={{ ...CHART_STYLES.tooltipItem, color: entry.color }}>
                        {entry.name}: {entry.value}
                      </p>
                    ))}
                    <div style={CHART_STYLES.tooltipDivider}>
                      <p style={{ color: '#111827', fontWeight: 'bold' }}>
                        Total: {data.total}
                      </p>
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
              const customOrder = ['Support', 'Hosting', 'Forms', 'Email', 'Migration', 'Advisory', 'Non-billable', 'Website', 'Scripts'];
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
          <Bar dataKey="Non-billable" stackId="a" fill={visibleCategories['Non-billable'] ? CATEGORY_COLORS.nonBillable : CATEGORY_COLORS.disabled} />
          <Bar dataKey="Website" stackId="a" fill={visibleCategories.Website ? CATEGORY_COLORS.website : CATEGORY_COLORS.disabled} />
          <Bar dataKey="Scripts" stackId="a" fill={visibleCategories.Scripts ? CATEGORY_COLORS.scripts : CATEGORY_COLORS.disabled} />
          <Bar dataKey="Advisory" stackId="a" fill={visibleCategories.Advisory ? CATEGORY_COLORS.advisory : CATEGORY_COLORS.disabled} />
          <Bar dataKey="Migration" stackId="a" fill={visibleCategories.Migration ? CATEGORY_COLORS.migration : CATEGORY_COLORS.disabled} />
          <Bar dataKey="Email" stackId="a" fill={visibleCategories.Email ? CATEGORY_COLORS.email : CATEGORY_COLORS.disabled} />
          <Bar dataKey="Forms" stackId="a" fill={visibleCategories.Forms ? CATEGORY_COLORS.forms : CATEGORY_COLORS.disabled} />
          <Bar dataKey="Hosting" stackId="a" fill={visibleCategories.Hosting ? CATEGORY_COLORS.hosting : CATEGORY_COLORS.disabled} />
          <Bar dataKey="Support" stackId="a" fill={visibleCategories.Support ? CATEGORY_COLORS.support : CATEGORY_COLORS.disabled}>
            <LabelList
              dataKey="total"
              position="top"
              content={(props: any) => {
                const { x, y, width, value } = props;
                if (!value || value <= 0) return null;
                return (
                  <text x={x + width / 2} y={y - 5} fill="#374151" textAnchor="middle" fontSize="14" fontWeight="bold">
                    {value}
                  </text>
                );
              }}
            />
          </Bar>
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
  };

  // Render single period chart (bar chart showing category distribution)
  const renderSinglePeriodChart = () => {
    if (!categoryData) return null;

    const categoryKeys = Object.keys(CATEGORY_NAMES) as Array<keyof typeof CATEGORY_NAMES>;
    const chartData = categoryKeys.map(key => ({
      name: CATEGORY_NAMES[key],
      count: categoryData[key],
      fill: visibleCategories[CATEGORY_NAMES[key]]
        ? CATEGORY_COLORS[key]
        : CATEGORY_COLORS.disabled,
    })).filter(item => item.count > 0); // Only show categories with data

    // Calculate max value for Y-axis domain
    const maxValue = Math.max(...chartData.map(d => d.count));
    const yAxisMax = Math.ceil(maxValue * 1.1); // Add 10% padding

    return (
      <div style={{ width: '100%', minHeight: 500 }}>
        <ResponsiveContainer width="100%" height={500}>
          <ComposedChart
            data={chartData}
            layout="horizontal"
            margin={{ top: 20, right: 30, left: 10, bottom: 20 }}
          >
          <CartesianGrid {...CHART_STYLES.cartesianGrid} />
          <XAxis
            dataKey="name"
            tick={<CustomCategoryTick maxCharsPerLine={10} />}
            height={120}
            interval={0}
          />
          <YAxis
            domain={[0, yAxisMax]}
            allowDecimals={false}
            {...CHART_STYLES.yAxis}
          />
          <Tooltip
            cursor={false}
            content={({ active, payload, label }) => {
              if (active && payload && payload.length) {
                const data = payload[0].payload;
                const percentage = categoryData.total > 0
                  ? ((data.count / categoryData.total) * 100).toFixed(1)
                  : '0.0';

                return (
                  <div style={CHART_STYLES.tooltipContainer}>
                    <p style={CHART_STYLES.tooltipTitle}>{label}</p>
                    <p style={{ ...CHART_STYLES.tooltipItem, color: '#374151' }}>
                      Count: {data.count}
                    </p>
                    <p style={{ ...CHART_STYLES.tooltipItem, color: '#374151' }}>
                      Percentage: {percentage}%
                    </p>
                    <div style={CHART_STYLES.tooltipDivider}>
                      <p style={{ color: '#111827', fontSize: '12px' }}>
                        Total: {categoryData.total}
                      </p>
                    </div>
                  </div>
                );
              }
              return null;
            }}
          />
          <Bar dataKey="count" name="Count">
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.fill} />
            ))}
            <LabelList
              dataKey="count"
              position="top"
              style={{ fontSize: '14px', fontWeight: 'bold', fill: '#374151' }}
            />
          </Bar>
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
  };

  // Main render logic
  const renderTable = () => {
    return selectedMonth === 'all' && monthlyCategoryData && monthlyCategoryData.length > 0
      ? renderMonthlyTable()
      : renderSinglePeriodTable();
  };

  const renderChart = () => {
    return selectedMonth === 'all' && monthlyCategoryData && monthlyCategoryData.length > 0
      ? renderMonthlyChart()
      : renderSinglePeriodChart();
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
