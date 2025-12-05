import React from 'react';
import { cn } from '../../lib/utils';
import {
  scorecardVariants,
  scorecardValueVariants,
  scorecardTitleVariants,
  scorecardDescriptionVariants,
  type ScorecardVariants,
  type ScorecardValueVariants,
} from '../../styles/variants/scorecard';
import { Card, CardContent, CardHeader, CardTitle } from './card';

interface ScorecardProps extends Omit<ScorecardVariants, 'size'>, Omit<ScorecardValueVariants, 'size'> {
  title: string;
  value: string | number | React.ReactNode;
  description?: string | React.ReactNode;
  icon?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  valueClassName?: string;
  titleClassName?: string;
  descriptionClassName?: string;
}

export const Scorecard = React.forwardRef<HTMLDivElement, ScorecardProps>(
  (
    {
      title,
      value,
      description,
      icon,
      variant = 'default',
      size = 'md',
      hover = false,
      className,
      valueClassName,
      titleClassName,
      descriptionClassName,
    },
    ref
  ) => {
    // Map size prop for value variant (component size affects value size)
    const valueSizeMap = {
      sm: 'sm' as const,
      md: 'md' as const,
      lg: 'lg' as const,
    };

    return (
      <Card ref={ref} className={cn(scorecardVariants({ variant, size, hover }), "transition-all duration-200", className)}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 pb-2">
          <CardTitle className={cn(scorecardTitleVariants({ size }), "text-sm font-medium text-muted-foreground", titleClassName)}>
            {title}
          </CardTitle>
          {icon && <div className="text-muted-foreground opacity-70">{icon}</div>}
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className={cn(scorecardValueVariants({ size: valueSizeMap[size || 'md'] }), "text-lg font-semibold text-foreground", valueClassName)}>
            {value}
          </div>
          {description && (
            <p className={cn(scorecardDescriptionVariants({ size }), 'text-xs text-muted-foreground mt-1.5', descriptionClassName)}>
              {description}
            </p>
          )}
        </CardContent>
      </Card>
    );
  }
);

Scorecard.displayName = 'Scorecard';