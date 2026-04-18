import { Skeleton } from '@/components/Skeleton';

interface LoadingStateProps {
  title?: string;
  description?: string;
  rows?: number;
}

export function LoadingState({
  title = 'Cargando informacion',
  description = 'Espera un momento mientras preparamos esta seccion.',
  rows = 3,
}: LoadingStateProps) {
  return (
    <div className="surface-subtle rounded-[1.65rem] p-6">
      <p className="font-display text-xl font-semibold theme-text-strong">{title}</p>
      <p className="mt-2 text-sm theme-text-secondary">{description}</p>
      <div className="mt-5 grid gap-3">
        {Array.from({ length: rows }).map((_, index) => (
          <Skeleton key={index} className="h-18" />
        ))}
      </div>
    </div>
  );
}
