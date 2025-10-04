import { ChevronUp, ChevronDown, Server, Zap } from 'lucide-react';
import { formatCurrency, formatCurrencyAccounting } from '../../../utils/formatting';
import { CountBadge, CreditBadge, BillingTypeBadge } from '../../ui/BillingBadge';
import { SiteFavicon } from '../../ui/SiteFavicon';
import type { MonthlyBillingSummary } from '../../../types/billing';

interface HostingSectionProps {
  monthData: MonthlyBillingSummary;
  isExpanded: boolean;
  onToggle: () => void;
}

/**
 * HostingSection Component
 *
 * Displays hosting sites section within a month breakdown.
 * Shows site details with billing types, proration, and free credits.
 *
 * Extracted from Dashboard.tsx lines 692-830
 */
export function HostingSection({ monthData, isExpanded, onToggle }: HostingSectionProps) {
  // Helper function to get effective billing period start date for display
  const getEffectiveBillingDate = (hosting: typeof monthData.hostingDetails[0], currentMonth: string): string => {
    const hostingStartMonth = hosting.hostingStart?.substring(0, 7) || '';

    // If this is the first month (prorated start), show actual start date
    if (hostingStartMonth === currentMonth) {
      // Extract just the date portion (YYYY-MM-DD) from potential ISO timestamp
      return hosting.hostingStart?.substring(0, 10) || `${currentMonth}-01`;
    }

    // For all subsequent months (FULL billing), show 1st of current month
    const [targetYear, targetMonth] = currentMonth.split('-');
    return `${targetYear}-${targetMonth}-01`;
  };

  // Sort hosting details by effective billing date, then alphabetically by site name
  const sortedHostingDetails = [...monthData.hostingDetails].sort((a, b) => {
    const dateA = getEffectiveBillingDate(a, monthData.month);
    const dateB = getEffectiveBillingDate(b, monthData.month);

    // Sort by date first
    if (dateA !== dateB) {
      return dateA.localeCompare(dateB);
    }

    // If same date, sort alphabetically by site name
    return a.siteName.localeCompare(b.siteName);
  });

  return (
    <>
      <tr
        className="bg-muted/40 hover:bg-muted/60 cursor-pointer border-b"
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
      >
        <td colSpan={7} className="py-2 px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              <Server className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Sites Hosted</span>
              <CountBadge
                text={`${monthData.hostingSitesCount}`}
                size="xs"
              />
              {monthData.hostingCreditsApplied > 0 && (
                <CreditBadge
                  text={`${monthData.hostingCreditsApplied} free credit${monthData.hostingCreditsApplied !== 1 ? 's' : ''}`}
                  size="xs"
                />
              )}
            </div>
            <span className="font-medium text-muted-foreground">
              {monthData.hostingRevenue === 0 ? '-' : formatCurrency(monthData.hostingRevenue)}
            </span>
          </div>
        </td>
      </tr>

      {isExpanded && (
        <>
          {sortedHostingDetails.map((hosting, idx) => (
            <tr key={hosting.websitePropertyId} className="border-b divide-x hover:bg-muted/30">
              <td className="py-3 px-2 text-right text-muted-foreground text-xs w-8">
                {idx + 1}
              </td>
              <td className="py-2 px-4 text-xs text-muted-foreground">
                {getEffectiveBillingDate(hosting, monthData.month)}
              </td>
              <td className="py-2 px-4 text-xs">
                <div className="flex items-center gap-2">
                  <SiteFavicon websiteUrl={hosting.websiteUrl} size={14} />
                  <span>{hosting.siteName}</span>
                </div>
              </td>
              <td className="py-2 px-4 text-xs">
                <BillingTypeBadge billingType={hosting.billingType} size="xs" />
              </td>
              <td className="py-2 px-4 text-xs text-left text-muted-foreground">
                {hosting.daysActive}/{hosting.daysInMonth} days
              </td>
              <td className="py-2 px-4 text-xs text-center text-muted-foreground">
                {hosting.creditApplied && (
                  <div className="flex items-center justify-center gap-1">
                    <Zap className="w-3 h-3 text-green-600 dark:text-green-400 fill-green-600 dark:fill-green-400" />
                    <span className="text-green-600 dark:text-green-400 font-semibold">FREE</span>
                  </div>
                )}
              </td>
              <td className="py-2 px-4 text-right text-sm font-semibold">
                <span>{formatCurrencyAccounting(hosting.netAmount).symbol}</span>
                <span className="tabular-nums">{formatCurrencyAccounting(hosting.netAmount).amount}</span>
              </td>
            </tr>
          ))}

          {/* Gross Total Row */}
          <tr className="bg-black text-white dark:bg-black dark:text-white border-b border-t-2">
            <td colSpan={6} className="py-2 px-12 text-xs font-semibold">
              Gross Total
            </td>
            <td className="py-2 px-4 text-right text-xs font-semibold">
              {formatCurrency(monthData.hostingGross)}
            </td>
          </tr>

          {/* Free Hosting Credit Row (if applicable) */}
          {monthData.hostingCreditsApplied > 0 && (
            <>
              <tr className="bg-green-50 dark:bg-green-950/20 border-b">
                <td colSpan={6} className="py-2 px-12 text-xs font-medium text-green-700 dark:text-green-400">
                  <Zap className="h-3 w-3 inline mr-1 fill-green-600 dark:fill-green-400" />
                  Free Hosting Credit ({monthData.hostingCreditsApplied} site{monthData.hostingCreditsApplied !== 1 ? 's' : ''})
                </td>
                <td className="py-2 px-4 text-right text-xs font-semibold text-green-700 dark:text-green-400">
                  -{formatCurrency(monthData.hostingGross - monthData.hostingRevenue)}
                </td>
              </tr>

              {/* Net Billable Row */}
              <tr className="bg-blue-50 dark:bg-blue-950/20 border-b border-t">
                <td colSpan={6} className="py-2 px-12 text-xs font-semibold text-blue-700 dark:text-blue-400">
                  Net Billable
                </td>
                <td className="py-2 px-4 text-right text-xs font-semibold text-blue-700 dark:text-blue-400">
                  {formatCurrency(monthData.hostingRevenue)}
                </td>
              </tr>
            </>
          )}
        </>
      )}
    </>
  );
}
