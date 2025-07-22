import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown } from 'lucide-react';

interface EditableCellProps {
  value: string;
  options: string[];
  onSave: (newValue: string) => void;
  className?: string;
  formatDisplayValue?: (value: string) => string;
}

export function EditableCell({ value, options, onSave, className = '', formatDisplayValue }: EditableCellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  
  console.log('EditableCell render - value:', value, 'options:', options);

  // Close dropdown when value changes (e.g., when switching between billable/non-billable)
  useEffect(() => {
    setIsOpen(false);
  }, [value, options]); // Also close when options change

  // Handle scroll and resize to reposition dropdown
  useEffect(() => {
    function handleScrollOrResize() {
      if (isOpen) {
        calculateDropdownPosition();
      }
    }

    if (isOpen) {
      window.addEventListener('scroll', handleScrollOrResize, true);
      window.addEventListener('resize', handleScrollOrResize);
    }

    return () => {
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [isOpen]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (isOpen && 
          dropdownRef.current && 
          !dropdownRef.current.contains(event.target as Node) &&
          buttonRef.current &&
          !buttonRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const calculateDropdownPosition = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width
      });
    }
  };

  const handleOptionClick = (newValue: string) => {
    console.log('EditableCell: Option clicked:', newValue, 'Current value:', value);
    setIsOpen(false); // Close dropdown immediately
    // Use setTimeout to ensure state update happens after DOM update
    setTimeout(() => {
      if (newValue !== value) {
        console.log('EditableCell: Calling onSave with:', newValue);
        onSave(newValue);
      } else {
        console.log('EditableCell: No change needed, values are the same');
      }
    }, 0);
  };

  const handleToggleOpen = () => {
    if (!isOpen) {
      calculateDropdownPosition();
    }
    setIsOpen(!isOpen);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleToggleOpen();
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div className="relative isolate" ref={dropdownRef}>
      <button
        ref={buttonRef}
        onClick={handleToggleOpen}
        onKeyDown={handleKeyDown}
        className={`flex items-center justify-between w-full px-3 py-2 text-left border border-gray-200 rounded-md bg-white hover:border-gray-300 hover:bg-gray-50 transition-colors ${className} ${isOpen ? 'border-blue-300 bg-blue-50' : ''}`}
        title="Click to edit"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <span>{formatDisplayValue ? formatDisplayValue(value) : value}</span>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && createPortal(
        <div 
          ref={dropdownRef}
          className="bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto"
          style={{
            position: 'absolute',
            top: dropdownPosition.top + 4,
            left: dropdownPosition.left,
            width: dropdownPosition.width,
            zIndex: 999999,
            backgroundColor: 'white',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
          }}
        >
          {options.map((option) => (
            <button
              key={option}
              onClick={() => handleOptionClick(option)}
              className={`w-full px-3 py-2 text-left hover:bg-gray-100 transition-colors ${
                option === value ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-900'
              }`}
              role="option"
              aria-selected={option === value}
            >
              {option}
            </button>
          ))}
        </div>,
        document.body
      )}
    </div>
  );
}