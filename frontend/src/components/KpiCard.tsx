import { ReactNode } from 'react';
import clsx from 'clsx';
import { Card } from '@/components/Card';

interface KpiCardProps {
  title: string;
  value: string;
  hint?: string;
  icon?: ReactNode;
  tone?: 'default' | 'success' | 'warning';
}

export function KpiCard({
  title,
  value,
  hint,
  icon,
  tone = 'default',
}: KpiCardProps) {
  return (
    <Card className="overflow-hidden">
      <div
        className={clsx(
          'absolute inset-x-0 top-0 h-px',
          tone === 'default' && 'bg-gradient-to-r from-transparent via-violet-300/70 to-transparent',
          tone === 'success' && 'bg-gradient-to-r from-transparent via-emerald-300/70 to-transparent',
          tone === 'warning' && 'bg-gradient-to-r from-transparent via-amber-300/70 to-transparent',
        )}
      />
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-[color:var(--text-secondary)]">{title}</p>
          <p className="mt-3 font-display text-3xl font-bold text-white">{value}</p>
          {hint ? <p className="mt-2 text-xs text-[color:var(--text-muted)]">{hint}</p> : null}
        </div>
        {icon ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-violet-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
            {icon}
          </div>
        ) : null}
      </div>
    </Card>
  );
}