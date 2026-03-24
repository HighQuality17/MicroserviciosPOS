import { ComponentPropsWithoutRef, ReactNode } from 'react';
import clsx from 'clsx';

interface CardProps extends ComponentPropsWithoutRef<'section'> {
  children: ReactNode;
}

export function Card({ children, className, ...props }: CardProps) {
  return (
    <section
      className={clsx(
        'glass-panel relative min-w-0 overflow-hidden rounded-[1.75rem] p-4 sm:rounded-3xl sm:p-5 lg:p-6',
        className,
      )}
      {...props}
    >
      <div aria-hidden="true" className="card-theme-glow pointer-events-none absolute inset-0" />
      <div className="relative z-10 min-w-0">{children}</div>
    </section>
  );
}

