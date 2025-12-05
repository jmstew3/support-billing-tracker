import { ChevronUp, ChevronDown, FolderKanban, Zap } from 'lucide-react';
import { formatCurrency, formatCurrencyAccounting } from '../../../utils/formatting';
import { CountBadge, CreditBadge } from '../../../components/ui/BillingBadge';
import { SiteFavicon } from '../../../components/ui/SiteFavicon';
import type { MonthlyBillingSummary } from '../../../types/billing';

interface ProjectsSectionProps {
  monthData: MonthlyBillingSummary;
  isExpanded: boolean;
  onToggle: () => void;
}

/**
 * ProjectsSection Component
 *
 * Displays projects section within a month breakdown.
 * Shows project details with free credits (landing page, multi-form, basic form).
 *
 * Extracted from Dashboard.tsx lines 589-689
 */
export function ProjectsSection({ monthData, isExpanded, onToggle }: ProjectsSectionProps) {
  // Format category for display (e.g., "LANDING_PAGE" -> "Landing Page")
  const formatCategory = (category: string) => {
    return category
      .split('_')
      .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
      .join(' ');
  };

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
              <FolderKanban className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Projects</span>
              <CountBadge
                text={`${monthData.projectsCount}`}
                size="xs"
              />
              {monthData.projectsLandingPageCredit > 0 && (
                <CreditBadge
                  text={`${monthData.projectsLandingPageCredit} Free Landing Page Credit`}
                  size="xs"
                />
              )}
              {monthData.projectsMultiFormCredit > 0 && (
                <CreditBadge
                  text={`${monthData.projectsMultiFormCredit} Free Multi-Form`}
                  size="xs"
                />
              )}
              {monthData.projectsBasicFormCredit > 0 && (
                <CreditBadge
                  text={`${monthData.projectsBasicFormCredit} Free Basic Form${monthData.projectsBasicFormCredit > 1 ? 's' : ''}`}
                  size="xs"
                />
              )}
            </div>
            <span className="font-medium text-muted-foreground">
              {monthData.projectsRevenue === 0 ? '-' : formatCurrency(monthData.projectsRevenue)}
            </span>
          </div>
        </td>
      </tr>

      {isExpanded &&
        monthData.projectDetails.map((project, idx) => (
          <tr key={project.id} className="border-b divide-x hover:bg-muted/30">
            <td className="py-3 px-2 text-right text-muted-foreground text-xs w-8">
              {idx + 1}
            </td>
            <td className="py-2 px-4 text-xs text-muted-foreground w-32">{project.completionDate}</td>
            <td className="py-2 px-4 text-xs">
              <div className="flex items-center gap-2">
                <SiteFavicon websiteUrl={project.websiteUrl} size={14} />
                <span>{project.name}</span>
                {project.isFreeCredit && <Zap className="h-4 w-4 inline text-green-600 dark:text-green-400" />}
              </div>
            </td>
            <td className="py-2 px-4 text-xs text-left text-muted-foreground w-28">
              {formatCategory(project.category)}
            </td>
            <td className="py-2 px-4 text-xs text-right text-muted-foreground w-28">
              <span>{formatCurrencyAccounting(project.originalAmount || project.amount).symbol}</span>
              <span className="tabular-nums">{formatCurrencyAccounting(project.originalAmount || project.amount).amount}</span>
            </td>
            <td className="py-2 px-4 text-xs text-right text-muted-foreground w-28">
              {project.isFreeCredit && (
                <>
                  <span>-{formatCurrencyAccounting(project.originalAmount || project.amount).symbol}</span>
                  <span className="tabular-nums">{formatCurrencyAccounting(project.originalAmount || project.amount).amount}</span>
                </>
              )}
            </td>
            <td className="py-2 px-4 text-right text-sm w-32">
              {project.isFreeCredit ? (
                <span className="text-green-600 dark:text-green-400">
                  <span>{formatCurrencyAccounting(0).symbol}</span>
                  <span className="tabular-nums">{formatCurrencyAccounting(0).amount}</span>
                </span>
              ) : (
                <span className="font-semibold">
                  <span>{formatCurrencyAccounting(project.amount).symbol}</span>
                  <span className="tabular-nums">{formatCurrencyAccounting(project.amount).amount}</span>
                </span>
              )}
            </td>
          </tr>
        ))}
    </>
  );
}
