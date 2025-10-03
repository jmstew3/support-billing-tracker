import React, { useState, useRef, useEffect } from 'react';

interface EditableNumberCellProps {
  value: number;
  onSave: (value: number) => void;
  urgency?: 'HIGH' | 'MEDIUM' | 'LOW' | 'PROMOTION';
  min?: number;
  max?: number;
  placeholder?: string;
}

export const EditableNumberCell: React.FC<EditableNumberCellProps> = ({
  value,
  onSave,
  urgency,
  min = 0,
  max = 99.99,
  placeholder = '0.50'
}) => {
  // Always use 0.25 increments (15 minute intervals)
  const step = 0.25;

  // Function to round to nearest 0.25 increment
  const roundToQuarterHour = (val: number): number => {
    // Round to nearest 0.25
    const rounded = Math.round(val / 0.25) * 0.25;
    // Ensure we stay within min/max bounds
    return Math.max(min, Math.min(max, rounded));
  };

  // Ensure the initial value is also rounded to 0.25 increments
  const roundedInitialValue = roundToQuarterHour(value);

  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(roundedInitialValue.toFixed(2));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleEdit = () => {
    setIsEditing(true);
    setEditValue(roundedInitialValue.toFixed(2));
  };

  const handleSave = () => {
    const numValue = parseFloat(editValue);
    console.log(`EditableNumberCell - Attempting to save: ${editValue} -> ${numValue}`);

    // Validate the value
    if (!isNaN(numValue) && numValue >= min && numValue <= max) {
      // Special handling for 0 and values already on quarter-hour boundaries
      let roundedValue;
      if (numValue === 0 || numValue % 0.25 === 0) {
        // If it's exactly 0 or already a quarter-hour value, use it as-is
        roundedValue = numValue;
      } else {
        // Otherwise round to nearest 0.25 increment
        roundedValue = roundToQuarterHour(numValue);
      }
      console.log(`EditableNumberCell - Rounding ${numValue} to ${roundedValue} (nearest 0.25 increment)`);
      console.log(`EditableNumberCell - Valid value, calling onSave with: ${roundedValue}`);
      onSave(roundedValue);
      setIsEditing(false);
    } else {
      console.warn(`EditableNumberCell - Invalid value: ${numValue} (min: ${min}, max: ${max})`);
      // Reset to original value if invalid
      setEditValue(value.toFixed(2));
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    setEditValue(roundedInitialValue.toFixed(2));
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    }
  };

  const handleBlur = () => {
    handleSave();
  };

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        type="number"
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        min={min}
        max={max}
        step={step}
        className="w-20 px-2 py-1 text-sm border border-blue-500 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
        onClick={(e) => e.stopPropagation()}
      />
    );
  }

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        handleEdit();
      }}
      className="w-20 px-2 py-1 text-sm text-left hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500"
      title="Click to edit hours"
    >
      {roundedInitialValue.toFixed(2)}
    </button>
  );
};