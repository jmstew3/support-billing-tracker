/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Support domain API service
 * Handles all support ticket CRUD operations
 *
 * Extracted from utils/api.ts to follow the same pattern as projectsApi and hostingApi
 */

import { authenticatedFetch } from '../../../services/api/apiClient';
import { ENDPOINTS } from '../../../config/apiConfig';
import type { ChatRequest } from '../../../types/request';

/**
 * Transform database row to ChatRequest format
 */
function transformDbRow(row: any): ChatRequest {
  return {
    id: row.id,
    Date: row.Date,
    Time: row.Time,
    Month: row.Month,
    Request_Type: row.Request_Type,
    Category: row.Category,
    Request_Summary: row.Request_Summary,
    Urgency: row.Urgency,
    Effort: row.Effort,
    EstimatedHours: row.EstimatedHours,
    Status: row.Status,
    source: row.source || 'sms', // Default to 'sms' for backwards compatibility
    website_url: row.website_url || null,
    BillingDate: row.BillingDate || null,
  };
}

/**
 * Fetch all support requests from API with optional filters
 *
 * @param filters - Optional filters for status, category, urgency, and date range
 * @returns Array of ChatRequest objects
 */
export async function fetchRequests(filters?: {
  status?: string;
  category?: string;
  urgency?: string;
  startDate?: string;
  endDate?: string;
}): Promise<ChatRequest[]> {
  try {
    const params = new URLSearchParams();

    if (filters?.status) params.append('status', filters.status);
    if (filters?.category) params.append('category', filters.category);
    if (filters?.urgency) params.append('urgency', filters.urgency);
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);

    const url = `${ENDPOINTS.REQUESTS}?${params.toString()}`;
    const response = await authenticatedFetch(url);

    if (!response.ok) {
      throw new Error(`Failed to fetch requests: ${response.statusText}`);
    }

    const data = await response.json();
    return data.map(transformDbRow);
  } catch (error) {
    console.error('Error fetching requests:', error);
    console.error('URL was:', ENDPOINTS.REQUESTS);
    throw error;
  }
}

/**
 * Update a single support request
 *
 * @param id - Request ID
 * @param updates - Partial ChatRequest with fields to update
 */
export async function updateRequest(id: number, updates: Partial<ChatRequest>): Promise<void> {
  try {
    const payload: Record<string, any> = {
      category: updates.Category,
      urgency: updates.Urgency,
      effort: updates.Effort,
      status: updates.Status,
      description: updates.Request_Summary,
      request_type: updates.Request_Type,
      estimated_hours: updates.EstimatedHours,
    };

    // Handle billing_date separately to allow explicit null (clear)
    if (updates.BillingDate !== undefined) {
      payload.billing_date = updates.BillingDate;
    }

    const response = await authenticatedFetch(`${ENDPOINTS.REQUESTS}/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`API updateRequest - Server error: ${response.status} ${response.statusText}`, errorText);
      throw new Error(`Failed to update request: ${response.statusText}`);
    }
  } catch (error) {
    console.error('Error updating request:', error);
    throw error;
  }
}

/**
 * Bulk update multiple support requests
 *
 * @param ids - Array of request IDs to update
 * @param updates - Partial ChatRequest with fields to update
 */
export async function bulkUpdateRequests(ids: number[], updates: Partial<ChatRequest>): Promise<void> {
  try {
    const response = await authenticatedFetch(ENDPOINTS.REQUESTS_BULK, {
      method: 'POST',
      body: JSON.stringify({
        ids,
        updates: {
          category: updates.Category,
          urgency: updates.Urgency,
          status: updates.Status,
          estimated_hours: updates.EstimatedHours,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to bulk update requests: ${response.statusText}`);
    }
  } catch (error) {
    console.error('Error bulk updating requests:', error);
    throw error;
  }
}

/**
 * Delete a support request (soft delete by default)
 *
 * @param id - Request ID
 * @param permanent - If true, permanently delete instead of soft delete
 */
export async function deleteRequest(id: number, permanent = false): Promise<void> {
  try {
    const url = `${ENDPOINTS.REQUESTS}/${id}${permanent ? '?permanent=true' : ''}`;
    const response = await authenticatedFetch(url, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error(`Failed to delete request: ${response.statusText}`);
    }
  } catch (error) {
    console.error('Error deleting request:', error);
    throw error;
  }
}

/**
 * Create a new support request
 *
 * @param request - ChatRequest data (without id)
 * @returns The ID of the created request
 */
export async function createRequest(request: Omit<ChatRequest, 'id'>): Promise<number> {
  try {
    const response = await authenticatedFetch(ENDPOINTS.REQUESTS, {
      method: 'POST',
      body: JSON.stringify({
        date: request.Date,
        time: request.Time,
        request_type: request.Request_Type,
        category: request.Category,
        description: request.Request_Summary,
        urgency: request.Urgency,
        effort: request.Effort,
        status: request.Status || 'active',
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to create request: ${response.statusText}`);
    }

    const result = await response.json();
    return result.id;
  } catch (error) {
    console.error('Error creating request:', error);
    throw error;
  }
}

/**
 * Get support request statistics
 *
 * @returns Statistics object with counts and aggregations
 */
export async function fetchStatistics(): Promise<any> {
  try {
    const response = await authenticatedFetch(ENDPOINTS.STATISTICS);

    if (!response.ok) {
      throw new Error(`Failed to fetch statistics: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching statistics:', error);
    throw error;
  }
}

/**
 * Export support requests to CSV file
 * Triggers a file download in the browser
 */
export async function exportToCSV(): Promise<void> {
  try {
    const response = await authenticatedFetch(ENDPOINTS.EXPORT_CSV);

    if (!response.ok) {
      throw new Error(`Failed to export CSV: ${response.statusText}`);
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'thad_requests_export.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error exporting CSV:', error);
    throw error;
  }
}

/**
 * Import support requests from CSV data
 *
 * @param csvData - Array of CSV row objects
 * @returns Import result with counts and errors
 */
export async function importCSV(csvData: any[]): Promise<{
  imported: number;
  failed: number;
  errors: any[];
}> {
  try {
    const response = await authenticatedFetch(ENDPOINTS.IMPORT_CSV, {
      method: 'POST',
      body: JSON.stringify({ csvData }),
    });

    if (!response.ok) {
      throw new Error(`Failed to import CSV: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error importing CSV:', error);
    throw error;
  }
}
