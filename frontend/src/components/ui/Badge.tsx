import { type HTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning';
}

const variants = {
  default: 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
  success: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
  warning: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
};

export function Badge({ variant = 'default', className, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full',
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}
