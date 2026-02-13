import { type ReactNode, useEffect } from 'react';
import { cn } from '../../lib/utils';
import { X } from 'lucide-react';

interface DialogProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  className?: string;
}

export function Dialog({ open, onClose, children, className }: DialogProps) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
      <div className="fixed inset-0 bg-black/60 dialog-overlay" onClick={onClose} />
      <div
        className={cn(
          'relative z-50 w-full md:max-w-lg max-h-[90vh] overflow-y-auto',
          'bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xl',
          'rounded-t-xl md:rounded-lg',
          'p-4 md:p-6 md:mx-4',
          'dialog-slide-up',
          className
        )}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 w-8 h-8 rounded-lg flex items-center justify-center text-zinc-400 dark:text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-50 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors"
        >
          <X size={16} />
        </button>
        {children}
      </div>
    </div>
  );
}

export function DialogTitle({ children, className }: { children: ReactNode; className?: string }) {
  return <h2 className={cn('text-lg font-bold text-zinc-900 dark:text-zinc-50 mb-4 pr-8', className)}>{children}</h2>;
}
