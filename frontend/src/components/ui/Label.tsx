import { type LabelHTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

export function Label({ className, ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn('block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5', className)}
      {...props}
    />
  );
}
