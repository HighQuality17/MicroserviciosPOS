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
      <div className="flex items-start gap-4 rounded-3xl border border-amber-400/20 bg-amber-400/10 p-5">
        <div className="rounded-2xl bg-amber-300/15 p-3 text-amber-200">
          <LockKeyhole size={20} />
        </div>
        <div>
          <p className="font-display text-2xl font-bold text-white">{title}</p>
          <p className="mt-2 text-sm text-amber-100/85">{description}</p>
        </div>
      </div>
    </Card>
  );
}
