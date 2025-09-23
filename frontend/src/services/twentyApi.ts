import { transformTickets } from '../utils/ticketTransform';
import type { ChatRequest } from '../types/request';

// Twenty API configuration
const TWENTY_API_URL = import.meta.env.VITE_TWENTY_API_URL || 'http://localhost:3000';
const TWENTY_API_TOKEN = import.meta.env.VITE_TWENTY_API_TOKEN || '';

// API Support Ticket interface based on 20.md
interface SupportTicket {
  id?: string;
  fsCreationDate: string;
  ticketStatus?: string;
  fsMailboxId?: number;
  submitterMobile?: object;
  fluentCustomerId?: string;
  lastFsSync?: string;
  syncError?: string;
  position?: number;
  createdBy?: object;
  subject: string;
  name?: string;
  fluentFormsId?: number;
  description?: string;
  priority: 'NORMAL' | 'MEDIUM' | 'CRITICAL';
  lastPushedHash?: string;
  fluentTicketId?: string;
  category: 'BRAND_WEBSITE_TICKET' | 'MULTI_BRAND_TICKET' | 'LANDING_PAGE_TICKET';
  integrationProvider: 'FLUENT' | 'JIRA';
  submitterEmail?: object;
  businessImpact?: string;
  brandNameId?: string;
  requestedCompletionDate?: string;
}

/**
 * Fetch support tickets from Twenty API
 * @param depth Level of nested objects to include (0-2)
 * @returns Array of support tickets from the API
 */
export async function fetchSupportTickets(depth: number = 1): Promise<SupportTicket[]> {
  try {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    // Add authentication if token is provided
    // Try different auth header formats
    if (TWENTY_API_TOKEN) {
      headers['Authorization'] = `Bearer ${TWENTY_API_TOKEN}`;
      // Also try without Bearer prefix
      headers['X-Api-Token'] = TWENTY_API_TOKEN;
      headers['Api-Token'] = TWENTY_API_TOKEN;
    }

    // Handle both base URL and full endpoint URL
    const url = TWENTY_API_URL.includes('/rest/supportTicket')
      ? `${TWENTY_API_URL}?depth=${depth}`
      : `${TWENTY_API_URL}/rest/supportTicket?depth=${depth}`;

    console.log('Fetching tickets from:', url);
    console.log('Request headers:', headers);

    const response = await fetch(url, {
      method: 'GET',
      headers,
      mode: 'cors', // Explicitly set CORS mode
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Twenty API Error Response:', errorText);
      throw new Error(`Failed to fetch support tickets: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    console.log('Twenty API Raw Response:', data);

    // Handle the nested response structure from Twenty API
    let tickets: SupportTicket[] = [];

    if (data && typeof data === 'object') {
      if (data.data && data.data.supportTickets) {
        // GraphQL-style response: { data: { supportTickets: [...] } }
        tickets = data.data.supportTickets;
        console.log(`Found ${tickets.length} tickets in data.supportTickets`);
      } else if (data.items) {
        // Paginated response: { items: [...] }
        tickets = data.items;
      } else if (Array.isArray(data)) {
        // Direct array response
        tickets = data;
      } else {
        console.warn('Unexpected response structure:', Object.keys(data));
        tickets = [];
      }
    }

    return tickets;
  } catch (error) {
    console.error('Error fetching support tickets from Twenty API:', error);
    throw error;
  }
}

/**
 * Create a new support ticket in Twenty API
 * @param ticket Ticket data to create
 * @returns Created ticket with ID
 */
export async function createSupportTicket(ticket: Omit<SupportTicket, 'id'>): Promise<SupportTicket> {
  try {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (TWENTY_API_TOKEN) {
      headers['Authorization'] = `Bearer ${TWENTY_API_TOKEN}`;
    }

    const response = await fetch(`${TWENTY_API_URL}/rest/supportTicket?depth=1`, {
      method: 'POST',
      headers,
      body: JSON.stringify(ticket),
    });

    if (!response.ok) {
      throw new Error(`Failed to create support ticket: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error creating support ticket:', error);
    throw error;
  }
}

/**
 * Fetch and transform support tickets into ChatRequest format
 * @returns Array of ChatRequest objects ready for the dashboard
 */
export async function fetchAndTransformTickets(): Promise<ChatRequest[]> {
  try {
    console.log('fetchAndTransformTickets: Starting...');
    const tickets = await fetchSupportTickets();
    console.log('fetchAndTransformTickets: Raw tickets received:', tickets);

    // Transform tickets to ChatRequest format using the existing utility
    const transformedTickets = transformTickets(tickets as any);

    console.log(`fetchAndTransformTickets: Transformed ${transformedTickets.length} tickets`);
    console.log('fetchAndTransformTickets: First transformed ticket:', transformedTickets[0]);

    return transformedTickets;
  } catch (error) {
    console.error('❌ Error in fetchAndTransformTickets:', error);
    console.error('Falling back to mock data due to error');
    // Return mock data on error so we can see something
    return getMockTickets();
  }
}

/**
 * Mock function for testing without actual API connection
 * @returns Array of mock ChatRequest objects
 */
export function getMockTickets(): ChatRequest[] {
  const mockTickets = [
    {
      fsCreationDate: '2025-09-23',
      subject: 'Website not loading properly',
      priority: 'CRITICAL' as const,
      category: 'BRAND_WEBSITE_TICKET' as const,
      integrationProvider: 'FLUENT' as const,
    },
    {
      fsCreationDate: '2025-09-22',
      subject: 'Need help with form submission',
      priority: 'MEDIUM' as const,
      category: 'LANDING_PAGE_TICKET' as const,
      integrationProvider: 'FLUENT' as const,
      description: 'Customer reports form is not submitting data correctly',
    },
    {
      fsCreationDate: '2025-09-21',
      subject: 'Server performance issues',
      priority: 'NORMAL' as const,
      category: 'MULTI_BRAND_TICKET' as const,
      integrationProvider: 'JIRA' as const,
      description: 'Multiple brands experiencing slow load times',
    },
  ];

  return transformTickets(mockTickets as any);
}