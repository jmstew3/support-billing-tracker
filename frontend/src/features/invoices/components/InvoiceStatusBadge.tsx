/**
 * Invoice Status Badge Component
 * Displays invoice status with appropriate styling
 */

import { cn } from '../../../lib/utils';
import type { Invoice } from '../../../services/invoiceApi';

interface InvoiceStatusBadgeProps {
  status: Invoice['status'];
  className?: string;
}

const statusConfig: Record<Invoice['status'], { label: string; className: string }> = {
  draft: {
    label: 'Draft',
    className: 'bg-muted text-muted-foreground border-muted-foreground/20',
  },
  sent: {
    label: 'Sent',
    className: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
  },
  paid: {
    label: 'Paid',
    className: 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20',
  },
  overdue: {
    label: 'Overdue',
    className: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
  },
  cancelled: {
    label: 'Cancelled',
    className: 'bg-gray-500/10 text-gray-500 dark:text-gray-400 border-gray-500/20',
  },
};

export function InvoiceStatusBadge({ status, className }: InvoiceStatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border',
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  );
}
