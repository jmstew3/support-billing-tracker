import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getQBOStatus } from '../../../services/invoiceApi';

export function QBOStatusBadge() {
  const navigate = useNavigate();
  const [connected, setConnected] = useState<boolean | null>(null);

  useEffect(() => {
    getQBOStatus()
      .then((status) => setConnected(status.connected))
      .catch(() => setConnected(false));
  }, []);

  if (connected === null) return null;

  return (
    <button
      onClick={() => navigate('/settings')}
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors hover:opacity-80"
      title={connected ? 'QBO Connected - Click to manage' : 'QBO Disconnected - Click to connect'}
    >
      <span
        className={`inline-block w-2 h-2 rounded-full ${
          connected ? 'bg-emerald-500' : 'bg-red-400'
        }`}
      />
      <span className={connected ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}>
        {connected ? 'QBO Connected' : 'QBO Disconnected'}
      </span>
    </button>
  );
}
