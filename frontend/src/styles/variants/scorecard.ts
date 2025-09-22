import { cva, type VariantProps } from 'class-variance-authority';

// Scorecard container variants
export const scorecardVariants = cva(
  'rounded-lg border shadow-sm transition-all duration-200',
  {
    variants: {
      variant: {
        default: 'bg-card text-card-foreground border-border',
        highlight: 'bg-primary text-primary-foreground border-primary',
        success: 'bg-green-50 dark:bg-green-900/20 text-green-900 dark:text-green-100 border-green-200 dark:border-green-800',
        warning: 'bg-amber-50 dark:bg-amber-900/20 text-amber-900 dark:text-amber-100 border-amber-200 dark:border-amber-800',
        error: 'bg-red-50 dark:bg-red-900/20 text-red-900 dark:text-red-100 border-red-200 dark:border-red-800',
      },
      size: {
        sm: '',
        md: '',
        lg: '',
      },
      hover: {
        true: 'hover:shadow-md',
        false: '',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
      hover: false,
    },
  }
);

// Scorecard value text variants
export const scorecardValueVariants = cva(
  'font-bold transition-all duration-200',
  {
    variants: {
      size: {
        sm: 'text-lg',
        md: 'text-2xl',
        lg: 'text-3xl',
        xl: 'text-4xl',
      },
    },
    defaultVariants: {
      size: 'md',
    },
  }
);

// Scorecard title variants
export const scorecardTitleVariants = cva(
  'font-medium',
  {
    variants: {
      size: {
        sm: 'text-xs',
        md: 'text-sm',
        lg: 'text-base',
      },
    },
    defaultVariants: {
      size: 'md',
    },
  }
);

// Scorecard description variants
export const scorecardDescriptionVariants = cva(
  'text-muted-foreground',
  {
    variants: {
      size: {
        sm: 'text-xs',
        md: 'text-xs',
        lg: 'text-sm',
      },
    },
    defaultVariants: {
      size: 'md',
    },
  }
);

export type ScorecardVariants = VariantProps<typeof scorecardVariants>;
export type ScorecardValueVariants = VariantProps<typeof scorecardValueVariants>;
export type ScorecardTitleVariants = VariantProps<typeof scorecardTitleVariants>;
export type ScorecardDescriptionVariants = VariantProps<typeof scorecardDescriptionVariants>;