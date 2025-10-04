import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DashboardScorecards } from '../DashboardScorecards'
import { mockBillingSummary } from '../../../../test/fixtures/billing'

describe('DashboardScorecards', () => {
  const defaultProps = {
    displayTotals: {
      totalRevenue: 1924.00,
      totalTicketsRevenue: 1025.00,
      totalProjectsRevenue: 800.00,
      totalHostingRevenue: 99.00
    },
    totalFreeHoursSavings: 250.00,
    totalProjectCredits: 200.00,
    totalHostingCreditsSavings: 99.00,
    totalDiscounts: 549.00,
    averageTicketCost: 341.67,
    averageProjectCost: 400.00,
    averageHostingCost: 49.50,
    currentMonthString: '2025-06',
    billingSummary: mockBillingSummary
  }

  it('renders both rows of scorecards', () => {
    const { container } = render(<DashboardScorecards {...defaultProps} />)

    // Should have two grid containers
    const grids = container.querySelectorAll('.grid')
    expect(grids.length).toBe(2)
  })

  it('displays all primary revenue scorecards', () => {
    render(<DashboardScorecards {...defaultProps} />)

    expect(screen.getByText('Total Revenue')).toBeInTheDocument()
    expect(screen.getByText('Support Tickets')).toBeInTheDocument()
    expect(screen.getByText('Project Revenue')).toBeInTheDocument()
    expect(screen.getByText('Hosting MRR')).toBeInTheDocument()
  })

  it('displays all average cost scorecards', () => {
    render(<DashboardScorecards {...defaultProps} />)

    expect(screen.getByText('Avg Ticket Cost')).toBeInTheDocument()
    expect(screen.getByText('Avg Project Cost')).toBeInTheDocument()
    expect(screen.getByText('Avg Hosting Cost')).toBeInTheDocument()
    expect(screen.getByText('Total Discounts')).toBeInTheDocument()
  })

  it('shows Turbo credits message when free hours savings exist', () => {
    render(<DashboardScorecards {...defaultProps} />)

    expect(screen.getByText(/Turbo hours credits/i)).toBeInTheDocument()
  })

  it('shows Turbo credits message when project credits exist', () => {
    render(<DashboardScorecards {...defaultProps} />)

    expect(screen.getByText(/Turbo project credits/i)).toBeInTheDocument()
  })

  it('shows "Current Hosting MRR" when viewing all months', () => {
    const propsAllMonths = {
      ...defaultProps,
      currentMonthString: 'all'
    }

    render(<DashboardScorecards {...propsAllMonths} />)

    expect(screen.getByText('Current Hosting MRR')).toBeInTheDocument()
  })

  it('shows "Hosting MRR" when viewing specific month', () => {
    render(<DashboardScorecards {...defaultProps} />)

    expect(screen.getByText('Hosting MRR')).toBeInTheDocument()
  })

  it('shows not eligible message for months before June 2025', () => {
    const propsMay2025 = {
      ...defaultProps,
      currentMonthString: '2025-05',
      totalFreeHoursSavings: 0
    }

    render(<DashboardScorecards {...propsMay2025} />)

    expect(screen.getByText('Not eligible for free hours credit')).toBeInTheDocument()
  })

  it('renders all revenue amounts correctly', () => {
    render(<DashboardScorecards {...defaultProps} />)

    expect(screen.getByText('$1,924.00')).toBeInTheDocument() // Total Revenue
    expect(screen.getByText('$1,025.00')).toBeInTheDocument() // Tickets
    expect(screen.getByText('$800.00')).toBeInTheDocument() // Projects
    expect(screen.getByText('$99.00')).toBeInTheDocument() // Hosting
  })

  it('renders all average costs correctly', () => {
    render(<DashboardScorecards {...defaultProps} />)

    expect(screen.getByText('$341.67')).toBeInTheDocument() // Avg Ticket
    expect(screen.getByText('$400.00')).toBeInTheDocument() // Avg Project
    expect(screen.getByText('$49.50')).toBeInTheDocument() // Avg Hosting
    expect(screen.getByText('$549.00')).toBeInTheDocument() // Total Discounts
  })

  it('displays icons for all scorecards', () => {
    const { container } = render(<DashboardScorecards {...defaultProps} />)

    // Should have icons for all 8 scorecards
    const icons = container.querySelectorAll('svg.lucide')
    expect(icons.length).toBeGreaterThanOrEqual(8)
  })
})
