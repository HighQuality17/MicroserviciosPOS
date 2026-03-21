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
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(129,140,248,0.08),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(103,232,249,0.04),transparent_24%)]"
      />
      <div className="relative z-10 min-w-0">{children}</div>
    </section>
  );
}
