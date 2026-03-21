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
    <div className="surface-subtle rounded-3xl p-6">
      <p className="font-display text-xl font-semibold text-white">{title}</p>
      <p className="mt-2 text-sm text-[color:var(--text-secondary)]">{description}</p>
      <div className="mt-5 grid gap-3">
        {Array.from({ length: rows }).map((_, index) => (
          <div
            key={index}
            className="h-18 animate-pulse rounded-2xl border border-white/10 bg-white/[0.04]"
          />
        ))}
      </div>
    </div>
  );
}