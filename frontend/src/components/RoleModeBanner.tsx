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
        tone === 'info' && 'border-cyan-300/18 bg-[linear-gradient(180deg,rgba(34,211,238,0.12),rgba(79,70,229,0.08))] text-cyan-50',
        tone === 'warning' && 'border-amber-400/20 bg-[linear-gradient(180deg,rgba(245,158,11,0.12),rgba(120,53,15,0.08))] text-amber-50',
      )}
    >
      <div className="flex items-start gap-3">
        <div className="panel-icon-shell h-10 w-10 min-h-10 min-w-10 rounded-2xl" data-tone={tone === 'info' ? 'default' : 'warning'}>
          {tone === 'info' ? <Eye size={18} /> : <ShieldCheck size={18} />}
        </div>
        <div className="min-w-0">
          <p className="font-medium text-white">{title}</p>
          <p className="mt-1 text-sm leading-6 text-current/80">{description}</p>
        </div>
      </div>
    </div>
  );
}
