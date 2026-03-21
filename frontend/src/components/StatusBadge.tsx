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
        'inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]',
        tone === 'default' && 'border-white/10 bg-white/[0.05] text-[color:var(--text-secondary)]',
        tone === 'success' && 'border-emerald-400/20 bg-emerald-500/15 text-emerald-200',
        tone === 'warning' && 'border-amber-400/20 bg-amber-500/15 text-amber-200',
        tone === 'danger' && 'border-rose-400/20 bg-rose-500/15 text-rose-200',
        tone === 'info' && 'border-violet-400/20 bg-violet-500/15 text-violet-100',
      )}
    >
      {label}
    </span>
  );
}