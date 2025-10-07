import axios from 'axios';

/**
 * FluentSupport API Service
 *
 * Handles communication with FluentSupport WordPress REST API
 * Requires WordPress Application Password for authentication
 *
 * API Documentation: https://fluentsupport.com/rest-api/
 * Endpoint: /wp-json/fluent-support/v2/tickets
 */

// Get FluentSupport config from environment
const FLUENT_API_URL = process.env.VITE_FLUENT_API_URL || '';
const FLUENT_USERNAME = process.env.VITE_FLUENT_API_USERNAME || '';
const FLUENT_PASSWORD = process.env.VITE_FLUENT_API_PASSWORD || '';
const FLUENT_DATE_FILTER = process.env.VITE_FLUENT_DATE_FILTER || '2025-09-20';

/**
 * Fetch all tickets from FluentSupport API
 * @param {string} dateFilter - Only fetch tickets created after this date (YYYY-MM-DD)
 * @returns {Promise<Array>} Array of FluentSupport ticket objects
 */
export async function fetchFluentTickets(dateFilter = FLUENT_DATE_FILTER) {
  if (!FLUENT_API_URL || !FLUENT_USERNAME || !FLUENT_PASSWORD) {
    throw new Error('FluentSupport API credentials not configured. Please set VITE_FLUENT_API_URL, VITE_FLUENT_API_USERNAME, and VITE_FLUENT_API_PASSWORD in .env.docker');
  }

  try {
    // WordPress REST API uses Basic Auth with Application Password
    const authString = Buffer.from(`${FLUENT_USERNAME}:${FLUENT_PASSWORD}`).toString('base64');

    const headers = {
      'Authorization': `Basic ${authString}`,
      'Content-Type': 'application/json',
    };

    // Build URL - ensure it's the full endpoint
    const baseUrl = FLUENT_API_URL.replace(/\/$/, ''); // Remove trailing slash
    const endpoint = `${baseUrl}/wp-json/fluent-support/v2/tickets`;

    console.log(`[FluentSupport] Fetching tickets from: ${endpoint}`);
    console.log(`[FluentSupport] Date filter: created_at >= ${dateFilter}`);

    // FluentSupport API may support pagination
    let allTickets = [];
    let page = 1;
    let hasMore = true;
    const perPage = 100; // Adjust based on API limits

    while (hasMore) {
      const url = `${endpoint}?per_page=${perPage}&page=${page}`;
      console.log(`[FluentSupport] Fetching page ${page}...`);

      const response = await axios.get(url, {
        headers,
        timeout: 30000 // 30 second timeout
      });

      console.log(`[FluentSupport] Response data type:`, typeof response.data);
      console.log(`[FluentSupport] Response data keys:`, response.data ? Object.keys(response.data) : 'null');

      let tickets = [];
      if (Array.isArray(response.data)) {
        // Direct array response
        tickets = response.data;
      } else if (response.data && response.data.tickets) {
        // FluentSupport API format: { tickets: { data: [...] } }
        if (response.data.tickets.data && Array.isArray(response.data.tickets.data)) {
          tickets = response.data.tickets.data;
        } else if (Array.isArray(response.data.tickets)) {
          tickets = response.data.tickets;
        }
      } else if (response.data && response.data.data && Array.isArray(response.data.data)) {
        // Simple { data: [...] } format
        tickets = response.data.data;
      }

      console.log(`[FluentSupport] Parsed ${tickets.length} tickets from response`);

      if (tickets.length === 0) {
        hasMore = false;
      } else {
        // Filter tickets by date (server-side filtering may not be available)
        const filteredTickets = tickets.filter(ticket => {
          const createdAt = ticket.created_at || ticket.created_date || ticket.date_created;
          if (!createdAt) return false;

          // Compare dates (FluentSupport typically uses MySQL datetime format)
          const ticketDate = new Date(createdAt).toISOString().split('T')[0];
          return ticketDate >= dateFilter;
        });

        allTickets = allTickets.concat(filteredTickets);

        console.log(`[FluentSupport] Page ${page}: ${tickets.length} total, ${filteredTickets.length} after date filter`);

        // Check if we should continue pagination
        if (tickets.length < perPage) {
          hasMore = false;
        } else {
          page++;
        }
      }
    }

    console.log(`[FluentSupport] Total tickets fetched: ${allTickets.length} (after date filter: ${dateFilter})`);
    return allTickets;

  } catch (error) {
    console.error('[FluentSupport] Error fetching tickets:', error.message);
    if (error.response) {
      console.error('[FluentSupport] Response status:', error.response.status);
      console.error('[FluentSupport] Response data:', error.response.data);
    }
    throw new Error(`FluentSupport API error: ${error.message}`);
  }
}

/**
 * Fetch a single ticket by ID
 * @param {string|number} ticketId - FluentSupport ticket ID
 * @returns {Promise<Object>} Ticket object
 */
export async function fetchFluentTicket(ticketId) {
  if (!FLUENT_API_URL || !FLUENT_USERNAME || !FLUENT_PASSWORD) {
    throw new Error('FluentSupport API credentials not configured');
  }

  try {
    const authString = Buffer.from(`${FLUENT_USERNAME}:${FLUENT_PASSWORD}`).toString('base64');

    const headers = {
      'Authorization': `Basic ${authString}`,
      'Content-Type': 'application/json',
    };

    const baseUrl = FLUENT_API_URL.replace(/\/$/, '');
    const url = `${baseUrl}/wp-json/fluent-support/v2/ticket/${ticketId}`;

    console.log(`[FluentSupport] Fetching ticket ${ticketId}...`);

    const response = await axios.get(url, { headers });

    return response.data;

  } catch (error) {
    console.error(`[FluentSupport] Error fetching ticket ${ticketId}:`, error.message);
    throw new Error(`FluentSupport API error: ${error.message}`);
  }
}

/**
 * Parse FluentSupport HTML content to extract clean subject and description
 * @param {string} htmlContent - HTML table content from FluentSupport
 * @returns {Object} Parsed subject and description
 */
function parseFluentSupportHTML(htmlContent) {
  if (!htmlContent) return { subject: '', description: '' };

  let subject = '';
  let description = '';

  try {
    // Extract Subject field
    const subjectMatch = htmlContent.match(/<strong>Subject<\/strong>.*?<td[^>]*>(.*?)<\/td>/s);
    if (subjectMatch && subjectMatch[1]) {
      subject = subjectMatch[1].replace(/<[^>]*>/g, '').trim();
    }

    // Extract Description field (multiple possible field names)
    const descMatches = [
      /<strong>Describe your request.*?<\/strong>.*?<td[^>]*>(.*?)<\/td>/s,
      /<strong>Description<\/strong>.*?<td[^>]*>(.*?)<\/td>/s,
      /<strong>Message<\/strong>.*?<td[^>]*>(.*?)<\/td>/s,
    ];

    for (const regex of descMatches) {
      const match = htmlContent.match(regex);
      if (match && match[1]) {
        description = match[1]
          .replace(/<br\s*\/?>/gi, '\n')  // Convert <br> to newlines
          .replace(/<\/p><p>/gi, '\n\n')  // Convert paragraph breaks to double newlines
          .replace(/<[^>]*>/g, '')        // Remove all HTML tags
          .replace(/&nbsp;/g, ' ')        // Convert &nbsp; to spaces
          .replace(/\r\n/g, '\n')         // Normalize line endings
          .replace(/\n{3,}/g, '\n\n')     // Max 2 consecutive newlines
          .trim();
        break;
      }
    }
  } catch (error) {
    console.error('[FluentSupport] Error parsing HTML:', error.message);
  }

  return { subject, description };
}

/**
 * Transform FluentSupport ticket to internal request format
 * @param {Object} ticket - FluentSupport ticket object
 * @returns {Object} Request data object for database insertion
 */
export function transformFluentTicket(ticket) {
  // Map FluentSupport priority to internal urgency
  const mapPriority = (priority) => {
    if (!priority) return 'MEDIUM';

    const p = priority.toLowerCase();
    if (p === 'critical' || p === 'high' || p === 'urgent') return 'HIGH';
    if (p === 'medium' || p === 'normal') return 'MEDIUM';
    return 'LOW';
  };

  // Estimate effort based on urgency
  const estimateEffort = (urgency) => {
    switch(urgency) {
      case 'HIGH':
        return 'Large';
      case 'MEDIUM':
        return 'Medium';
      case 'LOW':
      default:
        return 'Small';
    }
  };

  const urgency = mapPriority(ticket.priority);

  // Parse creation date
  const createdAt = ticket.created_at || ticket.created_date || ticket.date_created;
  const creationDate = createdAt ? new Date(createdAt) : new Date();
  const date = creationDate.toISOString().split('T')[0];
  const time = creationDate.toTimeString().split(' ')[0]; // HH:MM:SS format

  // Parse HTML content to get clean subject and description
  const htmlContent = ticket.customer_message || ticket.content || ticket.message || '';
  const parsed = parseFluentSupportHTML(htmlContent);

  // Use parsed values, fallback to ticket title if parsing fails
  const subject = parsed.subject || ticket.title || ticket.subject || 'No subject';
  const cleanDescription = parsed.description || '';

  // Build final description
  const description = cleanDescription ? `${subject}: ${cleanDescription}` : subject;

  return {
    date,
    time,
    request_type: 'Fluent Ticket',
    category: 'Support', // Default category, can be customized based on ticket.product or ticket.tags
    description,
    urgency,
    effort: estimateEffort(urgency),
    status: 'active',
    source: 'fluent',
    fluent_id: ticket.id?.toString() || ticket.ticket_id?.toString(),

    // Additional FluentSupport metadata
    fluent_metadata: {
      ticket_number: ticket.ticket_hash || ticket.serial_number || ticket.id,
      created_at: createdAt,
      updated_at: ticket.updated_at || ticket.last_updated,
      ticket_status: ticket.status,
      customer_id: ticket.customer_id,
      customer_name: ticket.customer?.name || ticket.customer_name,
      customer_email: ticket.customer?.email || ticket.customer_email,
      mailbox_id: ticket.mailbox_id,
      priority: ticket.priority,
      product_id: ticket.product_id,
      product_name: ticket.product?.name || ticket.product_name,
      agent_id: ticket.agent_id,
      agent_name: ticket.agent?.name || ticket.agent_name,
      raw_data: ticket
    }
  };
}

export default {
  fetchFluentTickets,
  fetchFluentTicket,
  transformFluentTicket
};
