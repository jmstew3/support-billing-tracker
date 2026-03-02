export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

let toastCounter = 0;
export function createToast(type: ToastMessage['type'], message: string): ToastMessage {
  return { id: `toast-${++toastCounter}`, type, message };
}
