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

    // FluentSupport API may support pagination
    let allTickets = [];
    let page = 1;
    let hasMore = true;
    const perPage = 100; // Adjust based on API limits

    while (hasMore) {
      const url = `${endpoint}?per_page=${perPage}&page=${page}`;

      const response = await axios.get(url, {
        headers,
        timeout: 30000 // 30 second timeout
      });

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

        // Check if we should continue pagination
        if (tickets.length < perPage) {
          hasMore = false;
        } else {
          page++;
        }
      }
    }

    return allTickets;

  } catch (error) {
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

    const response = await axios.get(url, { headers });

    return response.data;

  } catch (error) {
    throw new Error(`FluentSupport API error: ${error.message}`);
  }
}

/**
 * Extract URLs from text content
 * @param {string} text - Text to extract URLs from
 * @returns {Array} Array of URLs found
 */
function extractURLs(text) {
  if (!text) return [];

  // URL regex pattern
  const urlRegex = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/gi;
  const urls = text.match(urlRegex) || [];

  return [...new Set(urls)]; // Remove duplicates
}

/**
 * Get primary website URL (prioritize client websites over tools like Loom)
 * @param {Array} urls - Array of URLs
 * @returns {string|null} Primary website URL or null
 */
function getPrimaryWebsiteURL(urls) {
  if (!urls || urls.length === 0) return null;

  // Filter out common tool URLs (Loom, etc.)
  const toolDomains = ['loom.com', 'youtube.com', 'youtu.be', 'drive.google.com'];
  const clientUrls = urls.filter(url => {
    return !toolDomains.some(domain => url.includes(domain));
  });

  // Return first client URL, or first URL if no client URLs found
  return clientUrls[0] || urls[0] || null;
}

/**
 * Parse FluentSupport HTML content to extract clean subject, description, and URLs
 * @param {string} htmlContent - HTML table content from FluentSupport
 * @returns {Object} Parsed subject, description, urls, and primaryUrl
 */
function parseFluentSupportHTML(htmlContent) {
  if (!htmlContent) return { subject: '', description: '', urls: [], primaryUrl: null };

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

  // Extract URLs from both subject and description
  const combinedText = `${subject} ${description}`;
  const urls = extractURLs(combinedText);
  const primaryUrl = getPrimaryWebsiteURL(urls);

  return { subject, description, urls, primaryUrl };
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

  /**
   * Map FluentSupport product title to internal category
   * @param {string} productTitle - The product title from FluentSupport
   * @returns {string} The mapped category for our application
   */
  const mapFluentCategory = (productTitle) => {
    if (!productTitle) {
      console.log('[FluentSupport] No product title provided, defaulting to Support');
      return 'Support';
    }

    const mapping = {
      'Support': 'Support',      // Direct match
      'Hosting': 'Hosting',      // Direct match
      'Migration': 'Migration',  // Direct match
      'Website': 'Website',      // Direct match
      'Project': 'General',      // Map Project to General category
      'Email': 'Email',          // Direct match (if exists)
      'Forms': 'Forms',          // Direct match (if exists)
      'Scripts': 'Scripts',      // Direct match (if exists)
      'Advisory': 'Advisory',    // Direct match (if exists)
    };

    const mappedCategory = mapping[productTitle] || 'Support';
    console.log(`[FluentSupport] Mapping product "${productTitle}" to category "${mappedCategory}"`);
    return mappedCategory;
  };

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

  // Extract URLs from title as well (some tickets have URLs only in title)
  const titleUrls = extractURLs(ticket.title || '');
  const allUrls = [...new Set([...parsed.urls, ...titleUrls])];
  const websiteUrl = parsed.primaryUrl || getPrimaryWebsiteURL(titleUrls) || null;

  // Build final description
  const description = cleanDescription ? `${subject}: ${cleanDescription}` : subject;

  console.log(`[FluentSupport] Ticket ${ticket.id}: Found ${allUrls.length} URLs, primary: ${websiteUrl}`);

  return {
    date,
    time,
    request_type: 'Fluent Ticket',
    category: mapFluentCategory(ticket.product?.title),
    description,
    urgency,
    effort: estimateEffort(urgency),
    status: 'active',
    source: 'fluent',
    fluent_id: ticket.id?.toString() || ticket.ticket_id?.toString(),
    website_url: websiteUrl, // Primary website URL extracted from ticket

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
      product_name: ticket.product?.title || ticket.product_name,
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
