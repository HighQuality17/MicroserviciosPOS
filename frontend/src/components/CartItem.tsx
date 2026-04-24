import { Minus, Plus, Trash2 } from 'lucide-react';
import { IconButton } from '@/components/IconButton';
import { ProductMedia } from '@/components/ProductMedia';
import type { CartItem as CartItemType } from '@/types/api';
import { formatCurrency } from '@/utils/format';

interface CartItemProps {
  item: CartItemType;
  onChangeQty: (qty: number) => void;
  onRemove: () => void;
}

export function CartItem({ item, onChangeQty, onRemove }: CartItemProps) {
  const itemBadge = resolveCartItemBadge(item);
  const lineTotal = item.unit_price * item.qty;
  const detailLabel = item.detailLabel ?? item.subtitle;
  const metadataLabel = item.metadataLabel ?? resolveFallbackMetadata(item);
  const removeLabel = item.subtitle
    ? 'Eliminar ' + item.name + ' ' + item.subtitle + ' del carrito'
    : 'Eliminar ' + item.name + ' del carrito';

  return (
    <article
      className="pos-cart-item surface-subtle"
      aria-label={`${item.name}, cantidad ${item.qty}, total ${formatCurrency(lineTotal)}`}
    >
      <div className="pos-cart-item__main">
        <ProductMedia
          label={item.name}
          src={item.imageUrl}
          alt={item.imageAlt ?? `Imagen de ${item.name}`}
          kind={itemBadge.kind}
          size="md"
          monogram={itemBadge.shortLabel}
          className="pos-cart-item__media"
        />

        <div className="pos-cart-item__content">
          <div className="pos-cart-item__eyebrow-row">
            <span className="pos-cart-item__badge soft-pill">
              {itemBadge.label}
            </span>
            <span className="pos-cart-item__unit">
              {formatCurrency(item.unit_price)} c/u
            </span>
          </div>

          <p className="pos-cart-item__title theme-text-strong">{item.name}</p>

          <div className="pos-cart-item__meta-row">
            {detailLabel ? (
              <span className="pos-cart-item__subtitle">{detailLabel}</span>
            ) : null}
            {metadataLabel ? (
              <span className="pos-cart-item__metadata">{metadataLabel}</span>
            ) : null}
          </div>
        </div>

      </div>

      <div className="pos-cart-item__footer">
        <div className="pos-cart-item__actions">
          <div className="pos-cart-item__qty" aria-label={`Control de cantidad para ${item.name}`}>
            <IconButton
              variant="secondary"
              size="sm"
              className="pos-cart-item__qty-button"
              onClick={() => onChangeQty(item.qty - 1)}
              label={'Reducir cantidad de ' + item.name}
              icon={<Minus size={14} />}
            />
            <span
              className="pos-cart-item__qty-value surface-subtle-strong theme-text-strong"
              aria-live="polite"
              aria-atomic="true"
              aria-label={'Cantidad actual de ' + item.name + ': ' + item.qty}
            >
              {item.qty}
            </span>
            <IconButton
              variant="secondary"
              size="sm"
              className="pos-cart-item__qty-button"
              onClick={() => onChangeQty(item.qty + 1)}
              label={'Aumentar cantidad de ' + item.name}
              icon={<Plus size={14} />}
            />
          </div>

          <IconButton
            type="button"
            variant="ghost"
            size="sm"
            icon={<Trash2 size={16} />}
            onClick={onRemove}
            className="pos-cart-item__remove"
            label={removeLabel}
          />
        </div>

        <div className="pos-cart-item__total">
          <p className="pos-cart-item__total-label theme-text-faint">
            Total linea
          </p>
          <p className="pos-cart-item__total-value metric-accent">
            {formatCurrency(lineTotal)}
          </p>
        </div>
      </div>
    </article>
  );
}

function resolveFallbackMetadata(item: CartItemType) {
  if (item.item_type === 'COMBO') {
    return 'Combo';
  }

  if (item.is_operational && item.product_type === 'SIMPLE') {
    return 'Producto simple';
  }

  return undefined;
}

function resolveCartItemBadge(item: CartItemType) {
  if (item.item_type === 'COMBO') {
    return {
      kind: 'COMBO' as const,
      label: 'Combo',
      shortLabel: 'CB',
    };
  }

  if (item.is_operational && item.product_type === 'SIMPLE') {
    return {
      kind: 'SIMPLE' as const,
      label: 'Producto simple',
      shortLabel: 'PS',
    };
  }

  return {
    kind: 'VARIANT' as const,
    label: 'Variante',
    shortLabel: 'VR',
  };
}

