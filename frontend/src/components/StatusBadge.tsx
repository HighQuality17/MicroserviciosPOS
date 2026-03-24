import clsx from 'clsx';

interface StatusBadgeProps {
  label: string;
  tone?: 'default' | 'success' | 'warning' | 'danger' | 'info';
  className?: string;
}

export function StatusBadge({
  label,
  tone = 'default',
  className,
}: StatusBadgeProps) {
  return (
    <span className={clsx('status-badge', className)} data-tone={tone}>
      {label}
    </span>
  );
}