import { ReactNode } from 'react';
import clsx from 'clsx';

type FeedbackTone = 'success' | 'error' | 'info' | 'warning';

interface FeedbackMessageProps {
  children: ReactNode;
  tone?: FeedbackTone;
  className?: string;
}

export function FeedbackMessage({
  children,
  tone = 'info',
  className,
}: FeedbackMessageProps) {
  const isError = tone === 'error';

  return (
    <div
      role={isError ? 'alert' : 'status'}
      aria-live={isError ? 'assertive' : 'polite'}
      aria-atomic="true"
      className={clsx(
        'rounded-3xl border px-4 py-3 text-sm',
        tone === 'success' && 'border-emerald-400/30 bg-emerald-500/12 text-emerald-100',
        tone === 'error' && 'border-rose-400/30 bg-rose-500/12 text-rose-100',
        tone === 'info' && 'border-sky-400/30 bg-sky-500/12 text-sky-100',
        tone === 'warning' && 'border-amber-400/30 bg-amber-500/12 text-amber-100',
        className,
      )}
    >
      {children}
    </div>
  );
}
