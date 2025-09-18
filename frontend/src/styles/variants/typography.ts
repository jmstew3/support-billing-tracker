import { cva, type VariantProps } from 'class-variance-authority';

export const typographyVariants = cva(
  'transition-colors duration-200',
  {
    variants: {
      variant: {
        h1: 'text-4xl font-bold tracking-tight',
        h2: 'text-3xl font-semibold tracking-tight',
        h3: 'text-2xl font-semibold',
        h4: 'text-xl font-semibold',
        h5: 'text-lg font-semibold',
        h6: 'text-base font-semibold',
        body: 'text-base font-normal',
        bodyLarge: 'text-lg font-normal',
        bodySmall: 'text-sm font-normal',
        caption: 'text-xs font-normal',
        label: 'text-sm font-medium',
        // Component-specific
        scorecardValue: 'text-2xl font-bold',
        scorecardTitle: 'text-sm font-medium',
        scorecardDescription: 'text-xs font-normal',
        tableHeader: 'text-sm font-semibold',
        tableCell: 'text-sm font-normal',
      },
      color: {
        default: 'text-foreground',
        muted: 'text-muted-foreground',
        primary: 'text-primary',
        success: 'text-green-600 dark:text-green-400',
        warning: 'text-amber-600 dark:text-amber-400',
        error: 'text-red-600 dark:text-red-400',
        info: 'text-blue-600 dark:text-blue-400',
      },
      align: {
        left: 'text-left',
        center: 'text-center',
        right: 'text-right',
        justify: 'text-justify',
      },
      weight: {
        light: 'font-light',
        normal: 'font-normal',
        medium: 'font-medium',
        semibold: 'font-semibold',
        bold: 'font-bold',
      },
    },
    defaultVariants: {
      variant: 'body',
      color: 'default',
      align: 'left',
    },
  }
);

export type TypographyVariants = VariantProps<typeof typographyVariants>;