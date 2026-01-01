export interface ChatRequest {
  id?: number; // Optional ID from database
  Date: string;
  Time: string;
  Request_Summary: string;
  Urgency: 'HIGH' | 'MEDIUM' | 'LOW' | 'PROMOTION';
  Category?: string;
  EstimatedHours?: number;
  Status?: 'active' | 'deleted' | 'ignored';
  Request_Type?: string;
  Month?: string;
  Effort?: string;
  source?: 'sms' | 'ticket' | 'email' | 'phone' | 'fluent'; // Data source - defaults to 'sms' for existing data
  website_url?: string | null; // Website URL extracted from FluentSupport tickets
  BillingDate?: string | null; // YYYY-MM-DD format, null = use original Date for billing
}

export interface DailyRequestCount {
  date: string;
  count: number;
  low: number;
  medium: number;
  high: number;
}

export interface CategoryCount {
  name: string;
  value: number;
  percentage: number;
}

export interface CostCalculation {
  regularHours: number;
  sameDayHours: number;
  emergencyHours: number;
  promotionalHours: number;
  regularCost: number;
  sameDayCost: number;
  emergencyCost: number;
  promotionalCost: number;
  totalCost: number;
  // Free hours tracking (June 2025+)
  grossTotalCost: number;        // Cost before free hours
  freeHoursApplied: number;      // Hours credited (0-10)
  freeHoursSavings: number;      // Dollar savings from free hours
  netTotalCost: number;          // Cost after free hours (actual billable)

  // Net costs per category (after free hours deduction)
  regularNetCost?: number;       // Regular/Low urgency net cost
  sameDayNetCost?: number;       // Same Day/Medium urgency net cost
  emergencyNetCost?: number;     // Emergency/High urgency net cost
  promotionalNetCost?: number;   // Promotional net cost

  // Free hours applied per category
  regularFreeHours?: number;     // Free hours applied to Regular/Low
  sameDayFreeHours?: number;     // Free hours applied to Same Day/Medium
  emergencyFreeHours?: number;   // Free hours applied to Emergency/High
  promotionalFreeHours?: number; // Free hours applied to Promotional
}
