import type { Project, FinancialSummary, MonthlyRevenue } from '../types/project';

// API configuration - Use local backend proxy to avoid CORS issues
const API_BASE_URL = window.location.hostname === 'velocity.peakonedigital.com'
  ? 'https://velocity.peakonedigital.com/billing-overview-api/api'
  : (import.meta.env.VITE_API_URL || 'http://localhost:3011/api');

const TWENTY_API_URL = `${API_BASE_URL}/twenty-proxy/projects`;
const USE_MOCK = import.meta.env.VITE_TWENTY_USE_MOCK === 'true';

/**
 * Format currency for display
 * @param amount Dollar amount
 * @returns Formatted string (e.g., "$1,250.00")
 */
export { formatCurrency, formatCurrencyAccounting } from '../utils/currency';

/**
 * Convert revenue amount from micros to dollars
 * @param amountMicros Amount in micros (e.g., "125000000" = $125.00)
 * @returns Dollar amount as number
 */
export function convertMicrosToDollars(amountMicros: string): number {
  return parseInt(amountMicros, 10) / 1000000;
}

/**
 * Calculate financial summary from projects
 * @param projects Array of projects
 * @returns Financial summary with totals and breakdowns
 */
export function calculateFinancialSummary(projects: Project[]): FinancialSummary {
  let totalRevenue = 0;
  let paidRevenue = 0;
  let unpaidRevenue = 0;
  let projectsWithoutCompletionDate = 0;
  let revenueWithoutCompletionDate = 0;

  const monthlyMap = new Map<string, { paid: number; unpaid: number; count: number }>();

  projects.forEach((project) => {
    const revenue = convertMicrosToDollars(project.revenueAmount.amountMicros);
    totalRevenue += revenue;

    // Count by invoice status (only active hosting and ready to invoice)
    if (project.hostingStatus === 'ACTIVE' && project.invoiceStatus === 'READY') {
      unpaidRevenue += revenue; // "unpaid" semantically means "ready to invoice"
    } else if (project.invoiceStatus === 'PAID') {
      paidRevenue += revenue;
    }

    // Group by completion date
    if (project.projectCompletionDate) {
      const date = new Date(project.projectCompletionDate);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      if (!monthlyMap.has(monthKey)) {
        monthlyMap.set(monthKey, { paid: 0, unpaid: 0, count: 0 });
      }

      const monthData = monthlyMap.get(monthKey)!;
      monthData.count++;

      if (project.invoiceStatus === 'PAID') {
        monthData.paid += revenue;
      } else if (project.invoiceStatus === 'READY') {
        monthData.unpaid += revenue; // "unpaid" semantically means "ready to invoice"
      }
    } else {
      projectsWithoutCompletionDate++;
      revenueWithoutCompletionDate += revenue;
    }
  });

  // Convert monthly map to sorted array
  const monthlyBreakdown: MonthlyRevenue[] = Array.from(monthlyMap.entries())
    .map(([month, data]) => ({
      month,
      paid: data.paid,
      unpaid: data.unpaid,
      total: data.paid + data.unpaid,
      projectCount: data.count,
    }))
    .sort((a, b) => a.month.localeCompare(b.month));

  return {
    totalRevenue,
    paidRevenue,
    unpaidRevenue,
    activeProjects: projects.filter((p) => p.hostingStatus === 'ACTIVE').length,
    inactiveProjects: projects.filter((p) => p.hostingStatus === 'INACTIVE').length,
    paidInvoices: projects.filter((p) => p.invoiceStatus === 'PAID').length,
    unpaidInvoices: projects.filter((p) => p.hostingStatus === 'ACTIVE' && p.invoiceStatus === 'READY').length, // "unpaid" semantically means "ready to invoice"
    projectsWithoutCompletionDate,
    revenueWithoutCompletionDate,
    monthlyBreakdown,
  };
}

/**
 * Fetch projects from Twenty CRM API
 * @param depth Level of nested objects to include (0-1)
 * @returns Array of projects from the API
 */
export async function fetchProjects(depth: number = 1): Promise<Project[]> {
  // Return empty array if mock mode (no more mock data)
  if (USE_MOCK) {
    console.log('Mock mode enabled (VITE_TWENTY_USE_MOCK=true) - returning empty array');
    console.log('Set VITE_TWENTY_USE_MOCK=false to use live API');
    return [];
  }

  try {
    // Construct URL with depth and limit parameters (limit=200 to fetch all projects)
    const url = TWENTY_API_URL.includes('?')
      ? `${TWENTY_API_URL}&depth=${depth}&limit=200`
      : `${TWENTY_API_URL}?depth=${depth}&limit=200`;

    console.log('Fetching projects from proxy:', url);

    // No need for Authorization header - backend proxy handles authentication
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Twenty API Error Response:', errorText);
      throw new Error(`Failed to fetch projects: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('Twenty API Response Structure:', {
      hasData: !!data.data,
      hasProjects: !!data.data?.projects,
      projectCount: data.data?.projects?.length || 0,
    });

    // Handle the nested response structure from Twenty API
    let rawProjects: any[] = [];

    if (data && typeof data === 'object') {
      if (data.data && data.data.projects) {
        // GraphQL-style response: { data: { projects: [...] } }
        rawProjects = data.data.projects;
        console.log(`✓ Loaded ${rawProjects.length} projects from Twenty CRM`);
      } else if (data.items) {
        // Paginated response: { items: [...] }
        rawProjects = data.items;
        console.log(`✓ Loaded ${rawProjects.length} projects (paginated)`);
      } else if (Array.isArray(data)) {
        // Direct array response
        rawProjects = data;
        console.log(`✓ Loaded ${rawProjects.length} projects (direct array)`);
      } else {
        console.warn('Unexpected response structure:', Object.keys(data));
        rawProjects = [];
      }
    }

    // Map to proper Project type and extract websiteUrl from websitePropertyLink
    const projects: Project[] = rawProjects.map((proj: any) => {
      // Extract websiteUrl from the linked websiteProperty if available
      const websiteUrl = proj.websitePropertyLink?.websiteUrl || null;

      return {
        ...proj,
        websiteUrl,
      } as Project;
    });

    return projects;
  } catch (error) {
    console.error('Error fetching projects from Twenty API:', error);
    throw error;
  }
}

/**
 * Create a new project in Twenty API
 * @param project Project data to create
 * @returns Created project with ID
 */
export async function createProject(project: Omit<Project, 'id'>): Promise<Project> {
  try {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (TWENTY_API_TOKEN) {
      headers['Authorization'] = `Bearer ${TWENTY_API_TOKEN}`;
    }

    const response = await fetch(`${TWENTY_API_URL}?depth=1`, {
      method: 'POST',
      headers,
      body: JSON.stringify(project),
    });

    if (!response.ok) {
      throw new Error(`Failed to create project: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error creating project:', error);
    throw error;
  }
}