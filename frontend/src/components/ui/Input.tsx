import { type InputHTMLAttributes, forwardRef } from 'react';
import { cn } from '../../lib/utils';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        'w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-base md:text-sm text-slate-900 placeholder:text-slate-400 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-50 dark:placeholder:text-slate-500',
        'focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent',
        'disabled:opacity-50',
        className
      )}
      {...props}
    />
  )
);

Input.displayName = 'Input';
