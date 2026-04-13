import { Boxes, Layers3, Package2 } from 'lucide-react';
import type { ReactNode } from 'react';
import type { CartItem as CartItemType } from '@/types/api';
import { formatCurrency } from '@/utils/format';

export type PosCatalogCardKind = 'SIMPLE' | 'VARIANT' | 'COMBO';

export interface PosCatalogCardMetaRow {
  label: string;
  value: string;
}

interface PosCatalogCardProps {
  item: CartItemType;
  kind: PosCatalogCardKind;
  badge: string;
  eyebrow: string;
  description: string;
  metaRows: PosCatalogCardMetaRow[];
  disabled?: boolean;
  onAdd: () => void;
}

const cardIcons: Record<PosCatalogCardKind, ReactNode> = {
  SIMPLE: <Package2 size={20} strokeWidth={1.8} />,
  VARIANT: <Layers3 size={20} strokeWidth={1.8} />,
  COMBO: <Boxes size={20} strokeWidth={1.8} />,
};

export function PosCatalogCard({
  item,
  kind,
  badge,
  eyebrow,
  description,
  metaRows,
  disabled,
  onAdd,
}: PosCatalogCardProps) {
  return (
    <button
      type="button"
      onClick={onAdd}
      disabled={disabled}
      aria-label={`Agregar ${badge.toLowerCase()} ${item.name}${item.subtitle ? ', ' + item.subtitle : ''}, precio ${formatCurrency(item.unit_price)}`}
      className="pos-catalog-card surface-interactive group rounded-[1.65rem] p-4 text-left sm:p-5"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="pos-catalog-card__media" data-kind={kind} aria-hidden="true">
            <span className="pos-catalog-card__icon">{cardIcons[kind]}</span>
            <span className="pos-catalog-card__monogram">{createMonogram(item.name)}</span>
          </div>
          <div className="min-w-0">
            <p className="text-[0.7rem] font-semibold uppercase tracking-[0.22em] theme-text-faint">
              {eyebrow}
            </p>
            <p className="mt-2 font-display text-lg font-bold leading-tight theme-text-strong sm:text-xl">
              {item.name}
            </p>
          </div>
        </div>

        <span className="soft-pill shrink-0 rounded-full px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.14em]">
          {badge}
        </span>
      </div>

      <p className="mt-4 min-h-12 text-sm leading-6 theme-text-secondary">
        {description}
      </p>

      <div className="mt-4 grid gap-2 rounded-[1.35rem] border border-[color:var(--line)] bg-[color:rgb(255_255_255_/_0.02)] p-3">
        {metaRows.map((row) => (
          <div
            key={`${row.label}-${row.value}`}
            className="flex items-center justify-between gap-3 text-xs"
          >
            <span className="theme-text-faint">{row.label}</span>
            <span className="font-medium theme-text-secondary">{row.value}</span>
          </div>
        ))}
      </div>

      <div className="mt-5 flex items-end justify-between gap-3">
        <div>
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] theme-text-faint">
            Precio
          </p>
          <span className="metric-accent font-display text-2xl font-bold sm:text-[1.8rem]">
            {formatCurrency(item.unit_price)}
          </span>
        </div>
        <span className="action-soft-brand rounded-2xl px-4 py-2.5 text-sm font-semibold">
          Agregar
        </span>
      </div>
    </button>
  );
}

function createMonogram(value: string) {
  const letters = value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((chunk) => chunk[0]?.toUpperCase() ?? '')
    .join('');

  return letters || 'POS';
}
