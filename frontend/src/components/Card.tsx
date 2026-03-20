import { ComponentPropsWithoutRef, ReactNode } from 'react';
import clsx from 'clsx';

interface CardProps extends ComponentPropsWithoutRef<'section'> {
  children: ReactNode;
}

export function Card({ children, className, ...props }: CardProps) {
  return (
    <section
      className={clsx(
        'glass-panel relative min-w-0 rounded-[1.75rem] p-4 sm:rounded-3xl sm:p-5 lg:p-6',
        className,
      )}
      {...props}
    >
      {children}
    </section>
  );
}
