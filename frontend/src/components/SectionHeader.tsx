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
    <div>
      {eyebrow ? (
        <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
          {eyebrow}
        </p>
      ) : null}
      <h2 className="font-display mt-2 text-2xl font-bold text-white">{title}</h2>
      {description ? <p className="mt-2 text-sm text-slate-400">{description}</p> : null}
    </div>
  );
}
