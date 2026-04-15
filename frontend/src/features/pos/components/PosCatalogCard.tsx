import { ProductMedia } from '@/components/ProductMedia';
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
      <div className="pos-catalog-card__body">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <ProductMedia
              label={item.name}
              kind={kind}
              size="md"
              monogram={createMonogram(item.name)}
            />
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

        <div className="pos-catalog-card__meta">
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

        <div className="pos-catalog-card__footer flex items-end justify-between gap-3">
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
