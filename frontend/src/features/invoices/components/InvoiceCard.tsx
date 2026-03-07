/**
 * Invoice Card Component (Mobile)
 * Card-based layout for invoices on small screens
 */

import { useState } from 'react';
import { Eye, Download, FileSpreadsheet, Trash2, CheckCircle2, AlertTriangle, Minus, MoreVertical } from 'lucide-react';
import { InvoiceStatusBadge } from './InvoiceStatusBadge';
import { formatDate } from '../../../utils/formatting';
import { formatCurrency } from '../../../utils/currency';
import type { Invoice } from '../../../services/invoiceApi';

interface InvoiceCardProps {
  invoice: Invoice;
  onView: (invoice: Invoice) => void;
  onExportCSV: (invoice: Invoice) => void;
  onExportQBO: (invoice: Invoice) => void;
  onDelete: (invoice: Invoice) => void;
}

export function InvoiceCard({ invoice, onView, onExportCSV, onExportQBO, onDelete }: InvoiceCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const hasBalance = parseFloat(invoice.balance_due) > 0;

  return (
    <div className="rounded-lg border border-border/50 bg-card p-4 space-y-3">
      {/* Top row: invoice number + status */}
      <div className="flex items-center justify-between">
        <span className="font-semibold text-sm text-foreground">{invoice.invoice_number}</span>
        <div className="flex items-center gap-2">
          <InvoiceStatusBadge status={invoice.status} />
          {/* QBO status */}
          {invoice.qbo_sync_status === 'synced' && (
            <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400" title={`Synced (ID: ${invoice.qbo_invoice_id})`}>
              <CheckCircle2 className="h-3.5 w-3.5" />
            </span>
          )}
          {invoice.qbo_sync_status === 'error' && (
            <span className="inline-flex items-center gap-1 text-xs text-red-600 dark:text-red-400" title={invoice.qbo_sync_error || 'Sync error'}>
              <AlertTriangle className="h-3.5 w-3.5" />
            </span>
          )}
          {invoice.qbo_sync_status === 'pending' && (
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <Minus className="h-3.5 w-3.5" />
            </span>
          )}
        </div>
      </div>

      {/* Customer */}
      <p className="text-sm text-muted-foreground">{invoice.customer_name}</p>

      {/* Period */}
      <p className="text-xs text-muted-foreground">
        {formatDate(invoice.period_start)} - {formatDate(invoice.period_end)}
      </p>

      {/* Totals row */}
      <div className="flex items-end justify-between pt-1">
        <div>
          <p className="text-xs text-muted-foreground">Total</p>
          <p className="text-base font-semibold text-foreground">{formatCurrency(invoice.total)}</p>
        </div>
        {hasBalance && (
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Balance Due</p>
            <p className="text-sm font-medium text-red-600 dark:text-red-400">{formatCurrency(invoice.balance_due)}</p>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-2 border-t border-border/50">
        <button
          onClick={() => onView(invoice)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded hover:bg-primary/90"
        >
          <Eye className="h-3.5 w-3.5" />
          View Invoice
        </button>

        {/* Secondary actions menu */}
        <div className="relative">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-1.5 hover:bg-muted rounded"
            aria-label="More actions"
          >
            <MoreVertical className="h-4 w-4 text-muted-foreground" />
          </button>

          {menuOpen && (
            <>
              {/* Backdrop */}
              <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
              {/* Dropdown */}
              <div className="absolute right-0 bottom-full mb-1 z-50 w-44 rounded-md border border-border bg-popover shadow-md py-1">
                <button
                  onClick={() => { onExportCSV(invoice); setMenuOpen(false); }}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-muted text-left"
                >
                  <Download className="h-3.5 w-3.5" />
                  Download CSV
                </button>
                <button
                  onClick={() => { onExportQBO(invoice); setMenuOpen(false); }}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-muted text-left"
                >
                  <FileSpreadsheet className="h-3.5 w-3.5" />
                  Export for QBO
                </button>
                {invoice.status === 'draft' && (
                  <button
                    onClick={() => { onDelete(invoice); setMenuOpen(false); }}
                    className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-muted text-left text-red-600 dark:text-red-400"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
