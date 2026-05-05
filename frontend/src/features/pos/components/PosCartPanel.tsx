import clsx from 'clsx';
import {
  AlertTriangle,
  CheckCircle2,
  CreditCard,
  Minus,
  Plus,
  ReceiptText,
  ShoppingCart,
  Trash2,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from '@/components/Button';
import { IconButton } from '@/components/IconButton';
import { ProductMedia } from '@/components/ProductMedia';
import type { CartItem as CartItemType } from '@/types/api';
import { formatCurrency } from '@/utils/format';

interface CartTotals {
  subtotal: number;
  discountAmount: number;
  total: number;
}

interface PosCartPanelProps {
  mode?: 'desktop' | 'mobile';
  items: CartItemType[];
  totals: CartTotals;
  locationName?: string;
  cashStatusLabel?: string;
  checkoutDisabledReason?: string | null;
  className?: string;
  onClearCart: () => void;
  onChangeQty: (key: string, qty: number) => void;
  onRemove: (key: string) => void;
  onCheckout: () => void;
}

export function PosCartPanel({
  mode = 'desktop',
  items,
  totals,
  locationName,
  cashStatusLabel,
  checkoutDisabledReason,
  className,
  onClearCart,
  onChangeQty,
  onRemove,
  onCheckout,
}: PosCartPanelProps) {
  const totalUnits = items.reduce((sum, item) => sum + item.qty, 0);
  const isMobile = mode === 'mobile';
  const lineCountLabel = items.length === 1 ? '1 linea' : `${items.length} lineas`;
  const itemCountLabel = formatItemCount(totalUnits);
  const checkoutBlocked = Boolean(checkoutDisabledReason);
  const cashStateValue = cashStatusLabel ?? (locationName ? 'Pendiente' : 'Sin POS');
  const cashStateTone = cashStateValue === 'Abierta'
    ? 'success'
    : cashStateValue === 'Pendiente'
      ? 'warning'
      : 'neutral';
  const checkoutStatusLabel = checkoutBlocked ? 'Caja pendiente' : 'Listo para cobrar';

  return (
    <div
      className={clsx(
        'pos-cart-panel pos-cart-shell',
        isMobile ? 'pos-cart-panel--mobile pos-cart-shell--mobile' : 'pos-cart-panel--desktop pos-cart-shell--desktop',
        className,
      )}
      data-checkout-state={checkoutBlocked ? 'blocked' : 'ready'}
    >
      <header className="pos-cart-header">
        <div className="pos-cart-header__copy">
          <span className="pos-cart-badge">Carrito</span>
          <div>
            <h2 className="pos-cart-title theme-text-strong">Venta actual</h2>
            <p className="pos-cart-subtitle theme-text-secondary">
              {locationName ? locationName : 'Selecciona POS para iniciar la venta'}
            </p>
          </div>
        </div>

        <div className="pos-cart-header__actions">
          <span className="pos-cart-line-chip" aria-label={`${lineCountLabel} en carrito`}>
            {lineCountLabel}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearCart}
            disabled={items.length === 0}
            className="pos-cart-clear-button"
          >
            <Trash2 size={14} aria-hidden="true" />
            <span>Limpiar</span>
          </Button>
        </div>
      </header>

      <div className="pos-cart-top">
        <PosCartTotalHero
          total={totals.total}
          statusLabel={checkoutStatusLabel}
          blocked={checkoutBlocked}
        />

        <div className="pos-cart-status-strip" aria-label="Resumen rapido de venta">
          <CartStatusChip label="Items" value={itemCountLabel} />
          <CartStatusChip label="Lineas" value={lineCountLabel} />
          <CartStatusChip
            label="Caja"
            value={cashStateValue}
            tone={cashStateTone}
            icon={cashStateTone === 'success' ? <CheckCircle2 size={13} /> : <AlertTriangle size={13} />}
          />
        </div>
      </div>

      <main className="pos-cart-content" aria-label="Contenido del carrito">
        <section className="pos-cart-items" aria-label="Detalle de venta">
          <div className="pos-cart-items__header">
            <div>
              <p className="pos-cart-section-kicker">Detalle de venta</p>
              <h3 className="pos-cart-section-title">Items cargados</h3>
            </div>
            <span className="pos-cart-items__count">{itemCountLabel}</span>
          </div>

          <div className="pos-cart-items__body">
            {items.length === 0 ? (
              <CartEmptyState />
            ) : (
              <div className="pos-cart-list">
                {items.map((item) => (
                  <PosCartLineItem
                    key={item.key}
                    item={item}
                    onChangeQty={(qty) => onChangeQty(item.key, qty)}
                    onRemove={() => onRemove(item.key)}
                  />
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="pos-cart-summary-panel" aria-label="Resumen de cobro">
          <div className="pos-cart-summary-panel__rows">
            <div className="pos-cart-summary-panel__row">
              <span>Subtotal</span>
              <strong>{formatCurrency(totals.subtotal)}</strong>
            </div>
            <div className="pos-cart-summary-panel__row">
              <span>Items</span>
              <strong>{itemCountLabel}</strong>
            </div>
            <div className="pos-cart-summary-panel__row">
              <span>Lineas</span>
              <strong>{lineCountLabel}</strong>
            </div>
          </div>

          <div className="pos-cart-summary-panel__total">
            <span>Total final</span>
            <strong>{formatCurrency(totals.total)}</strong>
          </div>
        </section>
      </main>

      <footer className="pos-cart-footer">
        <div
          className={clsx(
            'pos-cart-checkout-status',
            checkoutBlocked && 'pos-cart-checkout-status--blocked',
          )}
          role="status"
        >
          <span className="pos-cart-checkout-status__icon" aria-hidden="true">
            {checkoutBlocked ? <AlertTriangle size={15} /> : <CheckCircle2 size={15} />}
          </span>
          <span>{checkoutDisabledReason ?? 'Caja lista para cobrar.'}</span>
        </div>

        <Button
          size="lg"
          disabled={checkoutBlocked}
          aria-haspopup="dialog"
          aria-controls="payment-dialog"
          onClick={onCheckout}
          className="pos-cart-checkout-button"
        >
          <CreditCard size={18} aria-hidden="true" />
          <span>Cobrar {formatCurrency(totals.total)}</span>
        </Button>
      </footer>
    </div>
  );
}

function PosCartTotalHero({
  total,
  statusLabel,
  blocked,
}: {
  total: number;
  statusLabel: string;
  blocked: boolean;
}) {
  return (
    <section className="pos-cart-total-hero" aria-label="Total a cobrar">
      <div className="pos-cart-total-hero__copy">
        <span
          className={clsx(
            'pos-cart-total-hero__status',
            blocked && 'pos-cart-total-hero__status--blocked',
          )}
        >
          {statusLabel}
        </span>
        <p className="pos-cart-total-hero__label">Total a cobrar</p>
        <div className="pos-cart-total-hero__amount-wrap">
          <p className="pos-cart-total-hero__amount">{formatCurrency(total)}</p>
        </div>
      </div>

      <span className="pos-cart-total-hero__icon" aria-hidden="true">
        <CreditCard size={22} />
      </span>
    </section>
  );
}

function CartStatusChip({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: string;
  icon?: ReactNode;
  tone?: 'neutral' | 'success' | 'warning';
}) {
  return (
    <div className={clsx('pos-cart-status-chip', tone && `pos-cart-status-chip--${tone}`)}>
      {icon ? (
        <span className="pos-cart-status-chip__icon" aria-hidden="true">
          {icon}
        </span>
      ) : null}
      <span className="pos-cart-status-chip__label">{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function CartEmptyState() {
  return (
    <div className="pos-cart-empty" role="status">
      <span className="pos-cart-empty__icon" aria-hidden="true">
        <ShoppingCart size={22} />
      </span>
      <p className="pos-cart-empty__title">Carrito listo para vender</p>
      <p className="pos-cart-empty__copy">
        Agrega productos desde el catalogo para preparar el cobro.
      </p>
    </div>
  );
}

function PosCartLineItem({
  item,
  onChangeQty,
  onRemove,
}: {
  item: CartItemType;
  onChangeQty: (qty: number) => void;
  onRemove: () => void;
}) {
  const itemBadge = resolveCartItemBadge(item);
  const lineTotal = item.unit_price * item.qty;
  const detailLabel = item.detailLabel ?? item.subtitle;
  const metadataLabel = item.metadataLabel ?? resolveFallbackMetadata(item);
  const removeLabel = item.subtitle
    ? 'Eliminar ' + item.name + ' ' + item.subtitle + ' del carrito'
    : 'Eliminar ' + item.name + ' del carrito';

  return (
    <article
      className="pos-cart-line-item"
      aria-label={`${item.name}, cantidad ${item.qty}, total ${formatCurrency(lineTotal)}`}
    >
      <div className="pos-cart-line-item__main">
        <ProductMedia
          label={item.name}
          src={item.imageUrl}
          alt={item.imageAlt ?? `Imagen de ${item.name}`}
          kind={itemBadge.kind}
          size="md"
          monogram={itemBadge.shortLabel}
          className="pos-cart-line-item__media"
        />

        <div className="pos-cart-line-item__content">
          <div className="pos-cart-line-item__eyebrow-row">
            <span className="pos-cart-line-item__badge">{itemBadge.label}</span>
            <span className="pos-cart-line-item__unit">{formatCurrency(item.unit_price)} c/u</span>
          </div>

          <p className="pos-cart-line-item__title theme-text-strong">{item.name}</p>

          <div className="pos-cart-line-item__meta-row">
            {detailLabel ? (
              <span className="pos-cart-line-item__subtitle">{detailLabel}</span>
            ) : null}
            {metadataLabel ? (
              <span className="pos-cart-line-item__metadata">{metadataLabel}</span>
            ) : null}
          </div>
        </div>
      </div>

      <div className="pos-cart-line-item__controls">
        <div className="pos-cart-line-item__qty" aria-label={`Control de cantidad para ${item.name}`}>
          <IconButton
            variant="secondary"
            size="sm"
            className="pos-cart-line-item__qty-button"
            onClick={() => onChangeQty(item.qty - 1)}
            label={'Reducir cantidad de ' + item.name}
            icon={<Minus size={14} />}
          />
          <span
            className="pos-cart-line-item__qty-value theme-text-strong"
            aria-live="polite"
            aria-atomic="true"
            aria-label={'Cantidad actual de ' + item.name + ': ' + item.qty}
          >
            {item.qty}
          </span>
          <IconButton
            variant="secondary"
            size="sm"
            className="pos-cart-line-item__qty-button"
            onClick={() => onChangeQty(item.qty + 1)}
            label={'Aumentar cantidad de ' + item.name}
            icon={<Plus size={14} />}
          />
        </div>

        <div className="pos-cart-line-item__total">
          <span>Total linea</span>
          <strong>{formatCurrency(lineTotal)}</strong>
        </div>

        <IconButton
          type="button"
          variant="ghost"
          size="sm"
          icon={<Trash2 size={15} />}
          onClick={onRemove}
          className="pos-cart-line-item__remove"
          label={removeLabel}
        />
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

function formatItemCount(value: number) {
  return value === 1 ? '1 item' : `${value} items`;
}
