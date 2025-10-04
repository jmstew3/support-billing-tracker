import type { BillingSummary, MonthlyBillingSummary, TicketDetail, ProjectDetail, HostingDetail } from '../../types/billing'

// Mock ticket details
export const mockTicketDetails: TicketDetail[] = [
  {
    id: 'ticket-1',
    date: '2025-06-15',
    description: 'Fix website header alignment issue',
    urgency: 'MEDIUM',
    hours: 2.0,
    rate: 150,
    amount: 300.00,
    netAmount: 300.00,
    freeHoursApplied: 0
  },
  {
    id: 'ticket-2',
    date: '2025-06-18',
    description: 'Update contact form styling',
    urgency: 'LOW',
    hours: 1.5,
    rate: 150,
    amount: 225.00,
    netAmount: 225.00,
    freeHoursApplied: 0
  },
  {
    id: 'ticket-3',
    date: '2025-06-22',
    description: 'Emergency fix for broken checkout page',
    urgency: 'HIGH',
    hours: 3.0,
    rate: 250,
    amount: 750.00,
    netAmount: 750.00,
    freeHoursApplied: 0
  }
]

// Mock project details
export const mockProjectDetails: ProjectDetail[] = [
  {
    id: 'proj-1',
    name: 'Acme Corp Landing Page',
    completionDate: '2025-06-10',
    category: 'LANDING_PAGE',
    amount: 0,
    originalAmount: 200,
    isFreeCredit: true,
    websiteUrl: 'https://acmecorp.com'
  },
  {
    id: 'proj-2',
    name: 'Tech Startup Website',
    completionDate: '2025-06-20',
    category: 'WEBSITE',
    amount: 800,
    originalAmount: 800,
    isFreeCredit: false,
    websiteUrl: 'https://techstartup.com'
  }
]

// Mock hosting details
export const mockHostingDetails: HostingDetail[] = [
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
  tickets: mockTicketDetails.map(t => ({
    summary: t.description,
    hours: t.hours,
    rate: t.rate,
    amount: t.amount
  })),

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
  projects: mockProjectDetails.map(p => ({
    name: p.name,
    category: p.category,
    amount: p.amount,
    isFreeCredit: p.isFreeCredit,
    originalAmount: p.originalAmount
  })),

  // Hosting
  hostingSitesCount: 2,
  hostingRevenue: 99.00, // After 1 free credit
  hostingGross: 198.00,
  hostingCreditsApplied: 1,
  hostingFreeCredits: 1,
  hostingDetails: mockHostingDetails,
  hosting: mockHostingDetails.map(h => ({
    name: h.siteName,
    url: h.websiteUrl,
    billingType: h.billingType,
    netAmount: h.netAmount,
    creditApplied: h.creditApplied
  })),

  // Total
  totalRevenue: 1924.00 // 1025 + 800 + 99
}

// Mock billing summary (all months)
export const mockBillingSummary: BillingSummary = {
  totalRevenue: 1924.00,
  totalTicketsRevenue: 1025.00,
  totalProjectsRevenue: 800.00,
  totalHostingRevenue: 99.00,
  monthlyBreakdown: [mockMonthData]
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
