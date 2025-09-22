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
}
