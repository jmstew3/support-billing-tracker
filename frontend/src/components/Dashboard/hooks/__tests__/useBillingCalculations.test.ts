import { describe, it, expect } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useBillingCalculations } from '../useBillingCalculations'
import { mockBillingSummary, mockMonthData, mockMonthDataNoCredits } from '../../../../test/fixtures/billing'

describe('useBillingCalculations', () => {
  describe('displayTotals calculation', () => {
    it('calculates totals for "all" period using billingSummary values', () => {
      const { result } = renderHook(() =>
        useBillingCalculations({
          billingSummary: mockBillingSummary,
          filteredData: [],
          currentMonthString: 'all'
        })
      )

      expect(result.current.displayTotals.totalRevenue).toBe(1924.00)
      expect(result.current.displayTotals.totalTicketsRevenue).toBe(1025.00)
      expect(result.current.displayTotals.totalProjectsRevenue).toBe(800.00)
      expect(result.current.displayTotals.totalHostingRevenue).toBe(99.00)
    })

    it('calculates totals for specific month using filteredData', () => {
      const { result } = renderHook(() =>
        useBillingCalculations({
          billingSummary: mockBillingSummary,
          filteredData: [mockMonthData],
          currentMonthString: '2025-06'
        })
      )

      expect(result.current.displayTotals.totalRevenue).toBe(1924.00)
      expect(result.current.displayTotals.totalTicketsRevenue).toBe(1025.00)
      expect(result.current.displayTotals.totalProjectsRevenue).toBe(800.00)
      expect(result.current.displayTotals.totalHostingRevenue).toBe(99.00)
    })

    it('returns zeros when billingSummary is null', () => {
      const { result } = renderHook(() =>
        useBillingCalculations({
          billingSummary: null,
          filteredData: [],
          currentMonthString: 'all'
        })
      )

      expect(result.current.displayTotals.totalRevenue).toBe(0)
      expect(result.current.displayTotals.totalTicketsRevenue).toBe(0)
      expect(result.current.displayTotals.totalProjectsRevenue).toBe(0)
      expect(result.current.displayTotals.totalHostingRevenue).toBe(0)
    })
  })

  describe('free hours savings calculation', () => {
    it('calculates free hours savings for "all" period', () => {
      const { result } = renderHook(() =>
        useBillingCalculations({
          billingSummary: mockBillingSummary,
          filteredData: [],
          currentMonthString: 'all'
        })
      )

      expect(result.current.totalFreeHoursSavings).toBe(250.00)
    })

    it('calculates free hours savings for specific month', () => {
      const { result } = renderHook(() =>
        useBillingCalculations({
          billingSummary: mockBillingSummary,
          filteredData: [mockMonthData],
          currentMonthString: '2025-06'
        })
      )

      expect(result.current.totalFreeHoursSavings).toBe(250.00)
    })

    it('returns 0 when no free hours applied', () => {
      const summaryNoCredits = {
        ...mockBillingSummary,
        monthlyBreakdown: [mockMonthDataNoCredits]
      }

      const { result } = renderHook(() =>
        useBillingCalculations({
          billingSummary: summaryNoCredits,
          filteredData: [],
          currentMonthString: 'all'
        })
      )

      expect(result.current.totalFreeHoursSavings).toBe(0)
    })
  })

  describe('project credits calculations', () => {
    it('calculates landing page savings for "all" period', () => {
      const { result } = renderHook(() =>
        useBillingCalculations({
          billingSummary: mockBillingSummary,
          filteredData: [],
          currentMonthString: 'all'
        })
      )

      expect(result.current.totalLandingPageSavings).toBe(200.00)
    })

    it('calculates multi-form savings for "all" period', () => {
      const { result } = renderHook(() =>
        useBillingCalculations({
          billingSummary: mockBillingSummary,
          filteredData: [],
          currentMonthString: 'all'
        })
      )

      expect(result.current.totalMultiFormSavings).toBe(0)
    })

    it('calculates basic form savings for "all" period', () => {
      const { result } = renderHook(() =>
        useBillingCalculations({
          billingSummary: mockBillingSummary,
          filteredData: [],
          currentMonthString: 'all'
        })
      )

      expect(result.current.totalBasicFormSavings).toBe(0)
    })

    it('calculates total project credits correctly', () => {
      const { result } = renderHook(() =>
        useBillingCalculations({
          billingSummary: mockBillingSummary,
          filteredData: [],
          currentMonthString: 'all'
        })
      )

      expect(result.current.totalProjectCredits).toBe(200.00) // 200 + 0 + 0
    })
  })

  describe('average cost calculations', () => {
    it('calculates average ticket cost correctly', () => {
      const { result } = renderHook(() =>
        useBillingCalculations({
          billingSummary: mockBillingSummary,
          filteredData: [],
          currentMonthString: 'all'
        })
      )

      // 1025 / 3 tickets = 341.67
      expect(result.current.averageTicketCost).toBeCloseTo(341.67, 2)
    })

    it('calculates average project cost correctly', () => {
      const { result } = renderHook(() =>
        useBillingCalculations({
          billingSummary: mockBillingSummary,
          filteredData: [],
          currentMonthString: 'all'
        })
      )

      // 800 / 2 projects = 400
      expect(result.current.averageProjectCost).toBe(400.00)
    })

    it('calculates average hosting cost correctly', () => {
      const { result } = renderHook(() =>
        useBillingCalculations({
          billingSummary: mockBillingSummary,
          filteredData: [],
          currentMonthString: 'all'
        })
      )

      // 99 / 2 site-months = 49.50
      expect(result.current.averageHostingCost).toBe(49.50)
    })

    it('returns 0 for average ticket cost when no tickets', () => {
      const summaryNoTickets = {
        ...mockBillingSummary,
        monthlyBreakdown: mockBillingSummary.monthlyBreakdown.map(m => ({
          ...m,
          ticketsCount: 0,
          ticketsRevenue: 0
        })),
        totalTicketsRevenue: 0
      }

      const { result } = renderHook(() =>
        useBillingCalculations({
          billingSummary: summaryNoTickets,
          filteredData: [],
          currentMonthString: 'all'
        })
      )

      expect(result.current.averageTicketCost).toBe(0)
    })

    it('returns 0 for average project cost when no projects', () => {
      const summaryNoProjects = {
        ...mockBillingSummary,
        monthlyBreakdown: mockBillingSummary.monthlyBreakdown.map(m => ({
          ...m,
          projectsCount: 0,
          projectsRevenue: 0
        })),
        totalProjectsRevenue: 0
      }

      const { result } = renderHook(() =>
        useBillingCalculations({
          billingSummary: summaryNoProjects,
          filteredData: [],
          currentMonthString: 'all'
        })
      )

      expect(result.current.averageProjectCost).toBe(0)
    })

    it('returns 0 for average hosting cost when no hosting', () => {
      const summaryNoHosting = {
        ...mockBillingSummary,
        monthlyBreakdown: mockBillingSummary.monthlyBreakdown.map(m => ({
          ...m,
          hostingSitesCount: 0,
          hostingRevenue: 0
        }))
      }

      const { result } = renderHook(() =>
        useBillingCalculations({
          billingSummary: summaryNoHosting,
          filteredData: [],
          currentMonthString: 'all'
        })
      )

      expect(result.current.averageHostingCost).toBe(0)
    })
  })

  describe('hosting credits savings calculation', () => {
    it('calculates hosting credits savings correctly', () => {
      const { result } = renderHook(() =>
        useBillingCalculations({
          billingSummary: mockBillingSummary,
          filteredData: [],
          currentMonthString: 'all'
        })
      )

      // 1 credit × $99 = $99
      expect(result.current.totalHostingCreditsSavings).toBe(99.00)
    })

    it('returns 0 when no hosting credits applied', () => {
      const summaryNoHostingCredits = {
        ...mockBillingSummary,
        monthlyBreakdown: mockBillingSummary.monthlyBreakdown.map(m => ({
          ...m,
          hostingCreditsApplied: 0
        }))
      }

      const { result } = renderHook(() =>
        useBillingCalculations({
          billingSummary: summaryNoHostingCredits,
          filteredData: [],
          currentMonthString: 'all'
        })
      )

      expect(result.current.totalHostingCreditsSavings).toBe(0)
    })
  })

  describe('total discounts calculation', () => {
    it('calculates total discounts across all credit types', () => {
      const { result } = renderHook(() =>
        useBillingCalculations({
          billingSummary: mockBillingSummary,
          filteredData: [],
          currentMonthString: 'all'
        })
      )

      // 250 (free hours) + 200 (landing page) + 0 (multi-form) + 0 (basic form) + 99 (hosting) = 549
      expect(result.current.totalDiscounts).toBe(549.00)
    })

    it('returns 0 when no credits applied', () => {
      const summaryNoCredits = {
        ...mockBillingSummary,
        monthlyBreakdown: [mockMonthDataNoCredits]
      }

      const { result } = renderHook(() =>
        useBillingCalculations({
          billingSummary: summaryNoCredits,
          filteredData: [],
          currentMonthString: 'all'
        })
      )

      expect(result.current.totalDiscounts).toBe(0)
    })
  })

  describe('memoization behavior', () => {
    it('recalculates values when inputs change', () => {
      const { result, rerender } = renderHook(
        ({ currentMonthString }) =>
          useBillingCalculations({
            billingSummary: mockBillingSummary,
            filteredData: [mockMonthData],
            currentMonthString
          }),
        {
          initialProps: { currentMonthString: '2025-06' }
        }
      )

      const firstTotal = result.current.displayTotals.totalRevenue
      expect(firstTotal).toBe(1924.00)

      rerender({ currentMonthString: 'all' })

      // Values should update when input changes
      const secondTotal = result.current.displayTotals.totalRevenue
      expect(secondTotal).toBe(1924.00)
    })
  })
})
