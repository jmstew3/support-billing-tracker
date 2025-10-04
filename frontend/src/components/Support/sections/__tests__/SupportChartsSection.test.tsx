/**
 * Tests for SupportChartsSection component
 */
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SupportChartsSection } from '../SupportChartsSection'

// Mock the chart components
vi.mock('../../../charts/RequestCalendarHeatmap', () => ({
  RequestCalendarHeatmap: () => <div data-testid="calendar-heatmap">Calendar Heatmap</div>
}))

vi.mock('../../../charts/CategoryRadarChart', () => ({
  default: () => <div data-testid="radar-chart">Radar Chart</div>
}))

vi.mock('../../../charts/CategoryPieChart', () => ({
  CategoryPieChart: () => <div data-testid="pie-chart">Pie Chart</div>
}))

describe('SupportChartsSection', () => {
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  const defaultProps = {
    calendarData: [],
    timeViewMode: 'month' as 'all' | 'month' | 'day',
    selectedDay: 'all' as string | 'all',
    selectedMonth: 6 as number | 'all',
    selectedYear: 2025,
    monthNames,
    categoryData: {},
    chartType: 'radar' as 'pie' | 'radar',
    onCalendarDateClick: vi.fn(),
    onBackToCalendar: vi.fn(),
    onChartTypeChange: vi.fn()
  }

  it('should render calendar and category chart sections', () => {
    render(<SupportChartsSection {...defaultProps} />)

    expect(screen.getByTestId('calendar-heatmap')).toBeInTheDocument()
    expect(screen.getByText('Request Categories')).toBeInTheDocument()
  })

  it('should render radar chart by default when chartType is radar', () => {
    render(<SupportChartsSection {...defaultProps} chartType="radar" />)

    expect(screen.getByTestId('radar-chart')).toBeInTheDocument()
    expect(screen.queryByTestId('pie-chart')).not.toBeInTheDocument()
  })

  it('should render pie chart when chartType is pie', () => {
    render(<SupportChartsSection {...defaultProps} chartType="pie" />)

    expect(screen.getByTestId('pie-chart')).toBeInTheDocument()
    expect(screen.queryByTestId('radar-chart')).not.toBeInTheDocument()
  })

  it('should display month-specific calendar title', () => {
    render(<SupportChartsSection {...defaultProps} />)

    expect(screen.getByText('Request Calendar - June 2025')).toBeInTheDocument()
  })

  it('should display overview title when viewing all months', () => {
    render(<SupportChartsSection {...defaultProps} selectedMonth="all" timeViewMode="all" />)

    expect(screen.getByText('Request Calendar Overview')).toBeInTheDocument()
  })

  it('should display day-specific title when in day view', () => {
    render(
      <SupportChartsSection
        {...defaultProps}
        timeViewMode="day"
        selectedDay="2025-06-23"
      />
    )

    expect(screen.getByText(/Requests by Hour/)).toBeInTheDocument()
  })

  it('should display calendar description for month view', () => {
    render(<SupportChartsSection {...defaultProps} />)

    expect(
      screen.getByText('Daily request intensity shown as color-coded calendar grid')
    ).toBeInTheDocument()
  })

  it('should display different description for day view', () => {
    render(
      <SupportChartsSection
        {...defaultProps}
        timeViewMode="day"
        selectedDay="2025-06-23"
      />
    )

    expect(
      screen.getByText('Hourly view not available in calendar format')
    ).toBeInTheDocument()
  })

  it('should render chart type toggle with pie and radar options', () => {
    render(<SupportChartsSection {...defaultProps} />)

    expect(screen.getByText('Pie')).toBeInTheDocument()
    expect(screen.getByText('Radar')).toBeInTheDocument()
  })

  it('should have correct grid layout classes', () => {
    const { container } = render(<SupportChartsSection {...defaultProps} />)

    const gridContainer = container.querySelector('.grid.grid-cols-1.lg\\:grid-cols-\\[3fr_1fr\\]')
    expect(gridContainer).toBeInTheDocument()
  })

  it('should render category chart description', () => {
    render(<SupportChartsSection {...defaultProps} />)

    expect(screen.getByText('Distribution of request types')).toBeInTheDocument()
  })

  it('should handle fallback for invalid date in day view', () => {
    render(
      <SupportChartsSection
        {...defaultProps}
        timeViewMode="day"
        selectedDay="invalid-date"
      />
    )

    expect(screen.getByText('Requests by Hour - Invalid Date')).toBeInTheDocument()
  })

  it('should render both cards with proper structure', () => {
    const { container } = render(<SupportChartsSection {...defaultProps} />)

    // Should have two Card components
    const cards = container.querySelectorAll('[class*="rounded"]')
    expect(cards.length).toBeGreaterThan(0)
  })
})
