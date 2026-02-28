/**
 * Core API client with authentication and error handling
 * Provides authenticated fetch wrapper for all API calls
 *
 * This file contains only the auth infrastructure extracted from utils/api.ts
 * Support-specific CRUD operations are now in features/support/services/supportApi.ts
 * Sync operations are now in features/support/services/syncService.ts
 */

import { API_CONFIG } from '../../config/apiConfig';

/**
 * Get authorization headers with JWT token
 */
function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('accessToken');
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return headers;
}

/**
 * Enhanced fetch with JWT authentication and error handling
 * Automatically includes JWT token and handles 401/403 responses
 *
 * @param url - The URL to fetch
 * @param options - Standard fetch options
 * @returns Response object
 * @throws Error on authentication failures (after clearing auth state)
 */
export async function authenticatedFetch(url: string, options: RequestInit = {}): Promise<Response> {
  // Merge auth headers with provided headers
  const headers = {
    ...getAuthHeaders(),
    ...(options.headers || {}),
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  // Handle 401 Unauthorized - token expired or invalid
  if (response.status === 401) {
    console.warn('Received 401 Unauthorized - clearing auth state');
    localStorage.removeItem('accessToken');

    // Reload page to trigger login screen
    window.location.reload();

    throw new Error('Session expired. Please login again.');
  }

  // Handle 403 Forbidden - invalid token (e.g., after backend restart)
  if (response.status === 403) {
    console.warn('Received 403 Forbidden - token invalid, clearing auth state');
    localStorage.removeItem('accessToken');

    // Reload page to trigger login screen
    window.location.reload();

    throw new Error('Invalid authentication token. Please login again.');
  }

  return response;
}

/**
 * Check if API is available
 * Uses the public /health endpoint (no JWT required)
 *
 * @returns true if API is healthy, false otherwise
 */
export async function checkAPIHealth(): Promise<boolean> {
  try {
    const response = await fetch(API_CONFIG.HEALTH_URL, {
      method: 'GET',
      mode: 'cors',
    });
    return response.ok;
  } catch (error) {
    console.error('API health check failed:', error);
    return false;
  }
}
