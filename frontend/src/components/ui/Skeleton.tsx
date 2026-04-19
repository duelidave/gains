import { cn } from '../../lib/utils';

export function Skeleton({ className }: { className?: string }) {
  return (
    <div className={cn('bg-slate-200 dark:bg-slate-800 rounded-lg animate-pulse', className)} />
  );
}
