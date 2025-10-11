import { useState, useEffect, useMemo } from 'react';
import { LoadingState } from '../ui/LoadingState';
import { PageHeader } from '../shared/PageHeader';
import { RevenueTrackerCard } from './RevenueTrackerCard';
import { usePeriod } from '../../contexts/PeriodContext';
import { useBillingCalculations } from './hooks/useBillingCalculations';
import { DashboardScorecards } from './sections/DashboardScorecards';
import { MonthlyBreakdownTable } from './sections/MonthlyBreakdownTable';
import { MobileMonthBreakdown } from './sections/MobileMonthBreakdown';
import { generateComprehensiveBilling } from '../../services/billingApi';
import { formatMonthLabel } from '../../utils/formatting';
import { exportMonthlyBreakdownDetailedData, type MonthlyBreakdownExportData } from '../../utils/csvExport';
import type { BillingSummary, MonthlyBillingSummary } from '../../types/billing';

interface DashboardProps {
  onToggleMobileMenu?: () => void;
}

export function Dashboard({ onToggleMobileMenu }: DashboardProps) {
  const { selectedYear, selectedMonth, selectedMonths, selectedDay, getMonthStrings, setAvailableData } = usePeriod();
  const [billingSummary, setBillingSummary] = useState<BillingSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Track which sections are expanded
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set());
  const [expandedSections, setExpandedSections] = useState<Map<string, Set<string>>>(new Map());

  // Load comprehensive billing data on mount
  useEffect(() => {
    loadBillingData();
  }, []);

  async function loadBillingData() {
    try {
      setLoading(true);
      setError(null);
      const data = await generateComprehensiveBilling();
      setBillingSummary(data);

      // Register available data with context
      const months = data.monthlyBreakdown.map(m => {
        const [, month] = m.month.split('-').map(Number);
        return month;
      });
      const years = Array.from(new Set(data.monthlyBreakdown.map(m => parseInt(m.month.split('-')[0]))));
      setAvailableData(years, months, []);

      // Start with all months expanded (Level 1 visible)
      const allMonths = new Set(data.monthlyBreakdown.map((m) => m.month));
      setExpandedMonths(allMonths);

      // Start with all sections (tickets/projects/hosting) collapsed (Level 2 visible but contents hidden)
      setExpandedSections(new Map());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load billing data');
      console.error('Error loading billing data:', err);
    } finally {
      setLoading(false);
    }
  }

  // Toggle month expansion
  const toggleMonth = (month: string) => {
    setExpandedMonths((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(month)) {
        newSet.delete(month);
      } else {
        newSet.add(month);
      }
      return newSet;
    });
  };

  // Toggle section expansion (tickets, projects, hosting within a month)
  const toggleSection = (month: string, section: 'tickets' | 'projects' | 'hosting') => {
    setExpandedSections((prev) => {
      const newMap = new Map(prev);
      if (!newMap.has(month)) {
        newMap.set(month, new Set());
      }
      const monthSections = new Set(newMap.get(month)!); // Create new Set to avoid mutation
      if (monthSections.has(section)) {
        monthSections.delete(section);
      } else {
        monthSections.add(section);
      }
      newMap.set(month, monthSections);
      return newMap;
    });
  };

  // Check if section is expanded
  const isSectionExpanded = (month: string, section: 'tickets' | 'projects' | 'hosting') => {
    return expandedSections.get(month)?.has(section) || false;
  };

  // Note: formatMonthLabel now imported from utils/formatting

  // Helper function to filter line items within a month by specific day
  const filterDayData = (monthData: MonthlyBillingSummary, day: string): MonthlyBillingSummary => {
    // Filter tickets by date
    const filteredTickets = monthData.ticketDetails.filter(t => t.date === day);
    const ticketsGrossRevenue = filteredTickets.reduce((sum, t) => sum + t.amount, 0);
    const ticketsRevenue = filteredTickets.reduce((sum, t) => sum + (t.netAmount || t.amount), 0);
    const ticketsFreeHoursSavings = ticketsGrossRevenue - ticketsRevenue;
    const ticketsFreeHoursApplied = filteredTickets.reduce((sum, t) => sum + (t.freeHoursApplied || 0), 0);

    // Filter projects by completionDate
    const filteredProjects = monthData.projectDetails.filter(p => p.completionDate === day);
    const projectsGrossRevenue = filteredProjects.reduce((sum, p) => sum + (p.originalAmount || p.amount), 0);
    const projectsRevenue = filteredProjects.reduce((sum, p) => sum + p.amount, 0);
    const projectsLandingPageCredit = filteredProjects.filter(p => p.isFreeCredit && p.category === 'LANDING_PAGE').length;
    const projectsMultiFormCredit = filteredProjects.filter(p => p.isFreeCredit && p.category === 'MULTI_FORM').length;
    const projectsBasicFormCredit = filteredProjects.filter(p => p.isFreeCredit && p.category === 'BASIC_FORM').length;
    const projectsLandingPageSavings = filteredProjects.filter(p => p.isFreeCredit && p.category === 'LANDING_PAGE').reduce((sum, p) => sum + ((p.originalAmount || 0) - p.amount), 0);
    const projectsMultiFormSavings = filteredProjects.filter(p => p.isFreeCredit && p.category === 'MULTI_FORM').reduce((sum, p) => sum + ((p.originalAmount || 0) - p.amount), 0);
    const projectsBasicFormSavings = filteredProjects.filter(p => p.isFreeCredit && p.category === 'BASIC_FORM').reduce((sum, p) => sum + ((p.originalAmount || 0) - p.amount), 0);

    // Filter hosting by date range (hostingStart <= day <= hostingEnd OR hostingEnd is null)
    const filteredHosting = monthData.hostingDetails.filter(h => {
      const start = h.hostingStart || monthData.month + '-01';
      const end = h.hostingEnd || '9999-12-31'; // No end date means still active
      return day >= start && day <= end;
    });
    const hostingGross = filteredHosting.reduce((sum, h) => sum + h.grossAmount, 0);
    const hostingRevenue = filteredHosting.reduce((sum, h) => sum + h.netAmount, 0);
    const hostingCreditsApplied = filteredHosting.filter(h => h.creditApplied).length;

    return {
      ...monthData,
      ticketDetails: filteredTickets,
      ticketsCount: filteredTickets.length,
      ticketsGrossRevenue,
      ticketsRevenue,
      ticketsFreeHoursApplied,
      ticketsFreeHoursSavings,
      projectDetails: filteredProjects,
      projectsCount: filteredProjects.length,
      projectsGrossRevenue,
      projectsRevenue,
      projectsLandingPageCredit,
      projectsLandingPageSavings,
      projectsMultiFormCredit,
      projectsMultiFormSavings,
      projectsBasicFormCredit,
      projectsBasicFormSavings,
      hostingDetails: filteredHosting,
      hostingSitesCount: filteredHosting.length,
      hostingGross,
      hostingRevenue,
      hostingCreditsApplied,
      totalRevenue: ticketsRevenue + projectsRevenue + hostingRevenue
    };
  };

  // Filter data based on selected month(s) and day from context
  // Convert context values to month string format (YYYY-MM)
  const selectedMonthStrings = getMonthStrings();

  const filteredData = useMemo(() => {
    if (!billingSummary) return [];

    // First filter by month
    let data = selectedMonthStrings !== 'all'
      ? billingSummary.monthlyBreakdown.filter((m) => selectedMonthStrings.includes(m.month))
      : billingSummary.monthlyBreakdown;

    // Then filter by day if selected
    if (selectedDay !== 'all') {
      data = data.map(monthData => filterDayData(monthData, selectedDay));
    }

    return data;
  }, [billingSummary, selectedMonthStrings, selectedDay]);

  // Calculate all billing metrics using custom hook
  const {
    displayTotals,
    totalFreeHoursSavings,
    totalProjectCredits,
    averageTicketCost,
    averageProjectCost,
    averageHostingCost,
    totalHostingCreditsSavings,
    totalDiscounts
  } = useBillingCalculations({
    billingSummary,
    filteredData,
    currentMonthString: selectedMonthStrings === 'all' ? 'all' : (selectedMonths.length === 1 ? selectedMonthStrings[0] : 'multi')
  });

  // Handle Monthly Breakdown export
  const handleExportMonthlyBreakdown = () => {
    if (!filteredData || filteredData.length === 0) return;

    const exportData: MonthlyBreakdownExportData = {
      months: filteredData.map(m => ({
        month: m.month,
        ticketsRevenue: m.ticketsRevenue,
        projectsRevenue: m.projectsRevenue,
        hostingRevenue: m.hostingRevenue,
        totalRevenue: m.totalRevenue,
        // Include all detailed line items
        ticketsCount: m.ticketsCount,
        ticketDetails: m.ticketDetails?.map(t => ({
          date: t.date,
          description: t.description,
          urgency: t.urgency,
          hours: t.hours,
          rate: t.rate,
          amount: t.amount,
          netAmount: t.netAmount,
          freeHoursApplied: t.freeHoursApplied,
        })),
        ticketsGrossRevenue: m.ticketsGrossRevenue,
        ticketsFreeHoursApplied: m.ticketsFreeHoursApplied,
        ticketsFreeHoursSavings: m.ticketsFreeHoursSavings,
        projectsCount: m.projectsCount,
        projectDetails: m.projectDetails?.map(p => ({
          name: p.name,
          completionDate: p.completionDate,
          category: p.category,
          amount: p.amount,
          originalAmount: p.originalAmount,
          isFreeCredit: p.isFreeCredit,
        })),
        projectsGrossRevenue: m.projectsGrossRevenue,
        projectsLandingPageCredit: m.projectsLandingPageCredit,
        projectsLandingPageSavings: m.projectsLandingPageSavings,
        projectsMultiFormCredit: m.projectsMultiFormCredit,
        projectsMultiFormSavings: m.projectsMultiFormSavings,
        projectsBasicFormCredit: m.projectsBasicFormCredit,
        projectsBasicFormSavings: m.projectsBasicFormSavings,
        hostingSitesCount: m.hostingSitesCount,
        hostingDetails: m.hostingDetails?.map(h => ({
          name: h.siteName,
          billingType: h.billingType,
          grossAmount: h.grossAmount,
          creditAmount: h.creditAmount,
          netAmount: h.netAmount,
          hostingStart: h.hostingStart,
          hostingEnd: h.hostingEnd,
        })),
        hostingGross: m.hostingGross,
        hostingCreditsApplied: m.hostingCreditsApplied,
      })),
    };

    // Add totals if viewing multiple months
    if (filteredData.length > 1 && displayTotals) {
      exportData.totals = {
        tickets: displayTotals.totalTicketsRevenue || 0,
        projects: displayTotals.totalProjectsRevenue || 0,
        hosting: displayTotals.totalHostingRevenue || 0,
        total: displayTotals.totalRevenue || 0,
      };
    }

    // Determine period for filename
    const selectedPeriod = selectedMonthStrings === 'all' ? 'all' : (selectedMonths.length === 1 ? selectedMonthStrings[0] : `${selectedMonthStrings[0]}-to-${selectedMonthStrings[selectedMonthStrings.length - 1]}`);
    exportMonthlyBreakdownDetailedData(exportData, selectedPeriod);
  };

  if (loading) {
    return <LoadingState variant="overview" />;
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <p className="text-destructive font-semibold mb-2">Error Loading Data</p>
            <p className="text-sm text-muted-foreground">{error}</p>
            <button
              onClick={loadBillingData}
              className="mt-4 px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!billingSummary) {
    return null;
  }

  return (
    <div className="flex flex-col h-full">
      {/* Sticky Header */}
      <PageHeader
        title="Dashboard"
        periodSelectorType="full"
        showViewToggle={true}
        viewOptions={['all', 'month', 'day']}
        onToggleMobileMenu={onToggleMobileMenu}
      />

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="p-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-6 lg:space-y-8">
          {/* Summary Scorecards */}
          <DashboardScorecards
            displayTotals={displayTotals}
            totalFreeHoursSavings={totalFreeHoursSavings}
            totalProjectCredits={totalProjectCredits}
            totalHostingCreditsSavings={totalHostingCreditsSavings}
            totalDiscounts={totalDiscounts}
            averageTicketCost={averageTicketCost}
            averageProjectCost={averageProjectCost}
            averageHostingCost={averageHostingCost}
            currentMonthString={selectedMonthStrings === 'all' ? 'all' : (selectedMonths.length === 1 ? selectedMonthStrings[0] : 'multi')}
            billingSummary={billingSummary}
          />

          {/* Monthly Revenue by Category - RevenueTrackerCard */}
          <div className="w-full">
            <RevenueTrackerCard
              monthlyData={filteredData}
              selectedYear={selectedYear}
              title={
                selectedDay !== 'all'
                  ? `Revenue for ${new Date(selectedDay).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`
                  : selectedMonthStrings === 'all'
                    ? 'Monthly Revenue by Category'
                    : selectedMonths.length === 1
                      ? `${formatMonthLabel(selectedMonthStrings[0])} Revenue Breakdown`
                      : `${formatMonthLabel(selectedMonthStrings[0])} - ${formatMonthLabel(selectedMonthStrings[selectedMonthStrings.length - 1])} Revenue Breakdown`
              }
              initialViewType="table"
              gridSpan=""
            />
          </div>

          {/* Monthly Breakdown - Desktop Table */}
          <MonthlyBreakdownTable
            filteredData={filteredData}
            expandedMonths={expandedMonths}
            toggleMonth={toggleMonth}
            toggleSection={toggleSection}
            isSectionExpanded={isSectionExpanded}
            displayTotals={displayTotals}
            onExport={handleExportMonthlyBreakdown}
          />

          {/* Monthly Breakdown - Mobile Cards */}
          <MobileMonthBreakdown
            filteredData={filteredData}
            expandedMonths={expandedMonths}
            toggleMonth={toggleMonth}
            toggleSection={toggleSection}
            isSectionExpanded={isSectionExpanded}
            displayTotals={displayTotals}
          />
        </div>
      </main>
    </div>
  );
}