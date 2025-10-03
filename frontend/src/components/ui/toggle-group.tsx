import { cn } from '../../lib/utils';

interface ToggleGroupOption {
  value: string;
  label: string;
}

interface ToggleGroupProps {
  options: ToggleGroupOption[];
  value: string;
  onValueChange: (value: string) => void;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function ToggleGroup({ options, value, onValueChange, className, size = 'md' }: ToggleGroupProps) {
  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
    lg: 'px-4 py-2 text-base',
  };

  return (
    <div className={cn('inline-flex', className)}>
      {options.map((option, index) => {
        const isFirst = index === 0;
        const isLast = index === options.length - 1;
        const isActive = value === option.value;

        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onValueChange(option.value)}
            className={cn(
              'font-medium transition-colors border border-border',
              sizeClasses[size],
              // Active state
              isActive
                ? 'bg-foreground text-background'
                : 'bg-background text-foreground hover:bg-muted',
              // Rounded corners
              isFirst && 'rounded-l',
              isLast && 'rounded-r',
              // Border handling
              !isFirst && 'border-l-0'
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
