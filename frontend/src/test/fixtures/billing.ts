import type { BillingSummary, MonthlyBillingSummary, BillableTicket, BillableProject } from '../../types/billing'
import type { HostingCharge } from '../../types/websiteProperty'

// Mock ticket details
export const mockTicketDetails: BillableTicket[] = [
  {
    id: 'ticket-1',
    date: '2025-06-15',
    time: '09:30 AM',
    description: 'Fix website header alignment issue',
    category: 'Support',
    urgency: 'MEDIUM',
    hours: 2.0,
    rate: 150,
    amount: 300.00,
    netAmount: 300.00,
    freeHoursApplied: 0,
    source: 'ticket'
  },
  {
    id: 'ticket-2',
    date: '2025-06-18',
    time: '02:15 PM',
    description: 'Update contact form styling',
    category: 'Support',
    urgency: 'LOW',
    hours: 1.5,
    rate: 150,
    amount: 225.00,
    netAmount: 225.00,
    freeHoursApplied: 0,
    source: 'sms'
  },
  {
    id: 'ticket-3',
    date: '2025-06-22',
    time: '11:45 AM',
    description: 'Emergency fix for broken checkout page',
    category: 'Support',
    urgency: 'HIGH',
    hours: 3.0,
    rate: 250,
    amount: 750.00,
    netAmount: 750.00,
    freeHoursApplied: 0,
    source: 'ticket'
  }
]

// Mock project details
export const mockProjectDetails: BillableProject[] = [
  {
    id: 'proj-1',
    name: 'Acme Corp Landing Page',
    websiteUrl: 'https://acmecorp.com',
    completionDate: '2025-06-10',
    category: 'LANDING_PAGE',
    hostingStatus: 'ACTIVE',
    amount: 0,
    isFreeCredit: true,
    originalAmount: 200
  },
  {
    id: 'proj-2',
    name: 'Tech Startup Website',
    websiteUrl: 'https://techstartup.com',
    completionDate: '2025-06-20',
    category: 'WEBSITE',
    hostingStatus: 'ACTIVE',
    amount: 800,
    isFreeCredit: false,
    originalAmount: 800
  }
]

// Mock hosting details
export const mockHostingDetails: HostingCharge[] = [
  {
    websitePropertyId: 'host-1',
    siteName: 'Example Site 1',
    websiteUrl: 'https://example1.com',
    billingType: 'FULL',
    grossAmount: 99,
    creditAmount: 0,
    netAmount: 99,
    creditApplied: false,
    hostingStart: '2025-05-01',
    hostingEnd: null,
    daysActive: 30,
    daysInMonth: 30
  },
  {
    websitePropertyId: 'host-2',
    siteName: 'Example Site 2',
    websiteUrl: 'https://example2.com',
    billingType: 'FULL',
    grossAmount: 99,
    creditAmount: 99,
    netAmount: 0,
    creditApplied: true,
    hostingStart: '2025-05-01',
    hostingEnd: null,
    daysActive: 30,
    daysInMonth: 30
  }
]

// Mock monthly billing summary
export const mockMonthData: MonthlyBillingSummary = {
  month: '2025-06',

  // Tickets
  ticketsCount: 3,
  ticketsRevenue: 1025.00, // After 2.5h free hours applied
  ticketsGrossRevenue: 1275.00,
  ticketsFreeHoursApplied: 2.5,
  ticketsFreeHoursSavings: 250.00,
  ticketDetails: mockTicketDetails,

  // Projects
  projectsCount: 2,
  projectsRevenue: 800.00, // After 1 free landing page
  projectsGrossRevenue: 1000.00,
  projectsLandingPageCredit: 1,
  projectsLandingPageSavings: 200.00,
  projectsMultiFormCredit: 0,
  projectsMultiFormSavings: 0,
  projectsBasicFormCredit: 0,
  projectsBasicFormSavings: 0,
  projectDetails: mockProjectDetails,

  // Hosting
  hostingSitesCount: 2,
  hostingRevenue: 99.00, // After 1 free credit
  hostingGross: 198.00,
  hostingCreditsApplied: 1,
  hostingFreeCredits: 1,
  hostingDetails: mockHostingDetails,

  // Total
  totalRevenue: 1924.00 // 1025 + 800 + 99
}

// Mock billing summary (all months)
export const mockBillingSummary: BillingSummary = {
  totalRevenue: 1924.00,
  totalTicketsRevenue: 1025.00,
  totalProjectsRevenue: 800.00,
  totalHostingRevenue: 99.00,
  monthlyBreakdown: [mockMonthData],
  dataSourceStatus: {
    requests: { available: true },
    projects: { available: true },
    hosting: { available: true }
  }
}

// Additional mock: Month with no free credits
export const mockMonthDataNoCredits: MonthlyBillingSummary = {
  ...mockMonthData,
  month: '2025-05', // Before June 2025
  ticketsFreeHoursApplied: 0,
  ticketsFreeHoursSavings: 0,
  ticketsRevenue: 1275.00,
  projectsLandingPageCredit: 0,
  projectsLandingPageSavings: 0,
  projectsRevenue: 1000.00,
  hostingCreditsApplied: 0,
  hostingRevenue: 198.00,
  totalRevenue: 2473.00
}
