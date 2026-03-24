import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react';
import { ReactNode } from 'react';
import clsx from 'clsx';

type FeedbackTone = 'success' | 'error' | 'info' | 'warning';

interface FeedbackMessageProps {
  children: ReactNode;
  tone?: FeedbackTone;
  className?: string;
}

const toneIcons: Record<FeedbackTone, ReactNode> = {
  success: <CheckCircle2 size={18} />,
  error: <XCircle size={18} />,
  info: <Info size={18} />,
  warning: <AlertTriangle size={18} />,
};

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
      data-tone={tone}
      className={clsx('feedback-message px-4 py-3', className)}
    >
      <div className="flex items-start gap-3">
        <div className="feedback-message__icon mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border text-current shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
          {toneIcons[tone]}
        </div>
        <div className="min-w-0 text-sm leading-6">{children}</div>
      </div>
    </div>
  );
}