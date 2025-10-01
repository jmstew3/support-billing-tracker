import { fetchRequests } from '../utils/api';
import { fetchProjects, convertMicrosToDollars } from './projectsApi';
import { fetchWebsiteProperties, generateMonthlyBreakdown } from './hostingApi';
import { PRICING_CONFIG, FREE_HOURS_PER_MONTH, FREE_HOURS_START_DATE, FREE_LANDING_PAGES_PER_MONTH, FREE_LANDING_PAGE_START_DATE, FREE_MULTI_FORMS_PER_MONTH, FREE_MULTI_FORM_START_DATE, FREE_BASIC_FORMS_PER_MONTH, FREE_BASIC_FORM_START_DATE } from '../config/pricing';
import type {
  MonthlyBillingSummary,
  BillingSummary,
  BillableTicket,
  BillableProject,
} from '../types/billing';
import type { ChatRequest } from '../types/request';
import type { Project } from '../types/project';

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
      monthData.ticketsGrossRevenue += ticket.amount; // Track gross before free hours
      monthData.ticketsCount++;
    });

    // Apply free hours to eligible months (June 2025 onwards)
    monthlyMap.forEach((monthData, month) => {
      if (month >= FREE_HOURS_START_DATE && monthData.ticketDetails.length > 0) {
        applyFreeHours(monthData);
      } else {
        // For months before free hours policy, net = gross
        monthData.ticketsRevenue = monthData.ticketsGrossRevenue;
        monthData.ticketsFreeHoursApplied = 0;
        monthData.ticketsFreeHoursSavings = 0;
      }
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
        monthData.projectsGrossRevenue += project.amount;
        monthData.projectsCount++;
      }
    });

    // Apply free landing page to eligible months (June 2025 onwards)
    monthlyMap.forEach((monthData, month) => {
      if (month >= FREE_LANDING_PAGE_START_DATE && monthData.projectDetails.length > 0) {
        applyFreeLandingPage(monthData);
        applyFreeMultiForm(monthData);
        applyFreeBasicForms(monthData);
      } else {
        // For months before free landing page policy, net = gross
        monthData.projectsRevenue = monthData.projectsGrossRevenue;
        monthData.projectsLandingPageCredit = 0;
        monthData.projectsLandingPageSavings = 0;
        monthData.projectsMultiFormCredit = 0;
        monthData.projectsMultiFormSavings = 0;
        monthData.projectsBasicFormCredit = 0;
        monthData.projectsBasicFormSavings = 0;
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
      monthData.hostingFreeCredits = hostingMonth.freeCredits;
      monthData.hostingCreditsApplied = hostingMonth.creditsApplied;
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
    // MRR (Monthly Recurring Revenue) represents current state, not cumulative sum
    // Use the latest month's hosting revenue as the current MRR
    const totalHostingRevenue = monthlyBreakdown.length > 0
      ? monthlyBreakdown[monthlyBreakdown.length - 1].hostingRevenue
      : 0;
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
    .filter((req) => req.Category !== 'Non-billable' && (req.EstimatedHours || 0) > 0)
    .map((req) => {
      // Migration items are billed at $0.00
      const isMigration = req.Category === 'Migration';

      // Determine rate based on urgency using helper function
      const tier = PRICING_CONFIG.tiers.find(t => t.urgency === req.Urgency);
      const rate = isMigration ? 0 : (tier?.rate || PRICING_CONFIG.tiers.find(t => t.urgency === 'LOW')?.rate || 150);
      const hours = req.EstimatedHours || 0;

      return {
        id: String(req.id || `${req.Date}-${req.Time}`),
        date: req.Date,
        time: req.Time,
        description: req.Request_Summary,
        category: req.Category || 'Unknown',
        urgency: req.Urgency,
        hours,
        rate,
        amount: hours * rate,
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
      websiteUrl: proj.websiteUrl,
      completionDate: proj.projectCompletionDate?.split('T')[0] || '',
      category: proj.projectCategory || 'Unknown',
      hostingStatus: proj.hostingStatus || 'INACTIVE',
      amount: convertMicrosToDollars(proj.revenueAmount.amountMicros),
    }));
}

/**
 * Apply free hours to tickets in a month
 * Distributes up to 10 free hours across tickets, prioritizing lower rates to maximize savings
 */
function applyFreeHours(monthData: MonthlyBillingSummary): void {
  // Sort tickets by rate (lowest first) to maximize savings
  const sortedTickets = [...monthData.ticketDetails].sort((a, b) => a.rate - b.rate);

  let remainingFreeHours = FREE_HOURS_PER_MONTH;
  let totalSavings = 0;

  // Apply free hours to each ticket
  sortedTickets.forEach((ticket) => {
    if (remainingFreeHours <= 0) {
      // No more free hours available
      ticket.freeHoursApplied = 0;
      ticket.netAmount = ticket.amount;
      return;
    }

    // Calculate how many free hours to apply to this ticket
    const freeHoursForTicket = Math.min(ticket.hours, remainingFreeHours);
    const savings = freeHoursForTicket * ticket.rate;

    // Update ticket with free hours
    ticket.freeHoursApplied = freeHoursForTicket;
    ticket.netAmount = ticket.amount - savings;

    // Update remaining free hours and total savings
    remainingFreeHours -= freeHoursForTicket;
    totalSavings += savings;
  });

  // Update month summary with free hours calculations
  monthData.ticketsFreeHoursApplied = FREE_HOURS_PER_MONTH - remainingFreeHours;
  monthData.ticketsFreeHoursSavings = totalSavings;
  monthData.ticketsRevenue = monthData.ticketsGrossRevenue - totalSavings;
}

/**
 * Apply free landing page credit to first LANDING_PAGE project in a month
 * Client gets 1 free landing page per month starting June 2025
 */
function applyFreeLandingPage(monthData: MonthlyBillingSummary): void {
  // Find first landing page project (LANDING_PAGE category)
  const landingPageProjects = monthData.projectDetails.filter(
    (proj) => proj.category === 'LANDING_PAGE'
  );

  if (landingPageProjects.length > 0 && FREE_LANDING_PAGES_PER_MONTH > 0) {
    // Apply free credit to first landing page
    const firstLandingPage = landingPageProjects[0];
    const originalAmount = firstLandingPage.amount;

    // Mark as free credit and store original amount
    firstLandingPage.isFreeCredit = true;
    firstLandingPage.originalAmount = originalAmount;
    firstLandingPage.amount = 0;

    // Update month summary
    monthData.projectsLandingPageCredit = 1;
    monthData.projectsLandingPageSavings = originalAmount;
    monthData.projectsRevenue = monthData.projectsGrossRevenue - originalAmount;
  } else {
    // No landing pages or no credits available
    monthData.projectsLandingPageCredit = 0;
    monthData.projectsLandingPageSavings = 0;
    monthData.projectsRevenue = monthData.projectsGrossRevenue;
  }
}

/**
 * Apply free multi-form credit to first MULTI_FORM project in a month
 * Client gets 1 free multi-form per month starting June 2025
 */
function applyFreeMultiForm(monthData: MonthlyBillingSummary): void {
  // Find first multi-form project (MULTI_FORM category)
  const multiFormProjects = monthData.projectDetails.filter(
    (proj) => proj.category === 'MULTI_FORM'
  );

  if (multiFormProjects.length > 0 && FREE_MULTI_FORMS_PER_MONTH > 0) {
    // Apply free credit to first multi-form
    const firstMultiForm = multiFormProjects[0];
    const originalAmount = firstMultiForm.amount;

    // Mark as free credit and store original amount
    firstMultiForm.isFreeCredit = true;
    firstMultiForm.originalAmount = originalAmount;
    firstMultiForm.amount = 0;

    // Update month summary
    monthData.projectsMultiFormCredit = 1;
    monthData.projectsMultiFormSavings = originalAmount;
    // Update net revenue by subtracting this savings too
    monthData.projectsRevenue -= originalAmount;
  } else {
    // No multi-forms or no credits available
    monthData.projectsMultiFormCredit = 0;
    monthData.projectsMultiFormSavings = 0;
  }
}

/**
 * Apply free basic form credits to first 5 BASIC_FORM projects in a month
 * Client gets 5 free basic forms per month starting June 2025
 */
function applyFreeBasicForms(monthData: MonthlyBillingSummary): void {
  // Find all basic form projects (BASIC_FORM category)
  const basicFormProjects = monthData.projectDetails.filter(
    (proj) => proj.category === 'BASIC_FORM'
  );

  if (basicFormProjects.length > 0 && FREE_BASIC_FORMS_PER_MONTH > 0) {
    // Apply free credits to first N basic forms (up to 5)
    const creditsToApply = Math.min(basicFormProjects.length, FREE_BASIC_FORMS_PER_MONTH);
    let totalSavings = 0;

    for (let i = 0; i < creditsToApply; i++) {
      const basicForm = basicFormProjects[i];
      const originalAmount = basicForm.amount;

      // Mark as free credit and store original amount
      basicForm.isFreeCredit = true;
      basicForm.originalAmount = originalAmount;
      basicForm.amount = 0;

      totalSavings += originalAmount;
    }

    // Update month summary
    monthData.projectsBasicFormCredit = creditsToApply;
    monthData.projectsBasicFormSavings = totalSavings;
    // Update net revenue by subtracting total savings
    monthData.projectsRevenue -= totalSavings;
  } else {
    // No basic forms or no credits available
    monthData.projectsBasicFormCredit = 0;
    monthData.projectsBasicFormSavings = 0;
  }
}

/**
 * Create empty month summary object
 */
function createEmptyMonthSummary(month: string): MonthlyBillingSummary {
  return {
    month,
    ticketsRevenue: 0,
    ticketsGrossRevenue: 0,
    ticketsFreeHoursApplied: 0,
    ticketsFreeHoursSavings: 0,
    ticketsCount: 0,
    ticketDetails: [],
    projectsRevenue: 0,
    projectsGrossRevenue: 0,
    projectsLandingPageCredit: 0,
    projectsLandingPageSavings: 0,
    projectsMultiFormCredit: 0,
    projectsMultiFormSavings: 0,
    projectsBasicFormCredit: 0,
    projectsBasicFormSavings: 0,
    projectsCount: 0,
    projectDetails: [],
    hostingRevenue: 0,
    hostingGross: 0,
    hostingSitesCount: 0,
    hostingFreeCredits: 0,
    hostingCreditsApplied: 0,
    hostingDetails: [],
    totalRevenue: 0,
  };
}

/**
 * Format currency helper
 */
export { formatCurrency, formatCurrencyAccounting } from '../utils/currency';
