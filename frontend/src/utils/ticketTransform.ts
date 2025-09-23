import type { ChatRequest } from '../types/request';

// API Support Ticket interface based on 20.md
interface SupportTicket {
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
 * Transform a support ticket from the API into the ChatRequest format
 * used by the Billable Requests dashboard
 */
export function transformTicketToRequest(ticket: SupportTicket): ChatRequest {
  // Map category enum to dashboard categories
  const mapCategory = (category: string): string => {
    switch(category) {
      case 'BRAND_WEBSITE_TICKET':
      case 'MULTI_BRAND_TICKET':
        return 'Support';
      case 'LANDING_PAGE_TICKET':
        return 'Forms';
      default:
        return 'Support';
    }
  };

  // Map priority to urgency levels
  const mapPriority = (priority: string): 'HIGH' | 'MEDIUM' | 'LOW' => {
    switch(priority) {
      case 'CRITICAL':
        return 'HIGH';
      case 'MEDIUM':
        return 'MEDIUM';
      case 'NORMAL':
      default:
        return 'LOW';
    }
  };

  // Estimate hours based on urgency (can be customized)
  const estimateHours = (urgency: string): number => {
    switch(urgency) {
      case 'HIGH':
        return 1.0;
      case 'MEDIUM':
        return 0.5;
      case 'LOW':
      default:
        return 0.25;
    }
  };

  const urgency = mapPriority(ticket.priority);

  // Ensure date is in YYYY-MM-DD format
  const formatDate = (dateString: string): string => {
    if (!dateString) return new Date().toISOString().split('T')[0];
    // Handle both ISO format and plain date format
    if (dateString.includes('T')) {
      return dateString.split('T')[0];
    }
    return dateString;
  };

  const formattedDate = formatDate(ticket.fsCreationDate);

  return {
    Date: formattedDate,
    Time: '8:00 AM', // Default time since API doesn't provide time
    Request_Summary: ticket.subject && ticket.description
      ? `${ticket.subject} - ${ticket.description}`
      : ticket.description || ticket.subject || 'No summary available',
    Urgency: urgency,
    Category: mapCategory(ticket.category),
    EstimatedHours: estimateHours(urgency),
    Status: 'active',
    source: 'ticket', // All API tickets are from ticket system
    Request_Type: 'Support Ticket',
    Month: formattedDate ? formattedDate.substring(0, 7) : undefined
  };
}

/**
 * Transform multiple tickets
 */
export function transformTickets(tickets: SupportTicket[]): ChatRequest[] {
  return tickets.map(transformTicketToRequest);
}

/**
 * Example usage for testing
 */
export const sampleTicket: SupportTicket = {
  fsCreationDate: '2025-09-23',
  subject: 'Website not loading properly',
  priority: 'CRITICAL',
  category: 'BRAND_WEBSITE_TICKET',
  integrationProvider: 'FLUENT'
};

// Test the transformation
// console.log('Sample transformation:', transformTicketToRequest(sampleTicket));