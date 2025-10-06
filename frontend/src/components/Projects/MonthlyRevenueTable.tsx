import { useState } from 'react';
import { ChevronDown, ChevronUp, AlertTriangle, Zap } from 'lucide-react';
import { formatCurrency, formatCurrencyAccounting, convertMicrosToDollars } from '../../services/projectsApi';
import { FREE_LANDING_PAGE_START_DATE } from '../../config/pricing';
import { SiteFavicon } from '../ui/SiteFavicon';
import { CountBadge, CreditBadge } from '../ui/BillingBadge';
import type { Project } from '../../types/project';

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

  // Calculate grand totals
  const grandTotal = monthlyBreakdown.reduce((sum, month) => sum + month.revenue, 0);

  // Calculate total credits applied (dollar amount)
  const grandTotalCredits = monthlyBreakdown.reduce((sum, monthData) => {
    const isEligibleMonth = monthData.month >= FREE_LANDING_PAGE_START_DATE;
    if (!isEligibleMonth) return sum;

    let monthCreditAmount = 0;
    monthData.projects.forEach((project, index) => {
      const revenue = convertMicrosToDollars(project.revenueAmount.amountMicros);

      // Check landing page credit (1st landing page)
      const isLandingPage = project.projectCategory === 'LANDING_PAGE';
      const landingPageIndex = monthData.projects
        .slice(0, index + 1)
        .filter(p => p.projectCategory === 'LANDING_PAGE')
        .length;
      const isFreeLandingPage = isLandingPage && landingPageIndex === 1;

      // Check multi-form credit (1st multi-form)
      const isMultiForm = project.projectCategory === 'MULTI_FORM';
      const multiFormIndex = monthData.projects
        .slice(0, index + 1)
        .filter(p => p.projectCategory === 'MULTI_FORM')
        .length;
      const isFreeMultiForm = isMultiForm && multiFormIndex === 1;

      // Check basic form credit (first 5 basic forms)
      const isBasicForm = project.projectCategory === 'BASIC_FORM';
      const basicFormIndex = monthData.projects
        .slice(0, index + 1)
        .filter(p => p.projectCategory === 'BASIC_FORM')
        .length;
      const isFreeBasicForm = isBasicForm && basicFormIndex <= 5;

      if (isFreeLandingPage || isFreeMultiForm || isFreeBasicForm) {
        monthCreditAmount += revenue;
      }
    });

    return sum + monthCreditAmount;
  }, 0);

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
        return 'bg-cyan-100 text-cyan-800 ring-cyan-200 dark:bg-cyan-900/30 dark:text-cyan-300 dark:ring-cyan-800';
      case 'MULTI_FORM':
        return 'bg-orange-100 text-orange-800 ring-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:ring-orange-800';
      case 'BASIC_FORM':
        return 'bg-teal-100 text-teal-800 ring-teal-200 dark:bg-teal-900/30 dark:text-teal-300 dark:ring-teal-800';
      default:
        return 'bg-gray-100 text-gray-800 ring-gray-200 dark:bg-gray-900/30 dark:text-gray-300 dark:ring-gray-800';
    }
  };

  // Get hosting status badge style
  const getHostingBadge = (status: string) => {
    // ACTIVE: plain text, no badge styling
    // INACTIVE: grey badge with ring
    return status === 'ACTIVE'
      ? ''
      : 'bg-slate-100 text-slate-600 ring-slate-200 dark:bg-slate-900/30 dark:text-slate-400 dark:ring-slate-800';
  };

  // Format hosting status for display
  const formatHostingStatus = (status: string) => {
    return status.charAt(0) + status.slice(1).toLowerCase();
  };

  return (
    <div className="space-y-4">
      {/* Unified Projects Table with Nested Months */}
      <div className="border bg-card text-card-foreground">
        <div className="relative w-full overflow-auto">
          <table className="w-full caption-bottom text-sm">
            {/* Main Table Header */}
            <thead className="[&_tr]:border-b" style={{ boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}>
              <tr className="border-b divide-x">
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
                <th className="h-10 px-4 text-left align-middle font-medium text-muted-foreground min-w-[110px]">
                  Invoice #
                </th>
                <th className="h-10 px-4 text-right align-middle font-medium text-muted-foreground min-w-[100px]">
                  Gross
                </th>
                <th className="h-10 px-4 text-right align-middle font-medium text-muted-foreground min-w-[80px]">
                  Credit
                </th>
                <th className="h-10 px-4 text-right align-middle font-medium text-muted-foreground min-w-[100px]">
                  Net
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
                      <td colSpan={9} className="py-3 px-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {isExpanded ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                            <span className="font-bold text-base">{formatMonthLabel(monthData.month)}</span>
                            <CountBadge
                              text={`${monthData.projectCount} ${monthData.projectCount === 1 ? 'project' : 'projects'}`}
                              size="sm"
                            />

                            {/* Calculate and display credit badges for this month */}
                            {(() => {
                              if (monthData.month < FREE_LANDING_PAGE_START_DATE) return null;

                              const landingPages = monthData.projects.filter(p => p.projectCategory === 'LANDING_PAGE');
                              const multiForms = monthData.projects.filter(p => p.projectCategory === 'MULTI_FORM');
                              const basicForms = monthData.projects.filter(p => p.projectCategory === 'BASIC_FORM');

                              return (
                                <>
                                  {landingPages.length > 0 && (
                                    <CreditBadge text="1 Free Landing Page Credit" size="sm" />
                                  )}
                                  {multiForms.length > 0 && (
                                    <CreditBadge text="1 Free Multi-Form" size="sm" />
                                  )}
                                  {basicForms.length > 0 && (
                                    <CreditBadge
                                      text={`${Math.min(basicForms.length, 5)} Free Basic Form${Math.min(basicForms.length, 5) > 1 ? 's' : ''}`}
                                      size="sm"
                                    />
                                  )}
                                </>
                              );
                            })()}
                          </div>
                          <div className="font-bold text-base tabular-nums">{formatCurrency(monthData.revenue)}</div>
                        </div>
                      </td>
                    </tr>

                    {/* Project Rows (only if expanded) */}
                    {isExpanded && (
                      <>
                        {monthData.projects.map((project, index) => {
                          const revenue = convertMicrosToDollars(project.revenueAmount.amountMicros);

                          // Determine if this project receives a free credit
                          const isEligibleMonth = monthData.month >= FREE_LANDING_PAGE_START_DATE;

                          // Check landing page credit (1st landing page)
                          const isLandingPage = project.projectCategory === 'LANDING_PAGE';
                          const landingPageIndex = monthData.projects
                            .slice(0, index + 1)
                            .filter(p => p.projectCategory === 'LANDING_PAGE')
                            .length;
                          const isFreeLandingPage = isEligibleMonth && isLandingPage && landingPageIndex === 1;

                          // Check multi-form credit (1st multi-form)
                          const isMultiForm = project.projectCategory === 'MULTI_FORM';
                          const multiFormIndex = monthData.projects
                            .slice(0, index + 1)
                            .filter(p => p.projectCategory === 'MULTI_FORM')
                            .length;
                          const isFreeMultiForm = isEligibleMonth && isMultiForm && multiFormIndex === 1;

                          // Check basic form credit (first 5 basic forms)
                          const isBasicForm = project.projectCategory === 'BASIC_FORM';
                          const basicFormIndex = monthData.projects
                            .slice(0, index + 1)
                            .filter(p => p.projectCategory === 'BASIC_FORM')
                            .length;
                          const isFreeBasicForm = isEligibleMonth && isBasicForm && basicFormIndex <= 5;

                          // Combine all checks
                          const isFreeCredit = isFreeLandingPage || isFreeMultiForm || isFreeBasicForm;

                          return (
                            <tr
                              key={project.id}
                              className="border-b divide-x transition-colors hover:bg-muted/50"
                            >
                              {/* Name - with left indent */}
                              <td className="py-3 pl-12 pr-4 align-middle">
                                <div className="flex items-center gap-2">
                                  <SiteFavicon websiteUrl={project.websiteUrl} size={16} />
                                  <div className="line-clamp-2 font-medium">{project.name}</div>
                                  {isFreeCredit && <Zap className="h-4 w-4 inline text-green-600 dark:text-green-400" />}
                                </div>
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
                                {project.hostingStatus === 'ACTIVE' ? (
                                  <span className="text-xs font-medium">
                                    {formatHostingStatus(project.hostingStatus)}
                                  </span>
                                ) : (
                                  <span
                                    className={`inline-flex items-center px-2 py-1 text-xs font-medium ring-1 ring-inset ${getHostingBadge(
                                      project.hostingStatus
                                    )}`}
                                  >
                                    {formatHostingStatus(project.hostingStatus)}
                                  </span>
                                )}
                              </td>

                              {/* Requested Date */}
                              <td className="py-3 px-4 align-middle text-muted-foreground text-xs">
                                {formatDate(project.projectRequestedDate)}
                              </td>

                              {/* Completion Date */}
                              <td className="py-3 px-4 align-middle text-muted-foreground text-xs">
                                {formatDate(project.projectCompletionDate)}
                              </td>

                              {/* Invoice Number */}
                              <td className="py-3 px-4 align-middle text-muted-foreground text-xs">
                                {project.invoiceNumber || 'N/A'}
                              </td>

                              {/* Gross Amount */}
                              <td className="py-3 px-4 align-middle text-right text-xs">
                                <span>{formatCurrencyAccounting(revenue).symbol}</span>
                                <span className="tabular-nums">{formatCurrencyAccounting(revenue).amount}</span>
                              </td>

                              {/* Credit Applied */}
                              <td className="py-3 px-4 align-middle text-right text-xs">
                                {isFreeCredit && (
                                  <>
                                    <span>-{formatCurrencyAccounting(revenue).symbol}</span>
                                    <span className="tabular-nums">{formatCurrencyAccounting(revenue).amount}</span>
                                  </>
                                )}
                              </td>

                              {/* Net Amount */}
                              <td className="py-3 px-4 align-middle text-right text-xs">
                                {isFreeCredit ? (
                                  <span className="text-green-600 dark:text-green-400">
                                    <span>{formatCurrencyAccounting(0).symbol}</span>
                                    <span className="tabular-nums">{formatCurrencyAccounting(0).amount}</span>
                                  </span>
                                ) : (
                                  <>
                                    <span>{formatCurrencyAccounting(revenue).symbol}</span>
                                    <span className="tabular-nums">{formatCurrencyAccounting(revenue).amount}</span>
                                  </>
                                )}
                              </td>
                            </tr>
                          );
                        })}

                        {/* Month Subtotal Row */}
                        <tr className="bg-muted/30 border-b divide-x font-semibold">
                          <td colSpan={6} className="py-3 px-6 text-right text-sm">
                            {formatMonthLabel(monthData.month)} Subtotal
                          </td>
                          <td className="py-3 px-4 text-right">
                            <span>{formatCurrencyAccounting(monthData.revenue).symbol}</span>
                            <span className="tabular-nums">{formatCurrencyAccounting(monthData.revenue).amount}</span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            {(() => {
                              // Calculate dollar amount of credits for this month
                              const isEligibleMonth = monthData.month >= FREE_LANDING_PAGE_START_DATE;
                              if (!isEligibleMonth) return '';

                              let monthCreditAmount = 0;
                              monthData.projects.forEach((project, index) => {
                                const revenue = convertMicrosToDollars(project.revenueAmount.amountMicros);

                                // Check landing page credit (1st landing page)
                                const isLandingPage = project.projectCategory === 'LANDING_PAGE';
                                const landingPageIndex = monthData.projects
                                  .slice(0, index + 1)
                                  .filter(p => p.projectCategory === 'LANDING_PAGE')
                                  .length;
                                const isFreeLandingPage = isLandingPage && landingPageIndex === 1;

                                // Check multi-form credit (1st multi-form)
                                const isMultiForm = project.projectCategory === 'MULTI_FORM';
                                const multiFormIndex = monthData.projects
                                  .slice(0, index + 1)
                                  .filter(p => p.projectCategory === 'MULTI_FORM')
                                  .length;
                                const isFreeMultiForm = isMultiForm && multiFormIndex === 1;

                                // Check basic form credit (first 5 basic forms)
                                const isBasicForm = project.projectCategory === 'BASIC_FORM';
                                const basicFormIndex = monthData.projects
                                  .slice(0, index + 1)
                                  .filter(p => p.projectCategory === 'BASIC_FORM')
                                  .length;
                                const isFreeBasicForm = isBasicForm && basicFormIndex <= 5;

                                if (isFreeLandingPage || isFreeMultiForm || isFreeBasicForm) {
                                  monthCreditAmount += revenue;
                                }
                              });

                              return monthCreditAmount > 0 ? (
                                <>
                                  <span>-{formatCurrencyAccounting(monthCreditAmount).symbol}</span>
                                  <span className="tabular-nums">{formatCurrencyAccounting(monthCreditAmount).amount}</span>
                                </>
                              ) : '';
                            })()}
                          </td>
                          <td className="py-3 px-4 text-right">
                            {(() => {
                              // Calculate net amount (gross - credits)
                              const isEligibleMonth = monthData.month >= FREE_LANDING_PAGE_START_DATE;
                              if (!isEligibleMonth) {
                                return (
                                  <>
                                    <span>{formatCurrencyAccounting(monthData.revenue).symbol}</span>
                                    <span className="tabular-nums">{formatCurrencyAccounting(monthData.revenue).amount}</span>
                                  </>
                                );
                              }

                              let monthCreditAmount = 0;
                              monthData.projects.forEach((project, index) => {
                                const revenue = convertMicrosToDollars(project.revenueAmount.amountMicros);

                                // Check landing page credit (1st landing page)
                                const isLandingPage = project.projectCategory === 'LANDING_PAGE';
                                const landingPageIndex = monthData.projects
                                  .slice(0, index + 1)
                                  .filter(p => p.projectCategory === 'LANDING_PAGE')
                                  .length;
                                const isFreeLandingPage = isLandingPage && landingPageIndex === 1;

                                // Check multi-form credit (1st multi-form)
                                const isMultiForm = project.projectCategory === 'MULTI_FORM';
                                const multiFormIndex = monthData.projects
                                  .slice(0, index + 1)
                                  .filter(p => p.projectCategory === 'MULTI_FORM')
                                  .length;
                                const isFreeMultiForm = isMultiForm && multiFormIndex === 1;

                                // Check basic form credit (first 5 basic forms)
                                const isBasicForm = project.projectCategory === 'BASIC_FORM';
                                const basicFormIndex = monthData.projects
                                  .slice(0, index + 1)
                                  .filter(p => p.projectCategory === 'BASIC_FORM')
                                  .length;
                                const isFreeBasicForm = isBasicForm && basicFormIndex <= 5;

                                if (isFreeLandingPage || isFreeMultiForm || isFreeBasicForm) {
                                  monthCreditAmount += revenue;
                                }
                              });

                              const netAmount = monthData.revenue - monthCreditAmount;
                              return (
                                <>
                                  <span>{formatCurrencyAccounting(netAmount).symbol}</span>
                                  <span className="tabular-nums">{formatCurrencyAccounting(netAmount).amount}</span>
                                </>
                              );
                            })()}
                          </td>
                        </tr>
                      </>
                    )}
                  </>
                );
              })}

              {/* Grand Total Row */}
              {monthlyBreakdown.length > 1 && (
                <tr className="bg-black text-white dark:bg-black dark:text-white border-t-2 divide-x divide-white/20 dark:divide-white/20 font-bold">
                  <td colSpan={6} className="py-4 px-6 text-right text-md">
                    GRAND TOTAL
                  </td>
                  <td className="py-4 px-4 text-right text-md">
                    <span>{formatCurrencyAccounting(grandTotal).symbol}</span>
                    <span className="tabular-nums">{formatCurrencyAccounting(grandTotal).amount}</span>
                  </td>
                  <td className="py-4 px-4 text-right text-md">
                    {grandTotalCredits > 0 && (
                      <>
                        <span>-{formatCurrencyAccounting(grandTotalCredits).symbol}</span>
                        <span className="tabular-nums">{formatCurrencyAccounting(grandTotalCredits).amount}</span>
                      </>
                    )}
                  </td>
                  <td className="py-4 px-4 text-right text-md">
                    <span>{formatCurrencyAccounting(grandTotal - grandTotalCredits).symbol}</span>
                    <span className="tabular-nums">{formatCurrencyAccounting(grandTotal - grandTotalCredits).amount}</span>
                  </td>
                </tr>
              )}
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