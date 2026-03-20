import type { HTMLAttributes, ReactNode } from 'react';
import clsx from 'clsx';

interface ScrollPanelProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  maxHeightClassName?: string;
}

export function ScrollPanel({
  children,
  className,
  maxHeightClassName = 'max-h-[32rem]',
  ...props
}: ScrollPanelProps) {
  return (
    <div
      className={clsx(
        'min-w-0 overflow-y-auto pr-0 sm:pr-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-300/30 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950',
        maxHeightClassName,
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
