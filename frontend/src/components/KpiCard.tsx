import { ReactNode } from 'react';
import { Card } from '@/components/Card';

interface KpiCardProps {
  title: string;
  value: string;
  hint?: string;
  icon?: ReactNode;
  tone?: 'default' | 'success' | 'warning' | 'info';
}

const toneToIconShell: Record<NonNullable<KpiCardProps['tone']>, string> = {
  default: 'default',
  success: 'success',
  warning: 'warning',
  info: 'violet',
};

export function KpiCard({
  title,
  value,
  hint,
  icon,
  tone = 'default',
}: KpiCardProps) {
  const isCurrencyValue = value.includes('$');

  return (
    <Card className="metric-card">
      <div aria-hidden="true" className="metric-card-accent-line" data-tone={tone === 'default' ? undefined : tone} />
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] theme-text-secondary">
            {title}
          </p>
          <p
            className={isCurrencyValue
              ? 'metric-accent-strong mt-3 font-display text-[2.15rem] font-bold leading-none sm:text-[2.35rem]'
              : 'theme-text-strong mt-3 font-display text-[2.15rem] font-bold leading-none sm:text-[2.35rem]'}
          >
            {value}
          </p>
          {hint ? (
            <p className="mt-3 max-w-[22rem] text-xs leading-5 theme-text-muted">
              {hint}
            </p>
          ) : null}
        </div>
        {icon ? (
          <div className="panel-icon-shell shrink-0" data-tone={toneToIconShell[tone]}>
            {icon}
          </div>
        ) : null}
      </div>
    </Card>
  );
}