import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { clsx } from "clsx";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  isToday,
  isBefore,
  isAfter,
} from "date-fns";

interface CalendarProps {
  selected?: Date | null;
  onSelect?: (date: Date) => void;
  onMonthSelect?: (month: Date) => void;
  isMonthSelected?: boolean;
  className?: string;
  minDate?: Date;
  maxDate?: Date;
  highlightedDates?: Date[];
  disabledDates?: Date[];
  showOutsideDays?: boolean;
}

export function Calendar({
  selected,
  onSelect,
  onMonthSelect,
  isMonthSelected = false,
  className,
  minDate,
  maxDate,
  highlightedDates = [],
  disabledDates = [],
  showOutsideDays = true,
}: CalendarProps) {
  const [currentMonth, setCurrentMonth] = React.useState(
    selected || new Date()
  );

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);

  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const handlePreviousMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  const handleDateClick = (date: Date) => {
    if (isDateDisabled(date)) return;
    onSelect?.(date);
  };

  const handleMonthClick = () => {
    onMonthSelect?.(currentMonth);
  };

  const isDateDisabled = (date: Date) => {
    if (minDate && isBefore(date, minDate)) return true;
    if (maxDate && isAfter(date, maxDate)) return true;
    if (disabledDates.some((d) => isSameDay(d, date))) return true;
    return false;
  };

  const isDateHighlighted = (date: Date) => {
    return highlightedDates.some((d) => isSameDay(d, date));
  };

  return (
    <div className={clsx("p-3", className)}>
      {/* Month Navigation */}
      <div className="flex items-center justify-between mb-4">
        <button
          type="button"
          onClick={handlePreviousMonth}
          className="p-1.5 hover:bg-gray-100 rounded-md transition-colors"
          aria-label="Previous month"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={handleMonthClick}
          className={clsx(
            "px-3 py-1 text-sm font-semibold rounded-md transition-all",
            "hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100",
            isMonthSelected && "bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          )}
          title="Click to select entire month"
        >
          {format(currentMonth, "MMMM yyyy")}
        </button>
        <button
          type="button"
          onClick={handleNextMonth}
          className="p-1.5 hover:bg-gray-100 rounded-md transition-colors"
          aria-label="Next month"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Weekday Headers */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => (
          <div
            key={day}
            className="text-xs font-medium text-gray-500 text-center py-1"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Days */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((day, dayIdx) => {
          const isInMonth = isSameMonth(day, monthStart);
          const isSelected = selected && isSameDay(day, selected);
          const isDisabled = isDateDisabled(day);
          const isHighlighted = isDateHighlighted(day);
          const isTodayDate = isToday(day);
          const isPartOfSelectedMonth = isMonthSelected && isInMonth;

          if (!isInMonth && !showOutsideDays) {
            return <div key={dayIdx} className="h-8 w-8" />;
          }

          return (
            <button
              key={dayIdx}
              type="button"
              onClick={() => handleDateClick(day)}
              disabled={isDisabled}
              className={clsx(
                "h-8 w-8 text-sm rounded-md transition-all",
                "hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1",
                {
                  "bg-blue-600 text-white hover:bg-blue-700": isSelected,
                  "bg-blue-100 text-blue-900 hover:bg-blue-200": isPartOfSelectedMonth && !isSelected,
                  "bg-blue-50 text-blue-700": isHighlighted && !isSelected && !isPartOfSelectedMonth,
                  "text-gray-400": !isInMonth,
                  "text-gray-900": isInMonth && !isSelected && !isDisabled && !isPartOfSelectedMonth,
                  "opacity-50 cursor-not-allowed": isDisabled,
                  "font-semibold": isTodayDate,
                  "ring-1 ring-gray-300": isTodayDate && !isSelected && !isPartOfSelectedMonth,
                }
              )}
              aria-label={format(day, "PPPP")}
              aria-selected={isSelected}
              aria-disabled={isDisabled}
            >
              {format(day, "d")}
            </button>
          );
        })}
      </div>
    </div>
  );
}