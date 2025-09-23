import type { ChatRequest, DailyRequestCount, CategoryCount, CostCalculation } from '../types/request';
import { RATES, DEFAULT_HOURS } from '../config/pricing';

// Request data interface for processed data
export interface RequestData {
  date: string;
  time: string;
  category: string;
  urgency: 'HIGH' | 'MEDIUM' | 'LOW' | 'PROMOTION';
  effort: 'Small' | 'Medium' | 'Large';
  description: string;
}

// Categorize requests based on keywords
export function categorizeRequest(summary: string): string {
  const lowerSummary = summary.toLowerCase();
  
  if (lowerSummary.includes('form') || lowerSummary.includes('webhook')) return 'Forms';
  if (lowerSummary.includes('dns') || lowerSummary.includes('nameserver')) return 'DNS';
  if (lowerSummary.includes('migration') || lowerSummary.includes('migrate')) return 'Migration';
  if (lowerSummary.includes('hosting') || lowerSummary.includes('server')) return 'Hosting';
  if (lowerSummary.includes('email')) return 'Email';
  if (lowerSummary.includes('backup') || lowerSummary.includes('zip')) return 'Backup';
  if (lowerSummary.includes('license')) return 'Licensing';
  if (lowerSummary.includes('page') || lowerSummary.includes('content')) return 'Content';
  if (lowerSummary.includes('tag') || lowerSummary.includes('analytics')) return 'Analytics';
  
  return 'General Support';
}

// Process requests for daily counts
export function processDailyRequests(requests: ChatRequest[]): DailyRequestCount[] {
  const dailyCounts = new Map<string, DailyRequestCount>();

  requests.forEach(request => {
    const date = request.Date;

    if (!dailyCounts.has(date)) {
      dailyCounts.set(date, {
        date,
        count: 0,
        low: 0,
        medium: 0,
        high: 0
      });
    }

    const dayData = dailyCounts.get(date)!;
    dayData.count++;

    switch (request.Urgency) {
      case 'LOW':
        dayData.low++;
        break;
      case 'MEDIUM':
        dayData.medium++;
        break;
      case 'HIGH':
        dayData.high++;
        break;
      case 'PROMOTION':
        dayData.low++; // Count promotional as low priority for charting
        break;
      default:
        console.warn('Unknown urgency value:', request.Urgency);
        dayData.medium++; // Default to medium
        break;
    }
  });
  
  const result = Array.from(dailyCounts.values()).sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  
  console.log('Daily counts sample:', result.slice(0, 3));
  return result;
}

// Process category counts for pie chart
export function processCategoryData(requests: ChatRequest[]): CategoryCount[] {
  const categoryCounts = new Map<string, number>();
  
  requests.forEach(request => {
    const category = request.Category || categorizeRequest(request.Request_Summary);
    categoryCounts.set(category, (categoryCounts.get(category) || 0) + 1);
  });
  
  const total = requests.length;
  
  return Array.from(categoryCounts.entries())
    .map(([name, value]) => ({
      name,
      value,
      percentage: Math.round((value / total) * 100)
    }))
    .sort((a, b) => b.value - a.value);
}

// Calculate costs based on urgency and estimated hours
export function calculateCosts(requests: ChatRequest[]): CostCalculation {

  let regularHours = 0;
  let sameDayHours = 0;
  let emergencyHours = 0;
  let promotionalHours = 0;

  requests.forEach(request => {
    const hours = request.EstimatedHours != null ? request.EstimatedHours : DEFAULT_HOURS;

    switch (request.Urgency) {
      case 'LOW':
        regularHours += hours;
        break;
      case 'MEDIUM':
        sameDayHours += hours;
        break;
      case 'HIGH':
        emergencyHours += hours;
        break;
      case 'PROMOTION':
        promotionalHours += hours;
        break;
    }
  });

  const promotionalCost = promotionalHours * 125;
  const totalCost = (regularHours * RATES.regular) +
                    (sameDayHours * RATES.sameDay) +
                    (emergencyHours * RATES.emergency) +
                    promotionalCost;

  return {
    regularHours,
    sameDayHours,
    emergencyHours,
    promotionalHours,
    regularCost: regularHours * RATES.regular,
    sameDayCost: sameDayHours * RATES.sameDay,
    emergencyCost: emergencyHours * RATES.emergency,
    promotionalCost,
    totalCost
  };
}

