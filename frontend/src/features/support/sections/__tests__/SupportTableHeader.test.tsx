/**
 * Tests for SupportTableHeader component
 */
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SupportTableHeader } from '../SupportTableHeader'
import type { ChatRequest } from '../../../../types/request'

describe('SupportTableHeader', () => {
  const mockRequests: ChatRequest[] = [
    {
      Date: '2025-06-23',
      Time: '09:30 AM',
      Month: '2025-06',
      Request_Type: 'General Request',
      Category: 'Support',
      Request_Summary: 'Test 1',
      Urgency: 'MEDIUM',
      EstimatedHours: 0.5,
      Status: 'active',
      source: 'sms',
      id: 1
    },
    {
      Date: '2025-06-24',
      Time: '10:00 AM',
      Month: '2025-06',
      Request_Type: 'General Request',
      Category: 'Hosting',
      Request_Summary: 'Test 2',
      Urgency: 'HIGH',
      EstimatedHours: 1.0,
      Status: 'active',
      source: 'ticket',
      id: 2
    }
  ]

  const defaultProps = {
    selectAll: false,
    onSelectAll: vi.fn(),
    sortColumn: null,
    sortDirection: 'asc' as 'asc' | 'desc',
    onSort: vi.fn(),
    showFilters: {
      source: false,
      date: false,
      day: false,
      category: false,
      urgency: false
    },
    sourceFilter: [],
    dateFilter: 'all',
    dayFilter: [],
    categoryFilter: [],
    urgencyFilter: [],
    availableDates: ['2025-06-23', '2025-06-24'],
    availableDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    categoryOptions: ['Support', 'Hosting', 'Forms', 'Billing'],
    urgencyOptions: ['HIGH', 'MEDIUM', 'LOW', 'PROMOTION'],
    onToggleColumnFilter: vi.fn(),
    onSourceFilterChange: vi.fn(),
    onDateFilterChange: vi.fn(),
    onDayFilterChange: vi.fn(),
    onCategoryFilterChange: vi.fn(),
    onUrgencyFilterChange: vi.fn(),
    requests: mockRequests,
    selectedYear: 2025,
    selectedMonth: 6 as number | 'all',
    selectedDay: 'all' as string | 'all',
    formatUrgencyDisplay: (urgency: string) => urgency.charAt(0).toUpperCase() + urgency.slice(1).toLowerCase(),
    preserveScrollPosition: vi.fn()
  }

  it('should render all column headers', () => {
    render(
      <table>
        <SupportTableHeader {...defaultProps} />
      </table>
    )

    expect(screen.getByText('Source')).toBeInTheDocument()
    expect(screen.getByText('Date')).toBeInTheDocument()
    expect(screen.getByText('Day')).toBeInTheDocument()
    expect(screen.getByText('Time')).toBeInTheDocument()
    expect(screen.getByText('Request Summary')).toBeInTheDocument()
    expect(screen.getByText('Category')).toBeInTheDocument()
    expect(screen.getByText('Urgency')).toBeInTheDocument()
    expect(screen.getByText('Hours')).toBeInTheDocument()
    expect(screen.getByText('Actions')).toBeInTheDocument()
  })

  it('should render select all checkbox', () => {
    const { container } = render(
      <table>
        <SupportTableHeader {...defaultProps} />
      </table>
    )

    const checkbox = container.querySelector('input[type="checkbox"]')
    expect(checkbox).toBeInTheDocument()
    expect(checkbox).not.toBeChecked()
  })

  it('should call onSelectAll when checkbox is clicked', async () => {
    const user = userEvent.setup()
    const { container } = render(
      <table>
        <SupportTableHeader {...defaultProps} />
      </table>
    )

    const checkbox = container.querySelector('input[type="checkbox"]')!
    await user.click(checkbox)

    expect(defaultProps.onSelectAll).toHaveBeenCalled()
  })

  it('should call onSort when sortable column is clicked', async () => {
    const user = userEvent.setup()
    render(
      <table>
        <SupportTableHeader {...defaultProps} />
      </table>
    )

    const dateButton = screen.getByText('Date').closest('button')!
    await user.click(dateButton)

    expect(defaultProps.onSort).toHaveBeenCalledWith('Date')
  })

  it('should display sort icon for sorted column', () => {
    const { container } = render(
      <table>
        <SupportTableHeader {...defaultProps} sortColumn="Date" sortDirection="asc" />
      </table>
    )

    // ArrowUp icon should be present for ascending sort
    const icons = container.querySelectorAll('svg')
    expect(icons.length).toBeGreaterThan(0)
  })

  it('should toggle filter dropdown when filter button is clicked', async () => {
    const user = userEvent.setup()
    render(
      <table>
        <SupportTableHeader {...defaultProps} />
      </table>
    )

    const filterButtons = screen.getAllByTitle(/Toggle .* filter/)
    await user.click(filterButtons[0])

    expect(defaultProps.onToggleColumnFilter).toHaveBeenCalled()
  })

  it('should display source filter options when source filter is open', () => {
    render(
      <table>
        <SupportTableHeader {...defaultProps} showFilters={{ ...defaultProps.showFilters, source: true }} />
      </table>
    )

    expect(screen.getByText('Text')).toBeInTheDocument()
    expect(screen.getByText('Twenty CRM')).toBeInTheDocument()
    expect(screen.getByText('FluentSupport')).toBeInTheDocument()
    expect(screen.getByText('Email')).toBeInTheDocument()
    expect(screen.getByText('Phone')).toBeInTheDocument()
  })

  it('should display date filter dropdown when date filter is open', () => {
    render(
      <table>
        <SupportTableHeader {...defaultProps} showFilters={{ ...defaultProps.showFilters, date: true }} />
      </table>
    )

    const select = screen.getByDisplayValue('All Dates')
    expect(select).toBeInTheDocument()
  })

  it('should display category filter with counts when category filter is open', () => {
    render(
      <table>
        <SupportTableHeader {...defaultProps} showFilters={{ ...defaultProps.showFilters, category: true }} />
      </table>
    )

    expect(screen.getByText('Support')).toBeInTheDocument()
    expect(screen.getByText('Hosting')).toBeInTheDocument()
    // Both Support and Hosting have count of 1
    const counts = screen.getAllByText('(1)')
    expect(counts).toHaveLength(2)
  })

  it('should display urgency filter options when urgency filter is open', () => {
    render(
      <table>
        <SupportTableHeader {...defaultProps} showFilters={{ ...defaultProps.showFilters, urgency: true }} />
      </table>
    )

    expect(screen.getByText('High')).toBeInTheDocument()
    expect(screen.getByText('Medium')).toBeInTheDocument()
    expect(screen.getByText('Low')).toBeInTheDocument()
    expect(screen.getByText('Promotion')).toBeInTheDocument()
  })

  it('should call onSourceFilterChange when source checkbox is toggled', async () => {
    const user = userEvent.setup()
    render(
      <table>
        <SupportTableHeader {...defaultProps} showFilters={{ ...defaultProps.showFilters, source: true }} />
      </table>
    )

    const smsCheckbox = screen.getByText('Text').closest('label')!.querySelector('input')!
    await user.click(smsCheckbox)

    expect(defaultProps.onSourceFilterChange).toHaveBeenCalledWith(['sms'])
  })

  it('should call onDateFilterChange when date select is changed', async () => {
    const user = userEvent.setup()
    render(
      <table>
        <SupportTableHeader {...defaultProps} showFilters={{ ...defaultProps.showFilters, date: true }} />
      </table>
    )

    const select = screen.getByDisplayValue('All Dates')
    await user.selectOptions(select, '2025-06-23')

    expect(defaultProps.onDateFilterChange).toHaveBeenCalledWith('2025-06-23')
  })

  it('should call preserveScrollPosition before filter changes', async () => {
    const user = userEvent.setup()
    render(
      <table>
        <SupportTableHeader {...defaultProps} showFilters={{ ...defaultProps.showFilters, date: true }} />
      </table>
    )

    const select = screen.getByDisplayValue('All Dates')
    await user.selectOptions(select, '2025-06-23')

    expect(defaultProps.preserveScrollPosition).toHaveBeenCalled()
  })

  it('should format urgency display values correctly', () => {
    render(
      <table>
        <SupportTableHeader {...defaultProps} showFilters={{ ...defaultProps.showFilters, urgency: true }} />
      </table>
    )

    // Should display formatted urgency (High, Medium, Low, Promotion) instead of uppercase
    expect(screen.getByText('High')).toBeInTheDocument()
    expect(screen.getByText('Medium')).toBeInTheDocument()
    expect(screen.getByText('Low')).toBeInTheDocument()
  })

  it('should render info icon with tooltip for Request Summary', () => {
    const { container } = render(
      <table>
        <SupportTableHeader {...defaultProps} />
      </table>
    )

    const infoIcon = container.querySelector('[title="Full request text is always visible with line wrapping"]')
    expect(infoIcon).toBeInTheDocument()
  })
})
