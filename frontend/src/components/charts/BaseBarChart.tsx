/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * BaseBarChart Component
 *
 * Reusable base component for all bar chart implementations.
 * Eliminates 90% of boilerplate code by providing a fully-configured
 * bar chart with standard styling, tooltips, legends, and interactions.
 *
 * Features:
 * - Automatic responsive sizing
 * - Consistent theme integration
 * - Configurable stacked or grouped bars
 * - Custom tooltip support
 * - Click handlers for interactivity
 * - Memoized for performance
 *
 * Usage:
 * ```typescript
 * <BaseBarChart
 *   data={monthlyData}
 *   bars={[
 *     { dataKey: 'low', name: 'Low Priority', fill: URGENCY_COLORS.low },
 *     { dataKey: 'medium', name: 'Medium Priority', fill: URGENCY_COLORS.medium },
 *   ]}
 *   xAxisKey="month"
 *   yAxisConfig={{ formatter: formatChartCurrency }}
 * />
 * ```
 */

import { memo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { CHART_THEME, CHART_HEIGHTS, CHART_MARGINS } from '../../config/chartConfig';
import type { ChartHeight, ChartMargin } from '../../config/chartConfig';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Configuration for a single bar in the chart
 */
export interface BarConfig {
  /** Data key to map to data objects */
  dataKey: string;
  /** Display name for legend */
  name: string;
  /** Fill color (hex, rgb, or hsl) */
  fill: string;
  /** Stack ID for stacked bars (bars with same stackId will stack) */
  stackId?: string;
  /** Radius for bar corners [topLeft, topRight, bottomRight, bottomLeft] */
  radius?: number | [number, number, number, number];
  /** Whether this bar is hidden */
  hide?: boolean;
  /** Custom click handler for this specific bar */
  onClick?: (data: any, index: number) => void;
}

/**
 * Y-axis configuration options
 */
export interface YAxisConfig {
  /** Custom formatter function for Y-axis labels */
  formatter?: (value: number) => string;
  /** Fixed domain [min, max] - if not provided, auto-calculated */
  domain?: [number, number];
  /** Allow decimal values on Y-axis (default: false) */
  allowDecimals?: boolean;
  /** Number of ticks to display */
  tickCount?: number;
  /** Custom tick values */
  ticks?: number[];
}

/**
 * X-axis configuration options
 */
export interface XAxisConfig {
  /** Angle for rotated labels (default: 0) */
  angle?: number;
  /** Text anchor for rotated labels */
  textAnchor?: 'start' | 'middle' | 'end';
  /** Height for X-axis area (useful for rotated labels) */
  height?: number;
  /** Interval for displaying labels (0 = all, 1 = every other, etc.) */
  interval?: number | 'preserveStart' | 'preserveEnd' | 'preserveStartEnd';
  /** Hide X-axis completely */
  hide?: boolean;
}

/**
 * Base Bar Chart Props
 */
export interface BaseBarChartProps {
  /** Chart data - array of objects */
  data: any[];

  /** Bar configurations */
  bars: BarConfig[];

  /** Key for X-axis data */
  xAxisKey: string;

  /** Y-axis configuration */
  yAxisConfig?: YAxisConfig;

  /** X-axis configuration */
  xAxisConfig?: XAxisConfig;

  /** Chart height preset or custom number */
  height?: ChartHeight | number;

  /** Chart margin preset or custom object */
  margin?: ChartMargin | { top: number; right: number; left: number; bottom: number };

  /** Show legend (default: true) */
  showLegend?: boolean;

  /** Custom tooltip component */
  customTooltip?: React.ComponentType<any>;

  /** Click handler for bars (receives data and index) */
  onBarClick?: (data: any, index: number) => void;

  /** Additional CSS class for container */
  className?: string;

  /** Minimum height for responsive container */
  minHeight?: number;

  /** Enable animation (default: true) */
  animate?: boolean;

  /** Sync ID for synchronized charts */
  syncId?: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * BaseBarChart - Memoized bar chart component
 */
export const BaseBarChart = memo(function BaseBarChart({
  data,
  bars,
  xAxisKey,
  yAxisConfig = {},
  xAxisConfig = {},
  height = 'standard',
  margin = 'standard',
  showLegend = true,
  customTooltip,
  onBarClick,
  className = '',
  minHeight,
  animate = true,
  syncId,
}: BaseBarChartProps) {
  // Resolve height from preset or use custom value
  const resolvedHeight = typeof height === 'string'
    ? CHART_HEIGHTS[height]
    : height;

  // Resolve margin from preset or use custom value
  const resolvedMargin = typeof margin === 'string'
    ? CHART_MARGINS[margin]
    : margin;

  // Calculate minimum height
  const containerMinHeight = minHeight || resolvedHeight;

  // Y-axis configuration with defaults
  const {
    formatter,
    domain,
    allowDecimals = false,
    tickCount,
    ticks,
  } = yAxisConfig;

  // X-axis configuration with defaults
  const {
    angle = 0,
    textAnchor = angle !== 0 ? 'end' : 'middle',
    height: xAxisHeight,
    interval = 0,
    hide: hideXAxis = false,
  } = xAxisConfig;

  // Handle bar click events
  const handleBarClick = (data: any, index: number, barConfig: BarConfig) => {
    // Call bar-specific handler if provided
    if (barConfig.onClick) {
      barConfig.onClick(data, index);
    }
    // Call global handler if provided
    if (onBarClick) {
      onBarClick(data, index);
    }
  };

  return (
    <div
      className={`w-full ${className}`}
      style={{ height: `${containerMinHeight}px` }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={resolvedMargin}
          syncId={syncId}
        >
          {/* Grid */}
          <CartesianGrid {...CHART_THEME.cartesianGrid} />

          {/* X Axis */}
          {!hideXAxis && (
            <XAxis
              dataKey={xAxisKey}
              angle={angle}
              textAnchor={textAnchor}
              height={xAxisHeight}
              interval={interval}
              {...CHART_THEME.xAxis}
            />
          )}

          {/* Y Axis */}
          <YAxis
            allowDecimals={allowDecimals}
            tickFormatter={formatter}
            domain={domain}
            tickCount={tickCount}
            ticks={ticks}
            {...CHART_THEME.yAxis}
          />

          {/* Tooltip */}
          {customTooltip ? (
            <Tooltip content={customTooltip as any} cursor={CHART_THEME.cursor.bar} />
          ) : (
            <Tooltip {...CHART_THEME.tooltip} cursor={CHART_THEME.cursor.bar} />
          )}

          {/* Legend */}
          {showLegend && <Legend {...CHART_THEME.legend} />}

          {/* Bars */}
          {bars.filter(bar => !bar.hide).map((barConfig) => (
            <Bar
              key={barConfig.dataKey}
              dataKey={barConfig.dataKey}
              name={barConfig.name}
              fill={barConfig.fill}
              stackId={barConfig.stackId}
              radius={barConfig.radius || 0}
              isAnimationActive={animate}
              onClick={(data, index) => handleBarClick(data, index, barConfig)}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison for memo optimization
  // Only re-render if data, bars, or key configs change
  return (
    prevProps.data === nextProps.data &&
    prevProps.bars === nextProps.bars &&
    prevProps.xAxisKey === nextProps.xAxisKey &&
    prevProps.height === nextProps.height &&
    prevProps.showLegend === nextProps.showLegend
  );
});

// ============================================================================
// DISPLAY NAME
// ============================================================================

BaseBarChart.displayName = 'BaseBarChart';
