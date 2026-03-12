import type { ReactNode } from 'react';
import clsx from 'clsx';

interface ScrollPanelProps {
  children: ReactNode;
  className?: string;
  maxHeightClassName?: string;
}

export function ScrollPanel({
  children,
  className,
  maxHeightClassName = 'max-h-[32rem]',
}: ScrollPanelProps) {
  return (
    <div className={clsx('overflow-y-auto pr-2', maxHeightClassName, className)}>
      {children}
    </div>
  );
}
