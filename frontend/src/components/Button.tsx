import { ButtonHTMLAttributes, ReactNode } from 'react';
import clsx from 'clsx';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
}

export function Button({
  children,
  className,
  variant = 'primary',
  ...props
}: ButtonProps) {
  return (
    <button
      className={clsx(
        'inline-flex items-center justify-center rounded-2xl px-4 py-2.5 text-sm font-semibold transition duration-200 disabled:cursor-not-allowed disabled:opacity-50',
        variant === 'primary' &&
          'bg-teal-400 text-slate-950 hover:bg-teal-300',
        variant === 'secondary' &&
          'border border-slate-700 bg-slate-900/80 text-slate-100 hover:border-sky-400/50 hover:bg-slate-800',
        variant === 'ghost' &&
          'text-slate-300 hover:bg-slate-800/70 hover:text-white',
        variant === 'danger' &&
          'bg-rose-500/90 text-white hover:bg-rose-400',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
