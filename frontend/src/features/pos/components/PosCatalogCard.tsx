import { ProductMedia } from '@/components/ProductMedia';
import { StatusBadge } from '@/components/StatusBadge';
import type { CartItem as CartItemType } from '@/types/api';
import { formatCurrency } from '@/utils/format';

export type PosCatalogCardKind = 'SIMPLE' | 'VARIANT' | 'COMBO';

export interface PosCatalogCardMetaRow {
  label: string;
  value: string;
}

interface PosCatalogCardItem extends CartItemType {
  imageUrl?: string | null;
  imageAlt?: string;
}

interface PosCatalogCardProps {
  item: PosCatalogCardItem;
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
  const hasImage = Boolean(item.imageUrl?.trim());
  const supportingText = resolveSupportingText(item.subtitle, description);

  return (
    <button
      type="button"
      onClick={onAdd}
      disabled={disabled}
      aria-label={`Agregar ${badge.toLowerCase()} ${item.name}${item.subtitle ? ', ' + item.subtitle : ''} al carrito, precio ${formatCurrency(item.unit_price)}`}
      className="pos-catalog-card surface-interactive group text-left"
      data-kind={kind}
      data-has-image={hasImage ? 'true' : 'false'}
    >
      <div className="pos-catalog-card__body">
        <div className="pos-catalog-card__header">
          <div className="pos-catalog-card__media-wrap">
            <ProductMedia
              label={item.name}
              src={item.imageUrl}
              alt={item.imageAlt ?? `Imagen de ${item.name}`}
              kind={kind}
              className="pos-catalog-card__media-frame"
              monogram={createMonogram(item.name)}
            />
            {!hasImage ? (
              <span className="pos-catalog-card__media-note" aria-hidden="true">
                Sin imagen
              </span>
            ) : null}
          </div>

          <div className="pos-catalog-card__topline">
            <span className="pos-catalog-card__eyebrow">{eyebrow}</span>
            <StatusBadge
              label={badge}
              tone={resolveCatalogBadgeTone(kind)}
              className="pos-catalog-card__badge"
            />
          </div>
        </div>

        <div className="pos-catalog-card__content">
          <div className="pos-catalog-card__title-block min-w-0">
            <p className="pos-catalog-card__title font-display">{item.name}</p>
            {supportingText ? (
              <p className="pos-catalog-card__description theme-text-secondary">{supportingText}</p>
            ) : null}
          </div>

          <div className="pos-catalog-card__meta" role="list" aria-label={`Datos de ${item.name}`}>
            {metaRows.map((row) => (
              <div
                key={`${row.label}-${row.value}`}
                className="pos-catalog-card__meta-row"
                role="listitem"
              >
                <span className="pos-catalog-card__meta-label theme-text-faint">{row.label}</span>
                <span
                  className={[
                    'pos-catalog-card__meta-value',
                    row.label.trim().toUpperCase() === 'SKU'
                      ? 'pos-catalog-card__meta-value--mono'
                      : '',
                    'font-medium',
                    'theme-text-secondary',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  {row.value}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="pos-catalog-card__footer">
          <div className="pos-catalog-card__price-block">
            <p className="pos-catalog-card__price-label theme-text-faint">Precio</p>
            <span className="pos-catalog-card__price metric-accent font-display">
              {formatCurrency(item.unit_price)}
            </span>
          </div>

          <span className="pos-catalog-card__cta" aria-hidden="true">
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

function resolveCatalogBadgeTone(kind: PosCatalogCardKind) {
  switch (kind) {
    case 'VARIANT':
      return 'info';
    case 'COMBO':
      return 'success';
    default:
      return 'default';
  }
}

function resolveSupportingText(subtitle: string | undefined, description: string) {
  const normalizedDescription = description.trim();

  if (!normalizedDescription) {
    return null;
  }

  if (subtitle?.trim().toLowerCase() === normalizedDescription.toLowerCase()) {
    return null;
  }

  return normalizedDescription;
}
