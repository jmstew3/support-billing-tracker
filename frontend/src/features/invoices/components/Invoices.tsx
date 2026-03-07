/**
 * Invoices Page Component
 * Main page for invoice management
 */

import { useState, useEffect } from 'react';
import { PageHeader } from '../../../components/shared/PageHeader';
import { InvoiceList } from './InvoiceList';
import { InvoiceDetail } from './InvoiceDetail';
import { GenerateInvoiceModal } from './GenerateInvoiceModal';
import type { Invoice, QBOStatus } from '../../../services/invoiceApi';
import { getQBOStatus, connectQBO, disconnectQBO } from '../../../services/invoiceApi';

interface InvoicesProps {
  onToggleMobileMenu?: () => void;
}

export function Invoices({ onToggleMobileMenu }: InvoicesProps) {
  const [view, setView] = useState<'list' | 'detail'>('list');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [qboMessage, setQboMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [qboStatus, setQboStatus] = useState<QBOStatus | null>(null);
  const [qboLoading, setQboLoading] = useState(false);

  // Fetch QBO connection status on mount
  useEffect(() => {
    getQBOStatus()
      .then(setQboStatus)
      .catch(() => setQboStatus(null));
  }, []);

  async function handleConnectQBO() {
    setQboLoading(true);
    try {
      const authUrl = await connectQBO();
      window.location.href = authUrl;
    } catch (err) {
      setQboMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to start QBO connection' });
      setQboLoading(false);
    }
  }

  async function handleDisconnectQBO() {
    setQboLoading(true);
    try {
      await disconnectQBO();
      setQboStatus(null);
      setQboMessage({ type: 'success', text: 'QuickBooks Online disconnected.' });
    } catch (err) {
      setQboMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to disconnect QBO' });
    } finally {
      setQboLoading(false);
    }
  }

  // Handle QBO OAuth callback redirect params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const qboParam = params.get('qbo');
    if (qboParam === 'connected') {
      setQboMessage({ type: 'success', text: 'QuickBooks Online connected successfully.' });
      getQBOStatus().then(setQboStatus).catch(() => {});
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

      {/* QBO Connection Status */}
      <div className="mx-4 mt-2 px-4 py-3 rounded text-sm flex items-center justify-between bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
        {qboStatus?.connected ? (
          <>
            <span className="text-gray-700 dark:text-gray-300">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 mr-2" />
              Connected to QuickBooks: <span className="font-medium">{qboStatus.companyName}</span>
            </span>
            <button
              onClick={handleDisconnectQBO}
              disabled={qboLoading}
              className="ml-4 px-3 py-1 text-xs font-medium rounded bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-900/50 disabled:opacity-50"
            >
              {qboLoading ? 'Disconnecting...' : 'Disconnect'}
            </button>
          </>
        ) : (
          <>
            <span className="text-gray-500 dark:text-gray-400">
              <span className="inline-block w-2 h-2 rounded-full bg-gray-400 mr-2" />
              QuickBooks not connected
            </span>
            <button
              onClick={handleConnectQBO}
              disabled={qboLoading}
              className="ml-4 px-3 py-1 text-xs font-medium rounded bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-200 dark:hover:bg-emerald-900/50 disabled:opacity-50"
            >
              {qboLoading ? 'Connecting...' : 'Connect to QuickBooks'}
            </button>
          </>
        )}
      </div>

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
