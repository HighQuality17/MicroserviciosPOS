import { ReactNode } from 'react';
import clsx from 'clsx';

interface AlertCardProps {
  title: string;
  description: string;
  tone?: 'info' | 'warning' | 'success';
  icon?: ReactNode;
}

export function AlertCard({
  title,
  description,
  tone = 'info',
  icon,
}: AlertCardProps) {
  return (
    <div
      className={clsx(
        'rounded-3xl border px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]',
        tone === 'info' && 'border-cyan-300/18 bg-[linear-gradient(180deg,rgba(34,211,238,0.12),rgba(79,70,229,0.08))]',
        tone === 'warning' && 'border-amber-400/20 bg-[linear-gradient(180deg,rgba(245,158,11,0.12),rgba(120,53,15,0.08))]',
        tone === 'success' && 'border-emerald-400/20 bg-[linear-gradient(180deg,rgba(52,211,153,0.12),rgba(6,95,70,0.08))]',
      )}
    >
      <div className="flex items-start gap-3">
        {icon ? (
          <div
            className={clsx(
              'panel-icon-shell mt-0.5 h-10 w-10 min-h-10 min-w-10 rounded-2xl',
              tone === 'info' && 'text-cyan-100',
            )}
            data-tone={tone === 'info' ? 'default' : tone}
          >
            {icon}
          </div>
        ) : null}
        <div className="min-w-0">
          <p className="font-medium text-white">{title}</p>
          <p className="mt-1 text-sm leading-6 text-[color:var(--text-secondary)]">{description}</p>
        </div>
      </div>
    </div>
  );
}
