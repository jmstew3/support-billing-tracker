/**
 * WebsiteProperty Type Definitions
 *
 * Interfaces for Twenty CRM websiteProperties object
 */

export interface WebsiteProperty {
  id: string;
  name: string;
  websiteUrl: string | null; // Full URL (e.g., "https://example.com")
  hostingStart: string | null; // ISO date string (YYYY-MM-DD) or null
  hostingEnd: string | null; // ISO date string or null if still active
  hostingMrrAmount: number | null; // Dollar amount (e.g., 99)
  hostingStatus: 'ACTIVE' | 'INACTIVE';
  parentCompanyId: string | null; // Twenty CRM company ID linking site to a brand/company
}

/**
 * Billing Type Classifications
 */
export type BillingType = 'FULL' | 'PRORATED_START' | 'PRORATED_END' | 'INACTIVE';

/**
 * Calculated Hosting Charge for a Single Site
 */
export interface HostingCharge {
  websitePropertyId: string;
  siteName: string;
  websiteUrl: string | null;
  hostingStart: string | null;
  hostingEnd: string | null;
  billingType: BillingType;
  daysActive: number;
  daysInMonth: number;
  grossAmount: number; // Dollar amount before credits
  creditApplied: boolean;
  creditAmount?: number; // Dollar amount of credit applied (if creditApplied is true)
  netAmount: number; // Dollar amount after credits
}

/**
 * Monthly Hosting Summary
 */
export interface MonthlyHostingSummary {
  month: string; // Format: YYYY-MM
  activeSites: number;
  grossMrr: number; // Total before credits
  freeCredits: number; // Number of credits available
  creditsApplied: number; // Number of credits used
  netMrr: number; // Total after credits
  charges: HostingCharge[];
}

/**
 * Free Credit Progress Tracking
 */
export interface CreditProgress {
  activeSites: number;
  freeCredits: number;
  sitesUntilNextCredit: number;
  progressPercentage: number; // 0-100
}