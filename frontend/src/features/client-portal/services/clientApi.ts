/**
 * Client Portal API Service
 * Handles all API calls for the client portal with automatic token management
 */

// Get the API URL based on environment
export const getClientApiUrl = (): string => {
  const hostname = window.location.hostname;

  // Production portal subdomain
  if (hostname === 'portal.peakonedigital.com') {
    return 'https://portal.peakonedigital.com/api';
  }

  // Production main domain (fallback)
  if (hostname === 'velocity.peakonedigital.com') {
    return 'https://velocity.peakonedigital.com/billing-overview-api/api';
  }

  // Development
  return import.meta.env.VITE_API_URL || 'http://localhost:3011/api';
};

// Storage keys for client tokens (separate from internal auth)
const CLIENT_ACCESS_TOKEN_KEY = 'clientAccessToken';
const CLIENT_REFRESH_TOKEN_KEY = 'clientRefreshToken';

/**
 * Get stored client access token
 */
export const getClientAccessToken = (): string | null => {
  return localStorage.getItem(CLIENT_ACCESS_TOKEN_KEY);
};

/**
 * Get stored client refresh token
 */
export const getClientRefreshToken = (): string | null => {
  return localStorage.getItem(CLIENT_REFRESH_TOKEN_KEY);
};

/**
 * Store client tokens
 */
export const setClientTokens = (accessToken: string, refreshToken: string): void => {
  localStorage.setItem(CLIENT_ACCESS_TOKEN_KEY, accessToken);
  localStorage.setItem(CLIENT_REFRESH_TOKEN_KEY, refreshToken);
};

/**
 * Clear client tokens
 */
export const clearClientTokens = (): void => {
  localStorage.removeItem(CLIENT_ACCESS_TOKEN_KEY);
  localStorage.removeItem(CLIENT_REFRESH_TOKEN_KEY);
};

/**
 * Make authenticated API request
 */
export const clientFetch = async <T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> => {
  const accessToken = getClientAccessToken();

  if (!accessToken) {
    throw new Error('No access token available');
  }

  const url = `${getClientApiUrl()}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
      ...options.headers,
    },
  });

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      // Token expired or invalid - will be handled by auth context
      throw new Error('Unauthorized');
    }

    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `API error: ${response.status}`);
  }

  return response.json();
};

// ============================================
// Auth API
// ============================================

export interface ClientUser {
  id: number;
  email: string;
  name: string | null;
  clientId: number;
  clientName: string;
  role: 'client';
}

export interface ClientLoginResponse {
  accessToken: string;
  refreshToken: string;
  user: ClientUser;
}

export const clientAuthApi = {
  /**
   * Login with email and password
   */
  login: async (email: string, password: string): Promise<ClientLoginResponse> => {
    const response = await fetch(`${getClientApiUrl()}/auth/client/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        throw new Error('Too many login attempts. Please try again later.');
      }
      if (response.status === 401) {
        throw new Error('Invalid email or password');
      }
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || 'Login failed');
    }

    return response.json();
  },

  /**
   * Logout
   */
  logout: async (): Promise<void> => {
    try {
      await fetch(`${getClientApiUrl()}/auth/client/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
    } catch {
      // Ignore logout errors
    }
    clearClientTokens();
  },

  /**
   * Refresh access token
   */
  refresh: async (): Promise<{ accessToken: string }> => {
    const refreshToken = getClientRefreshToken();
    if (!refreshToken) {
      throw new Error('No refresh token');
    }

    const response = await fetch(`${getClientApiUrl()}/auth/client/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) {
      clearClientTokens();
      throw new Error('Token refresh failed');
    }

    const data = await response.json();
    localStorage.setItem(CLIENT_ACCESS_TOKEN_KEY, data.accessToken);
    return data;
  },

  /**
   * Get current user info
   */
  me: async (): Promise<ClientUser> => {
    return clientFetch('/auth/client/me');
  },
};

// ============================================
// Client Data API
// ============================================

export interface ClientProfile {
  id: number;
  company_name: string;
  contact_email: string;
  contact_phone: string | null;
  created_at: string;
}

export interface ClientTicket {
  id: number;
  fluent_id: number;
  ticket_number: string;
  title: string;
  ticket_status: string;
  priority: string;
  created_at: string;
  updated_at_fluent: string | null;
  customer_message: string | null;
  agent_name: string | null;
  product_name: string | null;
}

export interface ClientTicketDetail extends ClientTicket {
  mailbox_id: number | null;
}

export interface TicketMessage {
  id: number;
  content: string;
  sender: 'client' | 'agent';
  senderName: string;
  createdAt: string;
}

export interface ClientWebsite {
  id: number;
  website_url: string;
  website_name: string | null;
  hosting_status: string | null;
  created_at: string;
}

export interface ClientProject {
  id: number;
  project_name: string;
  project_status: string | null;
  created_at: string;
}

export interface ClientActivitySummary {
  tickets: {
    total: number;
    byStatus: Record<string, number>;
    recent: Array<{
      id: number;
      ticket_number: string;
      title: string;
      ticket_status: string;
      created_at: string;
    }>;
  };
  websites: {
    total: number;
  };
  projects: {
    total: number;
  };
}

export interface PaginatedResponse<T> {
  tickets?: T[];
  total: number;
  limit: number;
  offset: number;
}

export const clientDataApi = {
  /**
   * Get client profile
   */
  getProfile: async (): Promise<ClientProfile> => {
    return clientFetch('/client/profile');
  },

  /**
   * Get client tickets
   */
  getTickets: async (params?: {
    limit?: number;
    offset?: number;
    status?: string;
  }): Promise<PaginatedResponse<ClientTicket>> => {
    const searchParams = new URLSearchParams();
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.offset) searchParams.set('offset', params.offset.toString());
    if (params?.status) searchParams.set('status', params.status);

    const query = searchParams.toString();
    return clientFetch(`/client/tickets${query ? `?${query}` : ''}`);
  },

  /**
   * Get single ticket detail
   */
  getTicketById: async (ticketId: number): Promise<ClientTicketDetail> => {
    return clientFetch(`/client/tickets/${ticketId}`);
  },

  /**
   * Get ticket messages/conversation
   */
  getTicketMessages: async (ticketId: number): Promise<{ messages: TicketMessage[]; ticketId: number }> => {
    return clientFetch(`/client/tickets/${ticketId}/messages`);
  },

  /**
   * Get client websites
   */
  getWebsites: async (): Promise<{ websites: ClientWebsite[] }> => {
    return clientFetch('/client/sites');
  },

  /**
   * Get client projects
   */
  getProjects: async (): Promise<{ projects: ClientProject[] }> => {
    return clientFetch('/client/projects');
  },

  /**
   * Get activity summary
   */
  getActivitySummary: async (): Promise<ClientActivitySummary> => {
    return clientFetch('/client/activity');
  },
};
