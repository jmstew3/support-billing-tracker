import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchRequests,
  updateRequest,
  bulkUpdateRequests,
  deleteRequest,
  createRequest,
  fetchStatistics
} from '../utils/api';
import { queryKeys } from '../lib/queryClient';
import type { ChatRequest } from '../types/request';

interface RequestFilters {
  status?: string;
  category?: string;
  urgency?: string;
  startDate?: string;
  endDate?: string;
  [key: string]: string | undefined;
}

/**
 * Hook for fetching requests with caching
 *
 * @param filters - Optional filters for the query
 * @returns Query result with requests data
 */
export function useRequests(filters: RequestFilters = {}) {
  return useQuery({
    queryKey: queryKeys.requests.list(filters),
    queryFn: () => fetchRequests(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook for fetching request statistics
 */
export function useRequestStatistics() {
  return useQuery({
    queryKey: queryKeys.statistics.all,
    queryFn: fetchStatistics,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook for updating a request with cache invalidation
 */
export function useUpdateRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates }: { id: number; updates: Partial<ChatRequest> }) =>
      updateRequest(id, updates),
    onSuccess: () => {
      // Invalidate all request queries to refetch fresh data
      queryClient.invalidateQueries({ queryKey: queryKeys.requests.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.statistics.all });
    },
  });
}

/**
 * Hook for bulk updating requests
 */
export function useBulkUpdateRequests() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ ids, updates }: { ids: number[]; updates: Partial<ChatRequest> }) =>
      bulkUpdateRequests(ids, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.requests.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.statistics.all });
    },
  });
}

/**
 * Hook for deleting a request
 */
export function useDeleteRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, permanent = false }: { id: number; permanent?: boolean }) =>
      deleteRequest(id, permanent),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.requests.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.statistics.all });
    },
  });
}

/**
 * Hook for creating a new request
 */
export function useCreateRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: Omit<ChatRequest, 'id'>) => createRequest(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.requests.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.statistics.all });
    },
  });
}

/**
 * Hook for manually refetching requests
 */
export function useRefetchRequests() {
  const queryClient = useQueryClient();

  return () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.requests.all });
  };
}
