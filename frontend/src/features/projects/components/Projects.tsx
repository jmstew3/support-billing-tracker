import { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, Search, DollarSign, FolderKanban } from 'lucide-react';
import { PageHeader } from '../../../components/shared/PageHeader';
import { MonthlyRevenueTable } from './MonthlyRevenueTable';
import { ProjectRevenueChart } from '../../../components/charts/ProjectRevenueChart';
import { ProjectCategoryPieChart } from '../../../components/charts/ProjectCategoryPieChart';
import { Scorecard } from '../../../components/ui/Scorecard';
import { LoadingState } from '../../../components/ui/LoadingState';
import { fetchProjects, formatCurrency, convertMicrosToDollars } from '../../../services/projectsApi';
import { FREE_LANDING_PAGE_START_DATE, FREE_MULTI_FORM_START_DATE, FREE_MULTI_FORMS_PER_MONTH, FREE_BASIC_FORM_START_DATE, FREE_BASIC_FORMS_PER_MONTH } from '../../../config/pricing';
import { queryKeys } from '../../../lib/queryClient';
import type { Project, ProjectFilters } from '../../../types/project';

interface ProjectsProps {
  onToggleMobileMenu?: () => void;
}

export function Projects({ onToggleMobileMenu }: ProjectsProps) {
  // Filter states - shows billable projects (READY, INVOICED, PAID)
  const [filters, setFilters] = useState<ProjectFilters>({
    hostingStatus: 'ALL',
    invoiceStatus: 'BILLABLE', // Shows Ready, Invoiced, and Paid projects
    projectCategory: 'ALL',
    searchQuery: '',
  });

  // Fetch projects with React Query
  const {
    data: projects = [],
    isLoading: loading,
    error: queryError,
    refetch: refetchProjects,
  } = useQuery({
    queryKey: queryKeys.projects.all,
    queryFn: () => fetchProjects(),
  });

  const error = queryError instanceof Error ? queryError.message : queryError ? 'Failed to load projects' : null;

  // Memoized filter change handler
  const handleFilterChange = useCallback((newFilters: Partial<ProjectFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  // Filter projects to show billable statuses (READY, INVOICED, PAID)
  const readyProjects = useMemo(() => {
    return projects.filter((project) => {
      // Show Ready, Invoiced, and Paid projects (exclude Not Ready)
      if (!['READY', 'INVOICED', 'PAID'].includes(project.invoiceStatus)) {
        return false;
      }

      // Search filter
      const matchesSearch = filters.searchQuery.trim() === '' ||
        project.name.toLowerCase().includes(filters.searchQuery.toLowerCase());

      // Hosting status filter
      const matchesHostingStatus = filters.hostingStatus === 'ALL' ||
        project.hostingStatus === filters.hostingStatus;

      // Category filter
      const matchesCategory = filters.projectCategory === 'ALL' ||
        project.projectCategory === filters.projectCategory;

      return matchesSearch && matchesHostingStatus && matchesCategory;
    });
  }, [projects, filters]);

  // Calculate billing summary from ready projects only
  const billingSummary = useMemo(() => {
    let totalReadyRevenue = 0;
    let totalCompletedProjects = 0;

    const monthlyMap = new Map<string, { revenue: number; projects: Project[] }>();

    readyProjects.forEach((project) => {
      // Only count projects with completion dates in total revenue
      // Projects without completion dates are tracked separately
      if (project.projectCompletionDate) {
        const revenue = convertMicrosToDollars(project.revenueAmount.amountMicros);
        totalReadyRevenue += revenue;
        totalCompletedProjects++;

        // Use string extraction to avoid timezone conversion issues
        // If we use new Date(), "2025-07-01" gets shifted to June 30 in EDT
        const monthKey = project.projectCompletionDate.substring(0, 7); // YYYY-MM

        if (!monthlyMap.has(monthKey)) {
          monthlyMap.set(monthKey, { revenue: 0, projects: [] });
        }

        const monthData = monthlyMap.get(monthKey)!;
        monthData.revenue += revenue;
        monthData.projects.push(project);
      }
    });

    // Apply free landing page credit to eligible months (June 2025 onwards)
    let totalLandingPageSavings = 0;
    monthlyMap.forEach((monthData, monthKey) => {
      if (monthKey >= FREE_LANDING_PAGE_START_DATE) {
        // Find first landing page in this month
        const landingPages = monthData.projects.filter(p => p.projectCategory === 'LANDING_PAGE');
        if (landingPages.length > 0) {
          const firstLandingPage = landingPages[0];
          const landingPageRevenue = convertMicrosToDollars(firstLandingPage.revenueAmount.amountMicros);
          monthData.revenue -= landingPageRevenue; // Subtract from month total
          totalLandingPageSavings += landingPageRevenue; // Track total savings
        }
      }
    });

    // Apply free multi-form credit to eligible months (June 2025 onwards)
    let totalMultiFormSavings = 0;
    monthlyMap.forEach((monthData, monthKey) => {
      if (monthKey >= FREE_MULTI_FORM_START_DATE) {
        const multiForms = monthData.projects.filter(p => p.projectCategory === 'MULTI_FORM');
        if (multiForms.length > 0 && FREE_MULTI_FORMS_PER_MONTH > 0) {
          const firstMultiForm = multiForms[0];
          const multiFormRevenue = convertMicrosToDollars(firstMultiForm.revenueAmount.amountMicros);
          monthData.revenue -= multiFormRevenue;
          totalMultiFormSavings += multiFormRevenue;
        }
      }
    });

    // Apply free basic form credits to eligible months (June 2025 onwards)
    let totalBasicFormSavings = 0;
    monthlyMap.forEach((monthData, monthKey) => {
      if (monthKey >= FREE_BASIC_FORM_START_DATE) {
        const basicForms = monthData.projects.filter(p => p.projectCategory === 'BASIC_FORM');
        const creditsToApply = Math.min(basicForms.length, FREE_BASIC_FORMS_PER_MONTH);

        for (let i = 0; i < creditsToApply; i++) {
          const basicFormRevenue = convertMicrosToDollars(basicForms[i].revenueAmount.amountMicros);
          monthData.revenue -= basicFormRevenue;
          totalBasicFormSavings += basicFormRevenue;
        }
      }
    });

    // Convert monthly map to sorted array (oldest first)
    const monthlyBreakdown = Array.from(monthlyMap.entries())
      .map(([month, data]) => ({
        month,
        revenue: data.revenue,
        projects: data.projects,
        projectCount: data.projects.length,
      }))
      .sort((a, b) => a.month.localeCompare(b.month)); // Chronological order

    // Calculate projects without completion dates
    const projectsWithoutCompletionDate = readyProjects.filter(p => !p.projectCompletionDate).length;
    const revenueWithoutCompletionDate = readyProjects
      .filter(p => !p.projectCompletionDate)
      .reduce((sum, p) => sum + convertMicrosToDollars(p.revenueAmount.amountMicros), 0);

    // Adjust total revenue to account for all free form credits
    const adjustedTotalRevenue = totalReadyRevenue - totalLandingPageSavings - totalMultiFormSavings - totalBasicFormSavings;

    return {
      totalReadyRevenue: adjustedTotalRevenue,
      readyProjectCount: readyProjects.length,
      totalCompletedProjects,
      monthlyBreakdown,
      projectsWithoutCompletionDate,
      revenueWithoutCompletionDate,
    };
  }, [readyProjects]);

  // Loading state
  if (loading) {
    return <LoadingState variant="projects" />;
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-4 max-w-md text-center">
          <AlertCircle className="w-12 h-12 text-destructive" />
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-2">Failed to Load Projects</h3>
            <p className="text-sm text-muted-foreground mb-4">{error}</p>
            <button
              onClick={() => refetchProjects()}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-background overflow-auto">
      {/* Header */}
      <PageHeader
        title="Projects"
        showPeriodSelector={false}
        showViewToggle={false}
        onToggleMobileMenu={onToggleMobileMenu}
      />

      {/* Main Content */}
      <div className="flex-1 space-y-4 p-6">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Ready to invoice projects organized by completion month
          </p>
          <div className="text-sm text-muted-foreground">
            {billingSummary.readyProjectCount} projects
          </div>
        </div>

        {/* Billing Summary Cards */}
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          <Scorecard
            title="Ready to Invoice"
            value={formatCurrency(billingSummary.totalReadyRevenue)}
            description={`${billingSummary.readyProjectCount} projects`}
            icon={<DollarSign className="h-4 w-4" />}
            variant="default"
          />
          <Scorecard
            title="Months with Projects"
            value={billingSummary.monthlyBreakdown.length.toString()}
            description="Completion months"
            variant="default"
          />
          <Scorecard
            title="Total Completed"
            value={billingSummary.totalCompletedProjects.toString()}
            description="Projects with completion date"
            variant="default"
          />
        </div>

        {/* Charts Section - Cumulative Billing (2/3) and Category Breakdown (1/3) */}
        {billingSummary.monthlyBreakdown.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
            {/* Project Revenue Chart - Takes 2 columns on desktop */}
            <div className="lg:col-span-2">
              <ProjectRevenueChart
                monthlyBreakdown={billingSummary.monthlyBreakdown}
              />
            </div>

            {/* Category Pie Chart - Takes 1 column */}
            <div className="col-span-1">
              <div className="bg-card border border-border p-6 h-full flex flex-col">
                <h3 className="text-md font-semibold mb-4">Category Breakdown</h3>
                <div className="flex-1 min-h-[300px]">
                  <ProjectCategoryPieChart projects={readyProjects} />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search projects..."
              value={filters.searchQuery}
              onChange={(e) => handleFilterChange({ searchQuery: e.target.value })}
              className="flex h-9 w-full border border-input bg-transparent px-3 pl-8 py-1 text-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>

          {/* Hosting Status Filter */}
          <select
            value={filters.hostingStatus}
            onChange={(e) => handleFilterChange({ hostingStatus: e.target.value as ProjectFilters['hostingStatus'] })}
            className="flex h-9 items-center justify-between border border-input bg-transparent px-3 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="ALL">All Status</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>

          {/* Category Filter */}
          <select
            value={filters.projectCategory}
            onChange={(e) => handleFilterChange({ projectCategory: e.target.value as ProjectFilters['projectCategory'] })}
            className="flex h-9 items-center justify-between border border-input bg-transparent px-3 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="ALL">All Categories</option>
            <option value="MIGRATION">Migration</option>
            <option value="LANDING_PAGE">Landing Page</option>
            <option value="WEBSITE">Website</option>
            <option value="MULTI_FORM">Multi-Form</option>
            <option value="BASIC_FORM">Basic Form</option>
          </select>

          {/* Clear Filters */}
          {(filters.hostingStatus !== 'ALL' || filters.projectCategory !== 'ALL' || filters.searchQuery !== '') && (
            <button
              onClick={() => handleFilterChange({ hostingStatus: 'ALL', projectCategory: 'ALL', searchQuery: '' })}
              className="inline-flex items-center justify-center text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-transparent hover:bg-accent hover:text-accent-foreground h-9 px-4"
            >
              Clear
            </button>
          )}
        </div>
        {/* Monthly Revenue Breakdown - Primary View */}
        {readyProjects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <FolderKanban className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Ready Projects Found</h3>
            <p className="text-sm text-muted-foreground max-w-md">
              {projects.length === 0
                ? 'No projects available. Check your Twenty CRM connection or set VITE_TWENTY_USE_MOCK=false to use live data.'
                : 'No projects with "Ready" invoice status found. Try adjusting your search or filter criteria.'}
            </p>
          </div>
        ) : (
          <MonthlyRevenueTable
            monthlyBreakdown={billingSummary.monthlyBreakdown}
            projectsWithoutCompletionDate={billingSummary.projectsWithoutCompletionDate}
            revenueWithoutCompletionDate={billingSummary.revenueWithoutCompletionDate}
          />
        )}
      </div>
    </div>
  );
}
