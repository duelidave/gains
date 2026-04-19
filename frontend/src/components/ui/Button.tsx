import { type ButtonHTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'primary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

const base =
  'inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:opacity-40 disabled:pointer-events-none active:scale-95 cursor-pointer select-none';

const variants = {
  default:
    'bg-slate-200 text-slate-900 hover:bg-slate-300 border border-slate-300 dark:bg-slate-800 dark:text-slate-50 dark:hover:bg-slate-700 dark:border-slate-700',
  primary: 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-lg shadow-indigo-500/20',
  danger:
    'bg-red-500/10 text-red-600 hover:bg-red-500/20 border border-red-500/30 dark:text-red-500',
  ghost:
    'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-50',
};

const sizes = {
  sm: 'px-3 py-1.5 text-xs min-h-[36px]',
  md: 'px-4 py-2 text-sm min-h-[42px]',
  lg: 'px-6 py-3 text-base min-h-[48px]',
};

export function Button({ variant = 'default', size = 'md', className, ...props }: ButtonProps) {
  return <button className={cn(base, variants[variant], sizes[size], className)} {...props} />;
}
