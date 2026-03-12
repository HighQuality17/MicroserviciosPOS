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
        'rounded-3xl border px-4 py-4',
        tone === 'info' && 'border-sky-400/20 bg-sky-400/10 text-sky-100',
        tone === 'warning' && 'border-amber-400/20 bg-amber-400/10 text-amber-100',
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={clsx(
            'rounded-2xl p-2',
            tone === 'info' && 'bg-sky-300/15 text-sky-200',
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

