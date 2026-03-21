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
        'inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[#090b16] disabled:cursor-not-allowed disabled:border-[color:var(--disabled-border)] disabled:bg-[color:var(--disabled-bg)] disabled:text-[color:var(--disabled-text)] disabled:shadow-none',
        variant === 'primary' &&
          'bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500 text-white shadow-[0_18px_40px_rgba(99,102,241,0.34)] hover:from-indigo-400 hover:via-violet-400 hover:to-fuchsia-400 active:from-indigo-500 active:via-violet-500 active:to-purple-500',
        variant === 'secondary' &&
          'border border-[color:var(--line)] bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] text-[color:var(--text)] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] hover:border-violet-300/30 hover:bg-white/[0.06]',
        variant === 'ghost' && 'text-[color:var(--text-secondary)] hover:bg-white/[0.05] hover:text-white',
        variant === 'danger' &&
          'bg-rose-500/90 text-white shadow-[0_16px_30px_rgba(244,63,94,0.18)] hover:bg-rose-400 focus-visible:ring-rose-400/30',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
});