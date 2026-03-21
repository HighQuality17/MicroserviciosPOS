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
        'rounded-3xl border px-4 py-3 text-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]',
        tone === 'success' && 'border-emerald-400/25 bg-emerald-500/12 text-emerald-100',
        tone === 'error' && 'border-rose-400/28 bg-rose-500/12 text-rose-100',
        tone === 'info' && 'border-violet-400/25 bg-violet-500/12 text-violet-100',
        tone === 'warning' && 'border-amber-400/25 bg-amber-500/12 text-amber-100',
        className,
      )}
    >
      {children}
    </div>
  );
}