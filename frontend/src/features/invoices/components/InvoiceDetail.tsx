/**
 * Invoice Detail Component
 * Displays detailed invoice information with actions and inline editing for drafts
 */

import { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Download, Send, CreditCard, FileText, Pencil, X, Plus, Minus, Save } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '../../../components/ui/table';
import { ConfirmDialog } from '../../../components/shared/ConfirmDialog';
import { ToastContainer } from '../../../components/shared/Toast';
import { createToast, type ToastMessage } from '../../../utils/toast';
import { InvoiceStatusBadge } from './InvoiceStatusBadge';
import {
  getInvoice,
  sendInvoice,
  payInvoice,
  updateInvoice,
  updateInvoiceItem,
  unlinkRequest,
  linkRequest,
  getUnbilledRequests,
  exportInvoiceCSV,
  exportInvoiceQBOCSV,
  exportHostingDetailCSV,
  exportInvoiceJSON,
  downloadFile,
  type Invoice,
  type InvoiceItem,
  type InvoiceRequest,
} from '../../../services/invoiceApi';
import { formatDateFull } from '../../../utils/formatting';
import { formatCurrency } from '../../../utils/currency';
import { DateInput } from '../../../components/shared/DateInput';
import { fetchWebsiteProperties, calculateMonthlyHosting } from '../../../services/hostingApi';

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

  // Editing state
  const [editMode, setEditMode] = useState(false);
  const [editingItem, setEditingItem] = useState<number | null>(null);
  const [editValues, setEditValues] = useState<{ description: string; quantity: string; unit_price: string }>({
    description: '', quantity: '', unit_price: ''
  });
  const [unbilledRequests, setUnbilledRequests] = useState<InvoiceRequest[]>([]);
  const [showAddRequests, setShowAddRequests] = useState(false);

  // Period editing state
  const [editingPeriod, setEditingPeriod] = useState(false);
  const [editPeriodStart, setEditPeriodStart] = useState('');
  const [editPeriodEnd, setEditPeriodEnd] = useState('');

  // Confirm dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText: string;
    isDestructive: boolean;
    onConfirm: () => void;
  }>({ isOpen: false, title: '', message: '', confirmText: 'Confirm', isDestructive: false, onConfirm: () => {} });

  // Toast notifications
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((type: ToastMessage['type'], message: string) => {
    setToasts(prev => [...prev, createToast(type, message)]);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const formatDate = formatDateFull;

  useEffect(() => {
    loadInvoice();
  }, [invoiceId]);

  async function loadInvoice() {
    try {
      setLoading(true);
      setError(null);
      let data = await getInvoice(invoiceId);

      // Auto-populate hosting detail snapshot if missing
      const hasHostingItem = data.items?.some((i: InvoiceItem) => i.item_type === 'hosting');
      if (hasHostingItem && !data.hosting_detail_snapshot) {
        try {
          const targetMonth = data.period_start?.slice(0, 7); // YYYY-MM
          if (targetMonth) {
            const properties = await fetchWebsiteProperties();
            const summary = calculateMonthlyHosting(properties, targetMonth);
            const snapshot = summary.charges.map(h => ({
              siteName: h.siteName,
              websiteUrl: h.websiteUrl,
              billingType: h.billingType,
              daysActive: h.daysActive,
              daysInMonth: h.daysInMonth,
              grossAmount: h.grossAmount,
              creditApplied: h.creditApplied,
              creditAmount: h.creditAmount,
              netAmount: h.netAmount,
            }));
            data = await updateInvoice(data.id, { hosting_detail_snapshot: snapshot });
          }
        } catch (snapshotErr) {
          console.warn('Failed to auto-populate hosting snapshot:', snapshotErr);
        }
      }

      setInvoice(data);
      setPaymentAmount(data.balance_due);
      setPaymentDate(new Date().toISOString().split('T')[0]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load invoice');
    } finally {
      setLoading(false);
    }
  }

  async function loadUnbilledRequests() {
    try {
      const requests = await getUnbilledRequests(invoiceId);
      setUnbilledRequests(requests);
    } catch (err) {
      addToast('error', err instanceof Error ? err.message : 'Failed to load unbilled requests');
    }
  }

  function handleSend() {
    if (!invoice) return;

    setConfirmDialog({
      isOpen: true,
      title: 'Mark as Sent',
      message: `Mark invoice ${invoice.invoice_number} as sent? This will lock it from editing.`,
      confirmText: 'Mark as Sent',
      isDestructive: false,
      onConfirm: async () => {
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        try {
          await sendInvoice(invoice.id);
          addToast('success', `Invoice ${invoice.invoice_number} marked as sent`);
          setEditMode(false);
          loadInvoice();
          onUpdate();
        } catch (err) {
          addToast('error', err instanceof Error ? err.message : 'Failed to send invoice');
        }
      },
    });
  }

  async function handlePay() {
    if (!invoice) return;

    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      addToast('error', 'Please enter a valid payment amount');
      return;
    }

    try {
      await payInvoice(invoice.id, amount, paymentDate || undefined);
      setShowPaymentForm(false);
      addToast('success', `Payment of ${formatCurrency(amount)} recorded`);
      loadInvoice();
      onUpdate();
    } catch (err) {
      addToast('error', err instanceof Error ? err.message : 'Failed to record payment');
    }
  }

  async function handleExportCSV() {
    if (!invoice) return;
    try {
      const csv = await exportInvoiceCSV(invoice.id);
      downloadFile(csv, `invoice-${invoice.invoice_number}.csv`, 'text/csv');
    } catch (err) {
      addToast('error', err instanceof Error ? err.message : 'Failed to export CSV');
    }
  }

  async function handleExportJSON() {
    if (!invoice) return;
    try {
      const json = await exportInvoiceJSON(invoice.id);
      downloadFile(JSON.stringify(json, null, 2), `invoice-${invoice.invoice_number}.json`, 'application/json');
    } catch (err) {
      addToast('error', err instanceof Error ? err.message : 'Failed to export JSON');
    }
  }

  async function handleExportQBOCSV() {
    if (!invoice) return;
    try {
      const csv = await exportInvoiceQBOCSV(invoice.id);
      downloadFile(csv, `${invoice.invoice_number}-qbo.csv`, 'text/csv');
    } catch (err) {
      addToast('error', err instanceof Error ? err.message : 'Failed to export QBO CSV');
    }
  }

  async function handleExportHostingCSV() {
    if (!invoice) return;
    try {
      const csv = await exportHostingDetailCSV(invoice.id);
      downloadFile(csv, `${invoice.invoice_number}-hosting-detail.csv`, 'text/csv');
    } catch (err) {
      addToast('error', err instanceof Error ? err.message : 'Failed to export hosting detail CSV');
    }
  }

  // Edit mode handlers
  function startEditItem(item: InvoiceItem) {
    setEditingItem(item.id);
    setEditValues({
      description: item.description,
      quantity: parseFloat(item.quantity).toString(),
      unit_price: parseFloat(item.unit_price).toString(),
    });
  }

  function cancelEditItem() {
    setEditingItem(null);
    setEditValues({ description: '', quantity: '', unit_price: '' });
  }

  async function saveEditItem(itemId: number) {
    try {
      const updates: { description?: string; quantity?: number; unit_price?: number } = {};
      const origItem = invoice?.items?.find(i => i.id === itemId);
      if (!origItem) return;

      if (editValues.description !== origItem.description) {
        updates.description = editValues.description;
      }
      if (editValues.quantity !== parseFloat(origItem.quantity).toString()) {
        updates.quantity = parseFloat(editValues.quantity);
      }
      if (editValues.unit_price !== parseFloat(origItem.unit_price).toString()) {
        updates.unit_price = parseFloat(editValues.unit_price);
      }

      if (Object.keys(updates).length === 0) {
        cancelEditItem();
        return;
      }

      const updated = await updateInvoiceItem(invoiceId, itemId, updates);
      setInvoice(updated);
      setEditingItem(null);
      addToast('success', 'Line item updated');
      onUpdate();
    } catch (err) {
      addToast('error', err instanceof Error ? err.message : 'Failed to update line item');
    }
  }

  function handleUnlinkRequest(req: InvoiceRequest) {
    setConfirmDialog({
      isOpen: true,
      title: 'Remove Request',
      message: `Remove "${req.description}" (${parseFloat(req.estimated_hours).toFixed(2)}h) from this invoice? It will become unbilled again.`,
      confirmText: 'Remove',
      isDestructive: true,
      onConfirm: async () => {
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        try {
          const updated = await unlinkRequest(invoiceId, req.id);
          setInvoice(updated);
          addToast('success', 'Request removed from invoice');
          onUpdate();
          // Refresh unbilled requests if panel is open
          if (showAddRequests) loadUnbilledRequests();
        } catch (err) {
          addToast('error', err instanceof Error ? err.message : 'Failed to remove request');
        }
      },
    });
  }

  async function handleLinkRequest(req: InvoiceRequest) {
    try {
      const updated = await linkRequest(invoiceId, req.id);
      setInvoice(updated);
      setUnbilledRequests(prev => prev.filter(r => r.id !== req.id));
      addToast('success', 'Request added to invoice');
      onUpdate();
    } catch (err) {
      addToast('error', err instanceof Error ? err.message : 'Failed to add request');
    }
  }

  function toggleEditMode() {
    setEditMode(!editMode);
    setEditingItem(null);
    setShowAddRequests(false);
    setEditingPeriod(false);
  }

  function toggleAddRequests() {
    if (!showAddRequests) {
      loadUnbilledRequests();
    }
    setShowAddRequests(!showAddRequests);
  }

  function startEditPeriod() {
    if (!invoice) return;
    setEditPeriodStart(invoice.period_start.split('T')[0]);
    setEditPeriodEnd(invoice.period_end.split('T')[0]);
    setEditingPeriod(true);
  }

  async function savePeriod() {
    if (!invoice || !editPeriodStart || !editPeriodEnd) return;
    try {
      const updated = await updateInvoice(invoice.id, {
        period_start: editPeriodStart,
        period_end: editPeriodEnd,
      });
      setInvoice(updated);
      setEditingPeriod(false);
      addToast('success', 'Invoice period updated');
      onUpdate();
    } catch (err) {
      addToast('error', err instanceof Error ? err.message : 'Failed to update period');
    }
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

  const isDraft = invoice.status === 'draft';

  return (
    <>
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
            {editMode && (
              <span className="text-xs px-2 py-0.5 rounded bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border border-yellow-500/20">
                Editing
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {isDraft && (
              <button
                onClick={toggleEditMode}
                className={`flex items-center gap-2 px-3 py-2 rounded text-sm ${
                  editMode
                    ? 'bg-muted border border-border'
                    : 'bg-yellow-600 text-white hover:bg-yellow-700'
                }`}
              >
                {editMode ? <X className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
                {editMode ? 'Done Editing' : 'Edit'}
              </button>
            )}
            {isDraft && !editMode && (
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
            <div className="flex items-center gap-1 border border-border rounded overflow-hidden">
              <button
                onClick={handleExportQBOCSV}
                className="flex items-center gap-1.5 px-3 py-2 hover:bg-muted text-sm font-medium"
                title="QuickBooks Online import CSV"
              >
                <Download className="h-4 w-4" />
                QBO
              </button>
              <div className="w-px h-6 bg-border" />
              <button
                onClick={handleExportCSV}
                className="flex items-center gap-1.5 px-3 py-2 hover:bg-muted text-sm"
                title="Human-readable invoice CSV"
              >
                CSV
              </button>
              {invoice.hosting_detail_snapshot && (
                <>
                  <div className="w-px h-6 bg-border" />
                  <button
                    onClick={handleExportHostingCSV}
                    className="flex items-center gap-1.5 px-3 py-2 hover:bg-muted text-sm"
                    title="Per-site hosting breakdown CSV"
                  >
                    Hosting
                  </button>
                </>
              )}
              <div className="w-px h-6 bg-border" />
              <button
                onClick={handleExportJSON}
                className="flex items-center gap-1.5 px-3 py-2 hover:bg-muted text-sm"
                title="JSON export for API/automation"
              >
                JSON
              </button>
            </div>
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
                  {editingPeriod ? (
                    <div className="flex flex-col gap-2 col-span-1">
                      <div className="flex items-center gap-2">
                        <DateInput
                          value={editPeriodStart}
                          onChange={setEditPeriodStart}
                          label="Period Start"
                          className="w-36"
                        />
                        <span className="text-muted-foreground">-</span>
                        <DateInput
                          value={editPeriodEnd}
                          onChange={setEditPeriodEnd}
                          label="Period End"
                          className="w-36"
                        />
                        <button
                          onClick={savePeriod}
                          className="p-1 hover:bg-muted rounded text-green-600"
                          title="Save period"
                        >
                          <Save className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setEditingPeriod(false)}
                          className="p-1 hover:bg-muted rounded text-muted-foreground"
                          title="Cancel"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <span className="flex items-center gap-1">
                      {formatDate(invoice.period_start)} - {formatDate(invoice.period_end)}
                      {editMode && (
                        <button
                          onClick={startEditPeriod}
                          className="p-0.5 hover:bg-muted rounded text-yellow-600 ml-1"
                          title="Edit period"
                        >
                          <Pencil className="h-3 w-3" />
                        </button>
                      )}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Line Items */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-3">Line Items</h3>
              {(() => {
                const items = invoice.items || [];
                const billableItems = items.filter(item => parseFloat(item.amount) > 0);
                const creditItems = items.filter(item => parseFloat(item.amount) === 0 && item.item_type === 'other');
                const freeProjectItems = items.filter(item => parseFloat(item.amount) === 0 && item.item_type === 'project');
                const itemTypes = new Set(billableItems.map(i => i.item_type));
                const hasMultipleTypes = itemTypes.size > 1 || (itemTypes.size === 1 && freeProjectItems.length > 0);

                const sectionLabels: Record<string, string> = {
                  support: 'Support',
                  project: 'Projects',
                  hosting: 'Hosting',
                  other: 'Other',
                };

                // Group items by type, preserving sort_order within groups
                const typeOrder = ['support', 'project', 'hosting', 'other'] as const;
                const groupedItems = typeOrder
                  .map(type => ({
                    type,
                    label: sectionLabels[type],
                    items: [...billableItems.filter(i => i.item_type === type),
                            ...(type === 'project' ? freeProjectItems : [])],
                  }))
                  .filter(g => g.items.length > 0);

                const renderItemRow = (item: InvoiceItem) => (
                  <TableRow key={item.id} className={parseFloat(item.amount) === 0 ? 'bg-green-500/5' : ''}>
                    {editingItem === item.id ? (
                      <>
                        <TableCell>
                          <input
                            type="text"
                            value={editValues.description}
                            onChange={(e) => setEditValues(prev => ({ ...prev, description: e.target.value }))}
                            className="w-full px-2 py-1 bg-background border border-border rounded text-sm"
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <input
                            type="number"
                            step="0.01"
                            value={editValues.quantity}
                            onChange={(e) => setEditValues(prev => ({ ...prev, quantity: e.target.value }))}
                            className="w-20 px-2 py-1 bg-background border border-border rounded text-sm text-right"
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <input
                            type="number"
                            step="0.01"
                            value={editValues.unit_price}
                            onChange={(e) => setEditValues(prev => ({ ...prev, unit_price: e.target.value }))}
                            className="w-24 px-2 py-1 bg-background border border-border rounded text-sm text-right"
                          />
                        </TableCell>
                        <TableCell className="text-right font-medium text-muted-foreground">
                          {formatCurrency((parseFloat(editValues.quantity) || 0) * (parseFloat(editValues.unit_price) || 0))}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => saveEditItem(item.id)}
                              className="p-1 hover:bg-muted rounded text-green-600"
                              title="Save"
                            >
                              <Save className="h-4 w-4" />
                            </button>
                            <button
                              onClick={cancelEditItem}
                              className="p-1 hover:bg-muted rounded text-muted-foreground"
                              title="Cancel"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        </TableCell>
                      </>
                    ) : (
                      <>
                        <TableCell>
                          {item.description}
                          {parseFloat(item.amount) === 0 && item.item_type === 'project' && (
                            <span className="ml-2 text-xs text-green-600 dark:text-green-400">(Free Credit)</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {parseFloat(item.amount) === 0 && item.item_type === 'project'
                            ? '-'
                            : parseFloat(item.quantity).toFixed(2)
                          }
                        </TableCell>
                        <TableCell className="text-right">
                          {parseFloat(item.amount) === 0 && item.item_type === 'project'
                            ? '-'
                            : formatCurrency(item.unit_price)
                          }
                        </TableCell>
                        <TableCell className={`text-right font-medium ${
                          parseFloat(item.amount) === 0 ? 'text-green-600 dark:text-green-400' : ''
                        }`}>
                          {formatCurrency(item.amount)}
                        </TableCell>
                        {editMode && (
                          <TableCell>
                            <div className="flex items-center justify-center">
                              {parseFloat(item.amount) > 0 && (
                                <button
                                  onClick={() => startEditItem(item)}
                                  className="p-1 hover:bg-muted rounded text-yellow-600"
                                  title="Edit line item"
                                >
                                  <Pencil className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          </TableCell>
                        )}
                      </>
                    )}
                  </TableRow>
                );

                return (
                  <div className="border border-border rounded overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-1/2">Description</TableHead>
                          <TableHead className="text-right">Quantity</TableHead>
                          <TableHead className="text-right">Unit Price</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                          {editMode && <TableHead className="w-20 text-center">Actions</TableHead>}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {hasMultipleTypes ? (
                          groupedItems.map((group) => (
                            <>{/* Section header + items */}
                              <TableRow key={`header-${group.type}`} className="bg-muted/30">
                                <TableCell
                                  colSpan={editMode ? 5 : 4}
                                  className="text-xs font-semibold uppercase tracking-wider text-muted-foreground py-2"
                                >
                                  {group.label}
                                </TableCell>
                              </TableRow>
                              {group.items.map(renderItemRow)}
                            </>
                          ))
                        ) : (
                          billableItems.map(renderItemRow)
                        )}
                        {/* Show free credits applied as info line (support credits) */}
                        {creditItems.map((item) => (
                          <TableRow key={item.id} className="bg-green-500/5">
                            <TableCell colSpan={editMode ? 5 : 4} className="text-green-600 dark:text-green-400 text-sm">
                              {item.description}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                );
              })()}
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
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold">Linked Requests ({invoice.requests.length})</h3>
                  {editMode && (
                    <button
                      onClick={toggleAddRequests}
                      className="flex items-center gap-1 px-3 py-1.5 text-sm border border-border rounded hover:bg-muted"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add Requests
                    </button>
                  )}
                </div>
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
                        {editMode && <TableHead className="w-12"></TableHead>}
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
                          {editMode && (
                            <TableCell>
                              <button
                                onClick={() => handleUnlinkRequest(req)}
                                className="p-1 hover:bg-muted rounded text-red-600 dark:text-red-400"
                                title="Remove from invoice"
                              >
                                <Minus className="h-4 w-4" />
                              </button>
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {/* Add Requests Panel (edit mode only) */}
            {editMode && showAddRequests && (
              <div className="pt-4 mt-4 border-t border-border">
                <h4 className="text-sm font-semibold mb-2">Unbilled Requests for This Period</h4>
                {unbilledRequests.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    No unbilled requests available for this invoice's period.
                  </p>
                ) : (
                  <div className="border border-border rounded overflow-hidden max-h-48 overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead>Urgency</TableHead>
                          <TableHead className="text-right">Hours</TableHead>
                          <TableHead className="w-12"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {unbilledRequests.map((req) => (
                          <TableRow key={req.id}>
                            <TableCell className="text-sm">{formatDate(req.date)}</TableCell>
                            <TableCell className="text-sm max-w-xs truncate">{req.description}</TableCell>
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
                            <TableCell>
                              <button
                                onClick={() => handleLinkRequest(req)}
                                className="p-1 hover:bg-muted rounded text-green-600 dark:text-green-400"
                                title="Add to invoice"
                              >
                                <Plus className="h-4 w-4" />
                              </button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            )}

            {/* Empty requests - show add button if in edit mode */}
            {editMode && (!invoice.requests || invoice.requests.length === 0) && (
              <div className="pt-6 border-t border-border mt-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold">Linked Requests (0)</h3>
                  <button
                    onClick={toggleAddRequests}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm border border-border rounded hover:bg-muted"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add Requests
                  </button>
                </div>
                <p className="text-sm text-muted-foreground text-center py-4">
                  No requests linked. Click "Add Requests" to link unbilled requests.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmText={confirmDialog.confirmText}
        isDestructive={confirmDialog.isDestructive}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
      />

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </>
  );
}
