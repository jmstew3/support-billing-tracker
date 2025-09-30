import { useState } from 'react';
import { ChevronDown, ChevronUp, Calendar, AlertTriangle } from 'lucide-react';
import { formatCurrency, convertMicrosToDollars } from '../services/projectsApi';
import type { Project } from '../types/project';

interface MonthlyBreakdown {
  month: string; // Format: YYYY-MM
  revenue: number;
  projects: Project[];
  projectCount: number;
}

interface MonthlyRevenueTableProps {
  monthlyBreakdown: MonthlyBreakdown[];
  projectsWithoutCompletionDate: number;
  revenueWithoutCompletionDate: number;
}

export function MonthlyRevenueTable({
  monthlyBreakdown,
  projectsWithoutCompletionDate,
  revenueWithoutCompletionDate,
}: MonthlyRevenueTableProps) {
  // Track which months are expanded (start collapsed)
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set());

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

  // Calculate grand total
  const grandTotal = monthlyBreakdown.reduce((sum, month) => sum + month.revenue, 0);

  // Format month for display (e.g., "September 2025")
  function formatMonthLabel(monthStr: string) {
    const [year, month] = monthStr.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }

  // Format date for display
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Format category for display
  const formatCategory = (category: string) => {
    return category
      .split('_')
      .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
      .join(' ');
  };

  // Get category badge style (vibrant muted colors)
  const getCategoryBadge = (category: string) => {
    switch (category) {
      case 'MIGRATION':
        return 'bg-purple-100 text-purple-800 ring-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:ring-purple-800';
      case 'LANDING_PAGE':
        return 'bg-blue-100 text-blue-800 ring-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:ring-blue-800';
      case 'WEBSITE':
        return 'bg-green-100 text-green-800 ring-green-200 dark:bg-green-900/30 dark:text-green-300 dark:ring-green-800';
      default:
        return 'bg-gray-100 text-gray-800 ring-gray-200 dark:bg-gray-900/30 dark:text-gray-300 dark:ring-gray-800';
    }
  };

  // Get hosting status badge style (vibrant muted colors)
  const getHostingBadge = (status: string) => {
    return status === 'ACTIVE'
      ? 'bg-emerald-100 text-emerald-800 ring-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:ring-emerald-800'
      : 'bg-slate-100 text-slate-600 ring-slate-200 dark:bg-slate-900/30 dark:text-slate-400 dark:ring-slate-800';
  };

  return (
    <div className="space-y-4">
      {/* Unified Projects Table with Nested Months */}
      <div className="border bg-card text-card-foreground">
        <div className="relative w-full overflow-auto">
          <table className="w-full caption-bottom text-sm">
            {/* Main Table Header */}
            <thead className="[&_tr]:border-b" style={{ boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}>
              <tr className="border-b">
                <th className="h-10 px-4 text-left align-middle font-medium text-muted-foreground min-w-[200px]">
                  Name
                </th>
                <th className="h-10 px-4 text-left align-middle font-medium text-muted-foreground min-w-[120px]">
                  Category
                </th>
                <th className="h-10 px-4 text-left align-middle font-medium text-muted-foreground min-w-[100px]">
                  Hosting
                </th>
                <th className="h-10 px-4 text-left align-middle font-medium text-muted-foreground min-w-[110px]">
                  Requested
                </th>
                <th className="h-10 px-4 text-left align-middle font-medium text-muted-foreground min-w-[110px]">
                  Completed
                </th>
                <th className="h-10 px-4 text-right align-middle font-medium text-muted-foreground min-w-[100px]">
                  Revenue
                </th>
                <th className="h-10 px-4 text-left align-middle font-medium text-muted-foreground min-w-[110px]">
                  Invoice #
                </th>
              </tr>
            </thead>
            <tbody>
              {/* Iterate through each month */}
              {monthlyBreakdown.map((monthData) => {
                const isExpanded = expandedMonths.has(monthData.month);

                return (
                  <>
                    {/* Month Header Row */}
                    <tr
                      key={`month-${monthData.month}`}
                      className="bg-muted/50 hover:bg-muted/70 cursor-pointer border-b transition-colors"
                      onClick={() => toggleMonth(monthData.month)}
                    >
                      <td colSpan={7} className="py-3 px-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {isExpanded ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                            <span className="font-bold text-base">{formatMonthLabel(monthData.month)}</span>
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-950/30 text-green-700 dark:text-green-300">
                              {monthData.projectCount} {monthData.projectCount === 1 ? 'project' : 'projects'}
                            </span>
                          </div>
                          <div className="font-bold text-base">
                            {formatCurrency(monthData.revenue)}
                          </div>
                        </div>
                      </td>
                    </tr>

                    {/* Project Rows (only if expanded) */}
                    {isExpanded && (
                      <>
                        {monthData.projects.map((project) => {
                          const revenue = convertMicrosToDollars(project.revenueAmount.amountMicros);
                          return (
                            <tr
                              key={project.id}
                              className="border-b transition-colors hover:bg-muted/50"
                            >
                              {/* Name - with left indent */}
                              <td className="py-3 pl-12 pr-4 align-middle">
                                <div className="line-clamp-2 font-medium">{project.name}</div>
                              </td>

                              {/* Category */}
                              <td className="py-3 px-4 align-middle">
                                <span
                                  className={`inline-flex items-center px-2 py-1 text-xs font-medium ring-1 ring-inset ${getCategoryBadge(
                                    project.projectCategory
                                  )}`}
                                >
                                  {formatCategory(project.projectCategory)}
                                </span>
                              </td>

                              {/* Hosting Status */}
                              <td className="py-3 px-4 align-middle">
                                <span
                                  className={`inline-flex items-center px-2 py-1 text-xs font-medium ring-1 ring-inset ${getHostingBadge(
                                    project.hostingStatus
                                  )}`}
                                >
                                  {project.hostingStatus}
                                </span>
                              </td>

                              {/* Requested Date */}
                              <td className="py-3 px-4 align-middle text-muted-foreground text-xs">
                                {formatDate(project.projectRequestedDate)}
                              </td>

                              {/* Completion Date */}
                              <td className="py-3 px-4 align-middle text-xs font-medium">
                                {formatDate(project.projectCompletionDate)}
                              </td>

                              {/* Revenue */}
                              <td className="py-3 px-4 align-middle text-right font-semibold">
                                {formatCurrency(revenue)}
                              </td>

                              {/* Invoice Number */}
                              <td className="py-3 px-4 align-middle text-muted-foreground text-xs">
                                {project.invoiceNumber || 'N/A'}
                              </td>
                            </tr>
                          );
                        })}

                        {/* Month Subtotal Row */}
                        <tr className="bg-muted/30 border-b font-semibold">
                          <td colSpan={5} className="py-3 px-6 text-right text-sm">
                            {formatMonthLabel(monthData.month)} Subtotal
                          </td>
                          <td className="py-3 px-4 text-right">
                            {formatCurrency(monthData.revenue)}
                          </td>
                          <td className="py-3 px-4"></td>
                        </tr>
                      </>
                    )}
                  </>
                );
              })}

              {/* Grand Total Row */}
              <tr className="bg-muted/60 border-t-2 font-bold">
                <td colSpan={5} className="py-4 px-6 text-right text-base">
                  GRAND TOTAL
                </td>
                <td className="py-4 px-4 text-right text-lg">
                  {formatCurrency(grandTotal)}
                </td>
                <td className="py-4 px-4"></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>


      {/* Warning for projects without completion dates */}
      {projectsWithoutCompletionDate > 0 && (
        <div className="border bg-destructive/10 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-semibold mb-1">
                Projects Without Completion Date
              </h4>
              <p className="text-sm text-muted-foreground">
                {projectsWithoutCompletionDate} project{projectsWithoutCompletionDate !== 1 ? 's' : ''}{' '}
                ({formatCurrency(revenueWithoutCompletionDate)}){' '}
                {projectsWithoutCompletionDate !== 1 ? 'are' : 'is'} not included in the monthly breakdown
                above because {projectsWithoutCompletionDate !== 1 ? 'they lack' : 'it lacks'} completion dates.
                Please add completion dates in Twenty CRM to include these projects.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}