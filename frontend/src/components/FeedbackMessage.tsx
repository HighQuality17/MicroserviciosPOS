import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react';
import { ReactNode } from 'react';
import clsx from 'clsx';

type FeedbackTone = 'success' | 'error' | 'info' | 'warning';

interface FeedbackMessageProps {
  children: ReactNode;
  tone?: FeedbackTone;
  className?: string;
}

const toneConfig: Record<FeedbackTone, { container: string; icon: ReactNode }> = {
  success: {
    container: 'border-emerald-400/22 bg-[linear-gradient(180deg,rgba(52,211,153,0.14),rgba(5,46,22,0.08))] text-emerald-50',
    icon: <CheckCircle2 size={18} />,
  },
  error: {
    container: 'border-rose-400/26 bg-[linear-gradient(180deg,rgba(251,113,133,0.14),rgba(76,5,25,0.08))] text-rose-50',
    icon: <XCircle size={18} />,
  },
  info: {
    container: 'border-cyan-300/22 bg-[linear-gradient(180deg,rgba(34,211,238,0.14),rgba(67,56,202,0.08))] text-cyan-50',
    icon: <Info size={18} />,
  },
  warning: {
    container: 'border-amber-400/24 bg-[linear-gradient(180deg,rgba(245,158,11,0.14),rgba(120,53,15,0.08))] text-amber-50',
    icon: <AlertTriangle size={18} />,
  },
};

export function FeedbackMessage({
  children,
  tone = 'info',
  className,
}: FeedbackMessageProps) {
  const isError = tone === 'error';
  const config = toneConfig[tone];

  return (
    <div
      role={isError ? 'alert' : 'status'}
      aria-live={isError ? 'assertive' : 'polite'}
      aria-atomic="true"
      className={clsx(
        'rounded-3xl border px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]',
        config.container,
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05] text-current shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
          {config.icon}
        </div>
        <div className="min-w-0 text-sm leading-6">{children}</div>
      </div>
    </div>
  );
}
