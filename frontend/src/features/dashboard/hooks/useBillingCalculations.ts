import { useMemo } from 'react'
import type { BillingSummary, MonthlyBillingSummary } from '../../../types/billing'

export interface UseBillingCalculationsProps {
  billingSummary: BillingSummary | null
  filteredData: MonthlyBillingSummary[]
  currentMonthString: string
}

export interface BillingCalculations {
  displayTotals: {
    totalRevenue: number
    totalTicketsRevenue: number
    totalProjectsRevenue: number
    totalHostingRevenue: number
  }
  totalFreeHoursSavings: number
  totalLandingPageSavings: number
  totalMultiFormSavings: number
  totalBasicFormSavings: number
  totalProjectCredits: number
  averageTicketCost: number
  averageProjectCost: number
  averageHostingCost: number
  totalHostingCreditsSavings: number
  totalDiscounts: number
}

/**
 * Hook to calculate all billing-related metrics and totals
 * Extracted from Dashboard.tsx lines 117-189
 */
export function useBillingCalculations({
  billingSummary,
  filteredData,
  currentMonthString
}: UseBillingCalculationsProps): BillingCalculations {
  return useMemo(() => {
    // Calculate totals for filtered data
    const displayTotals =
      currentMonthString === 'all'
        ? {
            // Calculate totalRevenue by summing all months for all sources to match table total
            // (billingSummary.totalRevenue uses latest month's hosting MRR only)
            totalRevenue: (billingSummary?.totalTicketsRevenue || 0) +
                         (billingSummary?.totalProjectsRevenue || 0) +
                         (billingSummary?.monthlyBreakdown.reduce((sum, m) => sum + m.hostingRevenue, 0) || 0),
            totalTicketsRevenue: billingSummary?.totalTicketsRevenue || 0,
            totalProjectsRevenue: billingSummary?.totalProjectsRevenue || 0,
            // Override totalHostingRevenue to sum all months for table display
            // (billingSummary.totalHostingRevenue is MRR = latest month only)
            totalHostingRevenue: billingSummary?.monthlyBreakdown.reduce(
              (sum, m) => sum + m.hostingRevenue,
              0
            ) || 0
          }
        : {
            totalRevenue: filteredData.reduce((sum, m) => sum + m.totalRevenue, 0),
            totalTicketsRevenue: filteredData.reduce((sum, m) => sum + m.ticketsRevenue, 0),
            totalProjectsRevenue: filteredData.reduce((sum, m) => sum + m.projectsRevenue, 0),
            totalHostingRevenue: filteredData.reduce((sum, m) => sum + m.hostingRevenue, 0)
          }

    // Calculate free hours savings for display
    const totalFreeHoursSavings =
      currentMonthString === 'all'
        ? billingSummary?.monthlyBreakdown.reduce((sum, m) => sum + m.ticketsFreeHoursSavings, 0) || 0
        : filteredData.reduce((sum, m) => sum + m.ticketsFreeHoursSavings, 0)

    // Calculate free landing page savings for display
    const totalLandingPageSavings =
      currentMonthString === 'all'
        ? billingSummary?.monthlyBreakdown.reduce((sum, m) => sum + m.projectsLandingPageSavings, 0) || 0
        : filteredData.reduce((sum, m) => sum + m.projectsLandingPageSavings, 0)

    // Calculate free multi-form savings for display
    const totalMultiFormSavings =
      currentMonthString === 'all'
        ? billingSummary?.monthlyBreakdown.reduce((sum, m) => sum + m.projectsMultiFormSavings, 0) || 0
        : filteredData.reduce((sum, m) => sum + m.projectsMultiFormSavings, 0)

    // Calculate free basic form savings for display
    const totalBasicFormSavings =
      currentMonthString === 'all'
        ? billingSummary?.monthlyBreakdown.reduce((sum, m) => sum + m.projectsBasicFormSavings, 0) || 0
        : filteredData.reduce((sum, m) => sum + m.projectsBasicFormSavings, 0)

    // Calculate total project credits
    const totalProjectCredits = totalLandingPageSavings + totalMultiFormSavings + totalBasicFormSavings

    // Calculate average costs
    const totalTicketsCount = billingSummary?.monthlyBreakdown.reduce((sum, m) => sum + m.ticketsCount, 0) || 0
    const totalTicketsRevenue = billingSummary?.totalTicketsRevenue || 0
    const averageTicketCost = totalTicketsCount > 0 ? totalTicketsRevenue / totalTicketsCount : 0

    const totalProjectsCount = billingSummary?.monthlyBreakdown.reduce((sum, m) => sum + m.projectsCount, 0) || 0
    const totalProjectsRevenue = billingSummary?.totalProjectsRevenue || 0
    const averageProjectCost = totalProjectsCount > 0 ? totalProjectsRevenue / totalProjectsCount : 0

    const totalHostingSiteMonths = billingSummary?.monthlyBreakdown.reduce((sum, m) => sum + m.hostingSitesCount, 0) || 0
    const totalHostingRevenue = billingSummary?.monthlyBreakdown.reduce((sum, m) => sum + m.hostingRevenue, 0) || 0
    const averageHostingCost = totalHostingSiteMonths > 0 ? totalHostingRevenue / totalHostingSiteMonths : 0

    // Calculate total hosting credits savings (credits applied × $99 per site)
    const totalHostingCreditsSavings = billingSummary?.monthlyBreakdown.reduce(
      (sum, m) => sum + ((m.hostingCreditsApplied || 0) * 99),
      0
    ) || 0

    // Calculate total discounts
    const totalDiscounts = billingSummary?.monthlyBreakdown.reduce(
      (sum, m) =>
        sum +
        (m.ticketsFreeHoursSavings || 0) +
        (m.projectsLandingPageSavings || 0) +
        (m.projectsMultiFormSavings || 0) +
        (m.projectsBasicFormSavings || 0) +
        ((m.hostingCreditsApplied || 0) * 99), // multiply count by $99
      0
    ) || 0

    return {
      displayTotals,
      totalFreeHoursSavings,
      totalLandingPageSavings,
      totalMultiFormSavings,
      totalBasicFormSavings,
      totalProjectCredits,
      averageTicketCost,
      averageProjectCost,
      averageHostingCost,
      totalHostingCreditsSavings,
      totalDiscounts
    }
  }, [billingSummary, filteredData, currentMonthString])
}
