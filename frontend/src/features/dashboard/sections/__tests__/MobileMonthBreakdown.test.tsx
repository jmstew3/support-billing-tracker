import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MobileMonthBreakdown } from '../MobileMonthBreakdown'
import { mockMonthData } from '../../../../test/fixtures/billing'

describe('MobileMonthBreakdown', () => {
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
    }
  }

  it('renders mobile month cards', () => {
    render(<MobileMonthBreakdown {...defaultProps} />)

    // Should show month label from mockMonthData (June 2025)
    expect(screen.getByText('June 2025')).toBeInTheDocument()
  })

  it('renders grand totals card when multiple months', () => {
    const multiMonthProps = {
      ...defaultProps,
      filteredData: [mockMonthData, { ...mockMonthData, month: '2025-07' }]
    }

    render(<MobileMonthBreakdown {...multiMonthProps} />)

    expect(screen.getByText('GRAND TOTALS')).toBeInTheDocument()
  })

  it('hides grand totals card when single month', () => {
    render(<MobileMonthBreakdown {...defaultProps} />)

    expect(screen.queryByText('GRAND TOTALS')).not.toBeInTheDocument()
  })

  it('applies mobile-only class', () => {
    const { container } = render(<MobileMonthBreakdown {...defaultProps} />)

    const wrapper = container.querySelector('.md\\:hidden')
    expect(wrapper).toBeInTheDocument()
  })

  it('displays all revenue categories in grand totals', () => {
    const multiMonthProps = {
      ...defaultProps,
      filteredData: [mockMonthData, { ...mockMonthData, month: '2025-07' }]
    }

    render(<MobileMonthBreakdown {...multiMonthProps} />)

    // Check for category labels in grand totals card
    const totalsSection = screen.getByText('GRAND TOTALS').parentElement as HTMLElement
    expect(totalsSection.textContent).toContain('Tickets')
    expect(totalsSection.textContent).toContain('Projects')
    expect(totalsSection.textContent).toContain('Hosting')
    expect(totalsSection.textContent).toContain('Total Revenue')
  })

  it('displays grand total amounts correctly', () => {
    const multiMonthProps = {
      ...defaultProps,
      filteredData: [mockMonthData, { ...mockMonthData, month: '2025-07' }]
    }

    render(<MobileMonthBreakdown {...multiMonthProps} />)

    // Should show totals in grand totals card
    const totalsCard = screen.getByText('GRAND TOTALS').closest('div')
    expect(totalsCard?.textContent).toContain('$1,025.00') // Tickets
    expect(totalsCard?.textContent).toContain('$800.00') // Projects
    expect(totalsCard?.textContent).toContain('$99.00') // Hosting
    expect(totalsCard?.textContent).toContain('$1,924.00') // Total
  })

  it('renders a card for each month', () => {
    const threeMonthsProps = {
      ...defaultProps,
      filteredData: [
        mockMonthData,
        { ...mockMonthData, month: '2025-07' },
        { ...mockMonthData, month: '2025-08' }
      ]
    }

    const { container } = render(<MobileMonthBreakdown {...threeMonthsProps} />)

    // Should have 3 month cards (MobileMonthCard components)
    // Plus potentially 1 grand totals card
    const cards = container.querySelectorAll('.border.bg-card')
    expect(cards.length).toBeGreaterThanOrEqual(3)
  })

  it('applies correct styling to grand totals card', () => {
    const multiMonthProps = {
      ...defaultProps,
      filteredData: [mockMonthData, { ...mockMonthData, month: '2025-07' }]
    }

    render(<MobileMonthBreakdown {...multiMonthProps} />)

    const grandTotalsCard = screen.getByText('GRAND TOTALS').closest('div')
    expect(grandTotalsCard).toHaveClass('border-2', 'border-black', 'bg-black', 'text-white')
  })
})
