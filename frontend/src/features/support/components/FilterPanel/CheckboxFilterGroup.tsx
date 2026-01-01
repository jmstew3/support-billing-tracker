/**
 * CheckboxFilterGroup Component
 *
 * A reusable checkbox group for multi-select filters.
 * Displays options with optional counts and supports 1 or 2 column layouts.
 */


interface CheckboxFilterGroupProps {
  options: string[];
  selectedValues: string[];
  counts?: Record<string, number>;
  onChange: (values: string[]) => void;
  formatDisplayValue?: (value: string) => string;
  columns?: 1 | 2;
}

export function CheckboxFilterGroup({
  options,
  selectedValues,
  counts,
  onChange,
  formatDisplayValue,
  columns = 2,
}: CheckboxFilterGroupProps) {
  const handleToggle = (value: string) => {
    if (selectedValues.includes(value)) {
      onChange(selectedValues.filter((v) => v !== value));
    } else {
      onChange([...selectedValues, value]);
    }
  };

  const handleSelectAll = () => {
    if (selectedValues.length === options.length) {
      onChange([]);
    } else {
      onChange([...options]);
    }
  };

  const allSelected = selectedValues.length === options.length;
  const someSelected = selectedValues.length > 0 && selectedValues.length < options.length;

  return (
    <div className="space-y-2">
      {/* Select All option */}
      <label className="flex items-center gap-2 cursor-pointer group">
        <input
          type="checkbox"
          checked={allSelected}
          ref={(el) => {
            if (el) el.indeterminate = someSelected;
          }}
          onChange={handleSelectAll}
          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 focus:ring-2 focus:ring-offset-0"
        />
        <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">
          {allSelected ? 'Deselect All' : 'Select All'}
        </span>
      </label>

      {/* Options grid */}
      <div className={`grid gap-1.5 ${columns === 2 ? 'grid-cols-2' : 'grid-cols-1'}`}>
        {options.map((option) => {
          const count = counts?.[option] ?? 0;
          const displayValue = formatDisplayValue ? formatDisplayValue(option) : option;
          const isSelected = selectedValues.includes(option);

          return (
            <label
              key={option}
              className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer transition-colors ${
                isSelected
                  ? 'bg-blue-50 dark:bg-blue-900/20'
                  : 'hover:bg-muted/50'
              }`}
            >
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => handleToggle(option)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 focus:ring-2 focus:ring-offset-0"
              />
              <span className="text-xs text-foreground truncate flex-1">{displayValue}</span>
              {count > 0 && (
                <span className="text-xs text-muted-foreground">({count})</span>
              )}
            </label>
          );
        })}
      </div>
    </div>
  );
}
