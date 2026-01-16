import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../../../lib/queryClient';
import {
  clientDataApi,
  type ClientProfile,
  type ClientTicket,
  type ClientTicketDetail,
  type TicketMessage,
  type ClientWebsite,
  type ClientProject,
  type ClientActivitySummary,
  type PaginatedResponse,
} from '../services/clientApi';

/**
 * Hook for fetching client profile
 */
export function useClientProfile() {
  return useQuery<ClientProfile>({
    queryKey: queryKeys.clientPortal.profile(),
    queryFn: () => clientDataApi.getProfile(),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Hook for fetching client activity summary (dashboard data)
 */
export function useClientActivity() {
  return useQuery<ClientActivitySummary>({
    queryKey: queryKeys.clientPortal.activity(),
    queryFn: () => clientDataApi.getActivitySummary(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

interface TicketFilters {
  limit?: number;
  offset?: number;
  status?: string;
  [key: string]: string | number | undefined;
}

/**
 * Hook for fetching client tickets with optional filters
 */
export function useClientTickets(filters: TicketFilters = {}) {
  return useQuery<PaginatedResponse<ClientTicket>>({
    queryKey: queryKeys.clientPortal.tickets.list(filters as Record<string, unknown>),
    queryFn: () => clientDataApi.getTickets(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook for fetching a single ticket by ID
 */
export function useClientTicket(ticketId: number | null) {
  return useQuery<ClientTicketDetail>({
    queryKey: queryKeys.clientPortal.tickets.detail(ticketId ?? 0),
    queryFn: () => clientDataApi.getTicketById(ticketId!),
    enabled: ticketId !== null,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook for fetching ticket messages/conversation
 */
export function useClientTicketMessages(ticketId: number | null) {
  return useQuery<{ messages: TicketMessage[]; ticketId: number }>({
    queryKey: queryKeys.clientPortal.tickets.messages(ticketId ?? 0),
    queryFn: () => clientDataApi.getTicketMessages(ticketId!),
    enabled: ticketId !== null,
    staleTime: 2 * 60 * 1000, // 2 minutes - messages may update more frequently
  });
}

/**
 * Hook for fetching client websites/sites
 */
export function useClientSites() {
  return useQuery<{ websites: ClientWebsite[] }>({
    queryKey: queryKeys.clientPortal.sites(),
    queryFn: () => clientDataApi.getWebsites(),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Hook for fetching client projects
 */
export function useClientProjects() {
  return useQuery<{ projects: ClientProject[] }>({
    queryKey: queryKeys.clientPortal.projects(),
    queryFn: () => clientDataApi.getProjects(),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}
