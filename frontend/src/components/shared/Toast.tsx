import { useEffect } from 'react';
import { X, AlertCircle, CheckCircle2, Info } from 'lucide-react';
import type { ToastMessage } from '../../utils/toast';

interface ToastProps {
  toast: ToastMessage;
  onDismiss: (id: string) => void;
}

const ICONS = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
};

const STYLES = {
  success: 'border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-400',
  error: 'border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-400',
  info: 'border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-400',
};

function Toast({ toast, onDismiss }: ToastProps) {
  const Icon = ICONS[toast.type];

  useEffect(() => {
    const timer = setTimeout(() => onDismiss(toast.id), 5000);
    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  return (
    <div className={`flex items-start gap-3 p-3 rounded-lg border shadow-lg ${STYLES[toast.type]}`}>
      <Icon className="h-5 w-5 flex-shrink-0 mt-0.5" />
      <p className="text-sm flex-1">{toast.message}</p>
      <button
        onClick={() => onDismiss(toast.id)}
        className="flex-shrink-0 p-0.5 hover:opacity-70"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

interface ToastContainerProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[60] flex flex-col gap-2 w-80">
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
}
