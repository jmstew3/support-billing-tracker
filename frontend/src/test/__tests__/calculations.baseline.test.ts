import { describe, it, expect } from 'vitest'
import { mockBillingSummary, mockMonthData, mockMonthDataNoCredits } from '../fixtures/billing'

describe('Billing Calculations Baseline', () => {
  describe('Display Totals Calculation', () => {
    it('calculates total revenue for "all" period', () => {
      const totalRevenue = mockBillingSummary.monthlyBreakdown.reduce(
        (sum, m) => sum + m.totalRevenue,
        0
      )
      expect(totalRevenue).toBe(1924.00)
    })

    it('calculates tickets revenue for "all" period', () => {
      const ticketsRevenue = mockBillingSummary.monthlyBreakdown.reduce(
        (sum, m) => sum + m.ticketsRevenue,
        0
      )
      expect(ticketsRevenue).toBe(1025.00)
    })

    it('calculates projects revenue for "all" period', () => {
      const projectsRevenue = mockBillingSummary.monthlyBreakdown.reduce(
        (sum, m) => sum + m.projectsRevenue,
        0
      )
      expect(projectsRevenue).toBe(800.00)
    })

    it('calculates hosting revenue for "all" period', () => {
      const hostingRevenue = mockBillingSummary.monthlyBreakdown.reduce(
        (sum, m) => sum + m.hostingRevenue,
        0
      )
      expect(hostingRevenue).toBe(99.00)
    })
  })

  describe('Free Hours Savings Calculation', () => {
    it('calculates free hours savings correctly', () => {
      const savings = mockBillingSummary.monthlyBreakdown.reduce(
        (sum, m) => sum + m.ticketsFreeHoursSavings,
        0
      )
      expect(savings).toBe(250.00)
    })

    it('calculates free hours applied correctly', () => {
      const hoursApplied = mockBillingSummary.monthlyBreakdown.reduce(
        (sum, m) => sum + m.ticketsFreeHoursApplied,
        0
      )
      expect(hoursApplied).toBe(2.5)
    })

    it('verifies gross revenue minus savings equals net revenue', () => {
      const month = mockMonthData
      const calculatedNet = month.ticketsGrossRevenue - month.ticketsFreeHoursSavings
      expect(calculatedNet).toBeCloseTo(month.ticketsRevenue, 2)
    })
  })

  describe('Project Credits Calculation', () => {
    it('calculates landing page savings correctly', () => {
      const landingPageSavings = mockBillingSummary.monthlyBreakdown.reduce(
        (sum, m) => sum + m.projectsLandingPageSavings,
        0
      )
      expect(landingPageSavings).toBe(200.00)
    })

    it('tracks landing page credit count correctly', () => {
      const creditCount = mockBillingSummary.monthlyBreakdown.reduce(
        (sum, m) => sum + m.projectsLandingPageCredit,
        0
      )
      expect(creditCount).toBe(1)
    })

    it('calculates total project credits correctly', () => {
      const totalCredits = mockBillingSummary.monthlyBreakdown.reduce(
        (sum, m) =>
          sum +
          m.projectsLandingPageSavings +
          m.projectsMultiFormSavings +
          m.projectsBasicFormSavings,
        0
      )
      expect(totalCredits).toBe(200.00)
    })

    it('verifies gross revenue minus credits equals net revenue', () => {
      const month = mockMonthData
      const calculatedNet =
        month.projectsGrossRevenue -
        month.projectsLandingPageSavings -
        month.projectsMultiFormSavings -
        month.projectsBasicFormSavings
      expect(calculatedNet).toBeCloseTo(month.projectsRevenue, 2)
    })
  })

  describe('Hosting Credits Calculation', () => {
    it('calculates hosting credits savings correctly', () => {
      const creditsSavings = mockBillingSummary.monthlyBreakdown.reduce(
        (sum, m) => sum + (m.hostingCreditsApplied || 0) * 99,
        0
      )
      expect(creditsSavings).toBe(99.00) // 1 credit × $99
    })

    it('tracks hosting credits applied correctly', () => {
      const creditsApplied = mockBillingSummary.monthlyBreakdown.reduce(
        (sum, m) => sum + (m.hostingCreditsApplied || 0),
        0
      )
      expect(creditsApplied).toBe(1)
    })

    it('verifies gross minus credits equals net revenue', () => {
      const month = mockMonthData
      const creditAmount = (month.hostingCreditsApplied || 0) * 99
      const calculatedNet = month.hostingGross - creditAmount
      expect(calculatedNet).toBeCloseTo(month.hostingRevenue, 2)
    })
  })

  describe('Average Cost Calculations', () => {
    it('calculates average ticket cost correctly', () => {
      const totalCount = mockBillingSummary.monthlyBreakdown.reduce(
        (sum, m) => sum + m.ticketsCount,
        0
      )
      const totalRevenue = mockBillingSummary.monthlyBreakdown.reduce(
        (sum, m) => sum + m.ticketsRevenue,
        0
      )
      const average = totalCount > 0 ? totalRevenue / totalCount : 0

      expect(average).toBeCloseTo(341.67, 2) // 1025 / 3
    })

    it('calculates average project cost correctly', () => {
      const totalCount = mockBillingSummary.monthlyBreakdown.reduce(
        (sum, m) => sum + m.projectsCount,
        0
      )
      const totalRevenue = mockBillingSummary.monthlyBreakdown.reduce(
        (sum, m) => sum + m.projectsRevenue,
        0
      )
      const average = totalCount > 0 ? totalRevenue / totalCount : 0

      expect(average).toBeCloseTo(400.00, 2) // 800 / 2
    })

    it('calculates average hosting cost correctly', () => {
      const totalSiteMonths = mockBillingSummary.monthlyBreakdown.reduce(
        (sum, m) => sum + m.hostingSitesCount,
        0
      )
      const totalRevenue = mockBillingSummary.monthlyBreakdown.reduce(
        (sum, m) => sum + m.hostingRevenue,
        0
      )
      const average = totalSiteMonths > 0 ? totalRevenue / totalSiteMonths : 0

      expect(average).toBeCloseTo(49.50, 2) // 99 / 2
    })
  })

  describe('Total Discounts Calculation', () => {
    it('calculates total discounts across all credit types', () => {
      const totalDiscounts = mockBillingSummary.monthlyBreakdown.reduce(
        (sum, m) =>
          sum +
          (m.ticketsFreeHoursSavings || 0) +
          (m.projectsLandingPageSavings || 0) +
          (m.projectsMultiFormSavings || 0) +
          (m.projectsBasicFormSavings || 0) +
          ((m.hostingCreditsApplied || 0) * 99),
        0
      )
      expect(totalDiscounts).toBe(549.00) // 250 + 200 + 0 + 0 + 99
    })
  })

  describe('Month Without Credits (Before June 2025)', () => {
    it('has no free hours savings', () => {
      expect(mockMonthDataNoCredits.ticketsFreeHoursSavings).toBe(0)
      expect(mockMonthDataNoCredits.ticketsFreeHoursApplied).toBe(0)
    })

    it('has no project credits', () => {
      expect(mockMonthDataNoCredits.projectsLandingPageSavings).toBe(0)
      expect(mockMonthDataNoCredits.projectsLandingPageCredit).toBe(0)
    })

    it('has no hosting credits', () => {
      expect(mockMonthDataNoCredits.hostingCreditsApplied).toBe(0)
    })

    it('gross revenue equals net revenue', () => {
      expect(mockMonthDataNoCredits.ticketsRevenue).toBe(mockMonthDataNoCredits.ticketsGrossRevenue)
      expect(mockMonthDataNoCredits.projectsRevenue).toBe(mockMonthDataNoCredits.projectsGrossRevenue)
      expect(mockMonthDataNoCredits.hostingRevenue).toBe(mockMonthDataNoCredits.hostingGross)
    })
  })

  describe('Data Integrity Checks', () => {
    it('monthly total revenue equals sum of categories', () => {
      const month = mockMonthData
      const calculatedTotal = month.ticketsRevenue + month.projectsRevenue + month.hostingRevenue
      expect(calculatedTotal).toBeCloseTo(month.totalRevenue, 2)
    })

    it('ticket details sum matches gross revenue', () => {
      const month = mockMonthData
      const detailsSum = month.ticketDetails.reduce((sum, t) => sum + t.amount, 0)
      expect(detailsSum).toBeCloseTo(month.ticketsGrossRevenue, 2)
    })

    it('project details sum matches gross revenue', () => {
      const month = mockMonthData
      const detailsSum = month.projectDetails.reduce(
        (sum, p) => sum + (p.originalAmount || p.amount),
        0
      )
      expect(detailsSum).toBeCloseTo(month.projectsGrossRevenue, 2)
    })

    it('hosting details sum matches gross revenue', () => {
      const month = mockMonthData
      const detailsSum = month.hostingDetails.reduce((sum, h) => sum + h.grossAmount, 0)
      expect(detailsSum).toBeCloseTo(month.hostingGross, 2)
    })
  })
})
