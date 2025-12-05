import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MonthlyBreakdownTable } from '../MonthlyBreakdownTable'
import { mockMonthData } from '../../../../test/fixtures/billing'

describe('MonthlyBreakdownTable', () => {
  const defaultProps = {
    filteredData: [mockMonthData],
    expandedMonths: new Set<string>(),
    toggleMonth: vi.fn(),
    toggleSection: vi.fn(),
    isSectionExpanded: vi.fn(() => false),
    displayTotals: {
      totalRevenue: 1924.00,
      totalTicketsRevenue: 1025.00,
      totalProjectsRevenue: 800.00,
      totalHostingRevenue: 99.00
    },
    onExport: vi.fn()
  }

  it('renders table with header', () => {
    render(<MonthlyBreakdownTable {...defaultProps} />)

    expect(screen.getByText('Monthly Breakdown')).toBeInTheDocument()
  })

  it('renders export button', () => {
    render(<MonthlyBreakdownTable {...defaultProps} />)

    expect(screen.getByText('Export CSV')).toBeInTheDocument()
  })

  it('calls onExport when export button is clicked', () => {
    const onExport = vi.fn()
    render(<MonthlyBreakdownTable {...defaultProps} onExport={onExport} />)

    fireEvent.click(screen.getByText('Export CSV'))
    expect(onExport).toHaveBeenCalledTimes(1)
  })

  it('renders table column headers', () => {
    render(<MonthlyBreakdownTable {...defaultProps} />)

    expect(screen.getByText('Month')).toBeInTheDocument()
    expect(screen.getByText('Tickets')).toBeInTheDocument()
    expect(screen.getByText('Projects')).toBeInTheDocument()
    expect(screen.getByText('Hosting')).toBeInTheDocument()
    expect(screen.getByText('Total Revenue')).toBeInTheDocument()
  })

  it('renders month rows for each month in filteredData', () => {
    render(<MonthlyBreakdownTable {...defaultProps} />)

    // Should show the month label (June 2025 from mockMonthData)
    expect(screen.getByText('June 2025')).toBeInTheDocument()
  })

  it('shows grand total row when multiple months', () => {
    const multiMonthProps = {
      ...defaultProps,
      filteredData: [mockMonthData, { ...mockMonthData, month: '2025-07' }]
    }

    render(<MonthlyBreakdownTable {...multiMonthProps} />)

    expect(screen.getByText('GRAND TOTALS')).toBeInTheDocument()
  })

  it('hides grand total row when single month', () => {
    render(<MonthlyBreakdownTable {...defaultProps} />)

    expect(screen.queryByText('GRAND TOTALS')).not.toBeInTheDocument()
  })

  it('applies desktop-only class', () => {
    const { container } = render(<MonthlyBreakdownTable {...defaultProps} />)

    const wrapper = container.querySelector('.hidden.md\\:block')
    expect(wrapper).toBeInTheDocument()
  })

  it('has sticky table header', () => {
    const { container } = render(<MonthlyBreakdownTable {...defaultProps} />)

    const thead = container.querySelector('thead.sticky')
    expect(thead).toBeInTheDocument()
  })

  it('has overflow-auto for horizontal scrolling', () => {
    const { container } = render(<MonthlyBreakdownTable {...defaultProps} />)

    const scrollContainer = container.querySelector('.overflow-auto')
    expect(scrollContainer).toBeInTheDocument()
  })
})
