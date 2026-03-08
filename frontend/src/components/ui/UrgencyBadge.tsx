/**
 * Urgency Badge Component
 * Displays request urgency level with appropriate styling
 * Follows the same pattern as InvoiceStatusBadge
 */

import { cn } from '../../lib/utils'

type UrgencyLevel = 'HIGH' | 'MEDIUM' | 'LOW' | 'PROMOTION'

interface UrgencyBadgeProps {
  urgency: string
  className?: string
}

const urgencyConfig: Record<UrgencyLevel, { label: string; className: string }> = {
  HIGH: {
    label: 'High',
    className: 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/30',
  },
  MEDIUM: {
    label: 'Medium',
    className: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30',
  },
  LOW: {
    label: 'Low',
    className: 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/30',
  },
  PROMOTION: {
    label: 'Promo',
    className: 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/30',
  },
}

const fallbackConfig = {
  label: 'Unknown',
  className: 'bg-muted text-muted-foreground border-muted-foreground/20',
}

export function UrgencyBadge({ urgency, className }: UrgencyBadgeProps) {
  const config = urgencyConfig[urgency as UrgencyLevel] || fallbackConfig

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
  )
}
