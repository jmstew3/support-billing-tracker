export interface ChatRequest {
  Date: string;
  Time: string;
  Request_Summary: string;
  Urgency: 'HIGH' | 'MEDIUM' | 'LOW';
  Category?: string;
  EstimatedHours?: number;
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
  regularCost: number;
  sameDayCost: number;
  emergencyCost: number;
  totalCost: number;
}
