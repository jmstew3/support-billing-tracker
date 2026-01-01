/**
 * Tests for SupportTableHeader component
 *
 * Tests the simplified table header with sortable columns.
 * Inline filters have been moved to the FilterPanel component.
 */
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SupportTableHeader } from '../SupportTableHeader'

describe('SupportTableHeader', () => {
  const defaultProps = {
    selectAll: false,
    onSelectAll: vi.fn(),
    sortColumn: null,
    sortDirection: 'asc' as 'asc' | 'desc',
    onSort: vi.fn()
  }

  it('should render all column headers', () => {
    render(
      <table>
        <SupportTableHeader {...defaultProps} />
      </table>
    )

    expect(screen.getByText('Source')).toBeInTheDocument()
    expect(screen.getByText('URL')).toBeInTheDocument()
    expect(screen.getByText('Date')).toBeInTheDocument()
    expect(screen.getByText('Day')).toBeInTheDocument()
    expect(screen.getByText('Time')).toBeInTheDocument()
    expect(screen.getByText('Request Summary')).toBeInTheDocument()
    expect(screen.getByText('Category')).toBeInTheDocument()
    expect(screen.getByText('Urgency')).toBeInTheDocument()
    expect(screen.getByText('Hours')).toBeInTheDocument()
    expect(screen.getByText('Billing Date')).toBeInTheDocument()
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

  it('should render checked checkbox when selectAll is true', () => {
    const { container } = render(
      <table>
        <SupportTableHeader {...defaultProps} selectAll={true} />
      </table>
    )

    const checkbox = container.querySelector('input[type="checkbox"]')
    expect(checkbox).toBeChecked()
  })

  it('should call onSelectAll when checkbox is clicked', async () => {
    const user = userEvent.setup()
    const onSelectAll = vi.fn()
    const { container } = render(
      <table>
        <SupportTableHeader {...defaultProps} onSelectAll={onSelectAll} />
      </table>
    )

    const checkbox = container.querySelector('input[type="checkbox"]')!
    await user.click(checkbox)

    expect(onSelectAll).toHaveBeenCalled()
  })

  it('should call onSort when Date column header is clicked', async () => {
    const user = userEvent.setup()
    const onSort = vi.fn()
    render(
      <table>
        <SupportTableHeader {...defaultProps} onSort={onSort} />
      </table>
    )

    const dateButton = screen.getByRole('button', { name: /Date/i })
    await user.click(dateButton)

    expect(onSort).toHaveBeenCalledWith('Date')
  })

  it('should call onSort when Day column header is clicked', async () => {
    const user = userEvent.setup()
    const onSort = vi.fn()
    render(
      <table>
        <SupportTableHeader {...defaultProps} onSort={onSort} />
      </table>
    )

    const dayButton = screen.getByRole('button', { name: /Day/i })
    await user.click(dayButton)

    expect(onSort).toHaveBeenCalledWith('DayOfWeek')
  })

  it('should call onSort when Time column header is clicked', async () => {
    const user = userEvent.setup()
    const onSort = vi.fn()
    render(
      <table>
        <SupportTableHeader {...defaultProps} onSort={onSort} />
      </table>
    )

    const timeButton = screen.getByRole('button', { name: /Time/i })
    await user.click(timeButton)

    expect(onSort).toHaveBeenCalledWith('Time')
  })

  it('should call onSort when Category column header is clicked', async () => {
    const user = userEvent.setup()
    const onSort = vi.fn()
    render(
      <table>
        <SupportTableHeader {...defaultProps} onSort={onSort} />
      </table>
    )

    const categoryButton = screen.getByRole('button', { name: /Category/i })
    await user.click(categoryButton)

    expect(onSort).toHaveBeenCalledWith('Category')
  })

  it('should call onSort when Urgency column header is clicked', async () => {
    const user = userEvent.setup()
    const onSort = vi.fn()
    render(
      <table>
        <SupportTableHeader {...defaultProps} onSort={onSort} />
      </table>
    )

    const urgencyButton = screen.getByRole('button', { name: /Urgency/i })
    await user.click(urgencyButton)

    expect(onSort).toHaveBeenCalledWith('Urgency')
  })

  it('should call onSort when Hours column header is clicked', async () => {
    const user = userEvent.setup()
    const onSort = vi.fn()
    render(
      <table>
        <SupportTableHeader {...defaultProps} onSort={onSort} />
      </table>
    )

    const hoursButton = screen.getByRole('button', { name: /Hours/i })
    await user.click(hoursButton)

    expect(onSort).toHaveBeenCalledWith('EstimatedHours')
  })
})
