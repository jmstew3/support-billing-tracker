/**
 * Invoice API Service
 * Handles all invoice-related API calls
 */

import { authenticatedFetch } from '../utils/api';
import { API_CONFIG } from '../config/apiConfig';

const API_BASE_URL = API_CONFIG.BASE_URL;

// Types
export interface Customer {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country: string;
  payment_terms: number;
  qbo_customer_id: string | null;
  is_active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface InvoiceItem {
  id: number;
  invoice_id: number;
  item_type: 'support' | 'project' | 'hosting' | 'other';
  description: string;
  quantity: string;
  unit_price: string;
  amount: string;
  sort_order: number;
  request_ids: number[] | null;
  created_at: string;
  updated_at: string;
}

export interface InvoiceRequest {
  id: number;
  date: string;
  time: string;
  description: string;
  category: string;
  urgency: string;
  estimated_hours: string;
}

export interface Invoice {
  id: number;
  customer_id: number;
  invoice_number: string;
  period_start: string;
  period_end: string;
  invoice_date: string;
  due_date: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  subtotal: string;
  tax_rate: string;
  tax_amount: string;
  total: string;
  amount_paid: string;
  balance_due: string;
  payment_date: string | null;
  notes: string | null;
  internal_notes: string | null;
  qbo_invoice_id: string | null;
  qbo_sync_status: 'pending' | 'synced' | 'error' | 'not_applicable';
  qbo_sync_date: string | null;
  qbo_sync_error: string | null;
  hosting_detail_snapshot: HostingChargeSnapshot[] | null;
  created_at: string;
  updated_at: string;
  customer_name?: string;
  customer_email?: string;
  items?: InvoiceItem[];
  requests?: InvoiceRequest[];
}

export interface BillingSummary {
  customerId: string;
  periodStart: string;
  periodEnd: string;
  requestCount: number;
  requests: InvoiceRequest[];
  totalHours: number;
  billableHours: number;
  freeHoursApplied: number;
  emergencyHours: number;
  sameDayHours: number;
  regularHours: number;
  billableEmergencyHours: number;
  billableSameDayHours: number;
  billableRegularHours: number;
  emergencyAmount: number;
  sameDayAmount: number;
  regularAmount: number;
  subtotal: number;
}

export interface AdditionalLineItem {
  item_type: 'project' | 'hosting';
  description: string;
  quantity: number;
  unit_price: number;
  amount: number;
  sort_order?: number;
}

export interface GenerateInvoiceParams {
  customerId: number;
  periodStart: string;
  periodEnd: string;
  invoiceDate?: string;
  dueDate?: string;
  taxRate?: number;
  notes?: string;
  additionalItems?: AdditionalLineItem[];
  includeSupport?: boolean;
  hostingDetailSnapshot?: HostingChargeSnapshot[];
}

// Serializable hosting charge for DB snapshot (matches HostingCharge from types/websiteProperty)
export interface HostingChargeSnapshot {
  siteName: string;
  websiteUrl: string | null;
  billingType: string;
  daysActive: number;
  daysInMonth: number;
  grossAmount: number;
  creditApplied: boolean;
  creditAmount?: number;
  netAmount: number;
}

export interface InvoiceFilters {
  customerId?: number;
  status?: Invoice['status'];
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

// API Functions

/**
 * List all customers
 */
export async function listCustomers(activeOnly = true): Promise<Customer[]> {
  const response = await authenticatedFetch(
    `${API_BASE_URL}/invoices/customers?active=${activeOnly}`
  );
  if (!response.ok) {
    throw new Error(`Failed to list customers: ${response.statusText}`);
  }
  const data = await response.json();
  return data.customers;
}

/**
 * Get customer by ID
 */
export async function getCustomer(id: number): Promise<Customer> {
  const response = await authenticatedFetch(`${API_BASE_URL}/invoices/customers/${id}`);
  if (!response.ok) {
    throw new Error(`Failed to get customer: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Get billing summary for a period
 */
export async function getBillingSummary(
  customerId: number,
  periodStart: string,
  periodEnd: string
): Promise<BillingSummary> {
  const params = new URLSearchParams({
    customerId: String(customerId),
    periodStart,
    periodEnd
  });
  const response = await authenticatedFetch(`${API_BASE_URL}/invoices/billing-summary?${params}`);
  if (!response.ok) {
    throw new Error(`Failed to get billing summary: ${response.statusText}`);
  }
  return response.json();
}

/**
 * List invoices with filters
 */
export async function listInvoices(
  filters: InvoiceFilters = {}
): Promise<{ invoices: Invoice[]; total: number }> {
  const params = new URLSearchParams();
  if (filters.customerId) params.append('customerId', String(filters.customerId));
  if (filters.status) params.append('status', filters.status);
  if (filters.startDate) params.append('startDate', filters.startDate);
  if (filters.endDate) params.append('endDate', filters.endDate);
  if (filters.limit) params.append('limit', String(filters.limit));
  if (filters.offset) params.append('offset', String(filters.offset));

  const response = await authenticatedFetch(`${API_BASE_URL}/invoices?${params}`);
  if (!response.ok) {
    throw new Error(`Failed to list invoices: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Get invoice by ID
 */
export async function getInvoice(id: number): Promise<Invoice> {
  const response = await authenticatedFetch(`${API_BASE_URL}/invoices/${id}`);
  if (!response.ok) {
    throw new Error(`Failed to get invoice: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Generate a new invoice
 */
export async function generateInvoice(
  params: GenerateInvoiceParams
): Promise<Invoice> {
  const response = await authenticatedFetch(`${API_BASE_URL}/invoices/generate`, {
    method: 'POST',
    body: JSON.stringify(params)
  });
  if (!response.ok) {
    throw new Error(`Failed to generate invoice: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Update invoice
 */
export async function updateInvoice(
  id: number,
  updates: Partial<Pick<Invoice, 'status' | 'notes' | 'internal_notes' | 'amount_paid' | 'payment_date' | 'period_start' | 'period_end'>>
): Promise<Invoice> {
  const response = await authenticatedFetch(`${API_BASE_URL}/invoices/${id}`, {
    method: 'PUT',
    body: JSON.stringify(updates)
  });
  if (!response.ok) {
    throw new Error(`Failed to update invoice: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Delete draft invoice
 */
export async function deleteInvoice(id: number): Promise<void> {
  const response = await authenticatedFetch(`${API_BASE_URL}/invoices/${id}`, {
    method: 'DELETE'
  });
  if (!response.ok) {
    throw new Error(`Failed to delete invoice: ${response.statusText}`);
  }
}

/**
 * Mark invoice as sent
 */
export async function sendInvoice(id: number): Promise<Invoice> {
  const response = await authenticatedFetch(`${API_BASE_URL}/invoices/${id}/send`, {
    method: 'POST',
    body: JSON.stringify({})
  });
  if (!response.ok) {
    throw new Error(`Failed to send invoice: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Mark invoice as paid
 */
export async function payInvoice(
  id: number,
  amount_paid: number,
  payment_date?: string
): Promise<Invoice> {
  const response = await authenticatedFetch(`${API_BASE_URL}/invoices/${id}/pay`, {
    method: 'POST',
    body: JSON.stringify({ amount_paid, payment_date })
  });
  if (!response.ok) {
    throw new Error(`Failed to record payment: ${response.statusText}`);
  }
  return response.json();
}

// =====================================================
// INVOICE EDITING (draft only)
// =====================================================

/**
 * Update a line item on a draft invoice
 */
export async function updateInvoiceItem(
  invoiceId: number,
  itemId: number,
  updates: { description?: string; quantity?: number; unit_price?: number }
): Promise<Invoice> {
  const response = await authenticatedFetch(`${API_BASE_URL}/invoices/${invoiceId}/items/${itemId}`, {
    method: 'PUT',
    body: JSON.stringify(updates)
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || `Failed to update line item: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Remove a request from a draft invoice
 */
export async function unlinkRequest(invoiceId: number, requestId: number): Promise<Invoice> {
  const response = await authenticatedFetch(`${API_BASE_URL}/invoices/${invoiceId}/requests/${requestId}`, {
    method: 'DELETE'
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || `Failed to unlink request: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Add an unbilled request to a draft invoice
 */
export async function linkRequest(invoiceId: number, requestId: number): Promise<Invoice> {
  const response = await authenticatedFetch(`${API_BASE_URL}/invoices/${invoiceId}/requests/${requestId}`, {
    method: 'POST',
    body: JSON.stringify({})
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || `Failed to link request: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Get unbilled requests for the invoice's customer and period
 */
export async function getUnbilledRequests(invoiceId: number): Promise<InvoiceRequest[]> {
  const response = await authenticatedFetch(`${API_BASE_URL}/invoices/${invoiceId}/unbilled-requests`);
  if (!response.ok) {
    throw new Error(`Failed to get unbilled requests: ${response.statusText}`);
  }
  const data = await response.json();
  return data.requests;
}

// =====================================================
// EXPORT
// =====================================================

/**
 * Export invoice as CSV
 */
export async function exportInvoiceCSV(id: number): Promise<string> {
  const response = await authenticatedFetch(`${API_BASE_URL}/invoices/${id}/export/csv`);
  if (!response.ok) {
    throw new Error(`Failed to export CSV: ${response.statusText}`);
  }
  return response.text();
}

/**
 * Export invoice as QBO-compatible flat CSV
 */
export async function exportInvoiceQBOCSV(id: number): Promise<string> {
  const response = await authenticatedFetch(`${API_BASE_URL}/invoices/${id}/export/qbo-csv`);
  if (!response.ok) {
    throw new Error(`Failed to export QBO CSV: ${response.statusText}`);
  }
  return response.text();
}

/**
 * Export hosting detail CSV (per-site breakdown)
 */
export async function exportHostingDetailCSV(id: number): Promise<string> {
  const response = await authenticatedFetch(`${API_BASE_URL}/invoices/${id}/export/hosting-csv`);
  if (!response.ok) {
    throw new Error(`Failed to export hosting detail CSV: ${response.statusText}`);
  }
  return response.text();
}

/**
 * Export invoice as JSON
 */
export async function exportInvoiceJSON(id: number): Promise<object> {
  const response = await authenticatedFetch(`${API_BASE_URL}/invoices/${id}/export/json`);
  if (!response.ok) {
    throw new Error(`Failed to export JSON: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Download file helper
 */
export function downloadFile(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// =====================================================
// LINE ITEM BUILDER
// =====================================================

import type { MonthlyBillingSummary } from '../types/billing';

/**
 * Build additional line items from comprehensive billing data
 * Creates pre-computed project and hosting line items for invoice generation
 */
export function buildAdditionalLineItems(
  monthData: MonthlyBillingSummary,
  includeProjects: boolean,
  includeHosting: boolean
): AdditionalLineItem[] {
  const items: AdditionalLineItem[] = [];
  let sortOrder = 50; // Start after support items

  // Project line items
  if (includeProjects && monthData.projectDetails.length > 0) {
    for (const project of monthData.projectDetails) {
      const desc = project.isFreeCredit
        ? `${project.name} (Free Credit)`
        : project.name;

      items.push({
        item_type: 'project',
        description: desc,
        quantity: 1,
        unit_price: project.isFreeCredit ? (project.originalAmount ?? 0) : project.amount,
        amount: project.amount, // 0 for free-credited projects
        sort_order: sortOrder++,
      });
    }
  }

  // Hosting line item (consolidated lump-sum — detail CSV handles per-site breakdown)
  if (includeHosting && monthData.hostingSitesCount > 0) {
    const [year, monthNum] = monthData.month.split('-');
    const monthName = new Date(parseInt(year), parseInt(monthNum) - 1).toLocaleString('en-US', { month: 'long' });

    // Count prorated sites from hosting details
    const proratedCount = monthData.hostingDetails?.filter(
      h => h.billingType !== 'full_month' && h.billingType !== 'free_credit'
    ).length ?? 0;

    let desc = `Turbo Hosting - ${monthData.hostingSitesCount} site${monthData.hostingSitesCount !== 1 ? 's' : ''} (${monthName} ${year})`;
    const notes: string[] = [];
    if (monthData.hostingCreditsApplied > 0) {
      notes.push(`${monthData.hostingCreditsApplied} free credit${monthData.hostingCreditsApplied !== 1 ? 's' : ''}`);
    }
    if (proratedCount > 0) {
      notes.push(`${proratedCount} prorated`);
    }
    if (notes.length > 0) {
      desc += ` [${notes.join(', ')}]`;
    }

    items.push({
      item_type: 'hosting',
      description: desc,
      quantity: 1,
      unit_price: monthData.hostingRevenue,
      amount: monthData.hostingRevenue,
      sort_order: sortOrder++,
    });
  }

  return items;
}

export default {
  listCustomers,
  getCustomer,
  getBillingSummary,
  listInvoices,
  getInvoice,
  generateInvoice,
  updateInvoice,
  deleteInvoice,
  sendInvoice,
  payInvoice,
  exportInvoiceCSV,
  exportInvoiceQBOCSV,
  exportHostingDetailCSV,
  exportInvoiceJSON,
  downloadFile,
  buildAdditionalLineItems
};
