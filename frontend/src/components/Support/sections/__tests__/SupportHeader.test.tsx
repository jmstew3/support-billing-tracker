/**
 * Tests for SupportHeader component
 */
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SupportHeader } from '../SupportHeader'

describe('SupportHeader', () => {
  const defaultProps = {
    title: 'Support',
    selectedYear: 2025,
    selectedMonth: 6 as number | 'all',
    selectedDay: 'all' as string | 'all',
    availableYears: [2025, 2024],
    availableMonths: [5, 6, 7],
    availableDates: ['2025-06-23', '2025-06-24', '2025-06-25'],
    timeViewMode: 'month' as 'all' | 'month' | 'day',
    theme: 'light' as 'light' | 'dark',
    canNavigatePrevious: true,
    canNavigateNext: true,
    previousMonthTooltip: 'Go to May 2025',
    nextMonthTooltip: 'Go to July 2025',
    onYearChange: vi.fn(),
    onMonthChange: vi.fn(),
    onDayChange: vi.fn(),
    onTimeViewModeChange: vi.fn(),
    onToggleTheme: vi.fn(),
    onPreviousMonth: vi.fn(),
    onNextMonth: vi.fn()
  }

  it('should render with title', () => {
    render(<SupportHeader {...defaultProps} />)
    expect(screen.getByRole('heading', { name: 'Support' })).toBeInTheDocument()
  })

  it('should render with custom title', () => {
    render(<SupportHeader {...defaultProps} title="Custom Title" />)
    expect(screen.getByRole('heading', { name: 'Custom Title' })).toBeInTheDocument()
  })

  it('should render period label', () => {
    render(<SupportHeader {...defaultProps} />)
    expect(screen.getByText('Period:')).toBeInTheDocument()
  })

  it('should render view mode label', () => {
    render(<SupportHeader {...defaultProps} />)
    expect(screen.getByText('View:')).toBeInTheDocument()
  })

  it('should render navigation arrows', () => {
    render(<SupportHeader {...defaultProps} />)

    const prevButton = screen.getByLabelText('Navigate to previous month')
    const nextButton = screen.getByLabelText('Navigate to next month')

    expect(prevButton).toBeInTheDocument()
    expect(nextButton).toBeInTheDocument()
  })

  it('should call onPreviousMonth when previous arrow clicked', async () => {
    const user = userEvent.setup()
    const onPreviousMonth = vi.fn()

    render(<SupportHeader {...defaultProps} onPreviousMonth={onPreviousMonth} />)

    const prevButton = screen.getByLabelText('Navigate to previous month')
    await user.click(prevButton)

    expect(onPreviousMonth).toHaveBeenCalledTimes(1)
  })

  it('should call onNextMonth when next arrow clicked', async () => {
    const user = userEvent.setup()
    const onNextMonth = vi.fn()

    render(<SupportHeader {...defaultProps} onNextMonth={onNextMonth} />)

    const nextButton = screen.getByLabelText('Navigate to next month')
    await user.click(nextButton)

    expect(onNextMonth).toHaveBeenCalledTimes(1)
  })

  it('should disable previous arrow when canNavigatePrevious is false', () => {
    render(<SupportHeader {...defaultProps} canNavigatePrevious={false} />)

    const prevButton = screen.getByLabelText('Navigate to previous month')
    expect(prevButton).toBeDisabled()
  })

  it('should disable next arrow when canNavigateNext is false', () => {
    render(<SupportHeader {...defaultProps} canNavigateNext={false} />)

    const nextButton = screen.getByLabelText('Navigate to next month')
    expect(nextButton).toBeDisabled()
  })

  it('should show tooltip on previous arrow when enabled', () => {
    render(
      <SupportHeader
        {...defaultProps}
        canNavigatePrevious={true}
        previousMonthTooltip="Go to May 2025"
      />
    )

    const prevButton = screen.getByLabelText('Navigate to previous month')
    expect(prevButton).toHaveAttribute('title', 'Go to May 2025')
  })

  it('should show "No previous data" tooltip when previous disabled', () => {
    render(
      <SupportHeader {...defaultProps} canNavigatePrevious={false} />
    )

    const prevButton = screen.getByLabelText('Navigate to previous month')
    expect(prevButton).toHaveAttribute('title', 'No previous data')
  })

  it('should show tooltip on next arrow when enabled', () => {
    render(
      <SupportHeader
        {...defaultProps}
        canNavigateNext={true}
        nextMonthTooltip="Go to July 2025"
      />
    )

    const nextButton = screen.getByLabelText('Navigate to next month')
    expect(nextButton).toHaveAttribute('title', 'Go to July 2025')
  })

  it('should show "No future data" tooltip when next disabled', () => {
    render(
      <SupportHeader {...defaultProps} canNavigateNext={false} />
    )

    const nextButton = screen.getByLabelText('Navigate to next month')
    expect(nextButton).toHaveAttribute('title', 'No future data')
  })

  it('should render view mode toggle with three options', () => {
    render(<SupportHeader {...defaultProps} />)

    // ToggleGroup renders buttons for each option
    expect(screen.getByText('All')).toBeInTheDocument()
    expect(screen.getByText('Month')).toBeInTheDocument()
    expect(screen.getByText('Day')).toBeInTheDocument()
  })

  it('should have correct styling classes', () => {
    const { container } = render(<SupportHeader {...defaultProps} />)

    // Check for sticky header container
    const header = container.querySelector('.flex-shrink-0.bg-background.border-b.border-border')
    expect(header).toBeInTheDocument()

    // Check for title styling
    const title = screen.getByRole('heading')
    expect(title).toHaveClass('text-3xl', 'font-semibold', 'tracking-tight')
  })

  it('should maintain layout structure', () => {
    const { container } = render(<SupportHeader {...defaultProps} />)

    // Should have flex container for left/right layout
    const flexContainer = container.querySelector('.flex.items-start.justify-between')
    expect(flexContainer).toBeInTheDocument()

    // Should have controls container
    const controlsContainer = container.querySelector('.flex.items-center.space-x-6')
    expect(controlsContainer).toBeInTheDocument()
  })
})
