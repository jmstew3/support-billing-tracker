import { useState, useEffect, useMemo } from 'react';
import { FolderKanban, Loader2, AlertCircle, Search, DollarSign } from 'lucide-react';
import { MonthlyRevenueTable } from './MonthlyRevenueTable';
import { CumulativeBillingChart } from './CumulativeBillingChart';
import { Scorecard } from './ui/Scorecard';
import { LoadingState } from './ui/LoadingState';
import { fetchProjects, formatCurrency, convertMicrosToDollars } from '../services/projectsApi';
import type { Project, ProjectFilters } from '../types/project';

export function Projects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter states - hard-coded to READY invoice status for billing focus
  const [filters, setFilters] = useState<ProjectFilters>({
    hostingStatus: 'ALL',
    invoiceStatus: 'READY', // Hard-coded for billing reconciliation
    projectCategory: 'ALL',
    searchQuery: '',
  });

  // Fetch projects on component mount
  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchProjects();
      setProjects(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load projects');
      console.error('Error loading projects:', err);
    } finally {
      setLoading(false);
    }
  };

  // Filter projects to only show READY status (billing reconciliation focus)
  const readyProjects = useMemo(() => {
    return projects.filter((project) => {
      // Only show ready invoices (ready to invoice)
      if (project.invoiceStatus !== 'READY') {
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
      const revenue = convertMicrosToDollars(project.revenueAmount.amountMicros);
      totalReadyRevenue += revenue;

      if (project.projectCompletionDate) {
        totalCompletedProjects++;

        const date = new Date(project.projectCompletionDate);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

        if (!monthlyMap.has(monthKey)) {
          monthlyMap.set(monthKey, { revenue: 0, projects: [] });
        }

        const monthData = monthlyMap.get(monthKey)!;
        monthData.revenue += revenue;
        monthData.projects.push(project);
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

    return {
      totalReadyRevenue,
      readyProjectCount: readyProjects.length,
      totalCompletedProjects,
      monthlyBreakdown,
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
              onClick={loadProjects}
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
      <div className="border-b">
        <div className="flex h-16 items-center px-6">
          <div className="flex items-center gap-2">
            <FolderKanban className="h-5 w-5" />
            <h1 className="text-xl font-semibold">Projects</h1>
          </div>
        </div>
      </div>

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
        <div className="grid gap-4 md:grid-cols-3">
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

        {/* Cumulative Billing Chart */}
        {billingSummary.monthlyBreakdown.length > 0 && (
          <CumulativeBillingChart
            data={billingSummary.monthlyBreakdown.map((m) => ({
              month: m.month,
              revenue: m.revenue,
            }))}
          />
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
              onChange={(e) => setFilters({ ...filters, searchQuery: e.target.value })}
              className="flex h-9 w-full border border-input bg-transparent px-3 pl-8 py-1 text-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>

          {/* Hosting Status Filter */}
          <select
            value={filters.hostingStatus}
            onChange={(e) => setFilters({ ...filters, hostingStatus: e.target.value as ProjectFilters['hostingStatus'] })}
            className="flex h-9 items-center justify-between border border-input bg-transparent px-3 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="ALL">All Status</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>

          {/* Category Filter */}
          <select
            value={filters.projectCategory}
            onChange={(e) => setFilters({ ...filters, projectCategory: e.target.value as ProjectFilters['projectCategory'] })}
            className="flex h-9 items-center justify-between border border-input bg-transparent px-3 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="ALL">All Categories</option>
            <option value="MIGRATION">Migration</option>
            <option value="LANDING_PAGE">Landing Page</option>
            <option value="WEBSITE">Website</option>
          </select>

          {/* Clear Filters */}
          {(filters.hostingStatus !== 'ALL' || filters.projectCategory !== 'ALL' || filters.searchQuery !== '') && (
            <button
              onClick={() => setFilters({ ...filters, hostingStatus: 'ALL', projectCategory: 'ALL', searchQuery: '' })}
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