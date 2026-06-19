import { CheckCircle, AlertCircle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast, Toast } from './use-toast';

function ToastItem({ toast }: { toast: Toast }) {
  const icons = {
    success: <CheckCircle className="h-4 w-4 text-emerald-400" />,
    destructive: <AlertCircle className="h-4 w-4 text-red-400" />,
    default: <Info className="h-4 w-4 text-blue-400" />,
  };
  return (
    <div className={cn(
      'flex items-start gap-3 glass rounded-xl p-4 shadow-2xl min-w-[300px] max-w-[400px] animate-fade-in',
      toast.variant === 'destructive' && 'border-red-500/20',
      toast.variant === 'success' && 'border-emerald-500/20',
    )}>
      {icons[toast.variant ?? 'default']}
      <div className="flex-1">
        {toast.title && <p className="text-sm font-medium text-foreground">{toast.title}</p>}
        {toast.description && <p className="text-xs text-muted-foreground mt-0.5">{toast.description}</p>}
      </div>
    </div>
  );
}

export function Toaster() {
  const { toasts } = useToast();
  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
      {toasts.map((t) => <ToastItem key={t.id} toast={t} />)}
    </div>
  );
}
