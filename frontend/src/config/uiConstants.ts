/**
 * Centralized UI Constants
 *
 * Single source of truth for labels, styles, and display formats
 * across all dashboard pages (Dashboard, Hosting, SupportTickets, Projects)
 */

import type { BillingType } from '../types/websiteProperty';

// ============================================================================
// GLOBAL DESIGN SYSTEM
// ============================================================================

/**
 * Border radius for all badges and pills throughout the application
 * Set to '0rem' for sharp, squared-off edges (flat design aesthetic)
 * Change to 'rounded-full' for pill-shaped badges
 */
export const BADGE_BORDER_RADIUS = ''; // Empty string = sharp edges (0rem)

// ============================================================================
// BILLING TYPE CONFIGURATION
// ============================================================================

export const BILLING_TYPE_LABELS: Record<BillingType, string> = {
  FULL: 'Full Month',
  PRORATED_START: 'Prorated Start',
  PRORATED_END: 'Prorated End',
  INACTIVE: 'Inactive',
};

export const BILLING_TYPE_BADGE_STYLES: Record<BillingType, string> = {
  FULL: 'bg-green-100 text-green-800 ring-green-200 dark:bg-green-950/30 dark:text-green-300 dark:ring-green-800',
  PRORATED_START: 'bg-blue-100 text-blue-800 ring-blue-200 dark:bg-blue-950/30 dark:text-blue-300 dark:ring-blue-800',
  PRORATED_END: 'bg-orange-100 text-orange-800 ring-orange-200 dark:bg-orange-950/30 dark:text-orange-300 dark:ring-orange-800',
  INACTIVE: 'bg-slate-100 text-slate-600 ring-slate-200 dark:bg-slate-900/30 dark:text-slate-400 dark:ring-slate-800',
};

// ============================================================================
// INVOICE STATUS CONFIGURATION
// ============================================================================

export type InvoiceStatus = 'NOT_READY' | 'READY' | 'INVOICED' | 'PAID';

export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  NOT_READY: 'Not Ready',
  READY: 'Ready',
  INVOICED: 'Invoiced',
  PAID: 'Paid',
};

export const INVOICE_STATUS_BADGE_STYLES: Record<InvoiceStatus, string> = {
  NOT_READY: 'bg-gray-100 text-gray-800 ring-gray-200 dark:bg-gray-900/30 dark:text-gray-300 dark:ring-gray-800',
  READY: 'bg-blue-100 text-blue-800 ring-blue-200 dark:bg-blue-950/30 dark:text-blue-300 dark:ring-blue-800',
  INVOICED: 'bg-yellow-100 text-yellow-800 ring-yellow-200 dark:bg-yellow-950/30 dark:text-yellow-300 dark:ring-yellow-800',
  PAID: 'bg-green-100 text-green-800 ring-green-200 dark:bg-green-950/30 dark:text-green-300 dark:ring-green-800',
};

// ============================================================================
// PROJECT CATEGORY CONFIGURATION
// ============================================================================

export type ProjectCategory =
  | 'WEBSITE'
  | 'LANDING_PAGE'
  | 'MIGRATION'
  | 'MULTI_FORM'
  | 'BASIC_FORM';

export const PROJECT_CATEGORY_LABELS: Record<ProjectCategory, string> = {
  WEBSITE: 'Website',
  LANDING_PAGE: 'Landing Page',
  MIGRATION: 'Migration',
  MULTI_FORM: 'Multi-Form',
  BASIC_FORM: 'Basic Form',
};

export const PROJECT_CATEGORY_BADGE_STYLES: Record<ProjectCategory, string> = {
  WEBSITE: 'bg-gray-100 text-gray-800 ring-gray-200 dark:bg-gray-900/30 dark:text-gray-300 dark:ring-gray-800',
  LANDING_PAGE: 'bg-gray-200 text-gray-900 ring-gray-300 dark:bg-gray-800/30 dark:text-gray-200 dark:ring-gray-700',
  MIGRATION: 'bg-gray-300 text-gray-900 ring-gray-400 dark:bg-gray-700/30 dark:text-gray-200 dark:ring-gray-600',
  MULTI_FORM: 'bg-gray-400 text-gray-900 ring-gray-500 dark:bg-gray-600/30 dark:text-gray-100 dark:ring-gray-500',
  BASIC_FORM: 'bg-gray-500 text-white ring-gray-600 dark:bg-gray-500/30 dark:text-gray-100 dark:ring-gray-400',
};

// ============================================================================
// CREDIT BADGE CONFIGURATION
// ============================================================================

// Compact style matching the "1 Free Multi-Form" design from screenshot
// Uses lighter green background with sharp edges
export const CREDIT_BADGE_STYLE =
  'bg-green-100 text-green-800 ring-1 ring-green-800 dark:bg-green-950/20 dark:text-green-400 dark:ring-green-400';

export const FREE_BADGE_STYLE =
  'bg-green-100 text-green-800 ring-1 ring-green-800 dark:bg-green-950/20 dark:text-green-400 dark:ring-green-400';

// ============================================================================
// COUNT BADGE CONFIGURATION (for "X sites", "X tickets", etc.)
// ============================================================================

export const COUNT_BADGE_STYLE =
  'bg-white text-black ring-1 ring-black dark:bg-white dark:text-black dark:ring-black min-w-[2rem] justify-center';

// ============================================================================
// TOTAL REVENUE BADGE (prominent black pill for totals)
// ============================================================================

export const TOTAL_REVENUE_BADGE_STYLE =
  'bg-black text-white dark:bg-white dark:text-black';

// ============================================================================
// TABLE TYPOGRAPHY (for billing tables)
// ============================================================================

/**
 * Typography constants for consistent revenue number display in tables
 * Used in BillingOverview and other billing tables
 */

// Monthly row totals (standard emphasis)
export const TABLE_REVENUE_TEXT_SIZE = 'text-sm';
export const TABLE_REVENUE_FONT_WEIGHT = 'font-normal';

// Grand total row (maximum emphasis)
export const GRAND_TOTAL_TEXT_SIZE = 'text-lg';
export const GRAND_TOTAL_FONT_WEIGHT = 'font-bold';

// ============================================================================
// CHART COLORS
// ============================================================================

export const CATEGORY_COLORS = {
  tickets: {
    primary: '#000000',      // pure black (darkest for charts)
    light: 'text-gray-500',
    dark: 'dark:text-gray-400',
  },
  projects: {
    primary: '#374151',      // gray-700 (medium for charts)
    light: 'text-gray-500',
    dark: 'dark:text-gray-400',
  },
  hosting: {
    primary: '#9ca3af',      // gray-400 (lighter for charts)
    light: 'text-gray-500',
    dark: 'dark:text-gray-400',
  },
} as const;
