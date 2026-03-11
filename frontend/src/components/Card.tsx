import { ReactNode } from 'react';
import clsx from 'clsx';

interface CardProps {
  children: ReactNode;
  className?: string;
}

export function Card({ children, className }: CardProps) {
  return (
    <section className={clsx('glass-panel relative rounded-3xl p-5', className)}>
      {children}
    </section>
  );
}
