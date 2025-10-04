import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MonthRow } from '../MonthRow'
import { mockMonthData } from '../../../../test/fixtures/billing'

describe('MonthRow', () => {
  const defaultProps = {
    monthData: mockMonthData,
    isExpanded: false,
    onToggleMonth: vi.fn(),
    onToggleSection: vi.fn(),
    isSectionExpanded: vi.fn(() => false),
    formatMonthLabel: (month: string) => {
      const [year, monthNum] = month.split('-')
      const date = new Date(parseInt(year), parseInt(monthNum) - 1)
      return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    }
  }

  it('renders month header with formatted label', () => {
    render(
      <table>
        <tbody>
          <MonthRow {...defaultProps} />
        </tbody>
      </table>
    )

    expect(screen.getByText('June 2025')).toBeInTheDocument()
  })

  it('displays revenue amounts for all categories', () => {
    render(
      <table>
        <tbody>
          <MonthRow {...defaultProps} />
        </tbody>
      </table>
    )

    // Tickets revenue (from mockMonthData: 1025.00)
    expect(screen.getByText('1,025.00')).toBeInTheDocument()
    // Projects revenue (from mockMonthData: 800.00)
    expect(screen.getByText('800.00')).toBeInTheDocument()
    // Hosting revenue (from mockMonthData: 99.00)
    expect(screen.getByText('99.00')).toBeInTheDocument()
    // Total revenue (from mockMonthData: 1924.00)
    expect(screen.getByText('1,924.00')).toBeInTheDocument()
  })

  it('shows dash for zero revenue categories', () => {
    const monthDataNoTickets = {
      ...mockMonthData,
      ticketsRevenue: 0
    }

    const { container } = render(
      <table>
        <tbody>
          <MonthRow {...defaultProps} monthData={monthDataNoTickets} />
        </tbody>
      </table>
    )

    // Check for dash in tickets column
    const cells = container.querySelectorAll('td')
    const ticketsCell = Array.from(cells).find(cell =>
      cell.className.includes('text-blue-700') && cell.textContent === '-'
    )
    expect(ticketsCell).toBeInTheDocument()
  })

  it('calls onToggleMonth when header is clicked', () => {
    const onToggleMonth = vi.fn()
    render(
      <table>
        <tbody>
          <MonthRow {...defaultProps} onToggleMonth={onToggleMonth} />
        </tbody>
      </table>
    )

    fireEvent.click(screen.getByText('June 2025'))
    expect(onToggleMonth).toHaveBeenCalledWith('2025-06')
  })

  it('shows chevron down when collapsed', () => {
    const { container } = render(
      <table>
        <tbody>
          <MonthRow {...defaultProps} isExpanded={false} />
        </tbody>
      </table>
    )

    const chevronDown = container.querySelector('svg[class*="lucide-chevron-down"]')
    expect(chevronDown).toBeInTheDocument()
  })

  it('shows chevron up when expanded', () => {
    const { container } = render(
      <table>
        <tbody>
          <MonthRow {...defaultProps} isExpanded={true} />
        </tbody>
      </table>
    )

    const chevronUp = container.querySelector('svg[class*="lucide-chevron-up"]')
    expect(chevronUp).toBeInTheDocument()
  })

  it('renders section components when expanded', () => {
    render(
      <table>
        <tbody>
          <MonthRow {...defaultProps} isExpanded={true} />
        </tbody>
      </table>
    )

    // Check for section headers
    expect(screen.getByText('Tickets')).toBeInTheDocument()
    expect(screen.getByText('Projects')).toBeInTheDocument()
    expect(screen.getByText('Sites Hosted')).toBeInTheDocument()
  })

  it('does not render sections when collapsed', () => {
    render(
      <table>
        <tbody>
          <MonthRow {...defaultProps} isExpanded={false} />
        </tbody>
      </table>
    )

    // Section headers should not be present
    expect(screen.queryByText('Tickets')).not.toBeInTheDocument()
    expect(screen.queryByText('Projects')).not.toBeInTheDocument()
    expect(screen.queryByText('Sites Hosted')).not.toBeInTheDocument()
  })

  it('only renders sections with data', () => {
    const monthDataNoProjects = {
      ...mockMonthData,
      projectsCount: 0,
      projectDetails: []
    }

    render(
      <table>
        <tbody>
          <MonthRow {...defaultProps} monthData={monthDataNoProjects} isExpanded={true} />
        </tbody>
      </table>
    )

    expect(screen.getByText('Tickets')).toBeInTheDocument()
    expect(screen.queryByText('Projects')).not.toBeInTheDocument()
    expect(screen.getByText('Sites Hosted')).toBeInTheDocument()
  })

  it('applies correct color classes to revenue cells', () => {
    const { container } = render(
      <table>
        <tbody>
          <MonthRow {...defaultProps} />
        </tbody>
      </table>
    )

    const cells = container.querySelectorAll('td')

    // Tickets cell (blue)
    const ticketsCell = Array.from(cells).find(cell =>
      cell.className.includes('text-blue-700')
    )
    expect(ticketsCell).toBeInTheDocument()

    // Projects cell (yellow)
    const projectsCell = Array.from(cells).find(cell =>
      cell.className.includes('text-yellow-700')
    )
    expect(projectsCell).toBeInTheDocument()

    // Hosting cell (green)
    const hostingCell = Array.from(cells).find(cell =>
      cell.className.includes('text-green-700')
    )
    expect(hostingCell).toBeInTheDocument()
  })
})
