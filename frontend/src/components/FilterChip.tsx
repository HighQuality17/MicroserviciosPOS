import { ButtonHTMLAttributes } from 'react';
import clsx from 'clsx';

interface FilterChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  count?: number;
  active?: boolean;
}

export function FilterChip({
  label,
  count,
  active = false,
  className,
  type = 'button',
  ...props
}: FilterChipProps) {
  return (
    <button
      type={type}
      aria-pressed={active}
      data-active={active || undefined}
      className={clsx('filter-chip', className)}
      {...props}
    >
      <span>{label}</span>
      {typeof count === 'number' ? <span className="filter-chip__count">{count}</span> : null}
    </button>
  );
}
