import { type HTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'bg-white border border-slate-200 dark:bg-slate-900/50 dark:border-slate-800 rounded-xl p-4',
        className,
      )}
      {...props}
    />
  );
}
