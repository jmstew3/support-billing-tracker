/**
 * External system sync service
 * Handles Twenty CRM and FluentSupport synchronization
 *
 * Extracted from utils/api.ts to separate sync operations from CRUD operations
 */

import { authenticatedFetch } from '../../../services/api/apiClient';
import { ENDPOINTS } from '../../../config/apiConfig';

// ============================================================
// Twenty CRM Sync Types
// ============================================================

export interface TwentySyncStatus {
  id: number;
  last_sync_at: string | null;
  last_sync_status: 'success' | 'failed' | 'in_progress' | null;
  tickets_fetched: number;
  tickets_added: number;
  tickets_updated: number;
  error_message: string | null;
  sync_duration_ms: number;
  created_at: string;
  updated_at: string;
}

export interface TwentySyncResponse {
  syncStatus: TwentySyncStatus | null;
  totalTickets: number;
}

export interface TwentySyncResult {
  success: boolean;
  ticketsFetched?: number;
  ticketsAdded?: number;
  ticketsUpdated?: number;
  syncDuration?: number;
  error?: string;
}

// ============================================================
// FluentSupport Sync Types
// ============================================================

export interface FluentSyncStatus {
  id: number;
  last_sync_at: string | null;
  last_sync_status: 'success' | 'failed' | 'in_progress' | null;
  tickets_fetched: number;
  tickets_added: number;
  tickets_updated: number;
  tickets_skipped: number;
  error_message: string | null;
  sync_duration_ms: number;
  date_filter: string;
  created_at: string;
  updated_at: string;
}

export interface FluentSyncResponse {
  syncStatus: FluentSyncStatus | null;
  totalTickets: number;
  statusBreakdown: Array<{ ticket_status: string; count: number }>;
}

export interface FluentSyncResult {
  success: boolean;
  ticketsFetched?: number;
  ticketsAdded?: number;
  ticketsUpdated?: number;
  ticketsSkipped?: number;
  syncDuration?: number;
  dateFilter?: string;
  error?: string;
}

// ============================================================
// Twenty CRM Sync Functions
// ============================================================

/**
 * Get Twenty CRM sync status
 *
 * @returns Sync status with last sync info and total tickets
 */
export async function getTwentySyncStatus(): Promise<TwentySyncResponse> {
  try {
    const response = await authenticatedFetch(ENDPOINTS.TWENTY_STATUS);

    if (!response.ok) {
      throw new Error(`Failed to fetch sync status: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching Twenty sync status:', error);
    throw error;
  }
}

/**
 * Trigger Twenty CRM sync
 *
 * @returns Sync result with counts of fetched, added, and updated tickets
 */
export async function triggerTwentySync(): Promise<TwentySyncResult> {
  try {
    const response = await authenticatedFetch(ENDPOINTS.TWENTY_SYNC, {
      method: 'POST',
    });

    if (!response.ok) {
      let errorMessage = `Sync failed: ${response.statusText}`;
      try {
        const errorData = await response.json();
        if (errorData.error) errorMessage = errorData.error;
      } catch {
        // Response body was empty or not JSON
      }
      throw new Error(errorMessage);
    }

    return await response.json();
  } catch (error) {
    console.error('Error triggering Twenty sync:', error);
    throw error;
  }
}

// ============================================================
// FluentSupport Sync Functions
// ============================================================

/**
 * Get FluentSupport sync status
 *
 * @returns Sync status with breakdown by ticket status
 */
export async function getFluentSyncStatus(): Promise<FluentSyncResponse> {
  try {
    const response = await authenticatedFetch(ENDPOINTS.FLUENT_STATUS);

    if (!response.ok) {
      throw new Error(`Failed to fetch sync status: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching FluentSupport sync status:', error);
    throw error;
  }
}

/**
 * Trigger FluentSupport sync
 *
 * @param dateFilter - Optional date filter (YYYY-MM-DD) to only sync tickets after this date
 * @returns Sync result with counts
 */
export async function triggerFluentSync(dateFilter?: string): Promise<FluentSyncResult> {
  try {
    const body = dateFilter ? JSON.stringify({ dateFilter }) : undefined;

    const response = await authenticatedFetch(ENDPOINTS.FLUENT_SYNC, {
      method: 'POST',
      body,
    });

    if (!response.ok) {
      let errorMessage = `Sync failed: ${response.statusText}`;
      try {
        const errorData = await response.json();
        if (errorData.error) errorMessage = errorData.error;
      } catch {
        // Response body was empty or not JSON
      }
      throw new Error(errorMessage);
    }

    return await response.json();
  } catch (error) {
    console.error('Error triggering FluentSupport sync:', error);
    throw error;
  }
}
