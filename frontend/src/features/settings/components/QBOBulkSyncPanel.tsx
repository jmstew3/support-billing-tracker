import { useState, useEffect, useCallback } from 'react';
import { Loader2, Upload, AlertTriangle } from 'lucide-react';
import { bulkSyncInvoicesToQBO, getEligibleSyncCount } from '../../../services/qboApi';
import type { BulkSyncResult } from '../../../services/qboApi';

export function QBOBulkSyncPanel() {
  const [eligibleCount, setEligibleCount] = useState<number | null>(null);
  const [result, setResult] = useState<BulkSyncResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [countLoading, setCountLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCount = useCallback(async () => {
    try {
      setCountLoading(true);
      const data = await getEligibleSyncCount();
      setEligibleCount(data.eligible);
    } catch {
      setEligibleCount(null);
    } finally {
      setCountLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCount();
  }, [fetchCount]);

  async function handleBulkSync() {
    try {
      setLoading(true);
      setError(null);
      setResult(null);
      const data = await bulkSyncInvoicesToQBO();
      setResult(data);
      // Refresh count after sync
      await fetchCount();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bulk sync failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-card rounded-lg border border-border p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Upload size={18} className="text-muted-foreground" />
          <h3 className="text-lg font-semibold">Bulk Invoice Sync</h3>
        </div>
      </div>

      <p className="text-sm text-muted-foreground mb-4">
        Sync all eligible invoices (sent, paid, or overdue with pending/error QBO status) to QuickBooks Online.
      </p>

      {/* Eligible count */}
      <div className="mb-4 flex items-center gap-3">
        <span className="text-sm text-muted-foreground">Eligible invoices:</span>
        {countLoading ? (
          <Loader2 size={14} className="animate-spin text-muted-foreground" />
        ) : (
          <span className="text-lg font-semibold">{eligibleCount ?? '?'}</span>
        )}
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 rounded text-sm bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800">
          {error}
        </div>
      )}

      <button
        onClick={handleBulkSync}
        disabled={loading || eligibleCount === 0}
        className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-md text-sm font-medium transition-colors disabled:opacity-50"
      >
        {loading ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            Syncing...
          </>
        ) : (
          <>
            <Upload size={16} />
            Sync All Eligible
          </>
        )}
      </button>

      {loading && (
        <p className="mt-2 text-xs text-muted-foreground italic">
          This may take a while depending on the number of invoices...
        </p>
      )}

      {result && (
        <div className="mt-4 space-y-3">
          {/* Summary */}
          <div className="flex flex-wrap gap-4 text-sm">
            <span className="px-2 py-1 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 rounded">
              Synced: {result.synced}
            </span>
            {result.failed > 0 && (
              <span className="px-2 py-1 bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400 rounded">
                Failed: {result.failed}
              </span>
            )}
            <span className="px-2 py-1 bg-muted text-muted-foreground rounded">
              Total: {result.total}
            </span>
          </div>

          {/* Error details */}
          {result.errors.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium flex items-center gap-1 text-red-600 dark:text-red-400">
                <AlertTriangle size={14} />
                Errors
              </h4>
              <div className="max-h-48 overflow-y-auto">
                {result.errors.map((err, i) => (
                  <div
                    key={i}
                    className="text-xs py-1.5 px-3 border-l-2 border-red-300 dark:border-red-700 bg-red-50/50 dark:bg-red-950/20 mb-1"
                  >
                    <span className="font-medium">{err.invoiceNumber}</span>: {err.error}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
