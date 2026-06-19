import * as React from 'react';

type ToastVariant = 'default' | 'destructive' | 'success';

export interface Toast {
  id: string;
  title?: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
}

type ToastState = { toasts: Toast[] };

const listeners: Array<(state: ToastState) => void> = [];
let memoryState: ToastState = { toasts: [] };

function dispatch(state: ToastState) {
  memoryState = state;
  listeners.forEach((listener) => listener(state));
}

let count = 0;
function genId() { count = (count + 1) % Number.MAX_SAFE_INTEGER; return count.toString(); }

function toast(opts: Omit<Toast, 'id'>) {
  const id = genId();
  const duration = opts.duration ?? 4000;
  dispatch({ toasts: [...memoryState.toasts, { ...opts, id }] });
  setTimeout(() => {
    dispatch({ toasts: memoryState.toasts.filter((t) => t.id !== id) });
  }, duration);
  return id;
}

toast.success = (title: string, description?: string) => toast({ title, description, variant: 'success' });
toast.error = (title: string, description?: string) => toast({ title, description, variant: 'destructive' });
toast.info = (title: string, description?: string) => toast({ title, description, variant: 'default' });

function useToast() {
  const [state, setState] = React.useState<ToastState>(memoryState);
  React.useEffect(() => {
    listeners.push(setState);
    return () => { const idx = listeners.indexOf(setState); if (idx > -1) listeners.splice(idx, 1); };
  }, []);
  return { toasts: state.toasts, toast };
}

export { useToast, toast };
