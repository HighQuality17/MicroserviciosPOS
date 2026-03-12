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
        'rounded-3xl border px-4 py-4',
        tone === 'info' && 'border-sky-400/20 bg-sky-400/10',
        tone === 'warning' && 'border-amber-400/20 bg-amber-400/10',
        tone === 'success' && 'border-emerald-400/20 bg-emerald-400/10',
      )}
    >
      <div className="flex items-start gap-3">
        {icon ? <div className="mt-0.5 text-slate-100">{icon}</div> : null}
        <div>
          <p className="font-medium text-white">{title}</p>
          <p className="mt-1 text-sm text-slate-300">{description}</p>
        </div>
      </div>
    </div>
  );
}
