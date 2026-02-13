import type { ReactNode } from 'react';

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="text-zinc-400 dark:text-zinc-600 mb-4">{icon}</div>
      <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-50 mb-1">{title}</h3>
      <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6 max-w-xs">{description}</p>
      {action}
    </div>
  );
}
