import { useState } from 'react';
import { Loader2, Package, RefreshCw } from 'lucide-react';
import { syncQBOItems } from '../../../services/qboApi';
import type { ItemSyncResult } from '../../../services/qboApi';

export function QBOItemMappingPanel() {
  const [result, setResult] = useState<ItemSyncResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSync() {
    try {
      setLoading(true);
      setError(null);
      const data = await syncQBOItems();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Item sync failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-card rounded-lg border border-border p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Package size={18} className="text-muted-foreground" />
          <h3 className="text-lg font-semibold">Item Mappings</h3>
        </div>
        <button
          onClick={handleSync}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary text-primary-foreground hover:bg-primary/90 rounded-md text-sm font-medium transition-colors disabled:opacity-50"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
          Sync Items from QBO
        </button>
      </div>

      <p className="text-sm text-muted-foreground mb-4">
        Fetches Service items from QuickBooks and maps them to internal billing types. Missing items must be created in QBO first.
      </p>

      {error && (
        <div className="mb-4 px-4 py-3 rounded text-sm bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800">
          {error}
        </div>
      )}

      {result && (
        <div className="space-y-4">
          {/* Summary */}
          <div className="flex gap-4 text-sm">
            <span className="px-2 py-1 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 rounded">
              Mapped: {result.mapped}
            </span>
            {result.missing > 0 && (
              <span className="px-2 py-1 bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 rounded">
                Missing: {result.missing}
              </span>
            )}
          </div>

          {/* Details table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Type</th>
                  <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Category</th>
                  <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Description</th>
                  <th className="text-left py-2 pr-4 font-medium text-muted-foreground">QBO Item</th>
                  <th className="text-left py-2 font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {result.details.map((detail, i) => (
                  <tr
                    key={i}
                    className={`border-b border-border/50 ${
                      detail.status === 'missing' ? 'bg-amber-50/50 dark:bg-amber-950/10' : ''
                    }`}
                  >
                    <td className="py-2 pr-4 capitalize">{detail.internalType}</td>
                    <td className="py-2 pr-4 text-muted-foreground">
                      {detail.internalCategory || '-'}
                    </td>
                    <td className="py-2 pr-4 text-muted-foreground text-xs">
                      {detail.internalDescription || '-'}
                    </td>
                    <td className="py-2 pr-4">
                      {detail.status === 'mapped' ? (
                        <span>
                          {detail.qboItemName}{' '}
                          <span className="text-xs text-muted-foreground font-mono">
                            (ID: {detail.qboItemId})
                          </span>
                        </span>
                      ) : (
                        <span className="text-amber-600 dark:text-amber-400 text-xs">
                          {detail.hint}
                        </span>
                      )}
                    </td>
                    <td className="py-2">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                          detail.status === 'mapped'
                            ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400'
                            : 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400'
                        }`}
                      >
                        {detail.status}
                      </span>
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
