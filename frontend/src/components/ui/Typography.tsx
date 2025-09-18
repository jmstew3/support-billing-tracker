import React from 'react';
import { cn } from '../../lib/utils';
import { typographyVariants, type TypographyVariants } from '../../styles/variants/typography';

interface TypographyProps extends TypographyVariants, React.HTMLAttributes<HTMLElement> {
  children: React.ReactNode;
  as?: keyof JSX.IntrinsicElements;
  className?: string;
}

export const Typography = React.forwardRef<HTMLElement, TypographyProps>(
  ({ children, variant = 'body', color = 'default', align, weight, as, className, ...props }, ref) => {
    // Map variant to appropriate HTML element if not specified
    const Component = as || getDefaultTag(variant);

    return React.createElement(
      Component,
      {
        ref,
        className: cn(typographyVariants({ variant, color, align, weight }), className),
        ...props,
      },
      children
    );
  }
);

Typography.displayName = 'Typography';

// Helper function to get default HTML tag based on variant
function getDefaultTag(variant: TypographyProps['variant']): keyof JSX.IntrinsicElements {
  switch (variant) {
    case 'h1':
      return 'h1';
    case 'h2':
      return 'h2';
    case 'h3':
      return 'h3';
    case 'h4':
      return 'h4';
    case 'h5':
      return 'h5';
    case 'h6':
      return 'h6';
    case 'label':
      return 'label';
    case 'caption':
      return 'small';
    default:
      return 'p';
  }
}