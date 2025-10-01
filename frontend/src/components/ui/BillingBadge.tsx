/**
 * BillingBadge Component
 *
 * Reusable badge component for consistent display of:
 * - Billing types (Full, Prorated Start, Prorated End, Inactive)
 * - Invoice statuses (Not Ready, Ready, Invoiced, Paid)
 * - Project categories (Website, Landing Page, etc.)
 * - Credit badges (FREE, free hours, etc.)
 * - Count badges (X sites, X tickets, etc.)
 */

import { Zap } from 'lucide-react';
import {
  BADGE_BORDER_RADIUS,
  BILLING_TYPE_LABELS,
  BILLING_TYPE_BADGE_STYLES,
  INVOICE_STATUS_LABELS,
  INVOICE_STATUS_BADGE_STYLES,
  PROJECT_CATEGORY_LABELS,
  PROJECT_CATEGORY_BADGE_STYLES,
  CREDIT_BADGE_STYLE,
  FREE_BADGE_STYLE,
  COUNT_BADGE_STYLE,
} from '../../config/uiConstants';
import type { BillingType } from '../../types/websiteProperty';
import type { InvoiceStatus, ProjectCategory } from '../../config/uiConstants';

// ============================================================================
// BADGE VARIANT TYPES
// ============================================================================

type BadgeVariant =
  | { type: 'billingType'; value: BillingType }
  | { type: 'invoiceStatus'; value: InvoiceStatus }
  | { type: 'projectCategory'; value: ProjectCategory }
  | { type: 'credit'; text: string; showIcon?: boolean }
  | { type: 'free'; showIcon?: boolean }
  | { type: 'count'; text: string };

interface BillingBadgeProps {
  variant: BadgeVariant;
  className?: string;
  size?: 'xs' | 'sm' | 'md';
}

// ============================================================================
// BILLING BADGE COMPONENT
// ============================================================================

export function BillingBadge({ variant, className = '', size = 'xs' }: BillingBadgeProps) {
  let label: string;
  let badgeStyle: string;
  let icon: React.ReactNode = null;

  // Determine label and style based on variant
  switch (variant.type) {
    case 'billingType':
      label = BILLING_TYPE_LABELS[variant.value];
      badgeStyle = BILLING_TYPE_BADGE_STYLES[variant.value];
      break;

    case 'invoiceStatus':
      label = INVOICE_STATUS_LABELS[variant.value];
      badgeStyle = INVOICE_STATUS_BADGE_STYLES[variant.value];
      break;

    case 'projectCategory':
      label = PROJECT_CATEGORY_LABELS[variant.value];
      badgeStyle = PROJECT_CATEGORY_BADGE_STYLES[variant.value];
      break;

    case 'credit':
      label = variant.text;
      badgeStyle = CREDIT_BADGE_STYLE;
      if (variant.showIcon !== false) {
        icon = <Zap className="h-3 w-3 mr-0.5" />;
      }
      break;

    case 'free':
      label = 'FREE';
      badgeStyle = FREE_BADGE_STYLE;
      if (variant.showIcon !== false) {
        icon = <Zap className="h-2.5 w-2.5 mr-0.5" />;
      }
      break;

    case 'count':
      label = variant.text;
      badgeStyle = COUNT_BADGE_STYLE;
      break;

    default:
      // TypeScript should prevent this, but just in case
      label = 'Unknown';
      badgeStyle = 'bg-gray-100 text-gray-800';
  }

  // Size classes
  const sizeClasses = {
    xs: 'px-1.5 py-0.5 text-xs',
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2 py-1 text-sm',
  };

  // Credit badges don't use ring borders (they have no border)
  const ringClass = (variant.type === 'credit' || variant.type === 'free')
    ? ''
    : 'ring-1 ring-inset';

  return (
    <span
      className={`inline-flex items-center font-medium whitespace-nowrap ${sizeClasses[size]} ${ringClass} ${BADGE_BORDER_RADIUS} ${badgeStyle} ${className}`}
    >
      {icon}
      {label}
    </span>
  );
}

// ============================================================================
// CONVENIENCE COMPONENTS (Optional - for cleaner JSX)
// ============================================================================

export function BillingTypeBadge({ billingType, className, size }: { billingType: BillingType; className?: string; size?: 'xs' | 'sm' | 'md' }) {
  return <BillingBadge variant={{ type: 'billingType', value: billingType }} className={className} size={size} />;
}

export function InvoiceStatusBadge({ status, className, size }: { status: InvoiceStatus; className?: string; size?: 'xs' | 'sm' | 'md' }) {
  return <BillingBadge variant={{ type: 'invoiceStatus', value: status }} className={className} size={size} />;
}

export function ProjectCategoryBadge({ category, className, size }: { category: ProjectCategory; className?: string; size?: 'xs' | 'sm' | 'md' }) {
  return <BillingBadge variant={{ type: 'projectCategory', value: category }} className={className} size={size} />;
}

export function CreditBadge({ text, showIcon = true, className, size }: { text: string; showIcon?: boolean; className?: string; size?: 'xs' | 'sm' | 'md' }) {
  return <BillingBadge variant={{ type: 'credit', text, showIcon }} className={className} size={size} />;
}

export function FreeBadge({ showIcon = true, className, size }: { showIcon?: boolean; className?: string; size?: 'xs' | 'sm' | 'md' }) {
  return <BillingBadge variant={{ type: 'free', showIcon }} className={className} size={size} />;
}

export function CountBadge({ text, className, size }: { text: string; className?: string; size?: 'xs' | 'sm' | 'md' }) {
  return <BillingBadge variant={{ type: 'count', text }} className={className} size={size} />;
}
