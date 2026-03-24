import { Sparkles } from 'lucide-react';
import { ReactNode } from 'react';

interface EmptyStateProps {
  title: string;
  description: string;
  action?: ReactNode;
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="surface-subtle rounded-3xl border-dashed p-8 text-center">
      <div className="empty-state-icon mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border">
        <Sparkles size={20} />
      </div>
      <h3 className="font-display mt-5 text-xl font-semibold theme-text-strong">{title}</h3>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 theme-text-secondary">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}