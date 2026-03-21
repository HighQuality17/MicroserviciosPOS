import { ReactNode } from 'react';
import clsx from 'clsx';
import { Card } from '@/components/Card';

interface SummaryCardProps {
  title: string;
  value: string;
  hint?: string;
  icon?: ReactNode;
}

export function SummaryCard({ title, value, hint, icon }: SummaryCardProps) {
  const isCurrencyValue = value.includes('$');

  return (
    <Card className="relative overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-300/70 to-transparent" />
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-[color:var(--text-secondary)]">{title}</p>
          <p
            className={clsx(
              'mt-3 font-display text-2xl font-bold',
              isCurrencyValue ? 'metric-accent-strong' : 'text-white',
            )}
          >
            {value}
          </p>
          {hint ? <p className="mt-2 text-xs text-[color:var(--text-muted)]">{hint}</p> : null}
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-violet-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
          {icon}
        </div>
      </div>
    </Card>
  );
}
