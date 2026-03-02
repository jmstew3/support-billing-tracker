import axios from 'axios';
import logger from './logger.js';
import { validateFluentTickets } from './apiSchemas.js';
import { estimateHours } from './invoiceService.js';

/**
 * FluentSupport API Service
 *
 * Handles communication with FluentSupport WordPress REST API
 * Requires WordPress Application Password for authentication
 *
 * API Documentation: https://fluentsupport.com/rest-api/
 * Endpoint: /wp-json/fluent-support/v2/tickets
 */

/**
 * Retry helper with exponential backoff
 * Only retries on network errors and 5xx status codes, NOT on 4xx
 * @param {Function} fn - Async function to retry
 * @param {number} maxAttempts - Maximum number of attempts (default: 3)
 * @param {number} baseDelayMs - Base delay in ms for exponential backoff (default: 1000)
 * @returns {Promise<*>} Result of the function call
 */
async function withRetry(fn, maxAttempts = 3, baseDelayMs = 1000) {
  let lastError;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Don't retry on 4xx client errors
      if (error.response && error.response.status >= 400 && error.response.status < 500) {
        throw error;
      }

      // Only retry on network errors (no response) or 5xx server errors
      const isRetryable = !error.response || (error.response.status >= 500);

      if (!isRetryable || attempt === maxAttempts) {
        throw error;
      }

      // Exponential backoff: 1s, 2s, 4s
      const delay = baseDelayMs * Math.pow(2, attempt - 1);
      logger.warn(`[FluentSupport] Request failed (attempt ${attempt}/${maxAttempts}), retrying in ${delay}ms`, {
        error: error.message,
        status: error.response?.status
      });
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

// Get FluentSupport config from environment
const FLUENT_API_URL = process.env.VITE_FLUENT_API_URL || '';
const FLUENT_USERNAME = process.env.VITE_FLUENT_API_USERNAME || '';
const FLUENT_PASSWORD = process.env.VITE_FLUENT_API_PASSWORD || '';
const FLUENT_DATE_FILTER = process.env.VITE_FLUENT_DATE_FILTER || '2025-09-20';
const FLUENT_MAILBOX_ID = process.env.VITE_FLUENT_MAILBOX_ID || '';

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
      let url = `${endpoint}?per_page=${perPage}&page=${page}`;
      if (FLUENT_MAILBOX_ID) {
        url += `&mailbox_id=${FLUENT_MAILBOX_ID}`;
      }

      const response = await withRetry(() => axios.get(url, {
        headers,
        timeout: 30000 // 30 second timeout
      }));

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
        // Filter tickets:
        // - Closed tickets: keep if resolved_at >= dateFilter
        // - Open/non-closed tickets: pass through (sync service needs these to detect reopened tickets)
        const filteredTickets = tickets.filter(ticket => {
          const isClosed = ticket.status === 'closed';

          if (isClosed) {
            const resolvedAt = ticket.resolved_at;
            if (!resolvedAt) return false;
            const resolvedDate = new Date(resolvedAt).toISOString().split('T')[0];
            return resolvedDate >= dateFilter;
          }

          // Non-closed tickets pass through for sync service to handle
          return true;
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

    // Filter by mailbox_id server-side (API ignores the mailbox_id query parameter)
    const effectiveMailboxId = process.env.VITE_FLUENT_MAILBOX_ID || FLUENT_MAILBOX_ID;
    if (effectiveMailboxId) {
      const before = allTickets.length;
      logger.info(`[FluentSupport] Filtering ${before} tickets for mailbox_id=${effectiveMailboxId}`);
      
      allTickets = allTickets.filter(ticket => {
        const ticketMailboxId = ticket.mailbox_id || (ticket.mailbox && ticket.mailbox.id);
        const matches = String(ticketMailboxId) === String(effectiveMailboxId);
        if (!matches && before < 10) { // Only log details if few tickets for debugging
           logger.debug(`[FluentSupport] Ticket ${ticket.id} mailbox_id ${ticketMailboxId} does not match ${effectiveMailboxId}`);
        }
        return matches;
      });
      
      const filtered = before - allTickets.length;
      if (filtered > 0) {
        logger.info(`[FluentSupport] Filtered out ${filtered} tickets from other mailboxes (keeping mailbox_id=${effectiveMailboxId})`);
      } else if (before > 0 && allTickets.length === before) {
        logger.warn(`[FluentSupport] No tickets were filtered out, even though mailbox_id=${effectiveMailboxId} was set. First ticket mailbox_id: ${allTickets[0]?.mailbox_id}`);
      }
    } else {
      logger.warn('[FluentSupport] VITE_FLUENT_MAILBOX_ID not set, skipping mailbox filter');
    }

    // Validate API response data at integration boundary
    return validateFluentTickets(allTickets);

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

    const response = await withRetry(() => axios.get(url, {
      headers,
      timeout: 30000 // 30 second timeout
    }));

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
    logger.error('[FluentSupport] Error parsing HTML', { error: error.message });
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
  /**
   * Map FluentSupport priority to internal urgency level
   * FluentSupport priorities: critical, high, urgent, medium, normal, low
   * Our urgency levels: HIGH, MEDIUM, LOW
   * @param {string} priority - The priority from FluentSupport
   * @returns {string} The mapped urgency level
   */
  const mapPriority = (priority) => {
    if (!priority) {
      logger.info('[FluentSupport] No priority provided, defaulting to MEDIUM');
      return 'MEDIUM';
    }

    // Case-insensitive matching with trimming
    const normalizedPriority = priority.toString().trim().toLowerCase();

    // Map FluentSupport priority values to our urgency levels
    if (normalizedPriority === 'critical' || normalizedPriority === 'high' || normalizedPriority === 'urgent') {
      logger.debug(`[FluentSupport] Mapping priority "${priority}" → urgency HIGH`);
      return 'HIGH';
    }
    if (normalizedPriority === 'medium' || normalizedPriority === 'normal') {
      logger.debug(`[FluentSupport] Mapping priority "${priority}" → urgency MEDIUM`);
      return 'MEDIUM';
    }
    if (normalizedPriority === 'low') {
      logger.debug(`[FluentSupport] Mapping priority "${priority}" → urgency LOW`);
      return 'LOW';
    }

    // Unknown priority value - log warning and default to MEDIUM
    logger.warn(`[FluentSupport] Unknown priority "${priority}" - defaulting to MEDIUM`);
    return 'MEDIUM';
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

  // Extract response metrics for hour estimation
  const responseCount = parseInt(ticket.response_count) || 0;
  const totalCloseTime = ticket.total_close_time != null ? parseInt(ticket.total_close_time) : null;
  const estimated_hours = estimateHours(responseCount, urgency);

  /**
   * Validate category against frontend CATEGORY_OPTIONS
   * Valid categories: Advisory, Email, Forms, General, Hosting, Migration, Non-billable, Scripts, Support, Website
   * @param {string} category - The category to validate
   * @returns {string} The validated category or 'Support' fallback
   */
  const validateCategory = (category) => {
    const validCategories = [
      'Advisory',
      'Email',
      'Forms',
      'General',
      'Hosting',
      'Migration',
      'Non-billable',
      'Scripts',
      'Support',
      'Website'
    ];

    if (validCategories.includes(category)) {
      return category;
    }

    logger.warn(`[FluentSupport] Invalid category "${category}" - not in CATEGORY_OPTIONS, defaulting to Support`);
    return 'Support';
  };

  /**
   * Map FluentSupport product title to internal category
   * @param {string} productTitle - The product title from FluentSupport
   * @returns {string} The mapped category for our application
   */
  const mapFluentCategory = (productTitle) => {
    if (!productTitle) {
      logger.info('[FluentSupport] No product title provided, defaulting to Support');
      return 'Support';
    }

    // Normalize case: "support" → "Support", "HOSTING" → "Hosting"
    const normalizedTitle = productTitle.trim();
    const capitalizedTitle = normalizedTitle.charAt(0).toUpperCase() + normalizedTitle.slice(1).toLowerCase();

    const mapping = {
      'Support': 'Support',      // Direct match
      'Hosting': 'Hosting',      // Direct match
      'Migration': 'Migration',  // Direct match
      'Website': 'Website',      // Direct match
      'Project': 'General',      // Map Project to General category
      'General': 'General',      // Direct match
      'Email': 'Email',          // Direct match
      'Forms': 'Forms',          // Direct match
      'Scripts': 'Scripts',      // Direct match
      'Advisory': 'Advisory',    // Direct match
    };

    const mappedCategory = mapping[capitalizedTitle];

    if (!mappedCategory) {
      logger.warn(`[FluentSupport] Unknown product "${productTitle}" (normalized: "${capitalizedTitle}") - defaulting to Support`);
      return validateCategory('Support');
    }

    logger.debug(`[FluentSupport] Mapping product "${productTitle}" → category "${mappedCategory}"`);
    return validateCategory(mappedCategory);
  };

  // Use resolved_at as primary date for closed tickets, fallback to created_at
  const isClosed = ticket.status === 'closed';
  const createdAt = ticket.created_at || ticket.created_date || ticket.date_created;
  const primaryDateSource = (isClosed && ticket.resolved_at) ? ticket.resolved_at : createdAt;
  const primaryDate = primaryDateSource ? new Date(primaryDateSource) : new Date();
  const date = primaryDate.toISOString().split('T')[0];
  const time = primaryDate.toTimeString().split(' ')[0]; // HH:MM:SS format

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

  logger.debug(`[FluentSupport] Ticket ${ticket.id}: Found ${allUrls.length} URLs, primary: ${websiteUrl}`);

  return {
    date,
    time,
    request_type: 'Fluent Ticket',
    category: mapFluentCategory(ticket.product?.title),
    description,
    urgency,
    effort: estimateEffort(urgency),
    estimated_hours,
    status: 'active',
    source: 'fluent',
    fluent_id: ticket.id?.toString() || ticket.ticket_id?.toString(),
    website_url: websiteUrl, // Primary website URL extracted from ticket
    response_count: responseCount,
    total_close_time: totalCloseTime,

    // Additional FluentSupport metadata
    fluent_metadata: {
      ticket_number: ticket.ticket_hash || ticket.serial_number || ticket.id,
      created_at: createdAt,
      resolved_at: ticket.resolved_at || null,
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
      response_count: responseCount,
      total_close_time: totalCloseTime,
      raw_data: ticket
    }
  };
}

export default {
  fetchFluentTickets,
  fetchFluentTicket,
  transformFluentTicket
};
