import type { HostingCharge } from './websiteProperty';

/**
 * Represents a billable support ticket/request
 */
export interface BillableTicket {
  id: string;
  date: string; // YYYY-MM-DD format
  time: string; // HH:MM AM/PM format
  description: string;
  category: string;
  urgency: string;
  hours: number;
  rate: number; // Dollars per hour based on urgency
  amount: number; // hours × rate (gross amount)
  freeHoursApplied?: number; // Free hours credited to this ticket
  netAmount?: number; // amount - (freeHoursApplied × rate)
  source: 'sms' | 'ticket' | 'email' | 'phone';
}

/**
 * Represents a billable project ready to invoice
 */
export interface BillableProject {
  id: string;
  name: string;
  websiteUrl: string | null;
  completionDate: string; // YYYY-MM-DD format
  category: string;
  hostingStatus: string;
  amount: number; // Revenue in dollars
  isFreeCredit?: boolean; // True if this project received free landing page credit
  originalAmount?: number; // Original amount before free credit (for display)
}

/**
 * Summary of all billing sources for a single month
 */
export interface MonthlyBillingSummary {
  month: string; // "YYYY-MM" format

  // Tickets data
  ticketsRevenue: number; // Net revenue after free hours
  ticketsGrossRevenue: number; // Revenue before free hours
  ticketsFreeHoursApplied: number; // Free hours used (0-10)
  ticketsFreeHoursSavings: number; // Dollar amount saved from free hours
  ticketsCount: number;
  ticketDetails: BillableTicket[];

  // Projects data
  projectsRevenue: number; // Net revenue after free landing page credit
  projectsGrossRevenue: number; // Revenue before free landing page credit
  projectsLandingPageCredit: number; // Number of free landing page credits applied (0-1)
  projectsLandingPageSavings: number; // Dollar amount saved from free landing page
  projectsMultiFormCredit: number; // Number of free multi-form credits applied (0-1)
  projectsMultiFormSavings: number; // Dollar amount saved from free multi-form
  projectsBasicFormCredit: number; // Number of free basic form credits applied (0-5)
  projectsBasicFormSavings: number; // Dollar amount saved from free basic forms
  projectsCount: number;
  projectDetails: BillableProject[];

  // Hosting data (reuses existing HostingCharge type)
  hostingRevenue: number; // Net revenue after credits
  hostingGross: number; // Gross before credits
  hostingSitesCount: number;
  hostingFreeCredits: number; // Number of free credits available this month
  hostingCreditsApplied: number; // Number of credits actually used
  hostingDetails: HostingCharge[];

  // Combined totals
  totalRevenue: number; // Sum of all three sources (after free hours)
}

/**
 * Overall billing summary across all months
 */
export interface BillingSummary {
  totalRevenue: number;
  totalTicketsRevenue: number;
  totalProjectsRevenue: number;
  totalHostingRevenue: number; // Current MRR (latest month's net hosting revenue)
  monthlyBreakdown: MonthlyBillingSummary[];
}
