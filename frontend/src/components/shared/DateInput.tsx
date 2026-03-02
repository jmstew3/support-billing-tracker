import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Calendar as CalendarIcon } from 'lucide-react';
import { Calendar } from '../ui/calendar';
import { format, parse } from 'date-fns';

interface DateInputProps {
  value: string;           // YYYY-MM-DD format
  onChange: (date: string) => void;
  className?: string;
  label?: string;
}

/**
 * DateInput - Form-field-style date picker with calendar popover.
 *
 * Displays the selected date as formatted text in a styled button.
 * Opens the Calendar component in a portal-based popover on click.
 * Pattern borrowed from EditableDateCell but styled as a form input.
 */
export function DateInput({ value, onChange, className, label }: DateInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const selectedDate = value
    ? parse(value, 'yyyy-MM-dd', new Date())
    : null;

  const calculateDropdownPosition = useCallback(() => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const popoverHeight = 320;

      const shouldPositionAbove = rect.bottom + popoverHeight > viewportHeight;

      setDropdownPosition({
        top: shouldPositionAbove
          ? rect.top + window.scrollY - popoverHeight - 4
          : rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
      });
    }
  }, []);

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
    if (!isOpen) {
      calculateDropdownPosition();
    }
    setIsOpen(!isOpen);
  };

  const handleDateSelect = (date: Date) => {
    onChange(format(date, 'yyyy-MM-dd'));
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

  const displayValue = value
    ? format(parse(value, 'yyyy-MM-dd', new Date()), 'MMM d, yyyy')
    : 'Select date...';

  return (
    <div className={className}>
      <button
        ref={buttonRef}
        type="button"
        onClick={handleToggleOpen}
        onKeyDown={handleKeyDown}
        className={`flex items-center gap-2 w-full px-3 py-2 bg-background border border-border rounded text-sm text-left transition-colors hover:bg-accent
          ${isOpen ? 'ring-1 ring-primary border-primary' : ''}
          ${!value ? 'text-muted-foreground' : ''}
        `}
        aria-label={label}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
      >
        <CalendarIcon className="h-4 w-4 text-muted-foreground shrink-0" />
        <span>{displayValue}</span>
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
            <Calendar
              selected={selectedDate}
              onSelect={handleDateSelect}
              className="border-0"
            />
          </div>,
          document.body
        )}
    </div>
  );
}
