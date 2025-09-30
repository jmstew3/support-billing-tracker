import { fetchRequests } from '../utils/api';
import { fetchProjects, convertMicrosToDollars } from './projectsApi';
import { fetchWebsiteProperties, generateMonthlyBreakdown } from './hostingApi';
import { PRICING_CONFIG } from '../config/pricing';
import type {
  MonthlyBillingSummary,
  BillingSummary,
  BillableTicket,
  BillableProject,
} from '../types/billing';
import type { ChatRequest } from '../types/request';
import type { Project } from '../types/project';
import type { MonthlyHostingSummary } from '../types/websiteProperty';

/**
 * Generates a comprehensive billing summary combining tickets, projects, and hosting
 * Groups all revenue sources by month for unified billing reconciliation
 */
export async function generateComprehensiveBilling(): Promise<BillingSummary> {
  try {
    // Fetch data from all three sources in parallel
    const [requests, projects, hostingProperties] = await Promise.all([
      fetchRequests(),
      fetchProjects(),
      fetchWebsiteProperties(),
    ]);

    // Generate hosting breakdown (reuse existing logic)
    const hostingBreakdown = generateMonthlyBreakdown(hostingProperties);

    // Transform requests into billable tickets (only billable ones)
    const billableTickets = transformRequestsToTickets(requests);

    // Transform projects into billable projects (only READY status)
    const billableProjects = transformProjectsToBillable(projects);

    // Group all data by month
    const monthlyMap = new Map<string, MonthlyBillingSummary>();

    // Process tickets by month
    billableTickets.forEach((ticket) => {
      const month = ticket.date.substring(0, 7); // Extract YYYY-MM
      if (!monthlyMap.has(month)) {
        monthlyMap.set(month, createEmptyMonthSummary(month));
      }
      const monthData = monthlyMap.get(month)!;
      monthData.ticketDetails.push(ticket);
      monthData.ticketsRevenue += ticket.amount;
      monthData.ticketsCount++;
    });

    // Process projects by month
    billableProjects.forEach((project) => {
      if (project.completionDate) {
        const month = project.completionDate.substring(0, 7); // Extract YYYY-MM
        if (!monthlyMap.has(month)) {
          monthlyMap.set(month, createEmptyMonthSummary(month));
        }
        const monthData = monthlyMap.get(month)!;
        monthData.projectDetails.push(project);
        monthData.projectsRevenue += project.amount;
        monthData.projectsCount++;
      }
    });

    // Process hosting by month (from existing breakdown)
    hostingBreakdown.forEach((hostingMonth) => {
      if (!monthlyMap.has(hostingMonth.month)) {
        monthlyMap.set(hostingMonth.month, createEmptyMonthSummary(hostingMonth.month));
      }
      const monthData = monthlyMap.get(hostingMonth.month)!;
      monthData.hostingRevenue = hostingMonth.netMrr;
      monthData.hostingGross = hostingMonth.grossMrr;
      monthData.hostingSitesCount = hostingMonth.activeSites;
      monthData.hostingDetails = hostingMonth.charges;
    });

    // Calculate totals for each month
    monthlyMap.forEach((monthData) => {
      monthData.totalRevenue =
        monthData.ticketsRevenue + monthData.projectsRevenue + monthData.hostingRevenue;
    });

    // Convert map to sorted array (oldest first)
    const monthlyBreakdown = Array.from(monthlyMap.values()).sort((a, b) =>
      a.month.localeCompare(b.month)
    );

    // Calculate grand totals
    const totalTicketsRevenue = monthlyBreakdown.reduce(
      (sum, m) => sum + m.ticketsRevenue,
      0
    );
    const totalProjectsRevenue = monthlyBreakdown.reduce(
      (sum, m) => sum + m.projectsRevenue,
      0
    );
    const totalHostingRevenue = monthlyBreakdown.reduce(
      (sum, m) => sum + m.hostingRevenue,
      0
    );
    const totalRevenue = totalTicketsRevenue + totalProjectsRevenue + totalHostingRevenue;

    return {
      totalRevenue,
      totalTicketsRevenue,
      totalProjectsRevenue,
      totalHostingRevenue,
      monthlyBreakdown,
    };
  } catch (error) {
    console.error('Error generating comprehensive billing:', error);
    throw error;
  }
}

/**
 * Transform ChatRequests into BillableTickets
 * Only includes billable requests (non-billable category excluded)
 */
function transformRequestsToTickets(requests: ChatRequest[]): BillableTicket[] {
  return requests
    .filter((req) => req.category !== 'Non-billable' && req.hours > 0)
    .map((req) => {
      // Determine rate based on urgency
      let rate = PRICING_CONFIG.REGULAR_RATE;
      if (req.urgency === 'HIGH') {
        rate = PRICING_CONFIG.EMERGENCY_RATE;
      } else if (req.urgency === 'MEDIUM') {
        rate = PRICING_CONFIG.SAME_DAY_RATE;
      }

      return {
        id: req.id || `${req.date}-${req.time}`,
        date: req.date,
        time: req.time,
        description: req.requestSummary,
        category: req.category,
        urgency: req.urgency,
        hours: req.hours,
        rate,
        amount: req.hours * rate,
        source: req.source || 'sms',
      };
    });
}

/**
 * Transform Projects into BillableProjects
 * Only includes READY status projects (ready to invoice)
 */
function transformProjectsToBillable(projects: Project[]): BillableProject[] {
  return projects
    .filter((proj) => proj.invoiceStatus === 'READY')
    .map((proj) => ({
      id: proj.id,
      name: proj.name,
      completionDate: proj.projectCompletionDate || '',
      category: proj.projectCategory || 'Unknown',
      hostingStatus: proj.hostingStatus || 'INACTIVE',
      amount: convertMicrosToDollars(proj.revenueAmount.amountMicros),
    }));
}

/**
 * Create empty month summary object
 */
function createEmptyMonthSummary(month: string): MonthlyBillingSummary {
  return {
    month,
    ticketsRevenue: 0,
    ticketsCount: 0,
    ticketDetails: [],
    projectsRevenue: 0,
    projectsCount: 0,
    projectDetails: [],
    hostingRevenue: 0,
    hostingGross: 0,
    hostingSitesCount: 0,
    hostingDetails: [],
    totalRevenue: 0,
  };
}

/**
 * Format currency helper
 */
export function formatCurrency(value: number): string {
  return `$${value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
