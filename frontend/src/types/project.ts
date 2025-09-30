// Twenty CRM Project interface matching actual API structure
export interface Project {
  id: string;
  name: string;
  websiteUrl: string | null; // URL from linked websiteProperty
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  createdBy?: {
    source: string;
    workspaceMemberId: string | null;
    name: string;
    context: Record<string, unknown>;
  };
  position: number;
  searchVector?: string;

  // Project Details
  projectRequestedDate: string | null;
  projectCompletionDate: string | null;
  invoiceDate: string | null;

  // Status Fields
  hostingStatus: 'ACTIVE' | 'INACTIVE';
  invoiceStatus: 'NOT_READY' | 'READY' | 'INVOICED' | 'PAID';
  projectCategory: 'MIGRATION' | 'LANDING_PAGE' | 'WEBSITE';

  // Financial
  revenueAmount: {
    amountMicros: string; // Stored as string to avoid precision issues
    currencyCode: string;
  };
  invoiceNumber: string;

  // Relationships
  websitePropertyLinkId: string | null;
  websitePropertyLink?: unknown;

  // Activity Arrays
  timelineActivities?: Array<{
    id: string;
    happensAt: string;
    name: string;
    properties: Record<string, unknown>;
  }>;
  attachments?: unknown[];
  favorites?: unknown[];
  noteTargets?: unknown[];
  taskTargets?: unknown[];
}

// Helper type for revenue calculations
export interface RevenueAmount {
  dollars: number;
  currency: string;
}

// Monthly revenue summary
export interface MonthlyRevenue {
  month: string; // Format: YYYY-MM
  paid: number;
  unpaid: number;
  total: number;
  projectCount: number;
}

// Financial summary for dashboard
export interface FinancialSummary {
  totalRevenue: number;
  paidRevenue: number;
  unpaidRevenue: number;
  activeProjects: number;
  inactiveProjects: number;
  paidInvoices: number;
  unpaidInvoices: number;
  projectsWithoutCompletionDate: number;
  revenueWithoutCompletionDate: number;
  monthlyBreakdown: MonthlyRevenue[];
}

// Project filter options
export interface ProjectFilters {
  hostingStatus: 'ALL' | 'ACTIVE' | 'INACTIVE';
  invoiceStatus: 'ALL' | 'NOT_READY' | 'READY' | 'INVOICED' | 'PAID';
  projectCategory: 'ALL' | 'MIGRATION' | 'LANDING_PAGE' | 'WEBSITE';
  searchQuery: string;
}