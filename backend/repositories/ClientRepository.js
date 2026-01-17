import pool from '../db/config.js';

// Twenty CRM API configuration
const TWENTY_API_TOKEN = process.env.VITE_TWENTY_API_TOKEN || '';
const TWENTY_BASE_URL = 'https://twenny.peakonedigital.com/rest';

/**
 * ClientRepository - Secure data access layer for client portal
 * All queries are automatically scoped to client_id for data isolation
 * SECURITY: Every method REQUIRES clientId parameter - no exceptions
 */
class ClientRepository {
  /**
   * Get client profile information
   * @param {number} clientId - Client ID (REQUIRED for scoping)
   * @returns {Promise<Object|null>} Client profile
   */
  static async getProfile(clientId) {
    if (!clientId) throw new Error('clientId is required for data scoping');

    try {
      const [clients] = await pool.execute(
        `SELECT id, company_name, contact_email, contact_phone, twenty_brand_id, created_at
         FROM clients
         WHERE id = ? AND is_active = TRUE`,
        [clientId]
      );
      return clients.length > 0 ? clients[0] : null;
    } catch (error) {
      console.error('Error fetching client profile:', error);
      throw error;
    }
  }

  /**
   * Get client's support tickets (without sensitive billing data)
   * @param {number} clientId - Client ID (REQUIRED for scoping)
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Array of tickets
   */
  static async getTickets(clientId, options = {}) {
    if (!clientId) throw new Error('clientId is required for data scoping');

    // Ensure limit and offset are integers (MySQL prepared statements are strict about types)
    const limit = parseInt(options.limit, 10) || 50;
    const offset = parseInt(options.offset, 10) || 0;
    const status = options.status || null;

    try {
      let query = `
        SELECT
          ft.id,
          ft.fluent_id,
          ft.ticket_number,
          ft.title,
          ft.ticket_status,
          ft.priority,
          ft.created_at,
          ft.updated_at_fluent,
          ft.customer_message,
          ft.agent_name,
          ft.product_name
        FROM fluent_tickets ft
        WHERE ft.client_id = ?
      `;
      const params = [clientId];

      if (status) {
        query += ' AND ft.ticket_status = ?';
        params.push(status);
      }

      // Use template literals for LIMIT/OFFSET (already validated as integers)
      // mysql2 execute() has issues with parameterized LIMIT/OFFSET
      query += ` ORDER BY ft.created_at DESC LIMIT ${limit} OFFSET ${offset}`;

      const [tickets] = await pool.execute(query, params);

      // Get total count for pagination
      const [countResult] = await pool.execute(
        `SELECT COUNT(*) as total FROM fluent_tickets WHERE client_id = ?` +
        (status ? ' AND ticket_status = ?' : ''),
        status ? [clientId, status] : [clientId]
      );

      return {
        tickets,
        total: countResult[0].total,
        limit,
        offset
      };
    } catch (error) {
      console.error('Error fetching client tickets:', error);
      throw error;
    }
  }

  /**
   * Get single ticket detail (without sensitive data)
   * @param {number} clientId - Client ID (REQUIRED for scoping)
   * @param {number} ticketId - Ticket ID
   * @returns {Promise<Object|null>} Ticket detail
   */
  static async getTicketById(clientId, ticketId) {
    if (!clientId) throw new Error('clientId is required for data scoping');

    try {
      const [tickets] = await pool.execute(
        `SELECT
          ft.id,
          ft.fluent_id,
          ft.ticket_number,
          ft.title,
          ft.ticket_status,
          ft.priority,
          ft.created_at,
          ft.updated_at_fluent,
          ft.customer_message,
          ft.agent_name,
          ft.product_name,
          ft.mailbox_id
        FROM fluent_tickets ft
        WHERE ft.id = ? AND ft.client_id = ?`,
        [ticketId, clientId]
      );

      return tickets.length > 0 ? tickets[0] : null;
    } catch (error) {
      console.error('Error fetching ticket by ID:', error);
      throw error;
    }
  }

  /**
   * Get client's hosted websites
   * @param {number} clientId - Client ID (REQUIRED for scoping)
   * @returns {Promise<Array>} Array of websites
   */
  static async getWebsites(clientId) {
    if (!clientId) throw new Error('clientId is required for data scoping');

    try {
      const [websites] = await pool.execute(
        `SELECT
          id,
          website_url,
          website_name,
          hosting_status,
          created_at
        FROM client_website_links
        WHERE client_id = ?
        ORDER BY website_name ASC`,
        [clientId]
      );

      return websites;
    } catch (error) {
      console.error('Error fetching client websites:', error);
      throw error;
    }
  }

  /**
   * Get client's projects
   * @param {number} clientId - Client ID (REQUIRED for scoping)
   * @returns {Promise<Array>} Array of projects
   */
  static async getProjects(clientId) {
    if (!clientId) throw new Error('clientId is required for data scoping');

    try {
      const [projects] = await pool.execute(
        `SELECT
          id,
          project_name,
          project_status,
          created_at
        FROM client_project_links
        WHERE client_id = ?
        ORDER BY created_at DESC`,
        [clientId]
      );

      return projects;
    } catch (error) {
      console.error('Error fetching client projects:', error);
      throw error;
    }
  }

  /**
   * Get website count from Twenty CRM by parentCompanyId
   * @param {string} twentyBrandId - Twenty CRM company ID
   * @returns {Promise<number>} Website count
   */
  static async getWebsiteCountFromTwenty(twentyBrandId) {
    if (!twentyBrandId) return 0;

    try {
      const response = await fetch(`${TWENTY_BASE_URL}/websiteProperties?depth=1&limit=500`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${TWENTY_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        console.error(`Twenty API error: ${response.status}`);
        return 0;
      }

      const data = await response.json();
      const rawProperties = data?.data?.websiteProperties || [];

      // Filter by parentCompanyId and count
      return rawProperties.filter(prop => prop.parentCompanyId === twentyBrandId).length;
    } catch (error) {
      console.error('Error fetching website count from Twenty:', error);
      return 0;
    }
  }

  /**
   * Get client activity summary
   * @param {number} clientId - Client ID (REQUIRED for scoping)
   * @returns {Promise<Object>} Activity summary
   */
  static async getActivitySummary(clientId) {
    if (!clientId) throw new Error('clientId is required for data scoping');

    try {
      // Get client profile for Twenty brand ID
      const profile = await this.getProfile(clientId);

      // Get ticket counts by status
      const [ticketCounts] = await pool.execute(
        `SELECT
          ticket_status,
          COUNT(*) as count
        FROM fluent_tickets
        WHERE client_id = ?
        GROUP BY ticket_status`,
        [clientId]
      );

      // Get recent tickets (last 5)
      const [recentTickets] = await pool.execute(
        `SELECT
          id, ticket_number, title, ticket_status, created_at
        FROM fluent_tickets
        WHERE client_id = ?
        ORDER BY created_at DESC
        LIMIT 5`,
        [clientId]
      );

      // Get website count from Twenty CRM if brand ID exists, otherwise from database
      let websiteCount = 0;
      if (profile?.twenty_brand_id) {
        websiteCount = await this.getWebsiteCountFromTwenty(profile.twenty_brand_id);
      } else {
        const [dbCount] = await pool.execute(
          `SELECT COUNT(*) as count FROM client_website_links WHERE client_id = ?`,
          [clientId]
        );
        websiteCount = dbCount[0].count;
      }

      // Get project count
      const [projectCount] = await pool.execute(
        `SELECT COUNT(*) as count FROM client_project_links WHERE client_id = ?`,
        [clientId]
      );

      // Build summary
      const ticketsByStatus = {};
      let totalTickets = 0;
      for (const row of ticketCounts) {
        ticketsByStatus[row.ticket_status || 'unknown'] = row.count;
        totalTickets += row.count;
      }

      return {
        tickets: {
          total: totalTickets,
          byStatus: ticketsByStatus,
          recent: recentTickets
        },
        websites: {
          total: websiteCount
        },
        projects: {
          total: projectCount[0].count
        }
      };
    } catch (error) {
      console.error('Error fetching activity summary:', error);
      throw error;
    }
  }

  // ============================================
  // Admin methods (for internal dashboard)
  // ============================================

  /**
   * Get all clients (admin only)
   * @returns {Promise<Array>} Array of all clients
   */
  static async getAllClients(options = {}) {
    const { limit = 100, offset = 0, includeInactive = false } = options;

    try {
      let query = `
        SELECT
          c.*,
          COUNT(DISTINCT cu.id) as user_count,
          COUNT(DISTINCT ft.id) as ticket_count,
          COUNT(DISTINCT cwl.id) as website_count
        FROM clients c
        LEFT JOIN client_users cu ON c.id = cu.client_id AND cu.is_active = TRUE
        LEFT JOIN fluent_tickets ft ON c.id = ft.client_id
        LEFT JOIN client_website_links cwl ON c.id = cwl.client_id
      `;

      if (!includeInactive) {
        query += ' WHERE c.is_active = TRUE';
      }

      query += ' GROUP BY c.id ORDER BY c.company_name ASC LIMIT ? OFFSET ?';

      const [clients] = await pool.execute(query, [limit, offset]);

      // Get total count
      const [countResult] = await pool.execute(
        'SELECT COUNT(*) as total FROM clients' + (includeInactive ? '' : ' WHERE is_active = TRUE')
      );

      return {
        clients,
        total: countResult[0].total,
        limit,
        offset
      };
    } catch (error) {
      console.error('Error fetching all clients:', error);
      throw error;
    }
  }

  /**
   * Get client by ID (admin only)
   * @param {number} clientId - Client ID
   * @returns {Promise<Object|null>} Client details
   */
  static async getClientById(clientId) {
    try {
      const [clients] = await pool.execute(
        `SELECT * FROM clients WHERE id = ?`,
        [clientId]
      );

      if (clients.length === 0) return null;

      // Get associated users
      const [users] = await pool.execute(
        `SELECT id, email, name, is_active, last_login_at, created_at
         FROM client_users WHERE client_id = ?`,
        [clientId]
      );

      return {
        ...clients[0],
        users
      };
    } catch (error) {
      console.error('Error fetching client by ID:', error);
      throw error;
    }
  }

  /**
   * Create new client (admin only)
   * @param {Object} clientData - Client data
   * @returns {Promise<Object>} Created client
   */
  static async createClient(clientData) {
    const {
      companyName,
      contactEmail,
      contactPhone = null,
      fluentCustomerId = null,
      twentyBrandId = null,
      notes = null
    } = clientData;

    try {
      const [result] = await pool.execute(
        `INSERT INTO clients (company_name, contact_email, contact_phone, fluent_customer_id, twenty_brand_id, notes, is_active)
         VALUES (?, ?, ?, ?, ?, ?, TRUE)`,
        [companyName, contactEmail, contactPhone, fluentCustomerId, twentyBrandId, notes]
      );

      return {
        id: result.insertId,
        company_name: companyName,
        contact_email: contactEmail,
        contact_phone: contactPhone,
        fluent_customer_id: fluentCustomerId,
        twenty_brand_id: twentyBrandId,
        notes,
        is_active: true,
        created_at: new Date()
      };
    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY') {
        throw new Error('Client with this FluentSupport ID already exists');
      }
      console.error('Error creating client:', error);
      throw error;
    }
  }

  /**
   * Update client (admin only)
   * @param {number} clientId - Client ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<void>}
   */
  static async updateClient(clientId, updates) {
    const allowedFields = ['company_name', 'contact_email', 'contact_phone', 'fluent_customer_id', 'twenty_brand_id', 'notes', 'is_active'];
    const updateParts = [];
    const values = [];

    for (const [key, value] of Object.entries(updates)) {
      const dbKey = key.replace(/([A-Z])/g, '_$1').toLowerCase(); // camelCase to snake_case
      if (allowedFields.includes(dbKey)) {
        updateParts.push(`${dbKey} = ?`);
        values.push(value);
      }
    }

    if (updateParts.length === 0) return;

    updateParts.push('updated_at = NOW()');
    values.push(clientId);

    try {
      await pool.execute(
        `UPDATE clients SET ${updateParts.join(', ')} WHERE id = ?`,
        values
      );
    } catch (error) {
      console.error('Error updating client:', error);
      throw error;
    }
  }
}

export default ClientRepository;
