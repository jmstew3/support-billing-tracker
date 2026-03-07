/**
 * QBO Admin API Service
 * Handles QBO management operations (customer sync, item sync, bulk sync)
 */

import { authenticatedFetch } from '../utils/api';
import { API_CONFIG } from '../config/apiConfig';

const API_BASE_URL = API_CONFIG.BASE_URL;

// Types

export interface CustomerSyncDetail {
  name: string;
  status: 'already_mapped' | 'matched' | 'created' | 'unmatched' | 'error';
  qboId?: string;
  qboName?: string;
  hint?: string;
  error?: string;
}

export interface CustomerSyncResult {
  matched: number;
  created: number;
  unmatched: number;
  failed: number;
  dryRun: boolean;
  details: CustomerSyncDetail[];
}

export interface ItemMappingDetail {
  internalType: string;
  internalCategory: string | null;
  internalDescription: string | null;
  qboItemName?: string;
  qboItemId?: string;
  expectedQboName?: string;
  status: 'mapped' | 'missing';
  hint?: string;
}

export interface ItemSyncResult {
  mapped: number;
  missing: number;
  details: ItemMappingDetail[];
}

export interface ItemMapping {
  id: number;
  internal_item_type: string;
  internal_category: string | null;
  internal_description: string | null;
  qbo_item_id: string;
  qbo_item_name: string;
}

export interface MappingsResult {
  mappings: ItemMapping[];
  count: number;
}

export interface BulkSyncResult {
  synced: number;
  failed: number;
  total: number;
  errors: Array<{ invoiceId: number; invoiceNumber: string; error: string }>;
}

export interface EligibleCountResult {
  eligible: number;
}

/**
 * Force a manual token refresh
 */
export async function refreshQBOToken(): Promise<Record<string, unknown>> {
  const response = await authenticatedFetch(`${API_BASE_URL}/qbo/refresh`, {
    method: 'POST',
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || `Failed to refresh token: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Sync local customers to QBO customers
 */
export async function syncQBOCustomers(dryRun = true): Promise<CustomerSyncResult> {
  const response = await authenticatedFetch(
    `${API_BASE_URL}/qbo/sync/customers?dryRun=${dryRun}`
  );
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || `Customer sync failed: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Sync QBO service items and populate item mappings
 */
export async function syncQBOItems(): Promise<ItemSyncResult> {
  const response = await authenticatedFetch(`${API_BASE_URL}/qbo/sync/items`);
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || `Item sync failed: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Get all current item mappings
 */
export async function getQBOMappings(): Promise<MappingsResult> {
  const response = await authenticatedFetch(`${API_BASE_URL}/qbo/mappings`);
  if (!response.ok) {
    throw new Error(`Failed to get mappings: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Bulk sync all eligible invoices to QBO
 */
export async function bulkSyncInvoicesToQBO(): Promise<BulkSyncResult> {
  const response = await authenticatedFetch(`${API_BASE_URL}/invoices/bulk-sync-qbo`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || `Bulk sync failed: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Get count of invoices eligible for QBO sync
 */
export async function getEligibleSyncCount(): Promise<EligibleCountResult> {
  const response = await authenticatedFetch(`${API_BASE_URL}/qbo/sync/eligible-count`);
  if (!response.ok) {
    throw new Error(`Failed to get eligible count: ${response.statusText}`);
  }
  return response.json();
}
