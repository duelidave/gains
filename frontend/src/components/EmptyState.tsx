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
      <div className="text-slate-400 dark:text-slate-600 mb-4">{icon}</div>
      <h3 className="text-base font-semibold text-slate-900 dark:text-slate-50 mb-1">{title}</h3>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 max-w-xs">{description}</p>
      {action}
    </div>
  );
}
