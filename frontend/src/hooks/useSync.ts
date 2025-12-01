import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getFluentSyncStatus,
  triggerFluentSync,
  getTwentySyncStatus,
  triggerTwentySync
} from '../utils/api';
import { queryKeys } from '../lib/queryClient';

/**
 * Hook for fetching FluentSupport sync status
 */
export function useFluentSyncStatus() {
  return useQuery({
    queryKey: queryKeys.sync.fluent,
    queryFn: getFluentSyncStatus,
    staleTime: 30 * 1000, // 30 seconds - sync status should be more up-to-date
  });
}

/**
 * Hook for triggering FluentSupport sync
 */
export function useTriggerFluentSync() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dateFilter?: string) => triggerFluentSync(dateFilter),
    onSuccess: () => {
      // Invalidate sync status and requests after successful sync
      queryClient.invalidateQueries({ queryKey: queryKeys.sync.fluent });
      queryClient.invalidateQueries({ queryKey: queryKeys.requests.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.billing.all });
    },
  });
}

/**
 * Hook for fetching Twenty CRM sync status
 */
export function useTwentySyncStatus() {
  return useQuery({
    queryKey: queryKeys.sync.twenty,
    queryFn: getTwentySyncStatus,
    staleTime: 30 * 1000, // 30 seconds
  });
}

/**
 * Hook for triggering Twenty CRM sync
 */
export function useTriggerTwentySync() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => triggerTwentySync(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.sync.twenty });
      queryClient.invalidateQueries({ queryKey: queryKeys.requests.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.billing.all });
    },
  });
}
