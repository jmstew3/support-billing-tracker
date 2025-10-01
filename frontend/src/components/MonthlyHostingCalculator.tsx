import { useState } from 'react';
import { ChevronDown, ChevronUp, ArrowUp, ArrowDown, Zap } from 'lucide-react';
import { formatCurrency, formatCurrencyAccounting, formatMonthLabel, formatDate, formatCount } from '../utils/formatting';
import { BillingTypeBadge, CountBadge, CreditBadge, FreeBadge } from './ui/BillingBadge';
import { SiteFavicon } from './ui/SiteFavicon';
import type { MonthlyHostingSummary, BillingType } from '../types/websiteProperty';

interface MonthlyHostingCalculatorProps {
  monthlyBreakdown: MonthlyHostingSummary[];
}

type SortColumn =
  | 'name'           // Website Name
  | 'hostingStart'   // Hosting Start
  | 'hostingEnd'     // Hosting End
  | 'billingType'    // Billing Type
  | 'days'           // Days Active
  | 'gross'          // Gross Amount
  | 'credit'         // Credit Applied
  | 'net';           // Net Amount

export function MonthlyHostingCalculator({ monthlyBreakdown }: MonthlyHostingCalculatorProps) {
  // Track which months are expanded (start collapsed)
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set());

  // Filter state
  const [billingTypeFilter, setBillingTypeFilter] = useState<BillingType | 'ALL'>('ALL');

  // Sort state - expanded to support all 8 columns
  const [sortBy, setSortBy] = useState<SortColumn>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

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

  // Handle header click for sorting
  const handleHeaderClick = (column: SortColumn) => {
    if (sortBy === column) {
      // Same column: toggle direction
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // New column: set column and default to ascending
      setSortBy(column);
      setSortDirection('asc');
    }
  };

  // Calculate grand totals
  const grandTotalGross = monthlyBreakdown.reduce((sum, month) => sum + month.grossMrr, 0);
  const grandTotalNet = monthlyBreakdown.reduce((sum, month) => sum + month.netMrr, 0);
  const grandTotalCredits = monthlyBreakdown.reduce((sum, month) => sum + (month.grossMrr - month.netMrr), 0);

  // Note: formatMonthLabel, formatDate now imported from utils/formatting
  // Note: Badge formatting now handled by BillingBadge component

  return (
    <div className="space-y-4">
      {/* Filter Controls */}
      <div className="flex items-center gap-4 p-4 border bg-card">
        <div className="flex items-center gap-2">
          <label htmlFor="billing-type-filter" className="text-sm font-medium">
            Billing Type:
          </label>
          <select
            id="billing-type-filter"
            value={billingTypeFilter}
            onChange={(e) => setBillingTypeFilter(e.target.value as BillingType | 'ALL')}
            className="px-3 py-1.5 border border-input bg-background text-sm"
          >
            <option value="ALL">All Types</option>
            <option value="FULL">Full Month</option>
            <option value="PRORATED_START">Prorated Start</option>
            <option value="PRORATED_END">Prorated End</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </div>

        <div className="text-sm text-muted-foreground">
          Click column headers to sort
        </div>
      </div>

      {/* Unified Hosting Table with Nested Months */}
      <div className="border bg-card text-card-foreground">
        <div className="relative w-full overflow-auto">
          <table className="w-full caption-bottom text-sm">
            {/* Main Table Header */}
            <thead className="[&_tr]:border-b" style={{ boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}>
              <tr className="border-b">
                <th
                  onClick={() => handleHeaderClick('name')}
                  className="h-10 px-4 text-left align-middle font-medium text-muted-foreground min-w-[250px] cursor-pointer hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    Website Name
                    {sortBy === 'name' && (
                      sortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleHeaderClick('hostingStart')}
                  className="h-10 px-4 text-left align-middle font-medium text-muted-foreground min-w-[110px] cursor-pointer hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    Hosting Start
                    {sortBy === 'hostingStart' && (
                      sortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleHeaderClick('hostingEnd')}
                  className="h-10 px-4 text-left align-middle font-medium text-muted-foreground min-w-[110px] cursor-pointer hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    Hosting End
                    {sortBy === 'hostingEnd' && (
                      sortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleHeaderClick('billingType')}
                  className="h-10 px-4 text-left align-middle font-medium text-muted-foreground min-w-[140px] cursor-pointer hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    Billing Type
                    {sortBy === 'billingType' && (
                      sortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleHeaderClick('days')}
                  className="h-10 px-4 text-center align-middle font-medium text-muted-foreground min-w-[80px] cursor-pointer hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center justify-center gap-2">
                    Days
                    {sortBy === 'days' && (
                      sortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleHeaderClick('gross')}
                  className="h-10 px-4 text-right align-middle font-medium text-muted-foreground min-w-[100px] cursor-pointer hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center justify-end gap-2">
                    Gross Amount
                    {sortBy === 'gross' && (
                      sortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleHeaderClick('credit')}
                  className="h-10 px-4 text-center align-middle font-medium text-muted-foreground min-w-[80px] cursor-pointer hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center justify-center gap-2">
                    Credit
                    {sortBy === 'credit' && (
                      sortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleHeaderClick('net')}
                  className="h-10 px-4 text-right align-middle font-medium text-muted-foreground min-w-[100px] cursor-pointer hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center justify-end gap-2">
                    Net Amount
                    {sortBy === 'net' && (
                      sortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                    )}
                  </div>
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
                      <td colSpan={8} className="py-3 px-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {isExpanded ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                            <span className="font-bold text-base">{formatMonthLabel(monthData.month)}</span>
                            <CountBadge text={formatCount(monthData.activeSites, 'site')} size="sm" />
                            {monthData.freeCredits > 0 && (
                              <CreditBadge
                                text={formatCount(monthData.freeCredits, 'free credit')}
                                size="sm"
                              />
                            )}
                          </div>
                          <div className="font-bold text-base tabular-nums">{formatCurrency(monthData.netMrr)}</div>
                        </div>
                      </td>
                    </tr>

                    {/* Site Rows (only if expanded) */}
                    {isExpanded && (
                      <>
                        {monthData.charges
                          // Filter by billing type
                          .filter((charge) => billingTypeFilter === 'ALL' || charge.billingType === billingTypeFilter)
                          // Sort by selected criteria
                          .sort((a, b) => {
                            let comparison = 0;

                            switch (sortBy) {
                              case 'name':
                                comparison = a.siteName.localeCompare(b.siteName);
                                break;

                              case 'hostingStart':
                                // Handle null dates (push to end)
                                if (!a.hostingStart && !b.hostingStart) return 0;
                                if (!a.hostingStart) return 1;
                                if (!b.hostingStart) return -1;
                                comparison = a.hostingStart.localeCompare(b.hostingStart);
                                break;

                              case 'hostingEnd':
                                // Handle null dates (active sites first when ascending)
                                if (!a.hostingEnd && !b.hostingEnd) return 0;
                                if (!a.hostingEnd) return -1; // Active sites first
                                if (!b.hostingEnd) return 1;
                                comparison = a.hostingEnd.localeCompare(b.hostingEnd);
                                break;

                              case 'billingType':
                                // Sort order: FULL, PRORATED_START, PRORATED_END, INACTIVE
                                const typeOrder: Record<string, number> = {
                                  FULL: 1,
                                  PRORATED_START: 2,
                                  PRORATED_END: 3,
                                  INACTIVE: 4,
                                };
                                comparison = typeOrder[a.billingType] - typeOrder[b.billingType];
                                break;

                              case 'days':
                                comparison = a.daysActive - b.daysActive;
                                break;

                              case 'gross':
                                comparison = a.grossAmount - b.grossAmount;
                                break;

                              case 'credit':
                                // Sort by credit applied (true first when ascending)
                                comparison = (b.creditApplied ? 1 : 0) - (a.creditApplied ? 1 : 0);
                                break;

                              case 'net':
                                comparison = a.netAmount - b.netAmount;
                                break;

                              default:
                                comparison = 0;
                            }

                            return sortDirection === 'asc' ? comparison : -comparison;
                          })
                          .map((charge) => {
                          return (
                            <tr
                              key={charge.websitePropertyId}
                              className="border-b transition-colors hover:bg-muted/50"
                            >
                              {/* Website Name - with left indent */}
                              <td className="py-3 pl-12 pr-4 align-middle">
                                <div className="flex items-center gap-2">
                                  <SiteFavicon websiteUrl={charge.websiteUrl} size={16} />
                                  <div className="line-clamp-2 font-medium">{charge.siteName}</div>
                                  {charge.creditApplied && <FreeBadge size="xs" />}
                                </div>
                              </td>

                              {/* Hosting Start */}
                              <td className="py-3 px-4 align-middle text-muted-foreground text-xs">
                                {formatDate(charge.hostingStart)}
                              </td>

                              {/* Hosting End */}
                              <td className="py-3 px-4 align-middle text-muted-foreground text-xs">
                                {formatDate(charge.hostingEnd)}
                              </td>

                              {/* Billing Type */}
                              <td className="py-3 px-4 align-middle">
                                <BillingTypeBadge billingType={charge.billingType} size="sm" />
                              </td>

                              {/* Days Active */}
                              <td className="py-3 px-4 align-middle text-center text-xs">
                                {charge.daysActive}/{charge.daysInMonth}
                              </td>

                              {/* Gross Amount */}
                              <td className="py-3 px-4 align-middle text-right font-semibold">
                                <span>{formatCurrencyAccounting(charge.grossAmount).symbol}</span>
                                <span className="tabular-nums">{formatCurrencyAccounting(charge.grossAmount).amount}</span>
                              </td>

                              {/* Credit Applied */}
                              <td className="py-3 px-4 align-middle text-center">
                                {charge.creditApplied && (
                                  <Zap className="h-4 w-4 inline text-green-600 dark:text-green-400" />
                                )}
                              </td>

                              {/* Net Amount */}
                              <td className="py-3 px-4 align-middle text-right font-semibold">
                                {charge.creditApplied ? (
                                  <span className="text-green-600 dark:text-green-400">
                                    <span>{formatCurrencyAccounting(0).symbol}</span>
                                    <span className="tabular-nums">{formatCurrencyAccounting(0).amount}</span>
                                  </span>
                                ) : (
                                  <>
                                    <span>{formatCurrencyAccounting(charge.netAmount).symbol}</span>
                                    <span className="tabular-nums">{formatCurrencyAccounting(charge.netAmount).amount}</span>
                                  </>
                                )}
                              </td>
                            </tr>
                          );
                        })}

                        {/* Month Subtotal Row */}
                        <tr className="bg-muted/30 border-b font-semibold">
                          <td colSpan={5} className="py-3 px-6 text-right text-sm">
                            <div className="flex items-center justify-end gap-2">
                              <span>{formatMonthLabel(monthData.month)} Subtotal</span>
                              <CountBadge text={formatCount(monthData.activeSites, 'site')} size="xs" />
                            </div>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <span>{formatCurrencyAccounting(monthData.grossMrr).symbol}</span>
                            <span className="tabular-nums">{formatCurrencyAccounting(monthData.grossMrr).amount}</span>
                          </td>
                          <td className="py-3 px-4 text-center text-xs">
                            {monthData.creditsApplied > 0 && `${monthData.creditsApplied}×`}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <span>{formatCurrencyAccounting(monthData.netMrr).symbol}</span>
                            <span className="tabular-nums">{formatCurrencyAccounting(monthData.netMrr).amount}</span>
                          </td>
                        </tr>
                      </>
                    )}
                  </>
                );
              })}

              {/* Grand Total Row */}
              {monthlyBreakdown.length > 1 && (
                <tr className="bg-muted/60 border-t-2 font-bold">
                  <td colSpan={5} className="py-4 px-6 text-right text-base">
                    GRAND TOTAL
                  </td>
                  <td className="py-4 px-4 text-right text-lg">
                    <span>{formatCurrencyAccounting(grandTotalGross).symbol}</span>
                    <span className="tabular-nums">{formatCurrencyAccounting(grandTotalGross).amount}</span>
                  </td>
                  <td className="py-4 px-4 text-center text-sm">
                    {grandTotalCredits > 0 && (
                      <>
                        <span>-{formatCurrencyAccounting(grandTotalCredits).symbol}</span>
                        <span className="tabular-nums">{formatCurrencyAccounting(grandTotalCredits).amount}</span>
                      </>
                    )}
                  </td>
                  <td className="py-4 px-4 text-right text-lg">
                    <span>{formatCurrencyAccounting(grandTotalNet).symbol}</span>
                    <span className="tabular-nums">{formatCurrencyAccounting(grandTotalNet).amount}</span>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}