interface LoadingStateProps {
  title?: string;
  description?: string;
  rows?: number;
}

export function LoadingState({
  title = 'Cargando información',
  description = 'Espera un momento mientras preparamos esta sección.',
  rows = 3,
}: LoadingStateProps) {
  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-950/35 p-6">
      <p className="font-display text-xl font-semibold text-white">{title}</p>
      <p className="mt-2 text-sm text-slate-400">{description}</p>
      <div className="mt-5 grid gap-3">
        {Array.from({ length: rows }).map((_, index) => (
          <div
            key={index}
            className="h-18 animate-pulse rounded-2xl border border-slate-800 bg-slate-900/70"
          />
        ))}
      </div>
    </div>
  );
}

