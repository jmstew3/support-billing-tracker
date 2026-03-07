import { useState, useEffect, useCallback } from 'react';
import { Loader2, Link, Unlink, RefreshCw } from 'lucide-react';
import { getQBOStatus, connectQBO, disconnectQBO } from '../../../services/invoiceApi';
import { refreshQBOToken } from '../../../services/qboApi';
import type { QBOStatus } from '../../../services/invoiceApi';

export function QBOConnectionPanel() {
  const [status, setStatus] = useState<QBOStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getQBOStatus();
      setStatus(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch status');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  async function handleConnect() {
    try {
      setActionLoading('connect');
      setError(null);
      const authUrl = await connectQBO();
      window.location.href = authUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect');
      setActionLoading(null);
    }
  }

  async function handleDisconnect() {
    try {
      setActionLoading('disconnect');
      setError(null);
      await disconnectQBO();
      setShowDisconnectConfirm(false);
      await fetchStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to disconnect');
    } finally {
      setActionLoading(null);
    }
  }

  async function handleRefresh() {
    try {
      setActionLoading('refresh');
      setError(null);
      await refreshQBOToken();
      await fetchStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh token');
    } finally {
      setActionLoading(null);
    }
  }

  function formatDate(dateStr?: string) {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleString();
  }

  if (loading) {
    return (
      <div className="bg-card rounded-lg border border-border p-6">
        <h3 className="text-lg font-semibold mb-4">QuickBooks Online Connection</h3>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 size={16} className="animate-spin" />
          <span>Checking connection status...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg border border-border p-6">
      <h3 className="text-lg font-semibold mb-4">QuickBooks Online Connection</h3>

      {error && (
        <div className="mb-4 px-4 py-3 rounded text-sm bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800">
          {error}
        </div>
      )}

      {!status?.connected ? (
        <div className="space-y-4">
          <p className="text-muted-foreground text-sm">
            Connect to QuickBooks Online to sync invoices, customers, and items.
          </p>
          <button
            onClick={handleConnect}
            disabled={actionLoading === 'connect'}
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-sm font-medium transition-colors disabled:opacity-50"
          >
            {actionLoading === 'connect' ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Link size={16} />
            )}
            Connect to QuickBooks
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Connection info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Company</p>
              <p className="font-medium">{status.companyName || 'Unknown'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Realm ID</p>
              <p className="font-mono text-sm">{status.realmId}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Access Token Expires</p>
              <p className="text-sm">{formatDate(status.accessTokenExpiresAt)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Refresh Token Expires</p>
              <p className="text-sm">{formatDate(status.refreshTokenExpiresAt)}</p>
            </div>
          </div>

          {/* Status indicator */}
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">Connected</span>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-3 pt-2 border-t border-border">
            <button
              onClick={handleRefresh}
              disabled={!!actionLoading}
              className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-md text-sm font-medium transition-colors disabled:opacity-50"
            >
              {actionLoading === 'refresh' ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <RefreshCw size={14} />
              )}
              Refresh Token
            </button>
            {showDisconnectConfirm ? (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Are you sure?</span>
                <button
                  onClick={handleDisconnect}
                  disabled={!!actionLoading}
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-md text-sm font-medium transition-colors disabled:opacity-50"
                >
                  {actionLoading === 'disconnect' ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Unlink size={14} />
                  )}
                  Yes, Disconnect
                </button>
                <button
                  onClick={() => setShowDisconnectConfirm(false)}
                  className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowDisconnectConfirm(true)}
                disabled={!!actionLoading}
                className="inline-flex items-center gap-2 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 rounded-md text-sm font-medium transition-colors disabled:opacity-50"
              >
                <Unlink size={14} />
                Disconnect
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
