/**
 * Invoice Detail Component
 * Displays detailed invoice information with actions
 */

import { useState, useEffect } from 'react';
import { ArrowLeft, Download, Send, CreditCard, FileText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '../../../components/ui/table';
import { InvoiceStatusBadge } from './InvoiceStatusBadge';
import {
  getInvoice,
  sendInvoice,
  payInvoice,
  exportInvoiceCSV,
  exportInvoiceJSON,
  downloadFile,
  type Invoice,
} from '../../../services/invoiceApi';

interface InvoiceDetailProps {
  invoiceId: number;
  onBack: () => void;
  onUpdate: () => void;
}

export function InvoiceDetail({ invoiceId, onBack, onUpdate }: InvoiceDetailProps) {
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState('');
  const [showPaymentForm, setShowPaymentForm] = useState(false);

  useEffect(() => {
    loadInvoice();
  }, [invoiceId]);

  async function loadInvoice() {
    try {
      setLoading(true);
      setError(null);
      const data = await getInvoice(invoiceId);
      setInvoice(data);
      // Set default payment amount to balance due
      setPaymentAmount(data.balance_due);
      setPaymentDate(new Date().toISOString().split('T')[0]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load invoice');
    } finally {
      setLoading(false);
    }
  }

  async function handleSend() {
    if (!invoice || !confirm(`Mark invoice ${invoice.invoice_number} as sent?`)) {
      return;
    }

    try {
      await sendInvoice(invoice.id);
      loadInvoice();
      onUpdate();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to send invoice');
    }
  }

  async function handlePay() {
    if (!invoice) return;

    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      alert('Please enter a valid payment amount');
      return;
    }

    try {
      await payInvoice(invoice.id, amount, paymentDate || undefined);
      setShowPaymentForm(false);
      loadInvoice();
      onUpdate();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to record payment');
    }
  }

  async function handleExportCSV() {
    if (!invoice) return;
    try {
      const csv = await exportInvoiceCSV(invoice.id);
      downloadFile(csv, `invoice-${invoice.invoice_number}.csv`, 'text/csv');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to export CSV');
    }
  }

  async function handleExportJSON() {
    if (!invoice) return;
    try {
      const json = await exportInvoiceJSON(invoice.id);
      downloadFile(JSON.stringify(json, null, 2), `invoice-${invoice.invoice_number}.json`, 'application/json');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to export JSON');
    }
  }

  function formatCurrency(value: string | number): string {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(num);
  }

  function formatDate(dateString: string): string {
    // Handle both ISO format (2025-07-01T00:00:00.000Z) and plain date (2025-07-01)
    const date = dateString.includes('T')
      ? new Date(dateString)
      : new Date(dateString + 'T00:00:00');

    if (isNaN(date.getTime())) {
      return 'Invalid Date';
    }

    return date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center text-muted-foreground">
            Loading invoice...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !invoice) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex flex-col items-center justify-center">
            <p className="text-destructive font-semibold mb-2">Error Loading Invoice</p>
            <p className="text-sm text-muted-foreground mb-4">{error || 'Invoice not found'}</p>
            <button
              onClick={onBack}
              className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
            >
              Back to Invoices
            </button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 hover:bg-muted rounded"
            aria-label="Back to invoices"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Invoice {invoice.invoice_number}
            </h2>
            <p className="text-sm text-muted-foreground">{invoice.customer_name}</p>
          </div>
          <InvoiceStatusBadge status={invoice.status} />
        </div>

        <div className="flex items-center gap-2">
          {invoice.status === 'draft' && (
            <button
              onClick={handleSend}
              className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
            >
              <Send className="h-4 w-4" />
              Mark as Sent
            </button>
          )}
          {(invoice.status === 'sent' || invoice.status === 'overdue') && (
            <button
              onClick={() => setShowPaymentForm(!showPaymentForm)}
              className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
            >
              <CreditCard className="h-4 w-4" />
              Record Payment
            </button>
          )}
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-3 py-2 border border-border rounded hover:bg-muted text-sm"
          >
            <Download className="h-4 w-4" />
            CSV
          </button>
          <button
            onClick={handleExportJSON}
            className="flex items-center gap-2 px-3 py-2 border border-border rounded hover:bg-muted text-sm"
          >
            <Download className="h-4 w-4" />
            JSON
          </button>
        </div>
      </div>

      {/* Payment Form */}
      {showPaymentForm && (
        <Card className="border-green-500/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Record Payment
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-end gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Amount</label>
                <input
                  type="number"
                  step="0.01"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="w-40 px-3 py-2 bg-background border border-border rounded text-sm"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Payment Date</label>
                <input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="px-3 py-2 bg-background border border-border rounded text-sm"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handlePay}
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
                >
                  Submit Payment
                </button>
                <button
                  onClick={() => setShowPaymentForm(false)}
                  className="px-4 py-2 border border-border rounded hover:bg-muted text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Invoice Content */}
      <Card>
        <CardContent className="p-6">
          {/* Invoice Header */}
          <div className="flex flex-col md:flex-row justify-between gap-6 mb-8 pb-6 border-b border-border">
            <div>
              <h3 className="text-lg font-semibold mb-2">Bill To:</h3>
              <p className="font-medium">{invoice.customer_name}</p>
              {invoice.customer_email && (
                <p className="text-sm text-muted-foreground">{invoice.customer_email}</p>
              )}
            </div>
            <div className="text-right">
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                <span className="text-muted-foreground">Invoice Number:</span>
                <span className="font-medium">{invoice.invoice_number}</span>
                <span className="text-muted-foreground">Invoice Date:</span>
                <span>{formatDate(invoice.invoice_date)}</span>
                <span className="text-muted-foreground">Due Date:</span>
                <span>{formatDate(invoice.due_date)}</span>
                <span className="text-muted-foreground">Period:</span>
                <span>{formatDate(invoice.period_start)} - {formatDate(invoice.period_end)}</span>
              </div>
            </div>
          </div>

          {/* Line Items */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3">Line Items</h3>
            <div className="border border-border rounded overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-1/2">Description</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead className="text-right">Unit Price</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoice.items?.filter(item => parseFloat(item.amount) > 0).map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.description}</TableCell>
                      <TableCell className="text-right">{parseFloat(item.quantity).toFixed(2)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.unit_price)}</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(item.amount)}</TableCell>
                    </TableRow>
                  ))}
                  {/* Show free credits applied as info line */}
                  {invoice.items?.filter(item => parseFloat(item.amount) === 0 && item.item_type === 'other').map((item) => (
                    <TableRow key={item.id} className="bg-green-500/5">
                      <TableCell colSpan={4} className="text-green-600 dark:text-green-400 text-sm">
                        {item.description}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Totals */}
          <div className="flex justify-end mb-6">
            <div className="w-64">
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-medium">{formatCurrency(invoice.subtotal)}</span>
              </div>
              {parseFloat(invoice.tax_amount) > 0 && (
                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-muted-foreground">
                    Tax ({(parseFloat(invoice.tax_rate) * 100).toFixed(2)}%)
                  </span>
                  <span className="font-medium">{formatCurrency(invoice.tax_amount)}</span>
                </div>
              )}
              <div className="flex justify-between py-2 border-b border-border text-lg">
                <span className="font-semibold">Total</span>
                <span className="font-bold">{formatCurrency(invoice.total)}</span>
              </div>
              {parseFloat(invoice.amount_paid) > 0 && (
                <div className="flex justify-between py-2 border-b border-border text-green-600 dark:text-green-400">
                  <span>Amount Paid</span>
                  <span>-{formatCurrency(invoice.amount_paid)}</span>
                </div>
              )}
              <div className="flex justify-between py-2 text-lg">
                <span className="font-semibold">Balance Due</span>
                <span className={`font-bold ${parseFloat(invoice.balance_due) > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                  {formatCurrency(invoice.balance_due)}
                </span>
              </div>
            </div>
          </div>

          {/* Notes */}
          {invoice.notes && (
            <div className="pt-4 border-t border-border">
              <h4 className="text-sm font-medium mb-2">Notes</h4>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{invoice.notes}</p>
            </div>
          )}

          {/* Linked Requests */}
          {invoice.requests && invoice.requests.length > 0 && (
            <div className="pt-6 border-t border-border mt-6">
              <h3 className="text-lg font-semibold mb-3">Linked Requests ({invoice.requests.length})</h3>
              <div className="border border-border rounded overflow-hidden max-h-64 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Urgency</TableHead>
                      <TableHead className="text-right">Hours</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoice.requests.map((req) => (
                      <TableRow key={req.id}>
                        <TableCell className="text-sm">{formatDate(req.date)}</TableCell>
                        <TableCell className="text-sm">{req.time}</TableCell>
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
    </div>
  );
}
