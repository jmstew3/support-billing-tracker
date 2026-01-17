import express from 'express';
import { clientPortalAuth, stripSensitiveFields } from '../middleware/clientAuth.js';
import ClientRepository from '../repositories/ClientRepository.js';
import pool from '../db/config.js';

const router = express.Router();

// Twenty CRM API configuration
const TWENTY_API_TOKEN = process.env.VITE_TWENTY_API_TOKEN || '';
const TWENTY_BASE_URL = 'https://twenny.peakonedigital.com/rest';

/**
 * Log client activity for audit
 */
async function logClientActivity(req, action, resourceType = null, resourceId = null) {
  try {
    await pool.execute(
      `INSERT INTO client_audit_logs (client_user_id, client_id, action, resource_type, resource_id, ip_address, user_agent)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        req.clientUser.id,
        req.clientUser.clientId,
        action,
        resourceType,
        resourceId,
        req.ip,
        req.get('User-Agent')
      ]
    );
  } catch (error) {
    console.error('Error logging client activity:', error);
  }
}

/**
 * GET /api/client/profile
 * Get client company profile
 */
router.get('/profile', clientPortalAuth, async (req, res) => {
  try {
    const profile = await ClientRepository.getProfile(req.clientScope.clientId);

    if (!profile) {
      return res.status(404).json({ error: 'Client not found' });
    }

    await logClientActivity(req, 'view_profile');

    res.json(profile);
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

/**
 * GET /api/client/tickets
 * Get client's support tickets (no billing data)
 */
router.get('/tickets', clientPortalAuth, stripSensitiveFields(), async (req, res) => {
  try {
    const { limit = 50, offset = 0, status } = req.query;

    const result = await ClientRepository.getTickets(req.clientScope.clientId, {
      limit: Math.min(parseInt(limit) || 50, 100),
      offset: parseInt(offset) || 0,
      status: status || null
    });

    await logClientActivity(req, 'view_tickets');

    res.json(result);
  } catch (error) {
    console.error('Error fetching tickets:', error);
    res.status(500).json({ error: 'Failed to fetch tickets' });
  }
});

/**
 * GET /api/client/tickets/:id
 * Get single ticket detail (no billing data)
 */
router.get('/tickets/:id', clientPortalAuth, stripSensitiveFields(), async (req, res) => {
  try {
    const ticketId = parseInt(req.params.id);

    if (isNaN(ticketId)) {
      return res.status(400).json({ error: 'Invalid ticket ID' });
    }

    const ticket = await ClientRepository.getTicketById(req.clientScope.clientId, ticketId);

    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    await logClientActivity(req, 'view_ticket', 'ticket', ticketId.toString());

    res.json(ticket);
  } catch (error) {
    console.error('Error fetching ticket:', error);
    res.status(500).json({ error: 'Failed to fetch ticket' });
  }
});

/**
 * GET /api/client/tickets/:id/messages
 * Get ticket conversation messages
 * TODO: Integrate with FluentSupport API to fetch actual conversation
 */
router.get('/tickets/:id/messages', clientPortalAuth, async (req, res) => {
  try {
    const ticketId = parseInt(req.params.id);

    if (isNaN(ticketId)) {
      return res.status(400).json({ error: 'Invalid ticket ID' });
    }

    // Verify ticket belongs to client
    const ticket = await ClientRepository.getTicketById(req.clientScope.clientId, ticketId);

    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    // TODO: Fetch conversation from FluentSupport API
    // For now, return the initial message
    const messages = [
      {
        id: 1,
        content: ticket.customer_message,
        sender: 'client',
        senderName: 'You',
        createdAt: ticket.created_at
      }
    ];

    await logClientActivity(req, 'view_ticket_messages', 'ticket', ticketId.toString());

    res.json({ messages, ticketId });
  } catch (error) {
    console.error('Error fetching ticket messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

/**
 * GET /api/client/sites
 * Get client's hosted websites from Twenty CRM
 * Filters by parentCompanyId matching the client's twenty_brand_id
 */
router.get('/sites', clientPortalAuth, async (req, res) => {
  try {
    // Get the client's twenty_brand_id for filtering
    const profile = await ClientRepository.getProfile(req.clientScope.clientId);

    if (!profile || !profile.twenty_brand_id) {
      // Fallback to database-linked websites if no Twenty CRM brand ID
      const websites = await ClientRepository.getWebsites(req.clientScope.clientId);
      await logClientActivity(req, 'view_sites');
      return res.json({ websites });
    }

    // Fetch all websiteProperties from Twenty CRM
    const response = await fetch(`${TWENTY_BASE_URL}/websiteProperties?depth=1&limit=500`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${TWENTY_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error(`Twenty API error: ${response.status} ${response.statusText}`);
      // Fallback to database
      const websites = await ClientRepository.getWebsites(req.clientScope.clientId);
      await logClientActivity(req, 'view_sites');
      return res.json({ websites });
    }

    const data = await response.json();
    const rawProperties = data?.data?.websiteProperties || [];

    // Filter by parentCompanyId matching client's twenty_brand_id
    const clientWebsites = rawProperties
      .filter(prop => prop.parentCompanyId === profile.twenty_brand_id)
      .map(prop => {
        // Format hosting status to match frontend expectations (Title Case)
        let hostingStatus = 'Active'; // default
        if (prop.hostingStatus) {
          const status = prop.hostingStatus.toLowerCase();
          hostingStatus = status.charAt(0).toUpperCase() + status.slice(1);
        }

        return {
          id: prop.id,
          website_url: prop.websiteUrl || null,
          website_name: prop.name || null,
          hosting_status: hostingStatus,
          hosting_start: prop.hostingStart || null,
          hosting_mrr: prop.hostingMrrAmount || null,
          created_at: prop.createdAt || new Date().toISOString(),
        };
      });

    await logClientActivity(req, 'view_sites');

    res.json({ websites: clientWebsites });
  } catch (error) {
    console.error('Error fetching websites:', error);
    res.status(500).json({ error: 'Failed to fetch websites' });
  }
});

/**
 * GET /api/client/projects
 * Get client's projects
 */
router.get('/projects', clientPortalAuth, async (req, res) => {
  try {
    const projects = await ClientRepository.getProjects(req.clientScope.clientId);

    await logClientActivity(req, 'view_projects');

    res.json({ projects });
  } catch (error) {
    console.error('Error fetching projects:', error);
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

/**
 * GET /api/client/activity
 * Get client activity summary
 */
router.get('/activity', clientPortalAuth, async (req, res) => {
  try {
    const summary = await ClientRepository.getActivitySummary(req.clientScope.clientId);

    await logClientActivity(req, 'view_activity');

    res.json(summary);
  } catch (error) {
    console.error('Error fetching activity:', error);
    res.status(500).json({ error: 'Failed to fetch activity summary' });
  }
});

export default router;
