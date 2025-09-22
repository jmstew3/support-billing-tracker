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
  min = 0.01,
  max = 99.99,
  placeholder = '0.50'
}) => {
  // Determine step based on urgency
  const getStep = () => {
    switch (urgency) {
      case 'HIGH':
        return 1.0;  // 1 hour increments for high urgency
      case 'MEDIUM':
        return 0.5;  // 30 minute increments for medium urgency
      case 'LOW':
      case 'PROMOTION':
        return 0.25; // 15 minute increments for low/promotion urgency
      default:
        return 0.25; // Default to 15 minute increments
    }
  };

  const step = getStep();
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value.toFixed(2));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleEdit = () => {
    setIsEditing(true);
    setEditValue(value.toFixed(2));
  };

  const handleSave = () => {
    const numValue = parseFloat(editValue);
    console.log(`EditableNumberCell - Attempting to save: ${editValue} -> ${numValue}`);

    // Validate the value
    if (!isNaN(numValue) && numValue >= min && numValue <= max) {
      console.log(`EditableNumberCell - Valid value, calling onSave with: ${numValue}`);
      onSave(numValue);
      setIsEditing(false);
    } else {
      console.warn(`EditableNumberCell - Invalid value: ${numValue} (min: ${min}, max: ${max})`);
      // Reset to original value if invalid
      setEditValue(value.toFixed(2));
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    setEditValue(value.toFixed(2));
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
      {value.toFixed(2)}
    </button>
  );
};