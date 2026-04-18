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
  const detailLine = item.subtitle && item.subtitle !== description ? item.subtitle : null;

  return (
    <button
      type="button"
      onClick={onAdd}
      disabled={disabled}
      aria-label={`Agregar ${badge.toLowerCase()} ${item.name}${item.subtitle ? ', ' + item.subtitle : ''}, precio ${formatCurrency(item.unit_price)}`}
      className="pos-catalog-card surface-interactive group rounded-[1.65rem] p-4 text-left sm:p-5"
      data-kind={kind}
    >
      <div className="pos-catalog-card__body">
        <div className="pos-catalog-card__topline">
          <span className="pos-catalog-card__eyebrow">{eyebrow}</span>
          <span className="pos-catalog-card__badge">{badge}</span>
        </div>

        <div className="pos-catalog-card__hero">
          <div className="pos-catalog-card__media-wrap">
            <ProductMedia
              label={item.name}
              kind={kind}
              size="lg"
              className="pos-catalog-card__media-frame"
              monogram={createMonogram(item.name)}
            />
          </div>

          <div className="pos-catalog-card__title-block min-w-0">
            <p className="pos-catalog-card__title font-display">{item.name}</p>
            {detailLine ? (
              <p className="pos-catalog-card__subtitle theme-text-secondary">{detailLine}</p>
            ) : null}
          </div>
        </div>

        <p className="pos-catalog-card__description theme-text-secondary">{description}</p>

        <div className="pos-catalog-card__meta">
          {metaRows.map((row) => (
            <div
              key={`${row.label}-${row.value}`}
              className="pos-catalog-card__meta-row"
            >
              <span className="pos-catalog-card__meta-label theme-text-faint">{row.label}</span>
              <span className="pos-catalog-card__meta-value font-medium theme-text-secondary">
                {row.value}
              </span>
            </div>
          ))}
        </div>

        <div className="pos-catalog-card__footer">
          <div className="pos-catalog-card__price-block">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] theme-text-faint">
              Precio
            </p>
            <span className="pos-catalog-card__price metric-accent font-display">
              {formatCurrency(item.unit_price)}
            </span>
          </div>

          <span className="pos-catalog-card__cta">
            <span>Agregar</span>
            <span className="pos-catalog-card__cta-mark" aria-hidden="true">
              +
            </span>
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
