import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, CheckCircle2, Clock, AlertTriangle, Loader2, Database } from 'lucide-react';
import { getFluentSyncStatus, triggerFluentSync, type FluentSyncResponse, type FluentSyncResult } from '../../../utils/api';
import { cn } from '../../../lib/utils';

interface SyncStatusWidgetProps {
  className?: string;
  autoRefreshInterval?: number; // in milliseconds, default 5 minutes
}

/**
 * SyncStatusWidget Component
 *
 * Displays FluentSupport sync status with:
 * - Last sync timestamp and result
 * - Next scheduled sync time
 * - Manual "Sync Now" button
 * - Auto-refresh every 5 minutes
 */
export function SyncStatusWidget({
  className,
  autoRefreshInterval = 5 * 60 * 1000, // 5 minutes default
}: SyncStatusWidgetProps) {
  const [status, setStatus] = useState<FluentSyncResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSyncResult, setLastSyncResult] = useState<FluentSyncResult | null>(null);

  // Fetch sync status
  const fetchStatus = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getFluentSyncStatus();
      setStatus(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load sync status');
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load and auto-refresh
  useEffect(() => {
    fetchStatus();

    if (autoRefreshInterval > 0) {
      const interval = setInterval(fetchStatus, autoRefreshInterval);
      return () => clearInterval(interval);
    }
  }, [fetchStatus, autoRefreshInterval]);

  // Handle manual sync
  const handleSync = async () => {
    try {
      setSyncing(true);
      setError(null);
      setLastSyncResult(null);

      // Use 14 days as default date filter
      const date = new Date();
      date.setDate(date.getDate() - 14);
      const dateFilter = date.toISOString().split('T')[0];

      const result = await triggerFluentSync(dateFilter);
      setLastSyncResult(result);

      // Refresh status after sync
      await fetchStatus();

      // Auto-clear success result after 5 seconds
      if (result.success) {
        setTimeout(() => setLastSyncResult(null), 5000);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sync failed');
      setTimeout(() => setError(null), 8000);
    } finally {
      setSyncing(false);
    }
  };

  // Format relative time
  const formatRelativeTime = (dateString: string | null): string => {
    if (!dateString) return 'Never';

    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  // Format next run time
  const formatNextRun = (dateString: string | null): string => {
    if (!dateString) return 'Not scheduled';

    const date = new Date(dateString);
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);

    if (diffMins < 0) return 'Due now';
    if (diffMins < 1) return 'Any moment';
    if (diffMins < 60) return `in ${diffMins}m`;
    if (diffHours < 24) {
      const remainingMins = diffMins % 60;
      return remainingMins > 0 ? `in ${diffHours}h ${remainingMins}m` : `in ${diffHours}h`;
    }
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  // Get status icon
  const getStatusIcon = () => {
    if (loading) return <Loader2 size={14} className="animate-spin text-muted-foreground" />;
    if (error) return <AlertTriangle size={14} className="text-red-600 dark:text-red-400" />;

    const syncStatus = status?.syncStatus?.last_sync_status;
    switch (syncStatus) {
      case 'success':
        return <CheckCircle2 size={14} className="text-green-600 dark:text-green-400" />;
      case 'failed':
        return <AlertTriangle size={14} className="text-red-600 dark:text-red-400" />;
      case 'in_progress':
        return <Loader2 size={14} className="animate-spin text-blue-600 dark:text-blue-400" />;
      default:
        return <AlertTriangle size={14} className="text-muted-foreground" />;
    }
  };

  // Get status badge styling
  const getStatusBadgeClass = () => {
    const syncStatus = status?.syncStatus?.last_sync_status;
    switch (syncStatus) {
      case 'success':
        return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300';
      case 'failed':
        return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300';
      case 'in_progress':
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300';
      default:
        return 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300';
    }
  };

  const nextRun = status?.scheduler?.nextRuns?.[0];
  const lastSync = status?.syncStatus;

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-muted/50 rounded-md border border-border">
        <div className="flex items-center gap-2">
          {getStatusIcon()}
          <span className="text-xs font-medium">FluentSupport Sync</span>
        </div>
        <span className={cn('text-xs px-2 py-0.5 rounded-full', getStatusBadgeClass())}>
          {lastSync?.last_sync_status || 'None'}
        </span>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-2">
        {/* Last Sync */}
        <div className="flex items-start gap-2 px-3 py-2 bg-background rounded-md border border-border">
          <Clock size={14} className="text-muted-foreground flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <div className="text-xs text-muted-foreground">Last Sync</div>
            <div className="text-xs font-medium truncate">
              {formatRelativeTime(lastSync?.last_sync_at || null)}
            </div>
          </div>
        </div>

        {/* Total Tickets */}
        <div className="flex items-start gap-2 px-3 py-2 bg-background rounded-md border border-border">
          <Database size={14} className="text-muted-foreground flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <div className="text-xs text-muted-foreground">Total Tickets</div>
            <div className="text-xs font-medium">{status?.totalTickets?.toLocaleString() ?? 0}</div>
          </div>
        </div>
      </div>

      {/* Last Sync Stats */}
      {lastSync && lastSync.last_sync_status === 'success' && (
        <div className="flex items-center gap-3 px-3 py-2 bg-background rounded-md border border-border text-xs">
          <span>
            <span className="font-medium text-green-600 dark:text-green-400">{lastSync.tickets_added}</span>
            <span className="text-muted-foreground ml-1">added</span>
          </span>
          <span>
            <span className="font-medium text-orange-600 dark:text-orange-400">{lastSync.tickets_updated}</span>
            <span className="text-muted-foreground ml-1">updated</span>
          </span>
        </div>
      )}

      {/* Next Scheduled Sync */}
      {status?.scheduler?.schedulerActive && nextRun && (
        <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 rounded-md border border-blue-200 dark:border-blue-800">
          <Clock size={14} className="text-blue-600 dark:text-blue-400 flex-shrink-0" />
          <div className="flex-1 text-xs">
            <span className="text-blue-800 dark:text-blue-200">Next sync: </span>
            <span className="font-medium text-blue-900 dark:text-blue-100">
              {formatNextRun(nextRun.nextRun)}
            </span>
            <span className="text-blue-700 dark:text-blue-300 ml-1">
              ({nextRun.description})
            </span>
          </div>
        </div>
      )}

      {/* Scheduler disabled notice */}
      {!status?.scheduler?.schedulerActive && !loading && (
        <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 dark:bg-amber-900/20 rounded-md border border-amber-200 dark:border-amber-800">
          <AlertTriangle size={14} className="text-amber-600 dark:text-amber-400 flex-shrink-0" />
          <span className="text-xs text-amber-800 dark:text-amber-200">
            Automatic sync disabled (dev mode)
          </span>
        </div>
      )}

      {/* Manual Sync Result */}
      {lastSyncResult && (
        <div className={cn(
          'flex items-start gap-2 px-3 py-2 rounded-md border',
          lastSyncResult.success
            ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
            : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
        )}>
          {lastSyncResult.success ? (
            <CheckCircle2 size={14} className="text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle size={14} className="text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          )}
          <div className="flex-1 text-xs">
            {lastSyncResult.success ? (
              <span className="text-green-800 dark:text-green-200">
                Synced: {lastSyncResult.ticketsFetched} fetched, {lastSyncResult.ticketsAdded} added, {lastSyncResult.ticketsUpdated} updated
              </span>
            ) : (
              <span className="text-red-800 dark:text-red-200">
                Error: {lastSyncResult.error}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && !lastSyncResult && (
        <div className="flex items-start gap-2 px-3 py-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
          <AlertTriangle size={14} className="text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <span className="text-xs text-red-800 dark:text-red-200">{error}</span>
        </div>
      )}

      {/* Sync Button */}
      <button
        onClick={handleSync}
        disabled={syncing || loading}
        className={cn(
          'flex items-center justify-center gap-2 px-3 py-2 rounded-md text-xs font-medium transition-colors border w-full',
          syncing || loading
            ? 'bg-muted text-muted-foreground cursor-not-allowed border-border'
            : 'bg-primary text-primary-foreground hover:bg-primary/90 border-primary'
        )}
      >
        <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
        {syncing ? 'Syncing...' : 'Sync Now'}
      </button>
    </div>
  );
}
