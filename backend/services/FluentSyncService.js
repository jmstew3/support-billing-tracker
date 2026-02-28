import pool from '../db/config.js';
import { fetchFluentTickets, transformFluentTicket } from './fluentSupportApi.js';
import RequestRepository from '../repositories/RequestRepository.js';
import FluentTicketRepository from '../repositories/FluentTicketRepository.js';
import FluentSyncStatusRepository from '../repositories/FluentSyncStatusRepository.js';
import logger from './logger.js';

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
        ticketsSkipped: 0,
        ticketsDeleted: 0
      };

      // Batch-fetch all existing fluent tickets to avoid N+1 lookups
      const existingTicketsMap = await this._batchFetchExisting(connection, tickets);

      // Process each ticket (creates/updates still individual due to complex logic)
      for (const ticket of tickets) {
        try {
          const processResult = await this._processTicket(connection, ticket, dateFilter, existingTicketsMap);

          switch (processResult) {
            case 'added':
              result.ticketsAdded++;
              break;
            case 'updated':
              result.ticketsUpdated++;
              break;
            case 'deleted':
              result.ticketsDeleted++;
              break;
            case 'skipped':
              result.ticketsSkipped++;
              break;
          }
        } catch (ticketError) {
          logger.error(`[FluentSyncService] Error processing ticket ${ticket.id}`, { error: ticketError.message });
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
          logger.error('[FluentSyncService] Failed to update sync status', { error: updateError.message });
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
   * Batch-fetch all existing fluent ticket records for a set of tickets
   * Eliminates N+1 query pattern by using repository batch lookup
   * @private
   * @param {Object} connection - MySQL connection
   * @param {Array} tickets - Array of FluentSupport tickets
   * @returns {Promise<Map>} Map of fluent_id → existing record
   */
  async _batchFetchExisting(connection, tickets) {
    if (tickets.length === 0) return new Map();

    // Collect all fluent IDs from incoming tickets
    const fluentIds = tickets
      .map(t => {
        const data = transformFluentTicket(t);
        return data.fluent_id;
      })
      .filter(Boolean)
      .map(id => id.toString());

    if (fluentIds.length === 0) return new Map();

    // Use repository batch method for single query lookup
    return FluentTicketRepository.findByFluentIdsBatch(connection, fluentIds);
  }

  /**
   * Process a single ticket (create, update, or delete)
   * Only closed tickets with resolved_at are tracked. Open tickets are skipped
   * unless they previously existed (reopened → mark deleted).
   * @private
   * @param {Object} connection - MySQL connection
   * @param {Object} ticket - FluentSupport ticket
   * @param {string} dateFilter - Date filter (YYYY-MM-DD)
   * @param {Map} existingTicketsMap - Pre-fetched map of fluent_id → existing record
   * @returns {Promise<string>} 'added', 'updated', 'deleted', or 'skipped'
   */
  async _processTicket(connection, ticket, dateFilter, existingTicketsMap) {
    const requestData = transformFluentTicket(ticket);

    if (!requestData.fluent_id) {
      return 'skipped';
    }

    const isClosed = ticket.status === 'closed';
    const resolvedAt = ticket.resolved_at || null;

    // Use pre-fetched lookup instead of individual query
    const existing = existingTicketsMap.get(requestData.fluent_id.toString()) || null;

    if (existing) {
      if (isClosed) {
        // Existing ticket is now closed — update with resolved_at date
        await this._updateExistingTicket(connection, existing, requestData);
        return 'updated';
      } else {
        // Existing ticket has been reopened — mark the request as deleted
        if (existing.request_id) {
          await RequestRepository.updateWithConnection(connection, existing.request_id, {
            status: 'deleted'
          });
        }
        // Update fluent_tickets metadata to reflect current status
        const meta = requestData.fluent_metadata;
        await FluentTicketRepository.updateWithConnection(connection, existing.id, {
          ticket_number: meta.ticket_number,
          created_at: meta.created_at,
          resolved_at: null,
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
        return 'deleted';
      }
    } else {
      // New ticket
      if (isClosed && resolvedAt) {
        // Check resolved_at against dateFilter
        const resolvedDate = new Date(resolvedAt).toISOString().split('T')[0];
        if (resolvedDate >= dateFilter) {
          await this._createNewTicket(connection, requestData);
          return 'added';
        }
      }
      // New ticket that's not closed, or closed before dateFilter — skip
      return 'skipped';
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
        website_url: requestData.website_url,
        status: 'active' // Re-activate in case it was previously deleted (reopened then re-closed)
      });
    }

    // Update fluent_tickets metadata
    const meta = requestData.fluent_metadata;
    await FluentTicketRepository.updateWithConnection(connection, fluentTicketId, {
      ticket_number: meta.ticket_number,
      created_at: meta.created_at,
      resolved_at: meta.resolved_at,
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
      resolved_at: meta.resolved_at,
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
