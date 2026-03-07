import { useState } from 'react';
import { Loader2, Users, Play, Eye } from 'lucide-react';
import { syncQBOCustomers } from '../../../services/qboApi';
import type { CustomerSyncResult, CustomerSyncDetail } from '../../../services/qboApi';

const STATUS_COLORS: Record<CustomerSyncDetail['status'], string> = {
  already_mapped: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400',
  matched: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400',
  created: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400',
  unmatched: 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400',
  error: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400',
};

export function QBOCustomerSyncPanel() {
  const [result, setResult] = useState<CustomerSyncResult | null>(null);
  const [loading, setLoading] = useState<'dry' | 'sync' | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSync(dryRun: boolean) {
    try {
      setLoading(dryRun ? 'dry' : 'sync');
      setError(null);
      const data = await syncQBOCustomers(dryRun);
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Customer sync failed');
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="bg-card rounded-lg border border-border p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Users size={18} className="text-muted-foreground" />
          <h3 className="text-lg font-semibold">Customer Sync</h3>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => handleSync(true)}
            disabled={!!loading}
            className="inline-flex items-center gap-2 px-3 py-1.5 bg-muted hover:bg-muted/80 rounded-md text-sm font-medium transition-colors disabled:opacity-50"
          >
            {loading === 'dry' ? <Loader2 size={14} className="animate-spin" /> : <Eye size={14} />}
            Dry Run
          </button>
          <button
            onClick={() => handleSync(false)}
            disabled={!!loading}
            className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary text-primary-foreground hover:bg-primary/90 rounded-md text-sm font-medium transition-colors disabled:opacity-50"
          >
            {loading === 'sync' ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
            Sync & Save
          </button>
        </div>
      </div>

      <p className="text-sm text-muted-foreground mb-4">
        Match local customers to QuickBooks customers by name. Unmatched customers will be created in QBO when syncing.
      </p>

      {error && (
        <div className="mb-4 px-4 py-3 rounded text-sm bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800">
          {error}
        </div>
      )}

      {result && (
        <div className="space-y-4">
          {/* Summary */}
          <div className="flex flex-wrap gap-4 text-sm">
            <span className="px-2 py-1 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 rounded">
              Matched: {result.matched}
            </span>
            {result.created > 0 && (
              <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400 rounded">
                Created: {result.created}
              </span>
            )}
            {result.unmatched > 0 && (
              <span className="px-2 py-1 bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 rounded">
                Unmatched: {result.unmatched}
              </span>
            )}
            {result.failed > 0 && (
              <span className="px-2 py-1 bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400 rounded">
                Failed: {result.failed}
              </span>
            )}
            {result.dryRun && (
              <span className="px-2 py-1 bg-muted text-muted-foreground rounded italic">
                Dry Run
              </span>
            )}
          </div>

          {/* Details table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Customer</th>
                  <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Status</th>
                  <th className="text-left py-2 font-medium text-muted-foreground">QBO ID</th>
                </tr>
              </thead>
              <tbody>
                {result.details.map((detail, i) => (
                  <tr key={i} className="border-b border-border/50">
                    <td className="py-2 pr-4">{detail.name}</td>
                    <td className="py-2 pr-4">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[detail.status]}`}>
                        {detail.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-2 font-mono text-xs text-muted-foreground">
                      {detail.qboId || detail.hint || detail.error || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
