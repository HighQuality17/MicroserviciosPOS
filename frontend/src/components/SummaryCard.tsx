import { ReactNode } from 'react';
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
    <Card className="metric-card">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] theme-text-secondary">
            {title}
          </p>
          <p
            className={isCurrencyValue
              ? 'metric-accent-strong mt-3 font-display text-[2rem] font-bold leading-none sm:text-[2.15rem]'
              : 'theme-text-strong mt-3 font-display text-[2rem] font-bold leading-none sm:text-[2.15rem]'}
          >
            {value}
          </p>
          {hint ? (
            <p className="mt-3 max-w-[22rem] text-xs leading-5 theme-text-muted">
              {hint}
            </p>
          ) : null}
        </div>
        {icon ? <div className="panel-icon-shell shrink-0">{icon}</div> : null}
      </div>
    </Card>
  );
}