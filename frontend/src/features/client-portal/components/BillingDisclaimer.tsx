import { AlertCircle } from 'lucide-react';

/**
 * Persistent billing disclaimer banner for client portal
 * Explains that displayed data is for reference only
 */
export function BillingDisclaimer() {
  return (
    <div className="bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-800/50 px-4 py-2.5">
      <div className="flex items-start gap-2 max-w-7xl mx-auto">
        <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-500 mt-0.5 flex-shrink-0" />
        <p className="text-xs text-amber-800 dark:text-amber-200">
          <span className="font-medium">Note:</span> Information shown here is for reference only.
          Please refer to your official invoices for finalized charges.
        </p>
      </div>
    </div>
  );
}
