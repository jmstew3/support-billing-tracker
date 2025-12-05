import { useEffect, useState } from 'react';
import { Clock, TrendingUp, Database, AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';
import { getFluentSyncStatus } from '../../../utils/api';
import type { FluentSyncResponse } from '../../../utils/api';

interface FluentSyncStatusProps {
  refreshTrigger?: number; // Change this value to force a refresh
  className?: string;
}

export function FluentSyncStatus({ refreshTrigger = 0, className = '' }: FluentSyncStatusProps) {
  const [data, setData] = useState<FluentSyncResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadStatus();
  }, [refreshTrigger]);

  const loadStatus = async () => {
    try {
      setLoading(true);
      setError(null);
      const status = await getFluentSyncStatus();
      setData(status);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load sync status';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }).format(date);
  };

  const formatTimeAgo = (dateString: string | null) => {
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
    if (diffDays < 7) return `${diffDays}d ago`;
    return formatDate(dateString);
  };

  if (loading) {
    return (
      <div className={`flex items-center gap-2 px-3 py-2 bg-muted/50 rounded-md border border-border ${className}`}>
        <Loader2 size={14} className="animate-spin text-muted-foreground" />
        <span className="text-xs text-muted-foreground">Loading sync status...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex items-center gap-2 px-3 py-2 bg-red-50 dark:bg-red-900/20 rounded-md border border-red-200 dark:border-red-800 ${className}`}>
        <AlertTriangle size={14} className="text-red-600 dark:text-red-400" />
        <span className="text-xs text-red-800 dark:text-red-200">{error}</span>
      </div>
    );
  }

  if (!data || !data.syncStatus) {
    return (
      <div className={`flex items-center gap-2 px-3 py-2 bg-muted/50 rounded-md border border-border ${className}`}>
        <AlertTriangle size={14} className="text-muted-foreground" />
        <span className="text-xs text-muted-foreground">No sync history found</span>
      </div>
    );
  }

  const { syncStatus, totalTickets } = data;
  const isSuccess = syncStatus.last_sync_status === 'success';
  const isFailed = syncStatus.last_sync_status === 'failed';
  const isInProgress = syncStatus.last_sync_status === 'in_progress';

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {/* Status header */}
      <div className="flex items-center justify-between px-3 py-2 bg-muted/50 rounded-md border border-border">
        <div className="flex items-center gap-2">
          {isSuccess && <CheckCircle2 size={14} className="text-green-600 dark:text-green-400" />}
          {isFailed && <AlertTriangle size={14} className="text-red-600 dark:text-red-400" />}
          {isInProgress && <Loader2 size={14} className="animate-spin text-blue-600 dark:text-blue-400" />}
          <span className="text-xs font-medium">
            FluentSupport Sync Status
          </span>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full ${
          isSuccess
            ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
            : isFailed
              ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
              : 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300'
        }`}>
          {syncStatus.last_sync_status || 'Unknown'}
        </span>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-2">
        {/* Last Sync Time */}
        <div className="flex items-start gap-2 px-3 py-2 bg-background rounded-md border border-border">
          <Clock size={14} className="text-muted-foreground flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <div className="text-xs text-muted-foreground">Last Sync</div>
            <div className="text-xs font-medium truncate" title={formatDate(syncStatus.last_sync_at)}>
              {formatTimeAgo(syncStatus.last_sync_at)}
            </div>
          </div>
        </div>

        {/* Total Tickets */}
        <div className="flex items-start gap-2 px-3 py-2 bg-background rounded-md border border-border">
          <Database size={14} className="text-muted-foreground flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <div className="text-xs text-muted-foreground">Total Tickets</div>
            <div className="text-xs font-medium">{totalTickets.toLocaleString()}</div>
          </div>
        </div>

        {/* Last Sync Stats */}
        <div className="col-span-2 flex items-start gap-2 px-3 py-2 bg-background rounded-md border border-border">
          <TrendingUp size={14} className="text-muted-foreground flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="text-xs text-muted-foreground mb-1">Last Sync Details</div>
            <div className="flex items-center gap-3 text-xs">
              <span>
                <span className="font-medium text-blue-600 dark:text-blue-400">{syncStatus.tickets_fetched}</span>
                <span className="text-muted-foreground ml-1">fetched</span>
              </span>
              <span>
                <span className="font-medium text-green-600 dark:text-green-400">{syncStatus.tickets_added}</span>
                <span className="text-muted-foreground ml-1">added</span>
              </span>
              <span>
                <span className="font-medium text-orange-600 dark:text-orange-400">{syncStatus.tickets_updated}</span>
                <span className="text-muted-foreground ml-1">updated</span>
              </span>
              {syncStatus.tickets_skipped > 0 && (
                <span>
                  <span className="font-medium text-muted-foreground">{syncStatus.tickets_skipped}</span>
                  <span className="text-muted-foreground ml-1">skipped</span>
                </span>
              )}
            </div>
            {syncStatus.sync_duration_ms && (
              <div className="text-xs text-muted-foreground mt-1">
                Duration: {(syncStatus.sync_duration_ms / 1000).toFixed(2)}s
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
