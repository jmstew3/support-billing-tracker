/**
 * Generate Invoice Modal Component
 * Modal for generating new invoices from billing summary
 */

import { useState, useEffect } from 'react';
import { X, FileText, Calculator, AlertCircle } from 'lucide-react';
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
  type Customer,
  type BillingSummary,
} from '../../../services/invoiceApi';
import { formatDate } from '../../../utils/formatting';
import { formatCurrency } from '../../../utils/currency';

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
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState('');

  // Set default period to current month
  useEffect(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();

    // First day of current month
    const firstDay = new Date(year, month, 1);
    setPeriodStart(firstDay.toISOString().split('T')[0]);

    // Last day of current month
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
      // Auto-select if only one customer
      if (data.length === 1) {
        setSelectedCustomer(data[0].id);
      }
    } catch (err) {
      console.error('Error loading customers:', err);
    }
  }

  // Load billing summary when customer and period change
  useEffect(() => {
    if (selectedCustomer && periodStart && periodEnd) {
      loadBillingSummary();
    } else {
      setBillingSummary(null);
    }
  }, [selectedCustomer, periodStart, periodEnd]);

  async function loadBillingSummary() {
    if (!selectedCustomer || !periodStart || !periodEnd) return;

    try {
      setLoading(true);
      setError(null);
      const summary = await getBillingSummary(selectedCustomer as number, periodStart, periodEnd);
      setBillingSummary(summary);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load billing summary');
      setBillingSummary(null);
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerate() {
    if (!selectedCustomer || !periodStart || !periodEnd) {
      setError('Please select a customer and period');
      return;
    }

    if (!billingSummary || billingSummary.requestCount === 0) {
      setError('No billable requests found for this period');
      return;
    }

    try {
      setGenerating(true);
      setError(null);

      await generateInvoice({
        customerId: selectedCustomer as number,
        periodStart,
        periodEnd,
        notes: notes || undefined,
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
                  <input
                    type="date"
                    value={periodStart}
                    onChange={(e) => setPeriodStart(e.target.value)}
                    className="w-full px-3 py-2 bg-background border border-border rounded text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Period End</label>
                  <input
                    type="date"
                    value={periodEnd}
                    onChange={(e) => setPeriodEnd(e.target.value)}
                    className="w-full px-3 py-2 bg-background border border-border rounded text-sm"
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

          {/* Billing Summary */}
          {loading ? (
            <Card>
              <CardContent className="py-8">
                <div className="flex items-center justify-center text-muted-foreground">
                  <Calculator className="h-5 w-5 mr-2 animate-pulse" />
                  Loading billing summary...
                </div>
              </CardContent>
            </Card>
          ) : billingSummary ? (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Calculator className="h-4 w-4" />
                  Billing Summary
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
          ) : selectedCustomer && periodStart && periodEnd ? (
            <Card>
              <CardContent className="py-8">
                <div className="flex flex-col items-center justify-center text-muted-foreground">
                  <AlertCircle className="h-8 w-8 mb-2" />
                  <p>No billable requests found for this period.</p>
                  <p className="text-sm">Try selecting a different date range.</p>
                </div>
              </CardContent>
            </Card>
          ) : null}

          {/* Error */}
          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded text-destructive text-sm">
              {error}
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
            disabled={generating || !billingSummary || billingSummary.requestCount === 0}
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
