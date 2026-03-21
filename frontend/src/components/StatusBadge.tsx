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
    <span
      className={clsx(
        'inline-flex min-h-8 items-center justify-center whitespace-nowrap rounded-[0.95rem] border px-2.5 py-1 text-[11px] font-semibold tracking-[0.01em] shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]',
        tone === 'default' && 'border-white/10 bg-white/[0.05] text-[color:var(--text-secondary)]',
        tone === 'success' && 'border-emerald-400/18 bg-[linear-gradient(180deg,rgba(52,211,153,0.16),rgba(6,95,70,0.12))] text-emerald-100',
        tone === 'warning' && 'border-amber-400/18 bg-[linear-gradient(180deg,rgba(245,158,11,0.14),rgba(120,53,15,0.1))] text-amber-100',
        tone === 'danger' && 'border-rose-400/18 bg-[linear-gradient(180deg,rgba(251,113,133,0.16),rgba(136,19,55,0.12))] text-rose-100',
        tone === 'info' && 'border-violet-300/20 bg-[linear-gradient(180deg,rgba(139,92,246,0.18),rgba(91,33,182,0.12))] text-violet-50',
        className,
      )}
    >
      {label}
    </span>
  );
}
