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

interface ScorecardProps extends ScorecardVariants, ScorecardValueVariants {
  title: string;
  value: string | number | React.ReactNode;
  description?: string;
  icon?: React.ReactNode;
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
      <Card ref={ref} className={cn(scorecardVariants({ variant, size, hover }), className)}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className={cn(scorecardTitleVariants({ size }), titleClassName)}>
            {title}
          </CardTitle>
          {icon && <div className="text-muted-foreground">{icon}</div>}
        </CardHeader>
        <CardContent>
          <div className={cn(scorecardValueVariants({ size: valueSizeMap[size] }), valueClassName)}>
            {value}
          </div>
          {description && (
            <p className={cn(scorecardDescriptionVariants({ size }), 'text-muted-foreground', descriptionClassName)}>
              {description}
            </p>
          )}
        </CardContent>
      </Card>
    );
  }
);

Scorecard.displayName = 'Scorecard';