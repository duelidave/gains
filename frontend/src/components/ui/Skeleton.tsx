import { cn } from '../../lib/utils';

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('bg-zinc-200 dark:bg-zinc-800 rounded-lg animate-pulse', className)} />;
}
