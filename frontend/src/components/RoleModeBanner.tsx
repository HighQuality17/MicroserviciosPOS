import { Eye, ShieldCheck } from 'lucide-react';

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
    <div className="semantic-card px-4 py-4" data-tone={tone}>
      <div className="flex items-start gap-3">
        <div className="panel-icon-shell h-10 w-10 min-h-10 min-w-10 rounded-2xl" data-tone={tone === 'info' ? 'default' : 'warning'}>
          {tone === 'info' ? <Eye size={18} /> : <ShieldCheck size={18} />}
        </div>
        <div className="min-w-0">
          <p className="font-medium theme-text-strong">{title}</p>
          <p className="mt-1 text-sm leading-6 theme-text-secondary">{description}</p>
        </div>
      </div>
    </div>
  );
}