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
  amount: number; // hours × rate
  source: 'sms' | 'ticket' | 'email' | 'phone';
}

/**
 * Represents a billable project ready to invoice
 */
export interface BillableProject {
  id: string;
  name: string;
  completionDate: string; // YYYY-MM-DD format
  category: string;
  hostingStatus: string;
  amount: number; // Revenue in dollars
}

/**
 * Summary of all billing sources for a single month
 */
export interface MonthlyBillingSummary {
  month: string; // "YYYY-MM" format

  // Tickets data
  ticketsRevenue: number;
  ticketsCount: number;
  ticketDetails: BillableTicket[];

  // Projects data
  projectsRevenue: number;
  projectsCount: number;
  projectDetails: BillableProject[];

  // Hosting data (reuses existing HostingCharge type)
  hostingRevenue: number; // Net revenue after credits
  hostingGross: number; // Gross before credits
  hostingSitesCount: number;
  hostingDetails: HostingCharge[];

  // Combined totals
  totalRevenue: number; // Sum of all three sources
}

/**
 * Overall billing summary across all months
 */
export interface BillingSummary {
  totalRevenue: number;
  totalTicketsRevenue: number;
  totalProjectsRevenue: number;
  totalHostingRevenue: number;
  monthlyBreakdown: MonthlyBillingSummary[];
}
