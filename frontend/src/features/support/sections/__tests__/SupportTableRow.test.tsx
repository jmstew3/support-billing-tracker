/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Tests for SupportTableRow component
 */
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SupportTableRow } from '../SupportTableRow'
import type { ChatRequest } from '../../../../types/request'

// Mock the editable cell components
vi.mock('../../../shared/EditableCell', () => ({
  EditableCell: ({ value, onSave }: any) => (
    <div data-testid="editable-cell" onClick={() => onSave('new-value')}>
      {value}
    </div>
  )
}))

vi.mock('../../../shared/EditableNumberCell', () => ({
  EditableNumberCell: ({ value, onSave }: any) => (
    <div data-testid="editable-number-cell" onClick={() => onSave(1.5)}>
      {value}
    </div>
  )
}))

describe('SupportTableRow', () => {
  const mockRequest: ChatRequest = {
    Date: '2025-06-23',
    Time: '09:30 AM',
    Month: '2025-06',
    Request_Type: 'General Request',
    Category: 'Support',
    Request_Summary: 'Test request summary',
    Urgency: 'MEDIUM',
    EstimatedHours: 0.5,
    Status: 'active',
    source: 'sms',
    id: 1
  }

  const defaultProps = {
    request: mockRequest,
    index: 0,
    paginatedIndex: 0,
    startIndex: 0,
    isSelected: false,
    categoryOptions: ['Support', 'Hosting', 'Forms', 'Billing'],
    urgencyOptions: ['HIGH', 'MEDIUM', 'LOW', 'PROMOTION'],
    onSelectRequest: vi.fn(),
    onRowClick: vi.fn(),
    onUpdateRequest: vi.fn(),
    onDeleteRequest: vi.fn(),
    formatTime: (time: string) => time,
    formatUrgencyDisplay: (urgency: string) => urgency.charAt(0).toUpperCase() + urgency.slice(1).toLowerCase()
  }

  it('should render request data correctly', () => {
    render(
      <table>
        <tbody>
          <SupportTableRow {...defaultProps} />
        </tbody>
      </table>
    )

    expect(screen.getByText('2025-06-23')).toBeInTheDocument()
    expect(screen.getByText('09:30 AM')).toBeInTheDocument()
    expect(screen.getByText('Test request summary')).toBeInTheDocument()
  })

  it('should render checkbox that is not checked by default', () => {
    const { container } = render(
      <table>
        <tbody>
          <SupportTableRow {...defaultProps} />
        </tbody>
      </table>
    )

    const checkbox = container.querySelector('input[type="checkbox"]')
    expect(checkbox).toBeInTheDocument()
    expect(checkbox).not.toBeChecked()
  })

  it('should render checkbox as checked when isSelected is true', () => {
    const { container } = render(
      <table>
        <tbody>
          <SupportTableRow {...defaultProps} isSelected={true} />
        </tbody>
      </table>
    )

    const checkbox = container.querySelector('input[type="checkbox"]')
    expect(checkbox).toBeChecked()
  })

  it('should call onSelectRequest when checkbox is clicked', async () => {
    const user = userEvent.setup()
    const { container } = render(
      <table>
        <tbody>
          <SupportTableRow {...defaultProps} />
        </tbody>
      </table>
    )

    const checkbox = container.querySelector('input[type="checkbox"]')!
    await user.click(checkbox)

    expect(defaultProps.onSelectRequest).toHaveBeenCalledWith(0, expect.any(Object))
  })

  it('should call onRowClick when row is clicked', async () => {
    const user = userEvent.setup()
    const { container } = render(
      <table>
        <tbody>
          <SupportTableRow {...defaultProps} />
        </tbody>
      </table>
    )

    const row = container.querySelector('tr')!
    await user.click(row)

    expect(defaultProps.onRowClick).toHaveBeenCalledWith(0, expect.any(Object))
  })

  it('should call onDeleteRequest when delete button is clicked', async () => {
    const user = userEvent.setup()
    render(
      <table>
        <tbody>
          <SupportTableRow {...defaultProps} />
        </tbody>
      </table>
    )

    const deleteButton = screen.getByTitle('Delete request')
    await user.click(deleteButton)

    expect(defaultProps.onDeleteRequest).toHaveBeenCalledWith(0)
  })

  it('should display SMS source icon with tooltip', () => {
    render(
      <table>
        <tbody>
          <SupportTableRow {...defaultProps} />
        </tbody>
      </table>
    )

    const icon = screen.getByLabelText('Request via Text')
    expect(icon).toBeInTheDocument()
  })

  it('should display ticket source icon when source is ticket', () => {
    render(
      <table>
        <tbody>
          <SupportTableRow
            {...defaultProps}
            request={{ ...mockRequest, source: 'ticket' }}
          />
        </tbody>
      </table>
    )

    const icon = screen.getByLabelText('Request via Twenty CRM')
    expect(icon).toBeInTheDocument()
  })

  it('should display email source icon when source is email', () => {
    render(
      <table>
        <tbody>
          <SupportTableRow
            {...defaultProps}
            request={{ ...mockRequest, source: 'email' }}
          />
        </tbody>
      </table>
    )

    const icon = screen.getByLabelText('Request via Email')
    expect(icon).toBeInTheDocument()
  })

  it('should display phone source icon when source is phone', () => {
    render(
      <table>
        <tbody>
          <SupportTableRow
            {...defaultProps}
            request={{ ...mockRequest, source: 'phone' }}
          />
        </tbody>
      </table>
    )

    const icon = screen.getByLabelText('Request via Phone')
    expect(icon).toBeInTheDocument()
  })

  it('should apply non-billable styling for Non-billable category', () => {
    const { container } = render(
      <table>
        <tbody>
          <SupportTableRow
            {...defaultProps}
            request={{ ...mockRequest, Category: 'Non-billable' }}
          />
        </tbody>
      </table>
    )

    const row = container.querySelector('tr')
    expect(row).toHaveClass('opacity-50', 'bg-gray-50')
  })

  it('should apply non-billable styling for Migration category', () => {
    const { container } = render(
      <table>
        <tbody>
          <SupportTableRow
            {...defaultProps}
            request={{ ...mockRequest, Category: 'Migration' }}
          />
        </tbody>
      </table>
    )

    const row = container.querySelector('tr')
    expect(row).toHaveClass('opacity-50', 'bg-gray-50')
  })

  it('should display N/A for urgency when request is non-billable', () => {
    render(
      <table>
        <tbody>
          <SupportTableRow
            {...defaultProps}
            request={{ ...mockRequest, Category: 'Non-billable' }}
          />
        </tbody>
      </table>
    )

    const naBadges = screen.getAllByText('N/A')
    expect(naBadges.length).toBeGreaterThan(0)
  })

  it('should display N/A for hours when request is non-billable', () => {
    render(
      <table>
        <tbody>
          <SupportTableRow
            {...defaultProps}
            request={{ ...mockRequest, Category: 'Migration' }}
          />
        </tbody>
      </table>
    )

    const naBadges = screen.getAllByText('N/A')
    expect(naBadges.length).toBeGreaterThan(0)
  })

  it('should render editable cells for billable requests', () => {
    render(
      <table>
        <tbody>
          <SupportTableRow {...defaultProps} />
        </tbody>
      </table>
    )

    const editableCells = screen.getAllByTestId('editable-cell')
    expect(editableCells.length).toBeGreaterThan(0)

    const editableNumberCells = screen.getAllByTestId('editable-number-cell')
    expect(editableNumberCells.length).toBeGreaterThan(0)
  })

  it('should apply selected styling when isSelected is true', () => {
    const { container } = render(
      <table>
        <tbody>
          <SupportTableRow {...defaultProps} isSelected={true} />
        </tbody>
      </table>
    )

    const row = container.querySelector('tr')
    expect(row).toHaveClass('bg-blue-50')
  })

  it('should parse date with T separator correctly', () => {
    render(
      <table>
        <tbody>
          <SupportTableRow
            {...defaultProps}
            request={{ ...mockRequest, Date: '2025-06-23T00:00:00' }}
          />
        </tbody>
      </table>
    )

    expect(screen.getByText('2025-06-23')).toBeInTheDocument()
  })
})
