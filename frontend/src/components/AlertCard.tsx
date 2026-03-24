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
    <div className="semantic-card px-4 py-4" data-tone={tone}>
      <div className="flex items-start gap-3">
        {icon ? (
          <div
            className={clsx(
              'semantic-card__icon panel-icon-shell mt-0.5 h-10 w-10 min-h-10 min-w-10 rounded-2xl',
              tone === 'info' && 'theme-text-strong',
            )}
            data-tone={tone === 'info' ? 'default' : tone}
          >
            {icon}
          </div>
        ) : null}
        <div className="min-w-0">
          <p className="font-medium theme-text-strong">{title}</p>
          <p className="mt-1 text-sm leading-6 theme-text-secondary">{description}</p>
        </div>
      </div>
    </div>
  );
}