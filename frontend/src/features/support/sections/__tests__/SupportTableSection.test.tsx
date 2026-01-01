/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Tests for SupportTableSection component
 */
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SupportTableSection } from '../SupportTableSection'
import type { ChatRequest } from '../../../../types/request'

// Mock child components
vi.mock('../SupportTableHeader', () => ({
  SupportTableHeader: () => <thead data-testid="table-header">Table Header</thead>
}))

vi.mock('../SupportTableRow', () => ({
  SupportTableRow: ({ request }: any) => (
    <tr data-testid="table-row">
      <td>{request.Request_Summary}</td>
    </tr>
  )
}))

// Don't mock Pagination - use the real component to test integration

describe('SupportTableSection', () => {
  const mockRequests: ChatRequest[] = [
    {
      Date: '2025-06-23',
      Time: '09:30 AM',
      Month: '2025-06',
      Request_Type: 'General Request',
      Category: 'Support',
      Request_Summary: 'Test request 1',
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
      Request_Summary: 'Test request 2',
      Urgency: 'HIGH',
      EstimatedHours: 1.0,
      Status: 'active',
      source: 'ticket',
      id: 2
    }
  ]

  const defaultProps = {
    paginatedRequests: mockRequests,
    filteredAndSortedRequests: mockRequests,
    billableFilteredRequests: mockRequests,
    nonBillableRequests: [],
    requests: mockRequests,
    startIndex: 0,
    endIndex: 2,
    hideNonBillable: false,
    onHideNonBillableChange: vi.fn(),
    selectedRequestIds: new Set<number>(),
    selectAll: false,
    onSelectAll: vi.fn(),
    onSelectRequest: vi.fn(),
    onRowClick: vi.fn(),
    onClearSelection: vi.fn(),
    stagedBulkCategory: '',
    stagedBulkUrgency: '',
    stagedBulkHours: null,
    onStagedBulkCategoryChange: vi.fn(),
    onStagedBulkUrgencyChange: vi.fn(),
    onStagedBulkHoursChange: vi.fn(),
    onApplyBulkChanges: vi.fn(),
    onClearStagedChanges: vi.fn(),
    searchQuery: '',
    onSearchQueryChange: vi.fn(),
    sortColumn: null,
    sortDirection: 'asc' as 'asc' | 'desc',
    onSort: vi.fn(),
    sourceFilter: [],
    dateRange: { from: null, to: null },
    dayFilter: [],
    categoryFilter: [],
    urgencyFilter: [],
    onSourceFilterChange: vi.fn(),
    onDateRangeChange: vi.fn(),
    onDayFilterChange: vi.fn(),
    onCategoryFilterChange: vi.fn(),
    onUrgencyFilterChange: vi.fn(),
    onResetFilters: vi.fn(),
    onApplyPreset: vi.fn(),
    filterCounts: {
      source: { sms: 1, ticket: 1 },
      urgency: { HIGH: 1, MEDIUM: 1 },
      category: { Support: 1, Hosting: 1 },
      day: { Mon: 1, Tue: 1 }
    },
    activeFilterCount: 0,
    categoryOptions: ['Support', 'Hosting', 'Forms', 'Billing'],
    urgencyOptions: ['HIGH', 'MEDIUM', 'LOW', 'PROMOTION'],
    currentPage: 1,
    totalPages: 1,
    pageSize: 20,
    onPageChange: vi.fn(),
    onPageSizeChange: vi.fn(),
    onUpdateRequest: vi.fn(),
    onDeleteRequest: vi.fn(),
    selectedYear: 2025,
    selectedMonth: 6 as number | 'all',
    selectedDay: 'all' as string | 'all',
    formatTime: (time: string) => time,
    formatUrgencyDisplay: (urgency: string) => urgency.charAt(0).toUpperCase() + urgency.slice(1).toLowerCase(),
    preserveScrollPosition: vi.fn()
  }

  it('should render card with title and description', () => {
    render(<SupportTableSection {...defaultProps} />)

    expect(screen.getByText('Billable Requests')).toBeInTheDocument()
    expect(screen.getByText('Complete list of support requests - click category or urgency to edit')).toBeInTheDocument()
  })

  it('should render billable toggle switch', () => {
    const { container } = render(<SupportTableSection {...defaultProps} />)

    const toggle = container.querySelector('input[type="checkbox"][role="switch"]')
    expect(toggle).toBeInTheDocument()
    expect(toggle).not.toBeChecked()
  })

  it('should call onHideNonBillableChange when toggle is clicked', async () => {
    const user = userEvent.setup()
    const { container } = render(<SupportTableSection {...defaultProps} />)

    const toggle = container.querySelector('input[type="checkbox"][role="switch"]')!
    await user.click(toggle)

    expect(defaultProps.onHideNonBillableChange).toHaveBeenCalledWith(true)
  })

  it('should render search bar', () => {
    render(<SupportTableSection {...defaultProps} />)

    const searchInput = screen.getByPlaceholderText('Search requests...')
    expect(searchInput).toBeInTheDocument()
  })

  it('should call onSearchQueryChange when typing in search bar', async () => {
    const user = userEvent.setup()
    render(<SupportTableSection {...defaultProps} />)

    const searchInput = screen.getByPlaceholderText('Search requests...')
    await user.type(searchInput, 'test')

    expect(defaultProps.onSearchQueryChange).toHaveBeenCalled()
  })

  it('should display clear button when search query exists', () => {
    render(<SupportTableSection {...defaultProps} searchQuery="test" />)

    const clearButtons = screen.getAllByRole('button')
    const clearButton = clearButtons.find(button => {
      const svg = button.querySelector('svg')
      return svg && button.className.includes('absolute')
    })
    expect(clearButton).toBeTruthy()
  })

  it('should call onSearchQueryChange with empty string when clear button is clicked', async () => {
    const user = userEvent.setup()
    render(<SupportTableSection {...defaultProps} searchQuery="test" />)

    const clearButtons = screen.getAllByRole('button')
    const clearButton = clearButtons.find(button => {
      const svg = button.querySelector('svg')
      return svg && button.className.includes('absolute')
    })!

    await user.click(clearButton)

    expect(defaultProps.onSearchQueryChange).toHaveBeenCalledWith('')
  })

  it('should render Filter button in toolbar', () => {
    render(<SupportTableSection {...defaultProps} />)

    expect(screen.getByRole('button', { name: /Filters/i })).toBeInTheDocument()
  })

  it('should show active filter count badge when filters are active', () => {
    render(<SupportTableSection {...defaultProps} activeFilterCount={3} />)

    // The filter count badge should be displayed
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('should open filter panel when Filters button is clicked', async () => {
    const user = userEvent.setup()
    render(<SupportTableSection {...defaultProps} />)

    const filterButton = screen.getByRole('button', { name: /Filters/i })
    await user.click(filterButton)

    // Reset all filters button should be visible in the panel
    expect(screen.getByText('Reset all filters')).toBeInTheDocument()
  })

  it('should display request count', () => {
    render(<SupportTableSection {...defaultProps} />)

    expect(screen.getByText('Showing 2 requests')).toBeInTheDocument()
  })

  it('should render bulk actions toolbar when requests are selected', () => {
    const selectedIds = new Set([0, 1])
    render(<SupportTableSection {...defaultProps} selectedRequestIds={selectedIds} />)

    expect(screen.getByText('2 selected:')).toBeInTheDocument()
  })

  it('should not render bulk actions toolbar when no requests are selected', () => {
    render(<SupportTableSection {...defaultProps} />)

    expect(screen.queryByText(/selected/)).not.toBeInTheDocument()
  })

  it('should display category dropdown in bulk actions', () => {
    const selectedIds = new Set([0])
    render(<SupportTableSection {...defaultProps} selectedRequestIds={selectedIds} />)

    expect(screen.getByText('Category:')).toBeInTheDocument()
    const selects = screen.getAllByRole('combobox')
    expect(selects.length).toBeGreaterThan(0)
  })

  it('should call onApplyBulkChanges when Apply Changes button is clicked', async () => {
    const user = userEvent.setup()
    const selectedIds = new Set([0])
    render(
      <SupportTableSection
        {...defaultProps}
        selectedRequestIds={selectedIds}
        stagedBulkCategory="Hosting"
      />
    )

    const applyButton = screen.getByText('Apply Changes')
    await user.click(applyButton)

    expect(defaultProps.onApplyBulkChanges).toHaveBeenCalled()
  })

  it('should display active category filter badges', () => {
    render(<SupportTableSection {...defaultProps} categoryFilter={['Support']} />)

    expect(screen.getByText('Support')).toBeInTheDocument()
  })

  it('should display active urgency filter badges', () => {
    render(<SupportTableSection {...defaultProps} urgencyFilter={['HIGH']} />)

    expect(screen.getByText('HIGH')).toBeInTheDocument()
  })

  it('should render table header component', () => {
    render(<SupportTableSection {...defaultProps} />)

    expect(screen.getByTestId('table-header')).toBeInTheDocument()
  })

  it('should render table rows for all paginated requests', () => {
    render(<SupportTableSection {...defaultProps} />)

    const rows = screen.getAllByTestId('table-row')
    expect(rows).toHaveLength(2)
  })

  it('should render pagination component', () => {
    render(<SupportTableSection {...defaultProps} />)

    // Check for pagination text content instead of data-testid
    expect(screen.getByText(/Showing 1 to 2 of 2 entries/)).toBeInTheDocument()
  })

  it('should display helper text for billable toggle', () => {
    render(
      <SupportTableSection
        {...defaultProps}
        nonBillableRequests={[mockRequests[0]]}
      />
    )

    expect(screen.getByText('Showing all items including non-billable')).toBeInTheDocument()
  })

  it('should display different helper text when hideNonBillable is true', () => {
    render(
      <SupportTableSection
        {...defaultProps}
        hideNonBillable={true}
        nonBillableRequests={[mockRequests[0]]}
      />
    )

    expect(screen.getByText('Hiding 1 non-billable and migration items')).toBeInTheDocument()
  })
})
