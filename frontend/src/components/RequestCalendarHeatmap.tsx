import { useState, useMemo } from 'react';
import type { DailyRequestCount } from '../types/request';
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isToday } from 'date-fns';
import { ArrowLeft, Clock } from 'lucide-react';

interface RequestCalendarHeatmapProps {
  data: DailyRequestCount[];
  isHourlyView?: boolean;
  onDateClick?: (date: string) => void;
  selectedDate?: string;
  onBackToCalendar?: () => void;
  isSingleMonth?: boolean;
}

export function RequestCalendarHeatmap({ data, isHourlyView, onDateClick, selectedDate, onBackToCalendar, isSingleMonth }: RequestCalendarHeatmapProps) {
  const [hoveredDay, setHoveredDay] = useState<string | null>(null);

  // Group data by month
  const monthlyData = useMemo(() => {
    if (isHourlyView || data.length === 0) return [];

    // Create a map of date to request data
    const dateMap = new Map<string, DailyRequestCount>();
    data.forEach(item => {
      dateMap.set(item.date, item);
    });

    // Find the date range
    const dates = data.map(d => d.date).sort();
    const startDate = parseISO(dates[0]);
    const endDate = parseISO(dates[dates.length - 1]);

    // Group by month
    const months: Array<{
      month: string;
      year: number;
      monthName: string;
      weeks: Array<Array<{ date: string; data: DailyRequestCount | null }>>
    }> = [];

    let currentDate = startOfMonth(startDate);
    const finalMonth = startOfMonth(endDate);

    while (currentDate <= finalMonth) {
      const monthStart = startOfMonth(currentDate);
      const monthEnd = endOfMonth(currentDate);
      const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

      // Organize days into weeks
      const weeks: Array<Array<{ date: string; data: DailyRequestCount | null }>> = [];
      let currentWeek: Array<{ date: string; data: DailyRequestCount | null }> = [];

      // Add padding for the first week
      const firstDayOfWeek = getDay(monthStart);
      for (let i = 0; i < firstDayOfWeek; i++) {
        currentWeek.push({ date: '', data: null });
      }

      days.forEach(day => {
        const dateStr = format(day, 'yyyy-MM-dd');
        currentWeek.push({
          date: dateStr,
          data: dateMap.get(dateStr) || null
        });

        if (currentWeek.length === 7) {
          weeks.push(currentWeek);
          currentWeek = [];
        }
      });

      // Push the last week if it has any days
      if (currentWeek.length > 0) {
        // Pad the last week to 7 days
        while (currentWeek.length < 7) {
          currentWeek.push({ date: '', data: null });
        }
        weeks.push(currentWeek);
      }

      months.push({
        month: format(currentDate, 'yyyy-MM'),
        year: currentDate.getFullYear(),
        monthName: format(currentDate, 'MMMM yyyy'),
        weeks
      });

      // Move to next month
      currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
    }

    return months;
  }, [data, isHourlyView]);

  // Calculate max count for color scaling
  const maxCount = useMemo(() => {
    return Math.max(...data.map(d => d.count), 1);
  }, [data]);

  // Get color intensity based on count
  const getColorIntensity = (count: number) => {
    if (count === 0) return 'bg-gray-100 hover:bg-gray-200';
    const intensity = Math.min(count / maxCount, 1);

    if (intensity <= 0.25) return 'bg-blue-200 hover:bg-blue-300';
    if (intensity <= 0.5) return 'bg-blue-400 hover:bg-blue-500';
    if (intensity <= 0.75) return 'bg-blue-600 hover:bg-blue-700';
    return 'bg-blue-800 hover:bg-blue-900';
  };

  // Get text color for better contrast
  const getTextColor = (count: number) => {
    if (count === 0) return 'text-gray-600';
    const intensity = Math.min(count / maxCount, 1);
    return intensity > 0.5 ? 'text-white' : 'text-gray-700';
  };

  if (isHourlyView) {
    // Calculate max count for hourly data
    const maxHourlyCount = Math.max(...data.map(d => d.count), 1);

    // Function to get bar color based on urgency
    const getBarColor = (item: DailyRequestCount) => {
      if (item.count === 0) return 'bg-gray-300'; // Gray for no data
      if (item.high > 0) return 'bg-red-500';
      if (item.medium > 0) return 'bg-yellow-500';
      if (item.low > 0) return 'bg-green-500';
      return 'bg-blue-500'; // Default color
    };

    return (
      <div className="space-y-4">
        {/* Back button and title */}
        <div className="flex items-center justify-between">
          <button
            onClick={onBackToCalendar}
            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Calendar
          </button>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Clock className="w-4 h-4" />
            <span>Hourly breakdown for {selectedDate && format(parseISO(selectedDate), 'EEEE, MMMM d, yyyy')}</span>
          </div>
        </div>

        {/* Hourly bar chart */}
        <div className="bg-white rounded-lg p-6">
          <div className="flex">
            {/* Y-axis labels */}
            <div className="w-12 pr-2 flex flex-col justify-between items-end text-xs text-gray-500 h-64">
              <span>{maxHourlyCount}</span>
              <span>{Math.ceil(maxHourlyCount * 0.75)}</span>
              <span>{Math.ceil(maxHourlyCount * 0.5)}</span>
              <span>{Math.ceil(maxHourlyCount * 0.25)}</span>
              <span>0</span>
            </div>

            {/* Chart area */}
            <div className="flex-1">
              <div className="relative">
                {/* Grid lines */}
                <div className="absolute inset-0 h-64">
                  <div className="h-full flex flex-col justify-between">
                    {[0, 1, 2, 3, 4].map((i) => (
                      <div key={i} className="border-b border-gray-100 w-full" />
                    ))}
                  </div>
                </div>

                {/* Bars container - now spreads across full width */}
                <div className="relative h-64 flex items-end justify-between">
                  {data.map((item, index) => {
                    const heightPixels = item.count === 0
                      ? 2
                      : Math.max((item.count / maxHourlyCount) * 256, 8); // 256px = h-64
                    const hour = parseInt(item.date.split(':')[0]);

                    return (
                      <div
                        key={index}
                        className="relative group flex-1"
                        style={{ maxWidth: '40px' }}
                      >
                        {/* Bar */}
                        <div
                          className={`${getBarColor(item)} rounded-t transition-all duration-200 hover:opacity-80`}
                          style={{
                            height: `${heightPixels}px`,
                            width: '100%'
                          }}
                        >
                          {/* Count label on top of bar */}
                          {item.count > 0 && (
                            <div className="absolute -top-5 left-1/2 transform -translate-x-1/2 text-xs font-semibold text-gray-700">
                              {item.count}
                            </div>
                          )}
                        </div>

                        {/* Hour label below */}
                        <div className="absolute top-full mt-1 w-full text-center">
                          <span className="text-xs text-gray-600">
                            {hour === 0 ? '12AM' : hour < 12 ? `${hour}AM` : hour === 12 ? '12PM' : `${hour - 12}PM`}
                          </span>
                        </div>

                        {/* Tooltip on hover */}
                        <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20">
                          <div className="bg-gray-900 text-white text-xs rounded px-3 py-2 whitespace-nowrap">
                            <div className="font-semibold">
                              {hour === 0 ? '12:00 AM' : hour < 12 ? `${hour}:00 AM` : hour === 12 ? '12:00 PM' : `${hour - 12}:00 PM`}
                              {' - '}
                              {hour === 23 ? '12:00 AM' : hour < 11 ? `${hour + 1}:00 AM` : hour === 11 ? '12:00 PM' : `${hour - 11}:00 PM`}
                            </div>
                            <div>Total: {item.count} {item.count === 1 ? 'request' : 'requests'}</div>
                            {item.high > 0 && <div className="text-red-300">High: {item.high}</div>}
                            {item.medium > 0 && <div className="text-yellow-300">Medium: {item.medium}</div>}
                            {item.low > 0 && <div className="text-green-300">Low: {item.low}</div>}
                            <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
                              <div className="border-4 border-transparent border-t-gray-900" />
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>


          {/* Legend */}
          <div className="flex items-center justify-center gap-6 mt-4 pt-4 border-t">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded" />
              <span className="text-xs text-gray-600">High Priority</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-yellow-500 rounded" />
              <span className="text-xs text-gray-600">Medium Priority</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded" />
              <span className="text-xs text-gray-600">Low Priority</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const weekDays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  // Determine box size based on whether single month is selected
  // Make single month view responsive
  const boxSize = isSingleMonth ? 'w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 lg:w-20 lg:h-20' : 'w-6 h-6 sm:w-8 sm:h-8';
  const textSize = isSingleMonth ? 'text-xs sm:text-sm md:text-base' : 'text-[10px] sm:text-xs';
  const headerHeight = isSingleMonth ? 'h-6 sm:h-7 md:h-8' : 'h-4 sm:h-5';

  // Filter to show only the selected month when isSingleMonth is true
  const displayData = isSingleMonth && monthlyData.length > 0
    ? monthlyData.filter(month => {
        // Show the month that contains the most data points from the current filtered data
        const monthDates = month.weeks.flatMap(week =>
          week.filter(day => day.date).map(day => day.date)
        );
        return data.some(d => monthDates.includes(d.date));
      }).slice(0, 1) // Ensure only one month is shown
    : monthlyData;

  return (
    <div className="space-y-6">
      {/* Container - no horizontal scroll when single month */}
      <div className={isSingleMonth ? '' : 'overflow-x-auto pb-4'}>
        <div className={isSingleMonth ? 'flex justify-center w-full' : 'flex gap-4 min-w-fit justify-center'}>
          {displayData.map((monthData) => (
            <div key={monthData.month} className="flex-shrink-0">
              <h3 className="text-sm font-medium text-muted-foreground mb-2 text-center">{monthData.monthName}</h3>
              <div className="inline-block">
                {/* Weekday headers */}
                <div className={`grid grid-cols-7 ${isSingleMonth ? 'gap-1.5 sm:gap-2 md:gap-3' : 'gap-1 sm:gap-1.5'} mb-2`}>
                  {weekDays.map((day, index) => (
                    <div
                      key={index}
                      className={`${boxSize.split(' ')[0]} ${headerHeight} ${textSize} text-center text-gray-500 font-medium flex items-center justify-center`}
                    >
                      {day}
                    </div>
                  ))}
                </div>

                {/* Calendar grid */}
                <div className={isSingleMonth ? 'space-y-1.5 sm:space-y-2 md:space-y-3' : 'space-y-1 sm:space-y-1.5'}>
                  {monthData.weeks.map((week, weekIndex) => (
                    <div key={weekIndex} className={`grid grid-cols-7 ${isSingleMonth ? 'gap-1.5 sm:gap-2 md:gap-3' : 'gap-1 sm:gap-1.5'}`}>
                    {week.map((day, dayIndex) => {
                      if (!day.date) {
                        return <div key={dayIndex} className={boxSize} />;
                      }

                      const count = day.data?.count || 0;
                      const dayOfMonth = parseInt(day.date.split('-')[2]);
                      const isCurrentDay = isToday(parseISO(day.date));
                      const isSelected = selectedDate === day.date;

                      return (
                        <div
                          key={dayIndex}
                          className="relative group"
                          onMouseEnter={() => setHoveredDay(day.date)}
                          onMouseLeave={() => setHoveredDay(null)}
                          onClick={() => onDateClick && onDateClick(day.date)}
                        >
                          <div
                            className={`
                              ${boxSize} rounded flex items-center justify-center ${textSize} font-medium
                              transition-all cursor-pointer hover:scale-110
                              ${getColorIntensity(count)}
                              ${getTextColor(count)}
                              ${isCurrentDay ? 'ring-2 ring-orange-400' : ''}
                              ${isSelected ? 'ring-2 ring-blue-600 ring-offset-1' : ''}
                            `}
                          >
                            {isSingleMonth ? (
                              <div className="flex flex-col items-center">
                                <div className="font-bold">{dayOfMonth}</div>
                                {count > 0 && <div className="text-xs">{count}</div>}
                              </div>
                            ) : (
                              dayOfMonth
                            )}
                          </div>

                          {/* Tooltip */}
                          {hoveredDay === day.date && (
                            <div className={`absolute z-50 left-1/2 transform -translate-x-1/2 pointer-events-none ${
                              weekIndex === 0 ? 'top-full mt-2' : 'bottom-full mb-2'
                            }`}>
                              <div className="bg-gray-900 text-white text-xs rounded px-3 py-2 whitespace-nowrap">
                                <div className="font-semibold">
                                  {format(parseISO(day.date), 'EEE, MMM d, yyyy')}
                                </div>
                                <div className="text-xs text-gray-400 italic">Click to filter</div>
                                {day.data ? (
                                  <>
                                    <div>Total: {count} requests</div>
                                    {day.data.high > 0 && (
                                      <div className="text-red-300">High: {day.data.high}</div>
                                    )}
                                    {day.data.medium > 0 && (
                                      <div className="text-yellow-300">Medium: {day.data.medium}</div>
                                    )}
                                    {day.data.low > 0 && (
                                      <div className="text-green-300">Low: {day.data.low}</div>
                                    )}
                                  </>
                                ) : (
                                  <div className="text-gray-400">No requests</div>
                                )}
                                {/* Arrow - positioned based on tooltip direction */}
                                {weekIndex === 0 ? (
                                  // Arrow pointing up (tooltip below)
                                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 -mb-1">
                                    <div className="border-4 border-transparent border-b-gray-900" />
                                  </div>
                                ) : (
                                  // Arrow pointing down (tooltip above)
                                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
                                    <div className="border-4 border-transparent border-t-gray-900" />
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center space-x-6 pt-4 border-t">
        <span className="text-xs text-gray-500">Less</span>
        <div className="flex space-x-1">
          <div className="w-4 h-4 bg-gray-100 rounded" title="No requests" />
          <div className="w-4 h-4 bg-blue-200 rounded" title="Low activity" />
          <div className="w-4 h-4 bg-blue-400 rounded" title="Moderate activity" />
          <div className="w-4 h-4 bg-blue-600 rounded" title="High activity" />
          <div className="w-4 h-4 bg-blue-800 rounded" title="Very high activity" />
        </div>
        <span className="text-xs text-gray-500">More</span>
      </div>
    </div>
  );
}