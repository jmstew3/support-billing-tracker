/**
 * Tests for ArchivedRequestsSection component
 */
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ArchivedRequestsSection } from '../ArchivedRequestsSection'
import { ChatRequest } from '../../../../types/request'

describe('ArchivedRequestsSection', () => {
  const mockArchivedRequests: ChatRequest[] = [
    {
      Date: '2025-06-23',
      Time: '09:30 AM',
      Month: '2025-06',
      Request_Type: 'General Request',
      Category: 'Support',
      Request_Summary: 'Archived request 1',
      Urgency: 'HIGH',
      EstimatedEffort: 'Medium',
      EstimatedHours: 0.5,
      Status: 'deleted',
      source: 'sms',
      id: 1
    },
    {
      Date: '2025-06-24',
      Time: '10:00 AM',
      Month: '2025-06',
      Request_Type: 'General Request',
      Category: 'Hosting',
      Request_Summary: 'Archived request 2',
      Urgency: 'MEDIUM',
      EstimatedEffort: 'Large',
      EstimatedHours: 1.0,
      Status: 'deleted',
      source: 'ticket',
      id: 2
    }
  ]

  const defaultProps = {
    archivedRequests: mockArchivedRequests,
    requests: mockArchivedRequests,
    showArchived: false,
    apiAvailable: true,
    onToggleArchived: vi.fn(),
    onRestoreRequest: vi.fn()
  }

  it('should render when API is available and archived requests exist', () => {
    render(<ArchivedRequestsSection {...defaultProps} />)

    expect(screen.getByText('Archived Requests (2)')).toBeInTheDocument()
  })

  it('should not render when API is not available', () => {
    const { container } = render(
      <ArchivedRequestsSection {...defaultProps} apiAvailable={false} />
    )

    expect(container.firstChild).toBeNull()
  })

  it('should not render when there are no archived requests', () => {
    const { container } = render(
      <ArchivedRequestsSection {...defaultProps} archivedRequests={[]} />
    )

    expect(container.firstChild).toBeNull()
  })

  it('should display correct count of archived requests', () => {
    render(<ArchivedRequestsSection {...defaultProps} />)

    expect(screen.getByText('Archived Requests (2)')).toBeInTheDocument()
  })

  it('should display "Click to show" when collapsed', () => {
    render(<ArchivedRequestsSection {...defaultProps} showArchived={false} />)

    expect(screen.getByText('Click to show')).toBeInTheDocument()
  })

  it('should display "Click to hide" when expanded', () => {
    render(<ArchivedRequestsSection {...defaultProps} showArchived={true} />)

    expect(screen.getByText('Click to hide')).toBeInTheDocument()
  })

  it('should call onToggleArchived when header is clicked', async () => {
    const user = userEvent.setup()
    render(<ArchivedRequestsSection {...defaultProps} />)

    const header = screen.getByText('Archived Requests (2)').closest('div')!
    await user.click(header)

    expect(defaultProps.onToggleArchived).toHaveBeenCalled()
  })

  it('should render chevron icon with correct rotation when collapsed', () => {
    const { container } = render(
      <ArchivedRequestsSection {...defaultProps} showArchived={false} />
    )

    const chevron = container.querySelector('.rotate-90')
    expect(chevron).not.toBeInTheDocument()
  })

  it('should render chevron icon with rotation when expanded', () => {
    const { container } = render(
      <ArchivedRequestsSection {...defaultProps} showArchived={true} />
    )

    const chevron = container.querySelector('.rotate-90')
    expect(chevron).toBeInTheDocument()
  })

  it('should not render table when showArchived is false', () => {
    render(<ArchivedRequestsSection {...defaultProps} showArchived={false} />)

    expect(screen.queryByText('Source')).not.toBeInTheDocument()
  })

  it('should render table when showArchived is true', () => {
    render(<ArchivedRequestsSection {...defaultProps} showArchived={true} />)

    expect(screen.getByText('Source')).toBeInTheDocument()
    expect(screen.getByText('Date')).toBeInTheDocument()
    expect(screen.getByText('Time')).toBeInTheDocument()
    expect(screen.getByText('Category')).toBeInTheDocument()
    expect(screen.getByText('Summary')).toBeInTheDocument()
    expect(screen.getByText('Urgency')).toBeInTheDocument()
    expect(screen.getByText('Actions')).toBeInTheDocument()
  })

  it('should render all archived requests in table', () => {
    render(<ArchivedRequestsSection {...defaultProps} showArchived={true} />)

    expect(screen.getByText('Archived request 1')).toBeInTheDocument()
    expect(screen.getByText('Archived request 2')).toBeInTheDocument()
  })

  it('should display source icon for SMS requests', () => {
    render(<ArchivedRequestsSection {...defaultProps} showArchived={true} />)

    const smsIcon = screen.getByLabelText('Request via Text')
    expect(smsIcon).toBeInTheDocument()
  })

  it('should display source icon for ticket requests', () => {
    render(<ArchivedRequestsSection {...defaultProps} showArchived={true} />)

    const ticketIcon = screen.getByLabelText('Request via Ticket System')
    expect(ticketIcon).toBeInTheDocument()
  })

  it('should display category badges', () => {
    render(<ArchivedRequestsSection {...defaultProps} showArchived={true} />)

    expect(screen.getByText('Support')).toBeInTheDocument()
    expect(screen.getByText('Hosting')).toBeInTheDocument()
  })

  it('should display urgency badges with correct styling', () => {
    const { container } = render(
      <ArchivedRequestsSection {...defaultProps} showArchived={true} />
    )

    const highBadge = container.querySelector('.bg-gray-800')
    expect(highBadge).toBeInTheDocument()
    expect(highBadge).toHaveTextContent('HIGH')

    const mediumBadge = container.querySelector('.bg-gray-600')
    expect(mediumBadge).toBeInTheDocument()
    expect(mediumBadge).toHaveTextContent('MEDIUM')
  })

  it('should render restore button for each request', () => {
    render(<ArchivedRequestsSection {...defaultProps} showArchived={true} />)

    const restoreButtons = screen.getAllByTitle('Restore request')
    expect(restoreButtons).toHaveLength(2)
  })

  it('should call onRestoreRequest when restore button is clicked', async () => {
    const user = userEvent.setup()
    render(<ArchivedRequestsSection {...defaultProps} showArchived={true} />)

    const restoreButtons = screen.getAllByTitle('Restore request')
    await user.click(restoreButtons[0])

    expect(defaultProps.onRestoreRequest).toHaveBeenCalledWith(1, 0)
  })

  it('should apply opacity styling to archived rows', () => {
    const { container } = render(
      <ArchivedRequestsSection {...defaultProps} showArchived={true} />
    )

    const rows = container.querySelectorAll('tbody tr')
    rows.forEach(row => {
      expect(row).toHaveClass('opacity-60')
    })
  })

  it('should format date using parseLocalDate', () => {
    render(<ArchivedRequestsSection {...defaultProps} showArchived={true} />)

    // parseLocalDate should format the date - check for formatted output
    const dateCells = screen.getAllByText(/\//)
    expect(dateCells.length).toBeGreaterThan(0)
  })

  it('should display time as-is without formatting', () => {
    render(<ArchivedRequestsSection {...defaultProps} showArchived={true} />)

    expect(screen.getByText('09:30 AM')).toBeInTheDocument()
    expect(screen.getByText('10:00 AM')).toBeInTheDocument()
  })
})
