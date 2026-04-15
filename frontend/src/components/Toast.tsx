import { HTMLAttributes } from 'react';
import clsx from 'clsx';

type ToastTone = 'default' | 'success' | 'warning' | 'danger' | 'info';

interface ToastProps extends HTMLAttributes<HTMLDivElement> {
  tone?: ToastTone;
}

export function Toast({
  tone = 'default',
  className,
  children,
  ...props
}: ToastProps) {
  return (
    <div
      data-tone={tone}
      className={clsx('toast-shell', className)}
      {...props}
    >
      {children}
    </div>
  );
}
