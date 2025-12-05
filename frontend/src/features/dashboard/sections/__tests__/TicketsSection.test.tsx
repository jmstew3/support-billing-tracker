import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { TicketsSection } from '../TicketsSection'
import { mockMonthData } from '../../../../test/fixtures/billing'

describe('TicketsSection', () => {
  const defaultProps = {
    monthData: mockMonthData,
    isExpanded: false,
    onToggle: vi.fn()
  }

  it('renders collapsed state with correct counts', () => {
    render(
      <table>
        <tbody>
          <TicketsSection {...defaultProps} />
        </tbody>
      </table>
    )

    expect(screen.getByText('Tickets')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument() // ticket count
    expect(screen.getByText('2.5h free')).toBeInTheDocument() // free hours badge
  })

  it('renders expanded state with ticket details', () => {
    render(
      <table>
        <tbody>
          <TicketsSection {...defaultProps} isExpanded={true} />
        </tbody>
      </table>
    )

    expect(screen.getByText('Gross Total')).toBeInTheDocument()
    expect(screen.getByText('Free Support Hours Benefit')).toBeInTheDocument()
    expect(screen.getByText('Net Billable')).toBeInTheDocument()
  })

  it('calls onToggle when clicked', () => {
    const onToggle = vi.fn()
    render(
      <table>
        <tbody>
          <TicketsSection {...defaultProps} onToggle={onToggle} />
        </tbody>
      </table>
    )

    fireEvent.click(screen.getByText('Tickets'))
    expect(onToggle).toHaveBeenCalledTimes(1)
  })

  it('displays free hours credit when applicable', () => {
    render(
      <table>
        <tbody>
          <TicketsSection {...defaultProps} isExpanded={true} />
        </tbody>
      </table>
    )

    expect(screen.getByText(/Free Support Hours Benefit/)).toBeInTheDocument()
    expect(screen.getByText(/-2.50h/)).toBeInTheDocument()
  })

  it('calculates totals correctly', () => {
    render(
      <table>
        <tbody>
          <TicketsSection {...defaultProps} isExpanded={true} />
        </tbody>
      </table>
    )

    // Check for gross total hours
    expect(screen.getByText('6.50h')).toBeInTheDocument() // sum of all ticket hours
  })

  it('does not show free hours section when no free hours applied', () => {
    const monthDataNoFreeHours = {
      ...mockMonthData,
      ticketsFreeHoursApplied: 0,
      ticketsFreeHoursSavings: 0
    }

    render(
      <table>
        <tbody>
          <TicketsSection {...defaultProps} monthData={monthDataNoFreeHours} isExpanded={true} />
        </tbody>
      </table>
    )

    expect(screen.queryByText('Free Support Hours Benefit')).not.toBeInTheDocument()
  })
})
