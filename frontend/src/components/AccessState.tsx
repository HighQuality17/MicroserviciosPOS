import { LockKeyhole } from 'lucide-react';
import { Card } from '@/components/Card';

interface AccessStateProps {
  title?: string;
  description: string;
}

export function AccessState({
  title = 'Acceso restringido',
  description,
}: AccessStateProps) {
  return (
    <Card>
      <div className="semantic-card px-5 py-5" data-tone="warning">
        <div className="flex items-start gap-4">
          <div className="panel-icon-shell rounded-2xl p-3" data-tone="warning">
            <LockKeyhole size={20} />
          </div>
          <div>
            <p className="font-display text-2xl font-bold theme-text-strong">{title}</p>
            <p className="mt-2 text-sm theme-text-secondary">{description}</p>
          </div>
        </div>
      </div>
    </Card>
  );
}