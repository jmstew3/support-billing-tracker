/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Hosting API Service
 *
 * Handles fetching website properties from Twenty CRM and calculating
 * monthly hosting billing with proration and free credit system.
 */

import type {
  WebsiteProperty,
  HostingCharge,
  MonthlyHostingSummary,
  CreditProgress,
  BillingType,
} from '../types/websiteProperty';

// Import authenticatedFetch for JWT token handling
import { authenticatedFetch } from '../utils/api';
import { ENDPOINTS, STANDARD_MRR } from '../config/apiConfig';

// Use centralized API configuration (single source of truth)
const TWENTY_API_URL = ENDPOINTS.WEBSITE_PROPERTIES;

/**
 * Fetch all website properties from Twenty CRM
 */
export async function fetchWebsiteProperties(): Promise<WebsiteProperty[]> {
  try {
    // Use authenticatedFetch to include JWT token
    const response = await authenticatedFetch(`${TWENTY_API_URL}?depth=1&limit=500`, {
      method: 'GET',
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    // Twenty CRM returns array directly: { data: { websiteProperties: [...] } }
    const rawProperties = data?.data?.websiteProperties || [];

    // Map to our interface, filtering out properties without required fields
    const properties: WebsiteProperty[] = rawProperties
      .filter((prop: any) => prop.id && prop.name)
      .map((prop: any) => ({
        id: prop.id,
        name: prop.name,
        websiteUrl: prop.websiteUrl || null,
        hostingStart: prop.hostingStart || null,
        hostingEnd: prop.hostingEnd || null,
        hostingMrrAmount: prop.hostingMrrAmount || null,
        hostingStatus: prop.hostingStatus || 'INACTIVE',
        parentCompanyId: prop.parentCompanyId || null, // Company link for filtering by client
      }));

    return properties;
  } catch (error) {
    console.error('Failed to fetch website properties:', error);
    throw error;
  }
}

/**
 * Get number of days in a given month
 */
function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

/**
 * Determine billing type for a site in a given month
 */
function determineBillingType(
  hostingStart: string | null,
  hostingEnd: string | null,
  targetMonth: string
): BillingType {
  // Sites without hosting start date are inactive
  if (!hostingStart) {
    return 'INACTIVE';
  }

  const [targetYear, targetMonthNum] = targetMonth.split('-').map(Number);
  const monthStart = new Date(targetYear, targetMonthNum - 1, 1);
  const monthEnd = new Date(targetYear, targetMonthNum, 0);

  const startDate = new Date(hostingStart);
  const endDate = hostingEnd ? new Date(hostingEnd) : null;

  // Check if site is inactive (ended before this month)
  if (endDate && endDate < monthStart) {
    return 'INACTIVE';
  }

  // Check if site hasn't started yet
  if (startDate > monthEnd) {
    return 'INACTIVE';
  }

  // Extract start month for comparison (YYYY-MM format)
  const startMonth = hostingStart.substring(0, 7); // "2025-06-01T..." -> "2025-06"
  const endMonth = hostingEnd ? hostingEnd.substring(0, 7) : null;

  // Prorated start: Only in the FIRST month of hosting AND started mid-month (not on 1st)
  const isFirstMonth = startMonth === targetMonth;
  const startDay = parseInt(hostingStart.substring(8, 10)); // Extract day directly to avoid timezone issues
  const startedMidMonth = startDay > 1;

  // Prorated end: Only in the LAST month of hosting AND ended mid-month (not on last day)
  const isLastMonth = endMonth === targetMonth;
  const endDay = hostingEnd ? parseInt(hostingEnd.substring(8, 10)) : 0; // Extract day directly
  const lastDayOfMonth = monthEnd.getDate();
  const endedMidMonth = endDay > 0 && endDay < lastDayOfMonth;

  // Both start and end in same month
  if (isFirstMonth && isLastMonth) {
    return 'PRORATED_START'; // Will calculate days between start and end
  }

  // Started mid-month in this month
  if (isFirstMonth && startedMidMonth) {
    return 'PRORATED_START';
  }

  // Ended mid-month in this month
  if (isLastMonth && endedMidMonth) {
    return 'PRORATED_END';
  }

  // Full month billing
  return 'FULL';
}

/**
 * Calculate days active for a site in a given month
 */
function calculateDaysActive(
  hostingStart: string | null,
  hostingEnd: string | null,
  targetMonth: string,
  billingType: BillingType
): number {
  if (billingType === 'INACTIVE' || !hostingStart) {
    return 0;
  }

  const [targetYear, targetMonthNum] = targetMonth.split('-').map(Number);
  const daysInMonth = getDaysInMonth(targetYear, targetMonthNum);

  const endDate = hostingEnd ? new Date(hostingEnd) : null;

  if (billingType === 'FULL') {
    return daysInMonth;
  }

  if (billingType === 'PRORATED_START') {
    // Extract day directly from ISO string to avoid timezone issues
    const startDay = parseInt(hostingStart.substring(8, 10));

    // Check if both start and end in same month
    if (endDate) {
      const endMonth = hostingEnd!.substring(0, 7);
      if (endMonth === targetMonth) {
        const endDay = parseInt(hostingEnd!.substring(8, 10));
        return endDay - startDay + 1;
      }
    }

    // Started mid-month, calculate days from start to end of month
    return daysInMonth - startDay + 1;
  }

  if (billingType === 'PRORATED_END') {
    // Ended mid-month, extract day directly from ISO string
    const endDay = parseInt(hostingEnd!.substring(8, 10));
    return endDay;
  }

  return daysInMonth;
}

/**
 * Calculate gross amount for a single charge
 */
function calculateGrossAmount(daysActive: number, daysInMonth: number): number {
  if (daysActive === 0) {
    return 0;
  }
  const amount = (daysActive / daysInMonth) * STANDARD_MRR;
  return Math.round(amount * 100) / 100; // Round to 2 decimals
}

/**
 * Calculate free credits available
 * 1 free credit per 20 sites hosted
 *
 * NOTE: Free credits do NOT apply to May 2025
 */
function calculateFreeCredits(activeSites: number, targetMonth?: string): number {
  // If no month specified, use current month
  const month = targetMonth || new Date().toISOString().slice(0, 7); // YYYY-MM format

  // No free credits for May 2025
  if (month === '2025-05') {
    return 0;
  }
  return Math.floor(activeSites / 20);
}

/**
 * Calculate hosting charges for a specific month
 */
export function calculateMonthlyHosting(
  properties: WebsiteProperty[],
  targetMonth: string
): MonthlyHostingSummary {
  const [targetYear, targetMonthNum] = targetMonth.split('-').map(Number);
  const daysInMonth = getDaysInMonth(targetYear, targetMonthNum);

  // Calculate charges for each property
  const charges: HostingCharge[] = properties
    .map((property) => {
      const billingType = determineBillingType(property.hostingStart, property.hostingEnd, targetMonth);
      const daysActive = calculateDaysActive(property.hostingStart, property.hostingEnd, targetMonth, billingType);
      const grossAmount = calculateGrossAmount(daysActive, daysInMonth);

      return {
        websitePropertyId: property.id,
        siteName: property.name,
        websiteUrl: property.websiteUrl,
        hostingStart: property.hostingStart,
        hostingEnd: property.hostingEnd,
        billingType,
        daysActive,
        daysInMonth,
        grossAmount,
        creditApplied: false,
        netAmount: grossAmount,
      };
    })
    .filter((charge) => charge.billingType !== 'INACTIVE'); // Exclude inactive sites

  // Calculate metrics
  const activeSites = charges.length;
  const grossMrr = charges.reduce((sum, charge) => sum + charge.grossAmount, 0);
  const freeCredits = calculateFreeCredits(activeSites, targetMonth);

  // Apply free credits (prioritize full-month charges, then highest prorated)
  const sortedCharges = [...charges].sort((a, b) => {
    if (a.billingType === 'FULL' && b.billingType !== 'FULL') return -1;
    if (b.billingType === 'FULL' && a.billingType !== 'FULL') return 1;
    return b.grossAmount - a.grossAmount;
  });

  let creditsRemaining = freeCredits;
  sortedCharges.forEach((charge) => {
    if (creditsRemaining > 0 && charge.grossAmount > 0) {
      charge.creditApplied = true;
      charge.netAmount = 0;
      creditsRemaining--;
    }
  });

  const netMrr = sortedCharges.reduce((sum, charge) => sum + charge.netAmount, 0);
  const creditsApplied = freeCredits - creditsRemaining;

  return {
    month: targetMonth,
    activeSites,
    grossMrr: Math.round(grossMrr * 100) / 100,
    freeCredits,
    creditsApplied,
    netMrr: Math.round(netMrr * 100) / 100,
    charges: sortedCharges.sort((a, b) => a.siteName.localeCompare(b.siteName)),
  };
}

/**
 * Calculate credit progress for current active sites
 */
export function calculateCreditProgress(activeSites: number): CreditProgress {
  const freeCredits = calculateFreeCredits(activeSites);
  const sitesUntilNextCredit = 20 - (activeSites % 20);
  const progressPercentage = Math.round(((activeSites % 20) / 20) * 100);

  return {
    activeSites,
    freeCredits,
    sitesUntilNextCredit,
    progressPercentage,
  };
}

/**
 * Generate monthly summaries from June 2025 to current month
 */
export function generateMonthlyBreakdown(properties: WebsiteProperty[]): MonthlyHostingSummary[] {
  const summaries: MonthlyHostingSummary[] = [];
  const startDate = new Date(2025, 5, 1); // June 2025
  const currentDate = new Date();

  let year = startDate.getFullYear();
  let month = startDate.getMonth() + 1;

  while (year < currentDate.getFullYear() || (year === currentDate.getFullYear() && month <= currentDate.getMonth() + 1)) {
    const targetMonth = `${year}-${String(month).padStart(2, '0')}`;
    const summary = calculateMonthlyHosting(properties, targetMonth);
    summaries.push(summary);

    month++;
    if (month > 12) {
      month = 1;
      year++;
    }
  }

  return summaries.sort((a, b) => a.month.localeCompare(b.month));
}

/**
 * Format currency for display
 */
export { formatCurrency, formatCurrencyAccounting } from '../utils/currency';