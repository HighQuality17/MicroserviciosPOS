import { ReactNode } from 'react';
import { Card } from '@/components/Card';

interface SummaryCardProps {
  title: string;
  value: string;
  hint?: string;
  icon?: ReactNode;
}

export function SummaryCard({ title, value, hint, icon }: SummaryCardProps) {
  return (
    <Card className="relative overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-teal-300/70 to-transparent" />
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-slate-300">{title}</p>
          <p className="mt-3 font-display text-2xl font-bold text-white">{value}</p>
          {hint ? <p className="mt-2 text-xs text-slate-400">{hint}</p> : null}
        </div>
        <div className="rounded-2xl bg-slate-900/80 p-3 text-teal-300">{icon}</div>
      </div>
    </Card>
  );
}
