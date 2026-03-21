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
        tone === 'info' && 'border-violet-400/20 bg-violet-500/10',
        tone === 'warning' && 'border-amber-400/20 bg-amber-500/10',
        tone === 'success' && 'border-emerald-400/20 bg-emerald-500/10',
      )}
    >
      <div className="flex items-start gap-3">
        {icon ? <div className="mt-0.5 text-slate-100">{icon}</div> : null}
        <div>
          <p className="font-medium text-white">{title}</p>
          <p className="mt-1 text-sm text-[color:var(--text-secondary)]">{description}</p>
        </div>
      </div>
    </div>
  );
}