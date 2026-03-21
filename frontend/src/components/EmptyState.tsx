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
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-cyan-300/18 bg-[linear-gradient(180deg,rgba(34,211,238,0.12),rgba(79,70,229,0.08))] text-cyan-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
        <Sparkles size={20} />
      </div>
      <h3 className="font-display mt-5 text-xl font-semibold text-white">{title}</h3>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-[color:var(--text-secondary)]">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
