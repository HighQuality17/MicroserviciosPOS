import { ReactNode } from 'react';
import clsx from 'clsx';
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
      <div
        aria-hidden="true"
        className={clsx(
          'absolute inset-x-0 top-0 h-[2px] opacity-90',
          tone === 'default' && 'bg-gradient-to-r from-transparent via-cyan-300/80 to-transparent',
          tone === 'info' && 'bg-gradient-to-r from-transparent via-violet-300/75 to-transparent',
          tone === 'success' && 'bg-gradient-to-r from-transparent via-emerald-300/80 to-transparent',
          tone === 'warning' && 'bg-gradient-to-r from-transparent via-amber-300/80 to-transparent',
        )}
      />
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[color:var(--text-secondary)]">
            {title}
          </p>
          <p
            className={clsx(
              'mt-3 font-display text-[2.15rem] font-bold leading-none sm:text-[2.35rem]',
              isCurrencyValue ? 'metric-accent-strong' : 'text-white',
            )}
          >
            {value}
          </p>
          {hint ? (
            <p className="mt-3 max-w-[22rem] text-xs leading-5 text-[color:var(--text-muted)]">
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
