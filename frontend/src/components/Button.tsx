import { ButtonHTMLAttributes, ReactNode, forwardRef } from 'react';
import clsx from 'clsx';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { children, className, type = 'button', variant = 'primary', ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={clsx(
        'inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400/30 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 disabled:cursor-not-allowed disabled:border-slate-800 disabled:bg-slate-900/60 disabled:text-slate-500 disabled:shadow-none',
        variant === 'primary' &&
          'bg-teal-400 text-slate-950 shadow-[0_10px_30px_rgba(45,212,191,0.18)] hover:bg-teal-300',
        variant === 'secondary' &&
          'border border-slate-700 bg-slate-900/80 text-slate-100 hover:border-sky-400/50 hover:bg-slate-800',
        variant === 'ghost' && 'text-slate-300 hover:bg-slate-800/70 hover:text-white',
        variant === 'danger' &&
          'bg-rose-500/90 text-white hover:bg-rose-400 focus-visible:ring-rose-400/30',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
});
