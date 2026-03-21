import { Eye, ShieldCheck } from 'lucide-react';
import clsx from 'clsx';

interface RoleModeBannerProps {
  title: string;
  description: string;
  tone?: 'info' | 'warning';
}

export function RoleModeBanner({
  title,
  description,
  tone = 'info',
}: RoleModeBannerProps) {
  return (
    <div
      className={clsx(
        'rounded-3xl border px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]',
        tone === 'info' && 'border-violet-400/20 bg-violet-500/10 text-violet-100',
        tone === 'warning' && 'border-amber-400/20 bg-amber-500/10 text-amber-100',
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={clsx(
            'rounded-2xl p-2',
            tone === 'info' && 'bg-violet-300/15 text-violet-100',
            tone === 'warning' && 'bg-amber-300/15 text-amber-200',
          )}
        >
          {tone === 'info' ? <Eye size={18} /> : <ShieldCheck size={18} />}
        </div>
        <div>
          <p className="font-medium text-white">{title}</p>
          <p className="mt-1 text-sm text-current/80">{description}</p>
        </div>
      </div>
    </div>
  );
}