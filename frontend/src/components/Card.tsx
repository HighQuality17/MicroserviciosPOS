import { ReactNode } from 'react';
import clsx from 'clsx';

interface CardProps {
  children: ReactNode;
  className?: string;
}

export function Card({ children, className }: CardProps) {
  return (
    <section
      className={clsx(
        'glass-panel relative min-w-0 rounded-[1.75rem] p-4 sm:rounded-3xl sm:p-5 lg:p-6',
        className,
      )}
    >
      {children}
    </section>
  );
}