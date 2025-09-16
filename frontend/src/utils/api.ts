import type { ChatRequest } from '../types/request';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

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
    Status: row.Status
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
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Failed to fetch requests: ${response.statusText}`);
    }

    const data = await response.json();
    return data.map(transformDbRow);
  } catch (error) {
    console.error('Error fetching requests:', error);
    throw error;
  }
}

// Update a single request
export async function updateRequest(id: number, updates: Partial<ChatRequest>): Promise<void> {
  try {
    const response = await fetch(`${API_BASE_URL}/requests/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        category: updates.Category,
        urgency: updates.Urgency,
        effort: updates.Effort,
        status: updates.Status,
        description: updates.Request_Summary,
        request_type: updates.Request_Type
      })
    });

    if (!response.ok) {
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
    const response = await fetch(`${API_BASE_URL}/requests/bulk-update`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ids,
        updates: {
          category: updates.Category,
          urgency: updates.Urgency,
          status: updates.Status
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
    const response = await fetch(url, {
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
    const response = await fetch(`${API_BASE_URL}/requests`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
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
    const response = await fetch(`${API_BASE_URL}/statistics`);

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
    const response = await fetch(`${API_BASE_URL}/export-csv`);

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
    const response = await fetch(`${API_BASE_URL}/import-csv`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
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
    const response = await fetch(`${API_BASE_URL}/health`, {
      method: 'GET',
      mode: 'cors',
    });
    return response.ok;
  } catch (error) {
    console.error('API health check failed:', error);
    return false;
  }
}