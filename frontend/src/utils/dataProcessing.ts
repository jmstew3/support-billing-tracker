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
    const hours = request.EstimatedHours || DEFAULT_HOURS;

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

// Load data from CSV file with version priority
export const loadRequestData = async (): Promise<{
  data: RequestData[];
  version: string;
  isWorking: boolean;
}> => {
  console.log('Starting data load...');
  
  try {
    let response;
    let version = 'original';
    let isWorking = false;
    
    // Try working version via API first, fall back to original from public
    try {
      console.log('Attempting to load working version via API...');
      response = await fetch('http://localhost:3001/api/load-csv/thad_requests_working.csv');
      
      if (response.ok) {
        version = 'working';
        isWorking = true;
        console.log('Successfully loaded working version from data directory');
      } else {
        throw new Error(`Working version not available: ${response.status}`);
      }
    } catch (error) {
      console.log('Working version not available, falling back to original:', (error as Error).message);
      // Fall back to original table from public directory
      response = await fetch('/thad_requests_table.csv');
      if (!response.ok) {
        throw new Error(`HTTP error loading original! status: ${response.status}`);
      }
      console.log('Loading original dataset from public directory');
    }
    const csvText = await response.text();
    console.log('CSV text length:', csvText.length);
    console.log('First 200 chars:', csvText.substring(0, 200));
    
    const lines = csvText.split('\n');
    console.log('Total lines:', lines.length);
    // Headers: date,time,month,request_type,category,description,urgency,effort
    
    const data: RequestData[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      // Parse CSV line - handle quoted fields
      const values = parseCSVLine(line);
      if (values.length >= 8 && values[0]) {
        // Normalize urgency to uppercase
        const normalizeUrgency = (urgency: string): 'HIGH' | 'MEDIUM' | 'LOW' | 'PROMOTION' => {
          const upper = urgency.toUpperCase();
          if (upper === 'HIGH') return 'HIGH';
          if (upper === 'LOW') return 'LOW';
          if (upper === 'PROMOTION' || upper === 'PROMOTIONAL') return 'PROMOTION';
          return 'MEDIUM';
        };

        data.push({
          date: values[0],           // date
          time: values[1],           // time
          category: values[4] || 'Support',  // category
          urgency: normalizeUrgency(values[6] || 'MEDIUM'), // urgency
          effort: (values[7] as 'Small' | 'Medium' | 'Large') || 'Medium', // effort
          description: values[5] || '', // description
        });
      }
    }
    
    console.log(`Loaded ${data.length} requests from CSV (${version})`);
    console.log('Sample urgency values:', data.slice(0, 10).map(r => r.urgency));
    
    return {
      data,
      version,
      isWorking
    };
  } catch (error) {
    console.error('Error loading request data:', error);
    return {
      data: [],
      version: 'error',
      isWorking: false
    };
  }
};

// Simple CSV parser that handles quoted fields
function parseCSVLine(line: string): string[] {
  const result = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  
  return result.map(field => field.replace(/^"|"$/g, ''));
}
