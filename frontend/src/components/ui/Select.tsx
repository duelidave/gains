import { type SelectHTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select
        className={cn(
          'w-full appearance-none bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 rounded-lg px-3 py-2 pr-8 text-base md:text-sm text-zinc-900 dark:text-zinc-50',
          'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
          'disabled:opacity-50 cursor-pointer',
          className
        )}
        {...props}
      >
        {children}
      </select>
      <svg
        className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-400 dark:text-zinc-500"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="m6 9 6 6 6-6" />
      </svg>
    </div>
  );
}
