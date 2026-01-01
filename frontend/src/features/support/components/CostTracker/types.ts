/**
 * Cost data for a single period
 */
export interface CostData {
  promotionalHours: number;
  promotionalCost: number;
  regularHours: number;
  regularCost: number;
  sameDayHours: number;
  sameDayCost: number;
  emergencyHours: number;
  emergencyCost: number;
  totalCost: number;
  grossTotalCost?: number;
  netTotalCost?: number;
  freeHoursApplied?: number;
  freeHoursSavings?: number;
  // Net costs per category (after free hours)
  regularNetCost?: number;
  sameDayNetCost?: number;
  emergencyNetCost?: number;
  promotionalNetCost?: number;
  // Free hours applied per category
  regularFreeHours?: number;
  sameDayFreeHours?: number;
  emergencyFreeHours?: number;
  promotionalFreeHours?: number;
}

/**
 * Monthly cost data with metadata
 */
export interface MonthlyCostData {
  month: string;
  year: number;
  costs: CostData;
}

/**
 * Props for CostTrackerCard component
 */
export interface CostTrackerCardProps {
  /** Single period cost data (when viewing a specific month) */
  costData?: CostData;
  /** Monthly breakdown cost data (when viewing all months) */
  monthlyCosts?: MonthlyCostData[];
  /** Selected month ('all' for yearly view, or month number) */
  selectedMonth: number | 'all';
  /** Selected year */
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
 * Props for table body components
 */
export interface CostTableBodyProps {
  costData?: CostData;
  monthlyCosts?: MonthlyCostData[];
  selectedMonth: number | 'all';
}

/**
 * Props for chart section components
 */
export interface CostChartSectionProps {
  costData?: CostData;
  monthlyCosts?: MonthlyCostData[];
  selectedMonth: number | 'all';
  visibleUrgencies: Record<string, boolean>;
  toggleUrgency: (urgency: string) => void;
  resetFilters: () => void;
  isModified: boolean;
}

/**
 * Chart data point for monthly chart
 */
export interface MonthlyChartData {
  month: string;
  Promotion: number;
  Low: number;
  Medium: number;
  High: number;
  totalCost: number;
  netTotalCost: number;
  freeHoursApplied: number;
  freeHoursSavings: number;
  totalHours: number;
}

/**
 * Chart data point for single period chart
 */
export interface SinglePeriodChartData {
  name: string;
  hours: number;
  cost: number;
  visible: boolean;
}

/**
 * Urgency level keys
 */
export const URGENCY_LEVELS = ['Promotion', 'Low', 'Medium', 'High'] as const;
export type UrgencyLevel = (typeof URGENCY_LEVELS)[number];
