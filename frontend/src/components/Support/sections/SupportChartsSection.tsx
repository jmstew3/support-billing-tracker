/**
 * SupportChartsSection Component
 *
 * Displays calendar heatmap and category charts side-by-side
 *
 * Features:
 * - Calendar heatmap with date click interaction
 * - Category chart with pie/radar toggle
 * - Responsive grid layout (stacked on mobile, side-by-side on desktop)
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card'
import { RequestCalendarHeatmap } from '../../charts/RequestCalendarHeatmap'
import CategoryRadarChart from '../../charts/CategoryRadarChart'
import { CategoryPieChart } from '../../charts/CategoryPieChart'
import { ToggleGroup } from '../../ui/toggle-group'
import { parseLocalDate } from '../../../utils/supportHelpers'

export interface SupportChartsSectionProps {
  // Calendar data
  calendarData: any[]
  timeViewMode: 'all' | 'month' | 'day'
  selectedDay: string | 'all'
  selectedMonth: number | 'all'
  selectedYear: number
  monthNames: string[]

  // Category chart data
  categoryData: any
  chartType: 'pie' | 'radar'

  // Event handlers
  onCalendarDateClick: (date: string) => void
  onBackToCalendar: () => void
  onChartTypeChange: (type: 'pie' | 'radar') => void
}

export function SupportChartsSection({
  calendarData,
  timeViewMode,
  selectedDay,
  selectedMonth,
  selectedYear,
  monthNames,
  categoryData,
  chartType,
  onCalendarDateClick,
  onBackToCalendar,
  onChartTypeChange
}: SupportChartsSectionProps) {
  // Generate calendar title based on view mode
  const getCalendarTitle = () => {
    if (timeViewMode === 'day' && selectedDay !== 'all') {
      try {
        return `Requests by Hour - ${parseLocalDate(selectedDay).toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'long',
          day: 'numeric'
        })}`
      } catch (error) {
        return `Requests by Hour - ${selectedDay}`
      }
    }

    if (timeViewMode === 'month' && selectedMonth !== 'all') {
      return `Request Calendar - ${monthNames[selectedMonth - 1]} ${selectedYear}`
    }

    return 'Request Calendar Overview'
  }

  // Generate calendar description based on view mode
  const getCalendarDescription = () => {
    if (timeViewMode === 'day' && selectedDay !== 'all') {
      return 'Hourly view not available in calendar format'
    }
    return 'Daily request intensity shown as color-coded calendar grid'
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[3fr_1fr] gap-4 sm:gap-6">
      {/* Request Calendar - 3fr on desktop */}
      <Card>
        <CardHeader>
          <CardTitle>{getCalendarTitle()}</CardTitle>
          <CardDescription>{getCalendarDescription()}</CardDescription>
        </CardHeader>
        <CardContent>
          <RequestCalendarHeatmap
            data={calendarData}
            isHourlyView={timeViewMode === 'day' && selectedDay !== 'all'}
            onDateClick={onCalendarDateClick}
            selectedDate={selectedDay === 'all' ? undefined : selectedDay}
            onBackToCalendar={onBackToCalendar}
            isSingleMonth={selectedMonth !== 'all'}
          />
        </CardContent>
      </Card>

      {/* Request Categories Chart - 1fr on desktop */}
      <Card>
        <CardHeader>
          <CardTitle>Request Categories</CardTitle>
          <CardDescription>Distribution of request types</CardDescription>
          <div className="mt-2">
            <ToggleGroup
              options={[
                { value: 'pie', label: 'Pie' },
                { value: 'radar', label: 'Radar' }
              ]}
              value={chartType}
              onValueChange={(value) => onChartTypeChange(value as 'pie' | 'radar')}
              size="sm"
            />
          </div>
        </CardHeader>
        <CardContent>
          {chartType === 'radar' ? (
            <CategoryRadarChart data={categoryData} />
          ) : (
            <CategoryPieChart data={categoryData} />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
