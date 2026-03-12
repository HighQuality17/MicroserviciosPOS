import clsx from 'clsx';

interface StatusBadgeProps {
  label: string;
  tone?: 'default' | 'success' | 'warning' | 'danger' | 'info';
}

export function StatusBadge({
  label,
  tone = 'default',
}: StatusBadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full px-3 py-1 text-xs font-medium',
        tone === 'default' && 'bg-slate-700/60 text-slate-200',
        tone === 'success' && 'bg-emerald-500/15 text-emerald-300',
        tone === 'warning' && 'bg-amber-500/15 text-amber-200',
        tone === 'danger' && 'bg-rose-500/15 text-rose-200',
        tone === 'info' && 'bg-sky-500/15 text-sky-200',
      )}
    >
      {label}
    </span>
  );
}

