import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Calendar as CalendarIcon, X } from 'lucide-react';
import { Calendar } from '../../../components/ui/calendar';
import { format, parse } from 'date-fns';

interface EditableDateCellProps {
  value: string | null;
  onSave: (newValue: string | null) => void;
  disabled?: boolean;
  placeholder?: string;
}

/**
 * EditableDateCell - Inline date picker for billing date override
 *
 * Shows a clickable cell that opens a calendar popover.
 * - When value is null, shows placeholder (e.g., "-")
 * - When value is set, shows the date with a clear button option
 * - Uses portal to render calendar above table scroll context
 */
export function EditableDateCell({
  value,
  onSave,
  disabled = false,
  placeholder = '-',
}: EditableDateCellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Parse the date value for the calendar
  const selectedDate = value
    ? parse(value, 'yyyy-MM-dd', new Date())
    : null;

  // Calculate dropdown position
  const calculateDropdownPosition = useCallback(() => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const popoverHeight = 320; // Approximate calendar height

      // Position above if not enough space below
      const shouldPositionAbove = rect.bottom + popoverHeight > viewportHeight;

      setDropdownPosition({
        top: shouldPositionAbove
          ? rect.top + window.scrollY - popoverHeight - 4
          : rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
      });
    }
  }, []);

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
  }, [isOpen, calculateDropdownPosition]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        isOpen &&
        popoverRef.current &&
        !popoverRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
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

  const handleToggleOpen = () => {
    if (disabled) return;
    if (!isOpen) {
      calculateDropdownPosition();
    }
    setIsOpen(!isOpen);
  };

  const handleDateSelect = (date: Date) => {
    const formattedDate = format(date, 'yyyy-MM-dd');
    onSave(formattedDate);
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSave(null);
    setIsOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleToggleOpen();
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  // Format display value
  const displayValue = value
    ? format(parse(value, 'yyyy-MM-dd', new Date()), 'MMM d, yyyy')
    : placeholder;

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={handleToggleOpen}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        className={`flex items-center gap-1.5 px-2 py-1 text-xs rounded-md transition-colors min-w-[90px]
          ${disabled
            ? 'text-gray-400 cursor-not-allowed'
            : 'text-foreground hover:bg-accent cursor-pointer'
          }
          ${value ? 'text-blue-600 dark:text-blue-400' : 'text-muted-foreground'}
          ${isOpen ? 'bg-accent ring-1 ring-blue-500' : ''}
        `}
        title={disabled ? 'Not editable' : value ? 'Click to change billing date' : 'Click to set billing date'}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
      >
        <CalendarIcon className="w-3 h-3" />
        <span>{displayValue}</span>
        {value && !disabled && (
          <button
            onClick={handleClear}
            className="ml-1 p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
            title="Clear billing date (use original date)"
            aria-label="Clear billing date"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </button>

      {isOpen &&
        createPortal(
          <div
            ref={popoverRef}
            className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl"
            style={{
              position: 'absolute',
              top: dropdownPosition.top,
              left: dropdownPosition.left,
              zIndex: 999999,
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            }}
          >
            <div className="p-2 border-b border-gray-200 dark:border-gray-700">
              <div className="text-xs font-medium text-gray-700 dark:text-gray-300">
                Select Billing Date
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Override the original date for billing purposes
              </div>
            </div>
            <Calendar
              selected={selectedDate}
              onSelect={handleDateSelect}
              className="border-0"
            />
            {value && (
              <div className="p-2 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={handleClear}
                  className="w-full px-3 py-1.5 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
                >
                  Clear (use original date)
                </button>
              </div>
            )}
          </div>,
          document.body
        )}
    </div>
  );
}
