import { usePeriod } from '../../contexts/PeriodContext';
import type { ViewMode } from '../../contexts/PeriodContext';
import { ToggleGroup } from '../ui/toggle-group';

export interface ViewModeToggleProps {
  /**
   * Label to display before the toggle
   */
  label?: string;

  /**
   * Which view modes to show
   * Default: ['all', 'month', 'day']
   */
  availableModes?: ViewMode[];

  /**
   * Size of the toggle buttons
   */
  size?: 'sm' | 'md' | 'lg';
}

export function ViewModeToggle({
  label = 'View:',
  availableModes = ['all', 'month', 'day'],
  size = 'sm'
}: ViewModeToggleProps) {
  const { viewMode, setViewMode } = usePeriod();

  // Map view modes to labels
  const modeLabels: Record<ViewMode, string> = {
    all: 'All',
    month: 'Month',
    day: 'Day'
  };

  // Filter options based on available modes
  const options = availableModes.map(mode => ({
    value: mode,
    label: modeLabels[mode]
  }));

  return (
    <div className="flex items-center space-x-2">
      <span className="text-sm font-medium text-muted-foreground">{label}</span>
      <ToggleGroup
        options={options}
        value={viewMode}
        onValueChange={(value) => setViewMode(value as ViewMode)}
        size={size}
      />
    </div>
  );
}
