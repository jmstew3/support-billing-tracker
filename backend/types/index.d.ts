/**
 * Type definitions for Support Billing Tracker Backend
 *
 * These types provide TypeScript support for the backend codebase.
 * They are designed to work with the existing JavaScript files via JSDoc comments
 * and provide type safety for new TypeScript code.
 */

// Request entity types
export interface Request {
  id: number;
  date: Date;
  time: string;
  month?: string;
  request_type: string;
  category: string;
  description: string | null;
  urgency: 'LOW' | 'MEDIUM' | 'HIGH' | 'PROMOTION';
  effort: 'Small' | 'Medium' | 'Large';
  status: 'active' | 'deleted' | 'ignored';
  source: 'sms' | 'ticket' | 'email' | 'phone' | 'fluent';
  website_url: string | null;
  estimated_hours: number;
  created_at: Date;
  updated_at: Date;
}

export interface RequestFilters {
  status?: string;
  category?: string;
  urgency?: string;
  source?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
  cursor?: number;
}

export interface PaginationMeta {
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
  nextCursor: number | null;
  currentPage: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationMeta;
}

// FluentSupport types
export interface FluentTicket {
  id: number;
  fluent_id: string;
  ticket_number: string | null;
  created_at: Date;
  updated_at_fluent: Date | null;
  ticket_status: string | null;
  customer_id: string | null;
  customer_name: string | null;
  customer_email: string | null;
  mailbox_id: number | null;
  title: string | null;
  customer_message: string | null;
  priority: string | null;
  product_id: string | null;
  product_name: string | null;
  agent_id: string | null;
  agent_name: string | null;
  raw_data: Record<string, unknown>;
  request_id: number | null;
  last_synced_at: Date;
  created_at_local: Date;
  updated_at_local: Date;
}

export interface FluentSyncStatus {
  id: number;
  last_sync_at: Date | null;
  last_sync_status: 'success' | 'failed' | 'in_progress' | null;
  tickets_fetched: number;
  tickets_added: number;
  tickets_updated: number;
  tickets_skipped: number;
  error_message: string | null;
  sync_duration_ms: number;
  date_filter: Date;
  created_at: Date;
  updated_at: Date;
}

export interface FluentSyncResult {
  success: boolean;
  ticketsFetched: number;
  ticketsAdded: number;
  ticketsUpdated: number;
  ticketsSkipped: number;
  syncDuration: number;
  dateFilter: string;
}

export interface FluentTicketMetadata {
  ticket_number: string | number | null;
  created_at: string;
  updated_at: string | null;
  ticket_status: string | null;
  customer_id: string | null;
  customer_name: string | null;
  customer_email: string | null;
  mailbox_id: number | null;
  priority: string | null;
  product_id: string | null;
  product_name: string | null;
  agent_id: string | null;
  agent_name: string | null;
  raw_data: Record<string, unknown>;
}

export interface TransformedFluentTicket {
  date: string;
  time: string;
  request_type: string;
  category: string;
  description: string;
  urgency: 'LOW' | 'MEDIUM' | 'HIGH';
  effort: 'Small' | 'Medium' | 'Large';
  status: 'active';
  source: 'fluent';
  fluent_id: string;
  website_url: string | null;
  fluent_metadata: FluentTicketMetadata;
}

// User types
export interface User {
  id: number;
  email: string;
  password_hash: string;
  role: 'admin' | 'viewer' | 'editor';
  created_at: Date;
  last_login_at: Date | null;
}

export interface JWTPayload {
  id: number;
  email: string;
  role: string;
}

// API Response types
export interface ApiError {
  error: string;
  status?: number;
}

export interface ApiSuccess {
  message: string;
  [key: string]: unknown;
}

// Rate limit types
export interface RateLimitMessage {
  error: string;
  retryAfter: number;
}

// MySQL Pool types (augmenting mysql2)
declare module 'mysql2/promise' {
  interface PoolConnection {
    query<T>(sql: string, values?: unknown[]): Promise<[T, unknown]>;
    execute<T>(sql: string, values?: unknown[]): Promise<[T, unknown]>;
    beginTransaction(): Promise<void>;
    commit(): Promise<void>;
    rollback(): Promise<void>;
    release(): void;
  }
}
