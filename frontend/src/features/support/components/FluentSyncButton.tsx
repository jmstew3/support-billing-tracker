import { useState } from 'react';
import { RefreshCw, AlertCircle, CheckCircle2, Calendar } from 'lucide-react';
import { triggerFluentSync } from '../../../utils/api';
import type { FluentSyncResult } from '../../../utils/api';

interface FluentSyncButtonProps {
  onSyncComplete?: () => void;
  className?: string;
}

export function FluentSyncButton({ onSyncComplete, className = '' }: FluentSyncButtonProps) {
  const [loading, setLoading] = useState(false);
  const [showDateInput, setShowDateInput] = useState(false);
  const [dateFilter, setDateFilter] = useState('');
  const [result, setResult] = useState<FluentSyncResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSync = async () => {
    setLoading(true);
    setResult(null);
    setError(null);

    try {
      const syncResult = await triggerFluentSync(dateFilter || undefined);
      setResult(syncResult);

      if (syncResult.success) {
        // Auto-hide success message after 5 seconds
        setTimeout(() => setResult(null), 5000);

        // Notify parent component to refresh data
        if (onSyncComplete) {
          onSyncComplete();
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Sync failed';
      setError(errorMessage);

      // Auto-hide error message after 8 seconds
      setTimeout(() => setError(null), 8000);
    } finally {
      setLoading(false);
    }
  };

  const toggleDateInput = () => {
    setShowDateInput(!showDateInput);
    if (!showDateInput) {
      // Set default to 7 days ago
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      setDateFilter(sevenDaysAgo.toISOString().split('T')[0]);
    }
  };

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {/* Main button row */}
      <div className="flex items-center gap-2">
        <button
          onClick={handleSync}
          disabled={loading}
          className={`
            flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium
            transition-colors border
            ${loading
              ? 'bg-muted text-muted-foreground cursor-not-allowed'
              : 'bg-primary text-primary-foreground hover:bg-primary/90 border-primary'
            }
          `}
          title="Sync FluentSupport Tickets"
        >
          <RefreshCw
            size={16}
            className={loading ? 'animate-spin' : ''}
          />
          <span className="hidden sm:inline">
            {loading ? 'Syncing...' : 'Sync FluentSupport'}
          </span>
          <span className="sm:hidden">
            Sync
          </span>
        </button>

        <button
          onClick={toggleDateInput}
          disabled={loading}
          className={`
            flex items-center gap-1.5 px-2.5 py-2 rounded-md text-sm
            transition-colors border border-border
            ${loading
              ? 'bg-muted text-muted-foreground cursor-not-allowed'
              : showDateInput
                ? 'bg-accent text-accent-foreground'
                : 'bg-background hover:bg-muted'
            }
          `}
          title={showDateInput ? 'Hide date filter' : 'Show date filter'}
        >
          <Calendar size={16} />
        </button>
      </div>

      {/* Date filter input */}
      {showDateInput && (
        <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 rounded-md border border-border">
          <label htmlFor="fluent-date-filter" className="text-xs font-medium text-muted-foreground whitespace-nowrap">
            Sync from:
          </label>
          <input
            id="fluent-date-filter"
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            disabled={loading}
            className="text-xs px-2 py-1 border border-border rounded bg-background flex-1 min-w-0"
            placeholder="YYYY-MM-DD"
          />
          <span className="text-xs text-muted-foreground hidden sm:inline">
            (Leave empty for default)
          </span>
        </div>
      )}

      {/* Success message */}
      {result && result.success && (
        <div className="flex items-start gap-2 px-3 py-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md">
          <CheckCircle2 size={16} className="text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1 text-xs text-green-800 dark:text-green-200">
            <div className="font-medium">Sync successful!</div>
            <div className="mt-0.5 text-green-700 dark:text-green-300">
              {result.ticketsFetched} fetched, {result.ticketsAdded} added, {result.ticketsUpdated} updated
              {result.syncDuration && ` (${(result.syncDuration / 1000).toFixed(1)}s)`}
            </div>
          </div>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="flex items-start gap-2 px-3 py-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
          <AlertCircle size={16} className="text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1 text-xs text-red-800 dark:text-red-200">
            <div className="font-medium">Sync failed</div>
            <div className="mt-0.5 text-red-700 dark:text-red-300">{error}</div>
          </div>
        </div>
      )}
    </div>
  );
}
