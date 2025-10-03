import { useState, type ReactNode } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { ToggleGroup } from '../ui/toggle-group';

/**
 * DataTrackerCard - Base component for all tracker cards
 *
 * This component owns ALL styling for tracker cards to ensure visual consistency.
 * Child components (CostTrackerCard, RevenueTrackerCard, etc.) provide data-specific
 * rendering logic via render props.
 *
 * Features:
 * - Consistent Card layout with header and content
 * - Table/Chart toggle with shared styling
 * - Badge support for additional metadata
 * - Flexible content rendering via render props
 *
 * @example
 * <DataTrackerCard
 *   title="My Tracker"
 *   description="Monthly breakdown"
 *   renderTable={() => <MyTableComponent />}
 *   renderChart={() => <MyChartComponent />}
 * />
 */

export interface DataTrackerCardProps {
  /** Card title */
  title: string;

  /** Card description (appears below title) */
  description: string;

  /** Optional badge to display next to title (e.g., free hours indicator) */
  badge?: ReactNode;

  /** Function that renders the table view */
  renderTable: () => ReactNode;

  /** Function that renders the chart view */
  renderChart: () => ReactNode;

  /** Initial view type (default: 'table') */
  initialViewType?: 'table' | 'chart';

  /** Optional CSS class for grid sizing (default: 'lg:col-span-2 xl:col-span-3') */
  gridSpan?: string;
}

/**
 * Base DataTrackerCard Component
 *
 * IMPORTANT: This component owns ALL styling. Do not add styles to child components.
 *
 * Shared Styling:
 * - Card: flex layout, full height, responsive grid span
 * - Header: consistent padding, title/description/badge layout
 * - Toggle: Table/Chart switcher with sm size
 * - Content: flex-1 for full height utilization
 */
export function DataTrackerCard({
  title,
  description,
  badge,
  renderTable,
  renderChart,
  initialViewType = 'table',
  gridSpan = 'lg:col-span-2 xl:col-span-3',
}: DataTrackerCardProps) {
  const [viewType, setViewType] = useState<'table' | 'chart'>(initialViewType);

  return (
    <Card className={`flex flex-col h-full ${gridSpan}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <CardTitle>{title}</CardTitle>
              {badge}
            </div>
            <CardDescription className="text-xs mt-1">
              {description}
            </CardDescription>
          </div>
          <ToggleGroup
            options={[
              { value: 'table', label: 'Table' },
              { value: 'chart', label: 'Chart' }
            ]}
            value={viewType}
            onValueChange={(value) => setViewType(value as 'table' | 'chart')}
            size="sm"
          />
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col">
        {viewType === 'table' ? renderTable() : renderChart()}
      </CardContent>
    </Card>
  );
}

/**
 * Shared table styling constants
 * Use these in your renderTable() functions to ensure consistency
 */
export const TABLE_STYLES = {
  // Container
  container: 'overflow-x-auto flex-1',
  table: 'w-full',

  // Header
  headerRow: 'border-b border-border',
  headerCell: 'text-left py-4 px-4 font-semibold text-sm',
  headerCellWithBorder: 'text-left py-4 px-4 font-semibold text-sm border-l border-border/40',

  // Body
  row: 'border-b border-border/40 hover:bg-muted/30',
  rowHighlight: 'bg-muted/50 font-semibold',
  rowSuccess: 'bg-green-50 dark:bg-green-950/20 border-b',
  cell: 'py-5 px-4',
  cellWithBorder: 'py-5 px-4 text-left border-l border-border/40',
  cellSmall: 'py-3 px-4 text-sm',
  cellBold: 'py-5 px-4 font-semibold text-left',
  cellBoldWithBorder: 'py-5 px-4 font-semibold text-left border-l border-border/40',

  // Special cells
  totalRow: 'bg-gray-50 dark:bg-gray-800/50 font-bold',
  badge: 'inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-black dark:bg-white text-white dark:text-black',
  successText: 'text-green-600 dark:text-green-400 font-semibold text-sm',

  // Row number column
  headerCellNumber: 'text-center py-4 px-2 font-semibold text-sm w-8',
  cellNumber: 'text-center py-5 px-2 text-muted-foreground w-8',
} as const;

/**
 * Shared chart styling constants
 * Use these in your renderChart() functions to ensure consistency
 */
export const CHART_STYLES = {
  // Standardized color palettes
  barColors: {
    // Revenue categories (RevenueTrackerCard)
    tickets: '#3B82F6',     // Blue
    projects: '#F59E0B',    // Orange
    hosting: '#10B981',     // Green

    // Urgency levels (CostTrackerCard)
    promotion: '#8B5CF6',   // Purple - special promotional rate
    low: '#3B82F6',        // Blue - low urgency
    medium: '#F59E0B',     // Orange - medium urgency
    high: '#EF4444',       // Red - high urgency

    // State colors
    disabled: '#D1D5DB',    // Gray for disabled/filtered items

    // Alternative palettes for future use
    primary: ['#3B82F6', '#60A5FA', '#93BBFC'],   // Blues
    secondary: ['#F59E0B', '#FBBF24', '#FCD34D'],  // Oranges
    tertiary: ['#10B981', '#34D399', '#6EE7B7'],   // Greens
    quaternary: ['#8B5CF6', '#A78BFA', '#C4B5FD'], // Purples
    danger: ['#EF4444', '#F87171', '#FCA5A5'],     // Reds
  },

  // Bar chart configuration
  barChart: {
    barCategoryGap: '20%',
    maxBarSize: 100,
  },

  // Recharts styling
  cartesianGrid: {
    strokeDasharray: '3 3',
    stroke: '#E5E7EB',
    className: 'dark:stroke-gray-700',
  },

  xAxis: {
    tick: { fill: '#374151' },
    className: 'dark:[&_text]:fill-gray-300',
  },

  yAxis: {
    tick: { fill: '#374151' },
    className: 'dark:[&_text]:fill-gray-300',
  },

  yAxisSecondary: {
    tick: { fill: '#6B7280' },
    className: 'dark:[&_text]:fill-gray-400',
  },

  // Tooltip styling
  tooltipContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    border: '1px solid #E5E7EB',
    borderRadius: '6px',
    padding: '10px',
  },

  tooltipTitle: {
    color: '#111827',
    fontWeight: 'bold',
    marginBottom: '8px',
  } as React.CSSProperties,

  tooltipItem: {
    margin: '4px 0',
  } as React.CSSProperties,

  tooltipDivider: {
    borderTop: '1px solid #E5E7EB',
    marginTop: '8px',
    paddingTop: '8px',
  } as React.CSSProperties,

  // Legend styling
  legendWrapper: {
    paddingTop: '20px',
  },

  legendList: {
    listStyle: 'none',
    margin: 0,
    padding: 0,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '20px',
  } as React.CSSProperties,

  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    userSelect: 'none' as const,
  },

  legendIcon: (isVisible: boolean) => ({
    display: 'inline-block',
    width: '14px',
    height: '14px',
    borderRadius: '4px',
    opacity: isVisible ? 1 : 0.5,
  }),

  legendText: (isVisible: boolean) => ({
    color: isVisible ? '#374151' : '#9CA3AF',
  }),

  // Reset button
  resetButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    cursor: 'pointer',
    padding: '2px 10px',
    borderRadius: '4px',
    fontSize: '13px',
    color: '#6B7280',
    backgroundColor: 'transparent',
    transition: 'all 0.2s ease',
    userSelect: 'none' as const,
    border: '1px solid transparent',
  },
} as const;
