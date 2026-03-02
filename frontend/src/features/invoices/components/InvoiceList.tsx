/**
 * Invoice List Component
 * Displays a list of invoices with filtering, pagination, and actions
 */

import { useState, useEffect, useCallback } from 'react';
import { FileText, Plus, Download, Eye, Trash2, Send } from 'lucide-react';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '../../../components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Pagination } from '../../../components/shared/Pagination';
import { ConfirmDialog } from '../../../components/shared/ConfirmDialog';
import { ToastContainer } from '../../../components/shared/Toast';
import { createToast, type ToastMessage } from '../../../utils/toast';
import { InvoiceStatusBadge } from './InvoiceStatusBadge';
import {
  listInvoices,
  listCustomers,
  deleteInvoice,
  sendInvoice,
  exportInvoiceCSV,
  downloadFile,
  type Invoice,
  type Customer,
  type InvoiceFilters,
} from '../../../services/invoiceApi';
import { formatDate } from '../../../utils/formatting';
import { formatCurrency } from '../../../utils/currency';

interface InvoiceListProps {
  onViewInvoice: (invoice: Invoice) => void;
  onGenerateInvoice: () => void;
  refreshTrigger?: number;
}

const DEFAULT_PAGE_SIZE = 20;

export function InvoiceList({ onViewInvoice, onGenerateInvoice, refreshTrigger }: InvoiceListProps) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);

  // Filters
  const [statusFilter, setStatusFilter] = useState<Invoice['status'] | ''>('');
  const [customerFilter, setCustomerFilter] = useState<number | ''>('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

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

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, customerFilter]);

  // Load data
  useEffect(() => {
    loadData();
  }, [statusFilter, customerFilter, currentPage, pageSize, refreshTrigger]);

  useEffect(() => {
    loadCustomers();
  }, []);

  async function loadCustomers() {
    try {
      const data = await listCustomers();
      setCustomers(data);
    } catch (err) {
      console.error('Error loading customers:', err);
    }
  }

  async function loadData() {
    try {
      setLoading(true);
      setError(null);

      const filters: InvoiceFilters = {
        limit: pageSize,
        offset: (currentPage - 1) * pageSize,
      };

      if (statusFilter) {
        filters.status = statusFilter;
      }

      if (customerFilter) {
        filters.customerId = customerFilter;
      }

      const result = await listInvoices(filters);
      setInvoices(result.invoices);
      setTotal(result.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load invoices');
      console.error('Error loading invoices:', err);
    } finally {
      setLoading(false);
    }
  }

  function handleDelete(invoice: Invoice) {
    if (invoice.status !== 'draft') {
      addToast('error', 'Only draft invoices can be deleted');
      return;
    }

    setConfirmDialog({
      isOpen: true,
      title: 'Delete Invoice',
      message: `Are you sure you want to delete invoice ${invoice.invoice_number}? This will unlink all associated requests.`,
      confirmText: 'Delete',
      isDestructive: true,
      onConfirm: async () => {
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        try {
          await deleteInvoice(invoice.id);
          addToast('success', `Invoice ${invoice.invoice_number} deleted`);
          loadData();
        } catch (err) {
          addToast('error', err instanceof Error ? err.message : 'Failed to delete invoice');
        }
      },
    });
  }

  function handleSend(invoice: Invoice) {
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
          loadData();
        } catch (err) {
          addToast('error', err instanceof Error ? err.message : 'Failed to send invoice');
        }
      },
    });
  }

  async function handleExportCSV(invoice: Invoice) {
    try {
      const csv = await exportInvoiceCSV(invoice.id);
      downloadFile(csv, `invoice-${invoice.invoice_number}.csv`, 'text/csv');
    } catch (err) {
      addToast('error', err instanceof Error ? err.message : 'Failed to export CSV');
    }
  }

  function handlePageSizeChange(size: number | 'all') {
    if (size === 'all') {
      setPageSize(total || 1000);
    } else {
      setPageSize(size);
    }
    setCurrentPage(1);
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  if (loading && invoices.length === 0) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <div className="text-muted-foreground">Loading invoices...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex flex-col items-center justify-center">
            <p className="text-destructive font-semibold mb-2">Error Loading Invoices</p>
            <p className="text-sm text-muted-foreground mb-4">{error}</p>
            <button
              onClick={loadData}
              className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
            >
              Retry
            </button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Invoices ({total})
          </CardTitle>
          <button
            onClick={onGenerateInvoice}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 text-sm font-medium"
          >
            <Plus className="h-4 w-4" />
            Generate Invoice
          </button>
        </CardHeader>

        <CardContent>
          {/* Filters */}
          <div className="flex flex-wrap gap-4 mb-4">
            <div className="flex items-center gap-2">
              <label className="text-sm text-muted-foreground">Status:</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as Invoice['status'] | '')}
                className="px-3 py-1.5 bg-background border border-border rounded text-sm"
              >
                <option value="">All</option>
                <option value="draft">Draft</option>
                <option value="sent">Sent</option>
                <option value="paid">Paid</option>
                <option value="overdue">Overdue</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-sm text-muted-foreground">Customer:</label>
              <select
                value={customerFilter}
                onChange={(e) => setCustomerFilter(e.target.value ? parseInt(e.target.value) : '')}
                className="px-3 py-1.5 bg-background border border-border rounded text-sm"
              >
                <option value="">All</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Invoice Table */}
          {invoices.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No invoices found. Click "Generate Invoice" to create one.
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                    <TableHead className="text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-medium">{invoice.invoice_number}</TableCell>
                      <TableCell>{invoice.customer_name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(invoice.period_start)} - {formatDate(invoice.period_end)}
                      </TableCell>
                      <TableCell>{formatDate(invoice.invoice_date)}</TableCell>
                      <TableCell>{formatDate(invoice.due_date)}</TableCell>
                      <TableCell>
                        <InvoiceStatusBadge status={invoice.status} />
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(invoice.total)}
                      </TableCell>
                      <TableCell className="text-right">
                        {parseFloat(invoice.balance_due) > 0 ? (
                          <span className="text-red-600 dark:text-red-400 font-medium">
                            {formatCurrency(invoice.balance_due)}
                          </span>
                        ) : (
                          <span className="text-green-600 dark:text-green-400">$0.00</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => onViewInvoice(invoice)}
                            className="p-1.5 hover:bg-muted rounded"
                            title="View invoice"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          {invoice.status === 'draft' && (
                            <button
                              onClick={() => handleSend(invoice)}
                              className="p-1.5 hover:bg-muted rounded text-blue-600 dark:text-blue-400"
                              title="Mark as sent"
                            >
                              <Send className="h-4 w-4" />
                            </button>
                          )}
                          <button
                            onClick={() => handleExportCSV(invoice)}
                            className="p-1.5 hover:bg-muted rounded"
                            title="Export CSV"
                          >
                            <Download className="h-4 w-4" />
                          </button>
                          {invoice.status === 'draft' && (
                            <button
                              onClick={() => handleDelete(invoice)}
                              className="p-1.5 hover:bg-muted rounded text-red-600 dark:text-red-400"
                              title="Delete invoice"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                pageSize={pageSize}
                totalItems={total}
                onPageChange={setCurrentPage}
                onPageSizeChange={handlePageSizeChange}
              />
            </>
          )}
        </CardContent>
      </Card>

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
