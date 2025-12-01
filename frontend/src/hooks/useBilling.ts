import { useQuery } from '@tanstack/react-query';
import { generateComprehensiveBilling } from '../services/billingApi';
import { fetchProjects } from '../services/projectsApi';
import { fetchWebsiteProperties } from '../services/hostingApi';
import { queryKeys } from '../lib/queryClient';

/**
 * Hook for fetching comprehensive billing summary
 *
 * Combines data from requests, projects, and hosting
 * into a single billing dashboard view.
 */
export function useBillingSummary() {
  return useQuery({
    queryKey: queryKeys.billing.summary(),
    queryFn: generateComprehensiveBilling,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
  });
}

/**
 * Hook for fetching projects data
 */
export function useProjects() {
  return useQuery({
    queryKey: queryKeys.projects.all,
    queryFn: () => fetchProjects(),
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook for fetching website properties (hosting)
 */
export function useHostingProperties() {
  return useQuery({
    queryKey: queryKeys.hosting.properties(),
    queryFn: fetchWebsiteProperties,
    staleTime: 5 * 60 * 1000,
  });
}
