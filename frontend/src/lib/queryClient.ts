import { QueryClient } from '@tanstack/react-query';

/**
 * React Query Client Configuration
 *
 * Provides centralized caching and data fetching management.
 * Default stale time is 5 minutes to reduce unnecessary API calls.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Data is considered fresh for 5 minutes
      staleTime: 5 * 60 * 1000,
      // Keep unused data in cache for 10 minutes
      gcTime: 10 * 60 * 1000, // Previously known as cacheTime
      // Retry failed requests up to 3 times
      retry: 3,
      // Retry with exponential backoff
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      // Don't refetch on window focus in production
      refetchOnWindowFocus: false,
      // Don't refetch on reconnect
      refetchOnReconnect: false,
    },
    mutations: {
      // Retry mutations once on failure
      retry: 1,
    },
  },
});

// Query keys factory for consistent key generation
export const queryKeys = {
  // Requests
  requests: {
    all: ['requests'] as const,
    lists: () => [...queryKeys.requests.all, 'list'] as const,
    list: (filters: Record<string, unknown>) => [...queryKeys.requests.lists(), filters] as const,
    details: () => [...queryKeys.requests.all, 'detail'] as const,
    detail: (id: number) => [...queryKeys.requests.details(), id] as const,
  },

  // Projects
  projects: {
    all: ['projects'] as const,
    lists: () => [...queryKeys.projects.all, 'list'] as const,
    list: (filters: Record<string, unknown>) => [...queryKeys.projects.lists(), filters] as const,
  },

  // Hosting / Website Properties
  hosting: {
    all: ['hosting'] as const,
    properties: () => [...queryKeys.hosting.all, 'properties'] as const,
  },

  // Billing Summary
  billing: {
    all: ['billing'] as const,
    summary: () => [...queryKeys.billing.all, 'summary'] as const,
  },

  // Sync Status
  sync: {
    fluent: ['sync', 'fluent'] as const,
    twenty: ['sync', 'twenty'] as const,
  },

  // Statistics
  statistics: {
    all: ['statistics'] as const,
  },

  // Client Portal
  clientPortal: {
    all: ['clientPortal'] as const,
    profile: () => [...queryKeys.clientPortal.all, 'profile'] as const,
    activity: () => [...queryKeys.clientPortal.all, 'activity'] as const,
    tickets: {
      all: () => [...queryKeys.clientPortal.all, 'tickets'] as const,
      list: (filters?: Record<string, unknown>) => [...queryKeys.clientPortal.tickets.all(), 'list', filters] as const,
      detail: (id: number) => [...queryKeys.clientPortal.tickets.all(), 'detail', id] as const,
      messages: (id: number) => [...queryKeys.clientPortal.tickets.all(), 'messages', id] as const,
    },
    sites: () => [...queryKeys.clientPortal.all, 'sites'] as const,
    projects: () => [...queryKeys.clientPortal.all, 'projects'] as const,
  },
};
