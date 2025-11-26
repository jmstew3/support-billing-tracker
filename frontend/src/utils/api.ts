import type { ChatRequest } from '../types/request';

// Use the public API URL when accessing from the domain, otherwise use local
const API_BASE_URL = window.location.hostname === 'velocity.peakonedigital.com'
  ? 'https://velocity.peakonedigital.com/billing-overview-api/api'
  : (import.meta.env.VITE_API_URL || 'http://localhost:3011/api');

/**
 * Get authorization headers with JWT token
 */
function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('accessToken');
  const headers: HeadersInit = {
    'Content-Type': 'application/json'
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return headers;
}

/**
 * Enhanced fetch with JWT authentication and 401 handling
 * Automatically includes JWT token and handles token expiration
 */
export async function authenticatedFetch(url: string, options: RequestInit = {}): Promise<Response> {
  // Merge auth headers with provided headers
  const headers = {
    ...getAuthHeaders(),
    ...(options.headers || {})
  };

  const response = await fetch(url, {
    ...options,
    headers
  });

  // Handle 401 Unauthorized - token expired or invalid
  if (response.status === 401) {
    console.warn('Received 401 Unauthorized - clearing auth state');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');

    // Reload page to trigger login screen
    window.location.reload();

    throw new Error('Session expired. Please login again.');
  }

  // Handle 403 Forbidden - invalid token (e.g., after backend restart)
  if (response.status === 403) {
    console.warn('Received 403 Forbidden - token invalid, clearing auth state');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');

    // Reload page to trigger login screen
    window.location.reload();

    throw new Error('Invalid authentication token. Please login again.');
  }

  return response;
}

// Transform database row to ChatRequest format
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
    source: row.source || 'sms' // Default to 'sms' for backwards compatibility
  };
}

// Fetch all requests from API
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

    const url = `${API_BASE_URL}/requests?${params.toString()}`;
    const response = await authenticatedFetch(url);

    if (!response.ok) {
      throw new Error(`Failed to fetch requests: ${response.statusText}`);
    }

    const data = await response.json();
    return data.map(transformDbRow);
  } catch (error) {
    console.error('Error fetching requests:', error);
    console.error('URL was:', `${API_BASE_URL}/requests`);
    throw error;
  }
}

// Update a single request
export async function updateRequest(id: number, updates: Partial<ChatRequest>): Promise<void> {
  try {
    const payload = {
      category: updates.Category,
      urgency: updates.Urgency,
      effort: updates.Effort,
      status: updates.Status,
      description: updates.Request_Summary,
      request_type: updates.Request_Type,
      estimated_hours: updates.EstimatedHours
    };

    const response = await authenticatedFetch(`${API_BASE_URL}/requests/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
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

// Bulk update multiple requests
export async function bulkUpdateRequests(ids: number[], updates: Partial<ChatRequest>): Promise<void> {
  try {
    const response = await authenticatedFetch(`${API_BASE_URL}/requests/bulk-update`, {
      method: 'POST',
      body: JSON.stringify({
        ids,
        updates: {
          category: updates.Category,
          urgency: updates.Urgency,
          status: updates.Status,
          estimated_hours: updates.EstimatedHours
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to bulk update requests: ${response.statusText}`);
    }
  } catch (error) {
    console.error('Error bulk updating requests:', error);
    throw error;
  }
}

// Delete a request (soft delete by default)
export async function deleteRequest(id: number, permanent = false): Promise<void> {
  try {
    const url = `${API_BASE_URL}/requests/${id}${permanent ? '?permanent=true' : ''}`;
    const response = await authenticatedFetch(url, {
      method: 'DELETE'
    });

    if (!response.ok) {
      throw new Error(`Failed to delete request: ${response.statusText}`);
    }
  } catch (error) {
    console.error('Error deleting request:', error);
    throw error;
  }
}

// Create a new request
export async function createRequest(request: Omit<ChatRequest, 'id'>): Promise<number> {
  try {
    const response = await authenticatedFetch(`${API_BASE_URL}/requests`, {
      method: 'POST',
      body: JSON.stringify({
        date: request.Date,
        time: request.Time,
        request_type: request.Request_Type,
        category: request.Category,
        description: request.Request_Summary,
        urgency: request.Urgency,
        effort: request.Effort,
        status: request.Status || 'active'
      })
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

// Get request statistics
export async function fetchStatistics(): Promise<any> {
  try {
    const response = await authenticatedFetch(`${API_BASE_URL}/statistics`);

    if (!response.ok) {
      throw new Error(`Failed to fetch statistics: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching statistics:', error);
    throw error;
  }
}

// Export data as CSV
export async function exportToCSV(): Promise<void> {
  try {
    const response = await authenticatedFetch(`${API_BASE_URL}/export-csv`);

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

// Import CSV data
export async function importCSV(csvData: any[]): Promise<{
  imported: number;
  failed: number;
  errors: any[];
}> {
  try {
    const response = await authenticatedFetch(`${API_BASE_URL}/import-csv`, {
      method: 'POST',
      body: JSON.stringify({ csvData })
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

// Check if API is available
export async function checkAPIHealth(): Promise<boolean> {
  try {
    // Use public /health endpoint (not /api/health which requires JWT)
    const healthUrl = API_BASE_URL.replace('/api', '') + '/health';
    const response = await fetch(healthUrl, {
      method: 'GET',
      mode: 'cors',
    });
    return response.ok;
  } catch (error) {
    console.error('API health check failed:', error);
    return false;
  }
}

// Twenty CRM sync functions
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

// Get Twenty sync status
export async function getTwentySyncStatus(): Promise<TwentySyncResponse> {
  try {
    const response = await authenticatedFetch(`${API_BASE_URL}/twenty/status`);

    if (!response.ok) {
      throw new Error(`Failed to fetch sync status: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching Twenty sync status:', error);
    throw error;
  }
}

// Trigger Twenty sync
export async function triggerTwentySync(): Promise<TwentySyncResult> {
  try {
    const response = await authenticatedFetch(`${API_BASE_URL}/twenty/sync`, {
      method: 'POST',
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Sync failed: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error triggering Twenty sync:', error);
    throw error;
  }
}

// FluentSupport sync interfaces
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

// Get FluentSupport sync status
export async function getFluentSyncStatus(): Promise<FluentSyncResponse> {
  try {
    const response = await authenticatedFetch(`${API_BASE_URL}/fluent/status`);

    if (!response.ok) {
      throw new Error(`Failed to fetch sync status: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching FluentSupport sync status:', error);
    throw error;
  }
}

// Trigger FluentSupport sync
export async function triggerFluentSync(dateFilter?: string): Promise<FluentSyncResult> {
  try {
    const body = dateFilter ? JSON.stringify({ dateFilter }) : undefined;

    const response = await authenticatedFetch(`${API_BASE_URL}/fluent/sync`, {
      method: 'POST',
      body,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Sync failed: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error triggering FluentSupport sync:', error);
    throw error;
  }
}