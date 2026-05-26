import React from 'react';
import { cn } from '../../lib/utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline' | 'ghost' | 'destructive';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

export function Button({ className, variant = 'default', size = 'default', ...props }: ButtonProps) {
  const variants = {
    default: "bg-teal-600 text-white hover:bg-teal-700 shadow-sm dark:bg-teal-500 dark:hover:bg-teal-600",
    outline: "border border-slate-200 bg-transparent hover:bg-slate-100 hover:text-slate-900 dark:border-slate-700 dark:text-slate-100 dark:hover:bg-slate-800 dark:hover:text-white",
    ghost: "hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-slate-100",
    destructive: "bg-red-500 text-white hover:bg-red-600 shadow-sm dark:bg-red-600 dark:hover:bg-red-700",
  };

  const sizes = {
    default: "h-9 px-4 py-2",
    sm: "h-8 rounded-md px-3 text-xs",
    lg: "h-10 rounded-md px-8",
    icon: "h-9 w-9",
  };

  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    />
  );
}
