/**
 * Tests for SupportChartsSection component
 */
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SupportChartsSection } from '../SupportChartsSection'

// Mock the chart components
vi.mock('../../../../components/charts/RequestCalendarHeatmap', () => ({
  RequestCalendarHeatmap: () => <div data-testid="calendar-heatmap">Calendar Heatmap</div>
}))

vi.mock('../../../../components/charts/CategoryRadarChart', () => ({
  default: () => <div data-testid="radar-chart">Radar Chart</div>
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
    onCalendarDateClick: vi.fn(),
    onBackToCalendar: vi.fn(),
  }

  it('should render calendar and category chart sections', () => {
    render(<SupportChartsSection {...defaultProps} />)

    expect(screen.getByTestId('calendar-heatmap')).toBeInTheDocument()
    expect(screen.getByText('Request Categories')).toBeInTheDocument()
  })

  it('should render radar chart', () => {
    render(<SupportChartsSection {...defaultProps} />)

    expect(screen.getByTestId('radar-chart')).toBeInTheDocument()
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

  it('should have correct grid layout classes', () => {
    const { container } = render(<SupportChartsSection {...defaultProps} />)

    const gridContainer = container.querySelector('.grid.grid-cols-1.lg\\:grid-cols-\\[3fr_1fr\\]')
    expect(gridContainer).toBeInTheDocument()
  })

  it('should render category chart description', () => {
    render(<SupportChartsSection {...defaultProps} />)

    expect(screen.getByText('Multidimensional category analysis')).toBeInTheDocument()
  })

  it('should handle fallback for invalid date in day view', () => {
    render(
      <SupportChartsSection
        {...defaultProps}
        timeViewMode="day"
        selectedDay="invalid-date"
      />
    )

    // With an invalid date, the toLocaleDateString returns "Invalid Date"
    expect(screen.getByText('Requests by Hour - Invalid Date')).toBeInTheDocument()
  })

  it('should render both cards with proper structure', () => {
    const { container } = render(<SupportChartsSection {...defaultProps} />)

    // Should have Card components (look for CardHeader elements)
    const cardHeaders = container.querySelectorAll('[class*="flex flex-col space-y"]')
    expect(cardHeaders.length).toBeGreaterThan(0)
  })
})
