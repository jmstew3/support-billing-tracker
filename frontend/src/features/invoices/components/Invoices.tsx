/**
 * Invoices Page Component
 * Main page for invoice management
 */

import { useState } from 'react';
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

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
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
      </main>

      {/* Generate Invoice Modal */}
      <GenerateInvoiceModal
        isOpen={showGenerateModal}
        onClose={() => setShowGenerateModal(false)}
        onSuccess={handleGenerateSuccess}
      />
    </div>
  );
}
