import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, LinkIcon } from 'lucide-react';
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
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
        connected
          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20'
          : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20'
      }`}
      title={connected ? 'QBO Connected — Click to manage' : 'QBO not linked — Click to connect'}
    >
      {connected ? (
        <CheckCircle2 className="h-3.5 w-3.5" />
      ) : (
        <LinkIcon className="h-3.5 w-3.5" />
      )}
      <span>
        {connected ? 'QBO Connected' : 'QBO Not Linked'}
      </span>
    </button>
  );
}
