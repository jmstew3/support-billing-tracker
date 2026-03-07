/**
 * Invoices Page Component
 * Main page for invoice management
 */

import { useState, useEffect } from 'react';
import { PageHeader } from '../../../components/shared/PageHeader';
import { InvoiceList } from './InvoiceList';
import { InvoiceDetail } from './InvoiceDetail';
import { GenerateInvoiceModal } from './GenerateInvoiceModal';
import type { Invoice } from '../../../services/invoiceApi';

interface InvoicesProps {
  onToggleMobileMenu?: () => void;
}

export function Invoices({ onToggleMobileMenu }: InvoicesProps) {
  const [view, setView] = useState<'list' | 'detail'>('list');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [qboMessage, setQboMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Handle QBO OAuth callback redirect params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const qboParam = params.get('qbo');
    if (qboParam === 'connected') {
      setQboMessage({ type: 'success', text: 'QuickBooks Online connected successfully.' });
    } else if (qboParam === 'error') {
      const message = params.get('message') || 'Connection failed';
      setQboMessage({ type: 'error', text: `QBO connection error: ${message}` });
    }
    // Clean up URL params
    if (qboParam) {
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  function handleViewInvoice(invoice: Invoice) {
    setSelectedInvoice(invoice);
    setView('detail');
  }

  function handleBackToList() {
    setView('list');
    setSelectedInvoice(null);
  }

  function handleGenerateSuccess() {
    setRefreshTrigger((prev) => prev + 1);
    setShowGenerateModal(false);
  }

  function handleInvoiceUpdate() {
    setRefreshTrigger((prev) => prev + 1);
  }

  return (
    <div className="flex flex-col h-full">
      {/* Sticky Header */}
      <PageHeader
        title="Invoices"
        showPeriodSelector={false}
        showViewToggle={false}
        onToggleMobileMenu={onToggleMobileMenu}
      />

      {/* QBO Connection Banner */}
      {qboMessage && (
        <div className={`mx-4 mt-2 px-4 py-3 rounded text-sm flex items-center justify-between ${
          qboMessage.type === 'success'
            ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
            : 'bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'
        }`}>
          <span>{qboMessage.text}</span>
          <button onClick={() => setQboMessage(null)} className="ml-4 font-medium hover:underline">Dismiss</button>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="p-4 sm:p-6 lg:p-8">
          {view === 'list' ? (
            <InvoiceList
              onViewInvoice={handleViewInvoice}
              onGenerateInvoice={() => setShowGenerateModal(true)}
              refreshTrigger={refreshTrigger}
            />
          ) : selectedInvoice ? (
            <InvoiceDetail
              invoiceId={selectedInvoice.id}
              onBack={handleBackToList}
              onUpdate={handleInvoiceUpdate}
            />
          ) : null}
        </div>
      </div>

      {/* Generate Invoice Modal */}
      <GenerateInvoiceModal
        isOpen={showGenerateModal}
        onClose={() => setShowGenerateModal(false)}
        onSuccess={handleGenerateSuccess}
      />
    </div>
  );
}
