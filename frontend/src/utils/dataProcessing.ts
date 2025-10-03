import type { ChatRequest, DailyRequestCount, CategoryCount, CostCalculation } from '../types/request';
import { RATES, DEFAULT_HOURS, FREE_HOURS_PER_MONTH, FREE_HOURS_START_DATE } from '../config/pricing';

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

// Helper function to parse time string to minutes since midnight
// Converts "8:47 AM" or "11:30 PM" format to comparable numeric value
// Used for chronological sorting of requests within the same day
function parseTimeToMinutes(time: string): number {
  const [timePart, period] = time.split(' ');
  const [hours, minutes] = timePart.split(':').map(Number);

  let totalMinutes = 0;
  if (period === 'PM' && hours !== 12) {
    totalMinutes = (hours + 12) * 60 + minutes;
  } else if (period === 'AM' && hours === 12) {
    totalMinutes = minutes; // 12 AM is midnight (0:00)
  } else {
    totalMinutes = hours * 60 + minutes;
  }

  return totalMinutes;
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
// Optionally applies free hours policy if month is provided and >= June 2025
export function calculateCosts(requests: ChatRequest[], month?: string): CostCalculation {

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

  const promotionalCost = promotionalHours * RATES.promotion;
  const regularCost = regularHours * RATES.regular;
  const sameDayCost = sameDayHours * RATES.sameDay;
  const emergencyCost = emergencyHours * RATES.emergency;
  const grossTotalCost = regularCost + sameDayCost + emergencyCost + promotionalCost;

  // Check if free hours policy applies (June 2025 onwards)
  const applyFreeHours = month && month >= FREE_HOURS_START_DATE;

  let freeHoursApplied = 0;
  let freeHoursSavings = 0;

  // Track free hours by category
  let promotionalFreeHours = 0;
  let regularFreeHours = 0;
  let sameDayFreeHours = 0;
  let emergencyFreeHours = 0;

  if (applyFreeHours && requests.length > 0) {
    // Sort requests chronologically: by date first, then by time
    // This ensures the first 10 hours of work each month receive the free hours credit
    // Matches the Dashboard calculation for consistency
    const sortedRequests = [...requests].sort((a, b) => {
      // First, compare dates (YYYY-MM-DD format sorts correctly as strings)
      if (a.Date !== b.Date) {
        return a.Date.localeCompare(b.Date);
      }
      // If same date, compare times (convert to minutes for accurate comparison)
      return parseTimeToMinutes(a.Time) - parseTimeToMinutes(b.Time);
    });

    let remainingFreeHours = FREE_HOURS_PER_MONTH;

    // Apply free hours to each request
    for (const request of sortedRequests) {
      if (remainingFreeHours <= 0) break;

      const requestHours = request.EstimatedHours != null ? request.EstimatedHours : DEFAULT_HOURS;
      const rate = request.Urgency === 'PROMOTION' ? RATES.promotion :
                   request.Urgency === 'LOW' ? RATES.regular :
                   request.Urgency === 'MEDIUM' ? RATES.sameDay :
                   RATES.emergency;

      // Calculate how many free hours to apply to this request
      const freeHoursForRequest = Math.min(requestHours, remainingFreeHours);
      const savings = freeHoursForRequest * rate;

      // Track free hours by urgency category
      switch (request.Urgency) {
        case 'PROMOTION':
          promotionalFreeHours += freeHoursForRequest;
          break;
        case 'LOW':
          regularFreeHours += freeHoursForRequest;
          break;
        case 'MEDIUM':
          sameDayFreeHours += freeHoursForRequest;
          break;
        case 'HIGH':
          emergencyFreeHours += freeHoursForRequest;
          break;
      }

      freeHoursApplied += freeHoursForRequest;
      freeHoursSavings += savings;
      remainingFreeHours -= freeHoursForRequest;
    }
  }

  // Calculate net costs per category
  const promotionalNetCost = promotionalCost - (promotionalFreeHours * RATES.promotion);
  const regularNetCost = regularCost - (regularFreeHours * RATES.regular);
  const sameDayNetCost = sameDayCost - (sameDayFreeHours * RATES.sameDay);
  const emergencyNetCost = emergencyCost - (emergencyFreeHours * RATES.emergency);

  const netTotalCost = grossTotalCost - freeHoursSavings;

  return {
    regularHours,
    sameDayHours,
    emergencyHours,
    promotionalHours,
    regularCost,
    sameDayCost,
    emergencyCost,
    promotionalCost,
    totalCost: grossTotalCost, // Keep for backward compatibility
    grossTotalCost,
    freeHoursApplied,
    freeHoursSavings,
    netTotalCost,
    // Net costs per category (only included when free hours are applied)
    ...(applyFreeHours ? {
      regularNetCost,
      sameDayNetCost,
      emergencyNetCost,
      promotionalNetCost,
      regularFreeHours,
      sameDayFreeHours,
      emergencyFreeHours,
      promotionalFreeHours
    } : {})
  };
}

