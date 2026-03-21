interface SectionHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
}

export function SectionHeader({
  eyebrow,
  title,
  description,
}: SectionHeaderProps) {
  return (
    <div className="min-w-0">
      {eyebrow ? (
        <p className="text-xs uppercase tracking-[0.32em] text-[color:var(--text-faint)]">
          {eyebrow}
        </p>
      ) : null}
      <h2 className="font-display mt-2 text-xl font-bold text-white sm:text-2xl">
        {title}
      </h2>
      {description ? (
        <p className="mt-2 max-w-3xl text-sm leading-6 text-[color:var(--text-secondary)]">
          {description}
        </p>
      ) : null}
    </div>
  );
}