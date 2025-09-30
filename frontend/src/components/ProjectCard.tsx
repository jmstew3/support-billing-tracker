import { Calendar, CheckCircle, DollarSign, AlertCircle, Tag } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { convertMicrosToDollars, formatCurrency } from '../services/projectsApi';
import type { Project } from '../types/project';

interface ProjectCardProps {
  project: Project;
}

export function ProjectCard({ project }: ProjectCardProps) {
  // Convert revenue amount
  const revenue = convertMicrosToDollars(project.revenueAmount.amountMicros);

  // Hosting status styling with border accent
  const getHostingStatusStyle = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return {
          badge: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
          border: 'border-l-4 border-l-green-500',
          bg: 'bg-green-50/30 dark:bg-green-950/10',
        };
      case 'INACTIVE':
        return {
          badge: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
          border: '',
          bg: '',
        };
      default:
        return {
          badge: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
          border: '',
          bg: '',
        };
    }
  };

  // Invoice status styling
  const getInvoiceStatusStyle = (status: string) => {
    switch (status) {
      case 'PAID':
        return {
          badge: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
          icon: CheckCircle,
          bg: 'bg-green-50/20 dark:bg-green-950/10',
          label: 'Paid',
        };
      case 'INVOICED':
        return {
          badge: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
          icon: DollarSign,
          bg: 'bg-yellow-50/20 dark:bg-yellow-950/10',
          label: 'Invoiced',
        };
      case 'READY':
        return {
          badge: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
          icon: AlertCircle,
          bg: 'bg-blue-50/20 dark:bg-blue-950/10',
          label: 'Ready',
        };
      case 'NOT_READY':
        return {
          badge: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
          icon: AlertCircle,
          bg: 'bg-gray-50/20 dark:bg-gray-950/10',
          label: 'Not Ready',
        };
      default:
        return {
          badge: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
          icon: DollarSign,
          bg: '',
          label: status,
        };
    }
  };

  // Project category styling
  const getCategoryStyle = (category: string) => {
    switch (category) {
      case 'MIGRATION':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400';
      case 'LANDING_PAGE':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'WEBSITE':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
    }
  };

  // Format category for display
  const formatCategory = (category: string) => {
    return category
      .split('_')
      .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
      .join(' ');
  };

  // Format date for display
  const formatDate = (dateString: string | null) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const hostingStyle = getHostingStatusStyle(project.hostingStatus);
  const invoiceStyle = getInvoiceStatusStyle(project.invoiceStatus);
  const InvoiceIcon = invoiceStyle.icon;

  return (
    <Card
      className={`hover:shadow-lg transition-all duration-200 h-full flex flex-col ${hostingStyle.border} ${hostingStyle.bg}`}
    >
      <CardHeader className="pb-3">
        {/* Project Name */}
        <CardTitle className="text-xl font-semibold line-clamp-2 mb-3">{project.name}</CardTitle>

        {/* Status Badges Row */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Hosting Status */}
          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${hostingStyle.badge}`}>
            {project.hostingStatus}
          </span>

          {/* Invoice Status */}
          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1 ${invoiceStyle.badge}`}>
            <InvoiceIcon size={12} />
            {invoiceStyle.label}
          </span>

          {/* Project Category */}
          <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getCategoryStyle(project.projectCategory)}`}>
            {formatCategory(project.projectCategory)}
          </span>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col justify-between pt-0">
        {/* Revenue Amount - Prominent Display */}
        <div className={`mb-4 p-4 rounded-lg ${invoiceStyle.bg} border border-border/30`}>
          <div className="text-xs text-muted-foreground mb-1 font-medium">Revenue</div>
          <div className="text-3xl font-bold text-foreground">{formatCurrency(revenue)}</div>
          {project.invoiceNumber && (
            <div className="text-xs text-muted-foreground mt-1">Invoice: {project.invoiceNumber || 'N/A'}</div>
          )}
        </div>

        {/* Project Details */}
        <div className="space-y-3 text-sm">
          {/* Completion Date */}
          {project.projectCompletionDate ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar size={16} className="flex-shrink-0" />
              <div>
                <span className="text-xs font-medium">Completed: </span>
                <span className="font-semibold text-foreground">
                  {formatDate(project.projectCompletionDate)}
                </span>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-yellow-600 dark:text-yellow-400">
              <AlertCircle size={16} className="flex-shrink-0" />
              <span className="text-xs font-medium">No completion date set</span>
            </div>
          )}

          {/* Requested Date */}
          {project.projectRequestedDate && (
            <div className="flex items-center gap-2 text-muted-foreground text-xs">
              <Calendar size={14} className="flex-shrink-0" />
              <div>
                <span className="font-medium">Requested: </span>
                {formatDate(project.projectRequestedDate)}
              </div>
            </div>
          )}

          {/* Invoice Date */}
          {project.invoiceDate && (
            <div className="flex items-center gap-2 text-muted-foreground text-xs">
              <Tag size={14} className="flex-shrink-0" />
              <div>
                <span className="font-medium">Invoiced: </span>
                {formatDate(project.invoiceDate)}
              </div>
            </div>
          )}
        </div>

        {/* Website Property Link ID - Small text at bottom */}
        {project.websitePropertyLinkId && (
          <div className="mt-4 pt-3 border-t border-border/30">
            <div className="text-xs text-muted-foreground font-mono truncate">
              ID: {project.websitePropertyLinkId.slice(0, 8)}...
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}