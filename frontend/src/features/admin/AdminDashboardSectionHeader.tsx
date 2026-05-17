import { type ReactNode } from 'react';
import clsx from 'clsx';

interface AdminDashboardSectionHeaderProps {
  eyebrow: string;
  title: string;
  meta?: ReactNode;
  className?: string;
}

export function AdminDashboardSectionHeader({
  eyebrow,
  title,
  meta,
  className,
}: AdminDashboardSectionHeaderProps) {
  return (
    <div className={clsx('products-panel__header admin-dashboard-section-heading', className)}>
      <div className="products-panel__header-copy">
        <p className="products-panel__eyebrow">{eyebrow}</p>
        <div className="products-panel__title-row">
          <h2 className="font-display text-2xl font-bold theme-text-strong">{title}</h2>
          {meta ? <div className="products-panel__meta">{meta}</div> : null}
        </div>
      </div>
    </div>
  );
}
