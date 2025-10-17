/**
 * Chart Configuration - Single Source of Truth
 *
 * Centralized configuration for all Recharts components in the application.
 * Provides consistent styling, theming, and behavior across all chart types.
 *
 * Usage:
 * ```typescript
 * import { CHART_THEME, URGENCY_COLORS } from '@/config/chartConfig';
 *
 * <BarChart data={data}>
 *   <CartesianGrid {...CHART_THEME.cartesianGrid} />
 *   <XAxis {...CHART_THEME.xAxis} />
 *   <YAxis {...CHART_THEME.yAxis} />
 *   <Bar fill={URGENCY_COLORS.high} />
 * </BarChart>
 * ```
 */

// ============================================================================
// RECHARTS BASE CONFIGURATION
// ============================================================================

/**
 * Standard Recharts component configurations
 * Uses CSS variables for theming support (dark mode compatible)
 */
export const CHART_THEME = {
  /**
   * CartesianGrid - Background grid lines
   * Sharp edges, no dashed lines, vertical lines hidden
   */
  cartesianGrid: {
    strokeDasharray: '0',
    stroke: 'hsl(var(--border))',
    vertical: false,
  },

  /**
   * XAxis - Horizontal axis configuration
   * Small font, no tick lines, sharp edges
   */
  xAxis: {
    stroke: 'hsl(var(--muted-foreground))',
    fontSize: 10,
    tickLine: false,
    axisLine: { stroke: 'hsl(var(--border))' },
  },

  /**
   * YAxis - Vertical axis configuration
   * Small font, no tick lines, sharp edges
   */
  yAxis: {
    stroke: 'hsl(var(--muted-foreground))',
    fontSize: 10,
    tickLine: false,
    axisLine: { stroke: 'hsl(var(--border))' },
  },

  /**
   * Tooltip - Standard tooltip styling
   * Sharp edges, consistent padding
   */
  tooltip: {
    contentStyle: {
      fontSize: '0.875rem',
      padding: '8px 12px',
      borderRadius: '6px',
    },
  },

  /**
   * Legend - Standard legend styling
   * Small font, compact spacing
   */
  legend: {
    wrapperStyle: { fontSize: '11px', paddingTop: '10px' },
    iconSize: 10,
    iconType: 'square' as const,
  },

  /**
   * Container - ResponsiveContainer defaults
   */
  container: {
    minHeight: 250,
    defaultHeight: 300,
    margin: { top: 10, right: 10, left: 10, bottom: 5 },
  },

  /**
   * Cursor - Hover/interaction styling
   */
  cursor: {
    bar: { fill: 'hsl(var(--muted))', opacity: 0.3 },
    line: { stroke: 'hsl(var(--border))', strokeWidth: 1, strokeDasharray: '4 4' },
  },
} as const;

// ============================================================================
// COLOR PALETTES
// ============================================================================

/**
 * Urgency Level Colors
 * Used in support ticket charts for priority visualization
 */
export const URGENCY_COLORS = {
  promotion: '#8b5cf6', // Purple - Promotional rate
  low: '#10b981',       // Green - Low priority
  medium: '#f59e0b',    // Amber - Medium priority
  high: '#ef4444',      // Red - High priority
  emergency: '#dc2626', // Dark red - Emergency
} as const;

/**
 * Project Category Colors
 * Used in project revenue charts for category visualization
 * Vibrant muted colors for sharp flat design
 */
export const CATEGORY_COLORS = {
  MIGRATION: 'hsl(217, 91%, 60%)',      // Blue
  LANDING_PAGE: 'hsl(142, 76%, 36%)',   // Green
  WEBSITE: 'hsl(45, 93%, 47%)',         // Yellow
  MULTI_FORM: 'hsl(27, 87%, 67%)',      // Orange
  BASIC_FORM: 'hsl(262, 52%, 47%)',     // Purple
} as const;

/**
 * Revenue Source Colors
 * Used in dashboard billing overview charts
 */
export const REVENUE_COLORS = {
  tickets: 'hsl(217, 91%, 60%)',   // Blue - Support tickets
  projects: 'hsl(45, 93%, 47%)',   // Yellow - Projects
  hosting: 'hsl(142, 76%, 36%)',   // Green - Hosting MRR
} as const;

/**
 * Hosting Type Colors
 * Used in hosting distribution charts
 */
export const HOSTING_COLORS = {
  websites: 'hsl(var(--foreground))',
  landingPages: 'hsl(var(--muted-foreground))',
} as const;

/**
 * Billing Type Colors
 * Used in hosting billing type breakdown
 */
export const BILLING_TYPE_COLORS = {
  full: 'hsl(142, 76%, 36%)',          // Green - Full month
  proratedStart: 'hsl(217, 91%, 60%)', // Blue - Prorated start
  proratedEnd: 'hsl(27, 87%, 67%)',    // Orange - Prorated end
  inactive: 'hsl(215, 16%, 47%)',      // Slate - Inactive
} as const;

// ============================================================================
// CHART DEFAULTS
// ============================================================================

/**
 * Default chart heights for different contexts
 */
export const CHART_HEIGHTS = {
  compact: 200,
  standard: 300,
  large: 400,
  tracker: 250, // For tracker cards
} as const;

/**
 * Default margin configurations
 */
export const CHART_MARGINS = {
  standard: { top: 10, right: 10, left: 10, bottom: 5 },
  withLegend: { top: 10, right: 10, left: 10, bottom: 25 },
  compact: { top: 5, right: 5, left: 5, bottom: 5 },
  leftAligned: { top: 10, right: 10, left: -20, bottom: 5 },
} as const;

/**
 * Animation configuration
 */
export const CHART_ANIMATION = {
  duration: 300,
  easing: 'ease-in-out' as const,
  enabled: true,
} as const;

// ============================================================================
// RESPONSIVE BREAKPOINTS
// ============================================================================

/**
 * Chart responsive behavior breakpoints
 * Matches Tailwind CSS breakpoints
 */
export const CHART_BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
} as const;

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type UrgencyColor = keyof typeof URGENCY_COLORS;
export type CategoryColor = keyof typeof CATEGORY_COLORS;
export type RevenueColor = keyof typeof REVENUE_COLORS;
export type HostingColor = keyof typeof HOSTING_COLORS;
export type BillingTypeColor = keyof typeof BILLING_TYPE_COLORS;
export type ChartHeight = keyof typeof CHART_HEIGHTS;
export type ChartMargin = keyof typeof CHART_MARGINS;
