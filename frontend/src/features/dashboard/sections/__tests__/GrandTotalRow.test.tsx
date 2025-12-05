import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { GrandTotalRow } from '../GrandTotalRow'

describe('GrandTotalRow', () => {
  const defaultProps = {
    totalTicketsRevenue: 1500.00,
    totalProjectsRevenue: 800.00,
    totalHostingRevenue: 396.00,
    totalRevenue: 2696.00
  }

  it('renders grand totals label', () => {
    render(
      <table>
        <tbody>
          <GrandTotalRow {...defaultProps} />
        </tbody>
      </table>
    )

    expect(screen.getByText('GRAND TOTALS')).toBeInTheDocument()
  })

  it('displays all revenue amounts correctly', () => {
    render(
      <table>
        <tbody>
          <GrandTotalRow {...defaultProps} />
        </tbody>
      </table>
    )

    // Tickets total
    expect(screen.getByText('1,500.00')).toBeInTheDocument()
    // Projects total
    expect(screen.getByText('800.00')).toBeInTheDocument()
    // Hosting total
    expect(screen.getByText('396.00')).toBeInTheDocument()
    // Grand total
    expect(screen.getByText('2,696.00')).toBeInTheDocument()
  })

  it('displays zero values correctly', () => {
    const propsWithZeros = {
      totalTicketsRevenue: 0,
      totalProjectsRevenue: 0,
      totalHostingRevenue: 0,
      totalRevenue: 0
    }

    render(
      <table>
        <tbody>
          <GrandTotalRow {...propsWithZeros} />
        </tbody>
      </table>
    )

    // Should show 0.00 for all values
    const zeroValues = screen.getAllByText('0.00')
    expect(zeroValues).toHaveLength(4)
  })

  it('handles negative values (credits/refunds)', () => {
    const propsWithNegative = {
      totalTicketsRevenue: -100.00,
      totalProjectsRevenue: 500.00,
      totalHostingRevenue: 200.00,
      totalRevenue: 600.00
    }

    render(
      <table>
        <tbody>
          <GrandTotalRow {...propsWithNegative} />
        </tbody>
      </table>
    )

    // Should show negative value with minus sign (formatCurrencyAccounting displays as "-100.00")
    expect(screen.getByText('-100.00')).toBeInTheDocument()
  })

  it('applies correct styling classes', () => {
    const { container } = render(
      <table>
        <tbody>
          <GrandTotalRow {...defaultProps} />
        </tbody>
      </table>
    )

    const row = container.querySelector('tr')
    expect(row).toHaveClass('bg-black', 'text-white', 'border-t-2', 'font-bold')
  })

  it('has proper column span for label', () => {
    render(
      <table>
        <tbody>
          <GrandTotalRow {...defaultProps} />
        </tbody>
      </table>
    )

    const labelCell = screen.getByText('GRAND TOTALS').closest('td')
    expect(labelCell).toHaveAttribute('colSpan', '3')
  })

  it('formats large numbers with comma separators', () => {
    const propsWithLargeNumbers = {
      totalTicketsRevenue: 12500.00,
      totalProjectsRevenue: 8999.99,
      totalHostingRevenue: 1234.56,
      totalRevenue: 22734.55
    }

    render(
      <table>
        <tbody>
          <GrandTotalRow {...propsWithLargeNumbers} />
        </tbody>
      </table>
    )

    expect(screen.getByText('12,500.00')).toBeInTheDocument()
    expect(screen.getByText('8,999.99')).toBeInTheDocument()
    expect(screen.getByText('1,234.56')).toBeInTheDocument()
    expect(screen.getByText('22,734.55')).toBeInTheDocument()
  })

  it('displays currency symbols separately from amounts', () => {
    const { container } = render(
      <table>
        <tbody>
          <GrandTotalRow {...defaultProps} />
        </tbody>
      </table>
    )

    // Each revenue cell should have two spans: symbol and amount
    const cells = container.querySelectorAll('td')
    const revenueCells = Array.from(cells).slice(1) // Skip label cell

    revenueCells.forEach(cell => {
      const spans = cell.querySelectorAll('span')
      expect(spans.length).toBe(2) // Symbol span + amount span
    })
  })

  it('applies tabular-nums class to amount spans', () => {
    const { container } = render(
      <table>
        <tbody>
          <GrandTotalRow {...defaultProps} />
        </tbody>
      </table>
    )

    const amountSpans = container.querySelectorAll('span.tabular-nums')
    expect(amountSpans.length).toBe(4) // One for each revenue column
  })
})
