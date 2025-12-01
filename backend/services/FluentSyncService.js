import pool from '../db/config.js';
import { fetchFluentTickets, transformFluentTicket } from './fluentSupportApi.js';
import RequestRepository from '../repositories/RequestRepository.js';
import FluentTicketRepository from '../repositories/FluentTicketRepository.js';
import FluentSyncStatusRepository from '../repositories/FluentSyncStatusRepository.js';

/**
 * FluentSyncService
 * Business logic for synchronizing FluentSupport tickets
 * Handles the complete sync workflow with transaction support
 */
class FluentSyncService {
  /**
   * Synchronize tickets from FluentSupport
   * @param {string} dateFilter - Only sync tickets created after this date (YYYY-MM-DD)
   * @returns {Promise<Object>} Sync result with statistics
   */
  async syncTickets(dateFilter) {
    const startTime = Date.now();
    let connection;
    let syncId;

    try {
      // Get a connection from the pool for transaction
      connection = await pool.getConnection();
      await connection.beginTransaction();

      // Mark sync as in progress
      syncId = await FluentSyncStatusRepository.startSync(connection, dateFilter);

      // Fetch tickets from FluentSupport API
      const tickets = await fetchFluentTickets(dateFilter);

      // Process results
      const result = {
        ticketsFetched: tickets.length,
        ticketsAdded: 0,
        ticketsUpdated: 0,
        ticketsSkipped: 0
      };

      // Process each ticket
      for (const ticket of tickets) {
        try {
          const processResult = await this._processTicket(connection, ticket);

          switch (processResult) {
            case 'added':
              result.ticketsAdded++;
              break;
            case 'updated':
              result.ticketsUpdated++;
              break;
            case 'skipped':
              result.ticketsSkipped++;
              break;
          }
        } catch (ticketError) {
          console.error(`[FluentSyncService] Error processing ticket ${ticket.id}:`, ticketError.message);
          result.ticketsSkipped++;
        }
      }

      // Mark sync as successful
      const duration = Date.now() - startTime;
      await FluentSyncStatusRepository.markSuccess(connection, syncId, {
        ...result,
        durationMs: duration
      });

      // Commit transaction
      await connection.commit();

      return {
        success: true,
        ...result,
        syncDuration: duration,
        dateFilter
      };

    } catch (error) {
      // Rollback on error
      if (connection) {
        await connection.rollback();

        // Try to mark sync as failed
        try {
          await FluentSyncStatusRepository.markFailed(connection, error.message);
        } catch (updateError) {
          console.error('[FluentSyncService] Failed to update sync status:', updateError.message);
        }
      }

      throw error;

    } finally {
      // Always release the connection
      if (connection) {
        connection.release();
      }
    }
  }

  /**
   * Process a single ticket (create or update)
   * @private
   * @param {Object} connection - MySQL connection
   * @param {Object} ticket - FluentSupport ticket
   * @returns {Promise<string>} 'added', 'updated', or 'skipped'
   */
  async _processTicket(connection, ticket) {
    const requestData = transformFluentTicket(ticket);

    if (!requestData.fluent_id) {
      return 'skipped';
    }

    // Check if ticket already exists
    const existing = await FluentTicketRepository.findByFluentIdWithConnection(
      connection,
      requestData.fluent_id
    );

    if (existing) {
      // Update existing ticket
      await this._updateExistingTicket(connection, existing, requestData);
      return 'updated';
    } else {
      // Create new ticket
      await this._createNewTicket(connection, requestData);
      return 'added';
    }
  }

  /**
   * Update an existing ticket and its associated request
   * @private
   * @param {Object} connection - MySQL connection
   * @param {Object} existing - Existing fluent_ticket record
   * @param {Object} requestData - Transformed request data
   */
  async _updateExistingTicket(connection, existing, requestData) {
    const { id: fluentTicketId, request_id: requestId } = existing;

    // Update the associated request if it exists
    if (requestId) {
      await RequestRepository.updateWithConnection(connection, requestId, {
        date: requestData.date,
        time: requestData.time,
        category: requestData.category,
        description: requestData.description,
        urgency: requestData.urgency,
        effort: requestData.effort,
        source: requestData.source,
        website_url: requestData.website_url
      });
    }

    // Update fluent_tickets metadata
    const meta = requestData.fluent_metadata;
    await FluentTicketRepository.updateWithConnection(connection, fluentTicketId, {
      ticket_number: meta.ticket_number,
      created_at: meta.created_at,
      updated_at: meta.updated_at,
      ticket_status: meta.ticket_status,
      customer_id: meta.customer_id,
      customer_name: meta.customer_name,
      customer_email: meta.customer_email,
      mailbox_id: meta.mailbox_id,
      title: requestData.description.substring(0, 255),
      customer_message: meta.customer_message,
      priority: meta.priority,
      product_id: meta.product_id,
      product_name: meta.product_name,
      agent_id: meta.agent_id,
      agent_name: meta.agent_name,
      raw_data: meta.raw_data
    });
  }

  /**
   * Create a new ticket and associated request
   * @private
   * @param {Object} connection - MySQL connection
   * @param {Object} requestData - Transformed request data
   */
  async _createNewTicket(connection, requestData) {
    // Create the request first
    const requestId = await RequestRepository.createWithConnection(connection, {
      date: requestData.date,
      time: requestData.time,
      request_type: requestData.request_type,
      category: requestData.category,
      description: requestData.description,
      urgency: requestData.urgency,
      effort: requestData.effort,
      status: requestData.status,
      source: requestData.source,
      website_url: requestData.website_url
    });

    // Create the fluent_tickets record
    const meta = requestData.fluent_metadata;
    await FluentTicketRepository.createWithConnection(connection, {
      fluent_id: requestData.fluent_id,
      ticket_number: meta.ticket_number,
      created_at: meta.created_at,
      updated_at: meta.updated_at,
      ticket_status: meta.ticket_status,
      customer_id: meta.customer_id,
      customer_name: meta.customer_name,
      customer_email: meta.customer_email,
      mailbox_id: meta.mailbox_id,
      title: requestData.description.substring(0, 255),
      customer_message: meta.customer_message,
      priority: meta.priority,
      product_id: meta.product_id,
      product_name: meta.product_name,
      agent_id: meta.agent_id,
      agent_name: meta.agent_name,
      raw_data: meta.raw_data,
      request_id: requestId
    });
  }

  /**
   * Get sync status and statistics
   * @returns {Promise<Object>} Status information
   */
  async getStatus() {
    const [syncStatus, totalTickets, statusBreakdown] = await Promise.all([
      FluentSyncStatusRepository.getLatest(),
      FluentTicketRepository.count(),
      FluentTicketRepository.countByStatus()
    ]);

    return {
      syncStatus,
      totalTickets,
      statusBreakdown
    };
  }

  /**
   * Get all fluent tickets with pagination
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Array of tickets
   */
  async getTickets(options = {}) {
    return FluentTicketRepository.findAll(options);
  }
}

export default new FluentSyncService();
