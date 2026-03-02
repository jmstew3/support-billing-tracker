/**
 * Generate Invoice Modal Component
 * Modal for generating new invoices from billing summary
 * Supports three revenue streams: Support, Projects, and Hosting
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { X, FileText, AlertCircle, Headphones, FolderKanban, Server } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '../../../components/ui/table';
import {
  listCustomers,
  getBillingSummary,
  generateInvoice,
  buildAdditionalLineItems,
  type Customer,
  type BillingSummary,
} from '../../../services/invoiceApi';
import { generateComprehensiveBilling } from '../../../services/billingApi';
import type { MonthlyBillingSummary } from '../../../types/billing';
import { formatDate } from '../../../utils/formatting';
import { formatCurrency } from '../../../utils/currency';
import { DateInput } from '../../../components/shared/DateInput';

interface GenerateInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function GenerateInvoiceModal({ isOpen, onClose, onSuccess }: GenerateInvoiceModalProps) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<number | ''>('');
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [billingSummary, setBillingSummary] = useState<BillingSummary | null>(null);
  const [monthlyBillingData, setMonthlyBillingData] = useState<MonthlyBillingSummary | null>(null);
  const [supportLoading, setSupportLoading] = useState(false);
  const [comprehensiveLoading, setComprehensiveLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [comprehensiveError, setComprehensiveError] = useState<string | null>(null);

  const loading = supportLoading || comprehensiveLoading;
  const [notes, setNotes] = useState('');

  // Section toggles
  const [includeSupport, setIncludeSupport] = useState(true);
  const [includeProjects, setIncludeProjects] = useState(true);
  const [includeHosting, setIncludeHosting] = useState(true);

  // Set default period to current month
  useEffect(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();

    const firstDay = new Date(year, month, 1);
    setPeriodStart(firstDay.toISOString().split('T')[0]);

    const lastDay = new Date(year, month + 1, 0);
    setPeriodEnd(lastDay.toISOString().split('T')[0]);
  }, [isOpen]);

  // Load customers
  useEffect(() => {
    if (isOpen) {
      loadCustomers();
    }
  }, [isOpen]);

  async function loadCustomers() {
    try {
      const data = await listCustomers();
      setCustomers(data);
      if (data.length === 1) {
        setSelectedCustomer(data[0].id);
      }
    } catch (err) {
      console.error('Error loading customers:', err);
    }
  }

  const loadSupportData = useCallback(async () => {
    if (!selectedCustomer || !periodStart || !periodEnd) return;

    try {
      setSupportLoading(true);
      setError(null);
      const supportSummary = await getBillingSummary(selectedCustomer as number, periodStart, periodEnd);
      setBillingSummary(supportSummary);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load support data');
      setBillingSummary(null);
    } finally {
      setSupportLoading(false);
    }
  }, [selectedCustomer, periodStart, periodEnd]);

  const loadComprehensiveBillingData = useCallback(async () => {
    if (!periodStart) return;

    try {
      setComprehensiveLoading(true);
      setComprehensiveError(null);
      const comprehensiveBilling = await generateComprehensiveBilling();

      const targetMonth = periodStart.substring(0, 7); // YYYY-MM
      const matchingMonth = comprehensiveBilling.monthlyBreakdown.find(
        (m) => m.month === targetMonth
      );
      setMonthlyBillingData(matchingMonth || null);
    } catch (err) {
      setComprehensiveError(err instanceof Error ? err.message : 'Failed to load projects/hosting data');
      setMonthlyBillingData(null);
    } finally {
      setComprehensiveLoading(false);
    }
  }, [periodStart]);

  // Load billing data when customer and period change
  useEffect(() => {
    if (selectedCustomer && periodStart && periodEnd) {
      loadSupportData();
      loadComprehensiveBillingData();
    } else {
      setBillingSummary(null);
      setMonthlyBillingData(null);
    }
  }, [selectedCustomer, periodStart, periodEnd, loadSupportData, loadComprehensiveBillingData]);

  // Computed totals
  const supportTotal = useMemo(() => {
    if (!includeSupport || !billingSummary) return 0;
    return billingSummary.subtotal;
  }, [includeSupport, billingSummary]);

  const projectsTotal = useMemo(() => {
    if (!includeProjects || !monthlyBillingData) return 0;
    return monthlyBillingData.projectsRevenue;
  }, [includeProjects, monthlyBillingData]);

  const hostingTotal = useMemo(() => {
    if (!includeHosting || !monthlyBillingData) return 0;
    return monthlyBillingData.hostingRevenue;
  }, [includeHosting, monthlyBillingData]);

  const combinedTotal = supportTotal + projectsTotal + hostingTotal;

  const hasAnyData = useMemo(() => {
    const hasSupportData = billingSummary && billingSummary.requestCount > 0;
    const hasProjectData = monthlyBillingData && monthlyBillingData.projectsCount > 0;
    const hasHostingData = monthlyBillingData && monthlyBillingData.hostingSitesCount > 0;
    return hasSupportData || hasProjectData || hasHostingData;
  }, [billingSummary, monthlyBillingData]);

  const hasSelectedData = useMemo(() => {
    if (includeSupport && billingSummary && billingSummary.requestCount > 0) return true;
    if (includeProjects && monthlyBillingData && monthlyBillingData.projectsCount > 0) return true;
    if (includeHosting && monthlyBillingData && monthlyBillingData.hostingSitesCount > 0) return true;
    return false;
  }, [includeSupport, includeProjects, includeHosting, billingSummary, monthlyBillingData]);

  async function handleGenerate() {
    if (!selectedCustomer || !periodStart || !periodEnd) {
      setError('Please select a customer and period');
      return;
    }

    if (!hasSelectedData) {
      setError('No billable items selected for this period');
      return;
    }

    try {
      setGenerating(true);
      setError(null);

      // Build additional line items from comprehensive billing data
      const additionalItems = monthlyBillingData
        ? buildAdditionalLineItems(monthlyBillingData, includeProjects, includeHosting)
        : [];

      // Build hosting detail snapshot for DB storage
      const hostingDetailSnapshot = (includeHosting && monthlyBillingData?.hostingDetails?.length)
        ? monthlyBillingData.hostingDetails.map(h => ({
            siteName: h.siteName,
            websiteUrl: h.websiteUrl,
            billingType: h.billingType,
            daysActive: h.daysActive,
            daysInMonth: h.daysInMonth,
            grossAmount: h.grossAmount,
            creditApplied: h.creditApplied,
            creditAmount: h.creditAmount,
            netAmount: h.netAmount,
          }))
        : undefined;

      await generateInvoice({
        customerId: selectedCustomer as number,
        periodStart,
        periodEnd,
        notes: notes || undefined,
        includeSupport,
        additionalItems: additionalItems.length > 0 ? additionalItems : undefined,
        hostingDetailSnapshot,
      });

      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate invoice');
    } finally {
      setGenerating(false);
    }
  }

  if (!isOpen) return null;

  const hasSupportData = billingSummary && billingSummary.requestCount > 0;
  const hasProjectData = monthlyBillingData && monthlyBillingData.projectsCount > 0;
  const hasHostingData = monthlyBillingData && monthlyBillingData.hostingSitesCount > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden="true" />

      {/* Modal */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="generate-invoice-title"
        className="relative bg-background border border-border rounded-lg shadow-lg w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col mx-4"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 id="generate-invoice-title" className="text-xl font-semibold flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Generate Invoice
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-muted rounded"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4 space-y-4">
          {/* Form */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Invoice Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Customer</label>
                  <select
                    value={selectedCustomer}
                    onChange={(e) => setSelectedCustomer(e.target.value ? parseInt(e.target.value) : '')}
                    className="w-full px-3 py-2 bg-background border border-border rounded text-sm"
                  >
                    <option value="">Select customer...</option>
                    {customers.map((customer) => (
                      <option key={customer.id} value={customer.id}>
                        {customer.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Period Start</label>
                  <DateInput
                    value={periodStart}
                    onChange={setPeriodStart}
                    label="Period Start"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Period End</label>
                  <DateInput
                    value={periodEnd}
                    onChange={setPeriodEnd}
                    label="Period End"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Notes (optional)</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 bg-background border border-border rounded text-sm"
                  placeholder="Add notes to appear on the invoice..."
                />
              </div>
            </CardContent>
          </Card>

          {/* Section Toggles */}
          {hasAnyData && (
            <div className="flex flex-wrap gap-2">
              <label
                className={`flex items-center gap-2 px-3 py-2 rounded border cursor-pointer transition-colors text-sm ${
                  includeSupport && hasSupportData
                    ? 'bg-blue-500/10 border-blue-500/30 text-blue-700 dark:text-blue-300'
                    : 'border-border text-muted-foreground'
                } ${!hasSupportData ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <input
                  type="checkbox"
                  checked={includeSupport}
                  onChange={(e) => setIncludeSupport(e.target.checked)}
                  disabled={!hasSupportData}
                  className="sr-only"
                />
                <Headphones className="h-4 w-4" />
                <span>Support Hours</span>
                {hasSupportData && (
                  <span className="text-xs opacity-75">({formatCurrency(billingSummary!.subtotal)})</span>
                )}
                <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                  includeSupport && hasSupportData ? 'bg-blue-500 border-blue-500' : 'border-current'
                }`}>
                  {includeSupport && hasSupportData && (
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
              </label>

              <label
                className={`flex items-center gap-2 px-3 py-2 rounded border cursor-pointer transition-colors text-sm ${
                  includeProjects && hasProjectData
                    ? 'bg-purple-500/10 border-purple-500/30 text-purple-700 dark:text-purple-300'
                    : 'border-border text-muted-foreground'
                } ${!hasProjectData ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <input
                  type="checkbox"
                  checked={includeProjects}
                  onChange={(e) => setIncludeProjects(e.target.checked)}
                  disabled={!hasProjectData}
                  className="sr-only"
                />
                <FolderKanban className="h-4 w-4" />
                <span>Projects</span>
                {hasProjectData && (
                  <span className="text-xs opacity-75">({formatCurrency(monthlyBillingData!.projectsRevenue)})</span>
                )}
                <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                  includeProjects && hasProjectData ? 'bg-purple-500 border-purple-500' : 'border-current'
                }`}>
                  {includeProjects && hasProjectData && (
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
              </label>

              <label
                className={`flex items-center gap-2 px-3 py-2 rounded border cursor-pointer transition-colors text-sm ${
                  includeHosting && hasHostingData
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
                    : 'border-border text-muted-foreground'
                } ${!hasHostingData ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <input
                  type="checkbox"
                  checked={includeHosting}
                  onChange={(e) => setIncludeHosting(e.target.checked)}
                  disabled={!hasHostingData}
                  className="sr-only"
                />
                <Server className="h-4 w-4" />
                <span>Hosting</span>
                {hasHostingData && (
                  <span className="text-xs opacity-75">({formatCurrency(monthlyBillingData!.hostingRevenue)})</span>
                )}
                <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                  includeHosting && hasHostingData ? 'bg-emerald-500 border-emerald-500' : 'border-current'
                }`}>
                  {includeHosting && hasHostingData && (
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
              </label>
            </div>
          )}

          {/* Loading Skeletons */}
          {supportLoading && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Headphones className="h-4 w-4 text-blue-500 animate-pulse" />
                  <span className="text-muted-foreground">Loading Support Hours...</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="p-3 bg-muted/50 rounded">
                      <div className="h-3 bg-muted rounded w-20 mb-2 animate-pulse" />
                      <div className="h-6 bg-muted rounded w-16 animate-pulse" />
                    </div>
                  ))}
                </div>
                <div className="mt-4 space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-4 bg-muted/50 rounded animate-pulse" style={{ width: `${85 - i * 15}%` }} />
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {comprehensiveLoading && (
            <>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <FolderKanban className="h-4 w-4 text-purple-500 animate-pulse" />
                    <span className="text-muted-foreground">Loading Projects...</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {[1, 2].map((i) => (
                      <div key={i} className="flex items-center justify-between p-3 bg-muted/30 rounded">
                        <div className="h-4 bg-muted rounded animate-pulse" style={{ width: `${40 + i * 10}%` }} />
                        <div className="h-4 bg-muted rounded w-20 animate-pulse" />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Server className="h-4 w-4 text-emerald-500 animate-pulse" />
                    <span className="text-muted-foreground">Loading Hosting...</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="p-3 bg-muted/50 rounded">
                        <div className="h-3 bg-muted rounded w-16 mb-2 animate-pulse" />
                        <div className="h-6 bg-muted rounded w-20 animate-pulse" />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {/* Comprehensive billing error */}
          {comprehensiveError && !comprehensiveLoading && (
            <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded text-yellow-700 dark:text-yellow-300 text-sm flex items-center gap-1.5">
              <AlertCircle className="h-4 w-4 shrink-0" />
              Projects/Hosting data unavailable: {comprehensiveError}
            </div>
          )}

          {/* Support Section */}
          {!supportLoading && includeSupport && hasSupportData && billingSummary && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Headphones className="h-4 w-4 text-blue-500" />
                  Support Hours
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Summary Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-3 bg-muted/50 rounded">
                    <div className="text-sm text-muted-foreground">Total Hours</div>
                    <div className="text-lg font-semibold">{billingSummary.totalHours.toFixed(2)}h</div>
                  </div>
                  <div className="p-3 bg-muted/50 rounded">
                    <div className="text-sm text-muted-foreground">Billable Hours</div>
                    <div className="text-lg font-semibold">{billingSummary.billableHours.toFixed(2)}h</div>
                  </div>
                  <div className="p-3 bg-muted/50 rounded">
                    <div className="text-sm text-muted-foreground">Free Hours Applied</div>
                    <div className="text-lg font-semibold text-green-600 dark:text-green-400">
                      {billingSummary.freeHoursApplied.toFixed(2)}h
                    </div>
                  </div>
                  <div className="p-3 bg-muted/50 rounded">
                    <div className="text-sm text-muted-foreground">Request Count</div>
                    <div className="text-lg font-semibold">{billingSummary.requestCount}</div>
                  </div>
                </div>

                {/* Amount Breakdown */}
                <div className="border border-border rounded overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Description</TableHead>
                        <TableHead className="text-right">Hours</TableHead>
                        <TableHead className="text-right">Rate</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {billingSummary.billableEmergencyHours > 0 && (
                        <TableRow>
                          <TableCell>Emergency Support Hours</TableCell>
                          <TableCell className="text-right">{billingSummary.billableEmergencyHours.toFixed(2)}</TableCell>
                          <TableCell className="text-right">$250.00</TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(billingSummary.emergencyAmount)}
                          </TableCell>
                        </TableRow>
                      )}
                      {billingSummary.billableSameDayHours > 0 && (
                        <TableRow>
                          <TableCell>Same Day Support Hours</TableCell>
                          <TableCell className="text-right">{billingSummary.billableSameDayHours.toFixed(2)}</TableCell>
                          <TableCell className="text-right">$175.00</TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(billingSummary.sameDayAmount)}
                          </TableCell>
                        </TableRow>
                      )}
                      {billingSummary.billableRegularHours > 0 && (
                        <TableRow>
                          <TableCell>Regular Support Hours</TableCell>
                          <TableCell className="text-right">{billingSummary.billableRegularHours.toFixed(2)}</TableCell>
                          <TableCell className="text-right">$150.00</TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(billingSummary.regularAmount)}
                          </TableCell>
                        </TableRow>
                      )}
                      {billingSummary.freeHoursApplied > 0 && (
                        <TableRow className="bg-green-500/5">
                          <TableCell className="text-green-600 dark:text-green-400">
                            Turbo Support Credit Applied
                          </TableCell>
                          <TableCell className="text-right text-green-600 dark:text-green-400">
                            {billingSummary.freeHoursApplied.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right">-</TableCell>
                          <TableCell className="text-right text-green-600 dark:text-green-400">
                            ($0.00)
                          </TableCell>
                        </TableRow>
                      )}
                      <TableRow className="bg-muted/50 font-semibold">
                        <TableCell colSpan={3}>Subtotal</TableCell>
                        <TableCell className="text-right">{formatCurrency(billingSummary.subtotal)}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>

                {/* Request List */}
                {billingSummary.requests.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">Included Requests ({billingSummary.requests.length})</h4>
                    <div className="border border-border rounded overflow-hidden max-h-48 overflow-y-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead>Urgency</TableHead>
                            <TableHead className="text-right">Hours</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {billingSummary.requests.map((req) => (
                            <TableRow key={req.id}>
                              <TableCell className="text-sm">{formatDate(req.date)}</TableCell>
                              <TableCell className="text-sm max-w-xs truncate">{req.description}</TableCell>
                              <TableCell className="text-sm">{req.category}</TableCell>
                              <TableCell>
                                <span className={`text-xs px-1.5 py-0.5 rounded ${
                                  req.urgency === 'HIGH'
                                    ? 'bg-red-500/10 text-red-600 dark:text-red-400'
                                    : req.urgency === 'MEDIUM'
                                    ? 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400'
                                    : 'bg-green-500/10 text-green-600 dark:text-green-400'
                                }`}>
                                  {req.urgency}
                                </span>
                              </TableCell>
                              <TableCell className="text-right">{parseFloat(req.estimated_hours).toFixed(2)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Projects Section */}
          {!comprehensiveLoading && includeProjects && hasProjectData && monthlyBillingData && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <FolderKanban className="h-4 w-4 text-purple-500" />
                  Projects
                  <span className="text-sm font-normal text-muted-foreground">
                    ({monthlyBillingData.projectsCount} project{monthlyBillingData.projectsCount !== 1 ? 's' : ''})
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="border border-border rounded overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Project Name</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {monthlyBillingData.projectDetails.map((project) => (
                        <TableRow
                          key={project.id}
                          className={project.isFreeCredit ? 'bg-green-500/5' : ''}
                        >
                          <TableCell className="text-sm">
                            {project.name}
                            {project.isFreeCredit && (
                              <span className="ml-2 text-xs px-1.5 py-0.5 rounded bg-green-500/10 text-green-600 dark:text-green-400">
                                Free Credit
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-sm">{project.category.replace(/_/g, ' ')}</TableCell>
                          <TableCell className="text-right font-medium">
                            {project.isFreeCredit ? (
                              <span className="text-green-600 dark:text-green-400">
                                $0.00
                                <span className="text-xs ml-1 opacity-75">
                                  (was {formatCurrency(project.originalAmount ?? 0)})
                                </span>
                              </span>
                            ) : (
                              formatCurrency(project.amount)
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="bg-muted/50 font-semibold">
                        <TableCell colSpan={2}>Subtotal</TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(monthlyBillingData.projectsRevenue)}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Hosting Section */}
          {!comprehensiveLoading && includeHosting && hasHostingData && monthlyBillingData && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Server className="h-4 w-4 text-emerald-500" />
                  Turbo Hosting
                  <span className="text-sm font-normal text-muted-foreground">
                    ({monthlyBillingData.hostingSitesCount} site{monthlyBillingData.hostingSitesCount !== 1 ? 's' : ''})
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                  <div className="p-3 bg-muted/50 rounded">
                    <div className="text-sm text-muted-foreground">Gross MRR</div>
                    <div className="text-lg font-semibold">{formatCurrency(monthlyBillingData.hostingGross)}</div>
                  </div>
                  <div className="p-3 bg-muted/50 rounded">
                    <div className="text-sm text-muted-foreground">Net MRR</div>
                    <div className="text-lg font-semibold">{formatCurrency(monthlyBillingData.hostingRevenue)}</div>
                  </div>
                  {monthlyBillingData.hostingCreditsApplied > 0 && (
                    <div className="p-3 bg-green-500/5 rounded">
                      <div className="text-sm text-green-600 dark:text-green-400">Credits Applied</div>
                      <div className="text-lg font-semibold text-green-600 dark:text-green-400">
                        {monthlyBillingData.hostingCreditsApplied} free site{monthlyBillingData.hostingCreditsApplied !== 1 ? 's' : ''}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Combined Total Preview */}
          {!loading && hasSelectedData && (
            <Card className="border-primary/30">
              <CardContent className="py-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex flex-wrap gap-4 text-sm">
                    {includeSupport && hasSupportData && (
                      <span className="flex items-center gap-1.5">
                        <Headphones className="h-3.5 w-3.5 text-blue-500" />
                        Support: <strong>{formatCurrency(supportTotal)}</strong>
                      </span>
                    )}
                    {includeProjects && hasProjectData && (
                      <span className="flex items-center gap-1.5">
                        <FolderKanban className="h-3.5 w-3.5 text-purple-500" />
                        Projects: <strong>{formatCurrency(projectsTotal)}</strong>
                      </span>
                    )}
                    {includeHosting && hasHostingData && (
                      <span className="flex items-center gap-1.5">
                        <Server className="h-3.5 w-3.5 text-emerald-500" />
                        Hosting: <strong>{formatCurrency(hostingTotal)}</strong>
                      </span>
                    )}
                  </div>
                  <div className="text-lg font-bold">
                    Total: {formatCurrency(combinedTotal)}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* No data message */}
          {!loading && !hasAnyData && selectedCustomer && periodStart && periodEnd && (
            <Card>
              <CardContent className="py-8">
                <div className="flex flex-col items-center justify-center text-muted-foreground">
                  <AlertCircle className="h-8 w-8 mb-2" />
                  <p>No billable data found for this period.</p>
                  <p className="text-sm">Try selecting a different date range.</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Error */}
          {(error || comprehensiveError) && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded text-destructive text-sm">
              {error || comprehensiveError}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t border-border bg-muted/30">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-border rounded hover:bg-muted text-sm"
          >
            Cancel
          </button>
          <button
            onClick={handleGenerate}
            disabled={generating || !hasSelectedData}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
          >
            {generating ? (
              <>
                <div className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <FileText className="h-4 w-4" />
                Generate Invoice
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
