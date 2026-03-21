import { ReactNode } from 'react';
import clsx from 'clsx';

interface SectionHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
}

export function SectionHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
}: SectionHeaderProps) {
  return (
    <div className={clsx('flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start sm:justify-between', className)}>
      <div className="min-w-0">
        {eyebrow ? <p className="section-kicker">{eyebrow}</p> : null}
        <h2 className="font-display mt-2 text-xl font-bold text-white sm:text-2xl">{title}</h2>
        {description ? <p className="section-note mt-2 max-w-3xl">{description}</p> : null}
      </div>
      {actions ? <div className="shrink-0">{actions}</div> : null}
    </div>
  );
}
