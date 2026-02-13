import { type LabelHTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

export function Label({ className, ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn('block text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-1.5', className)}
      {...props}
    />
  );
}
