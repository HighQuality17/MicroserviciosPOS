import clsx from 'clsx';
import {
  AlertTriangle,
  BadgePercent,
  CheckCircle2,
  CreditCard,
  ReceiptText,
  ShoppingCart,
  Trash2,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from '@/components/Button';
import { CartItem } from '@/components/CartItem';
import { EmptyState } from '@/components/EmptyState';
import { Input } from '@/components/Input';
import { Select } from '@/components/Select';
import type { CartItem as CartItemType, DiscountType } from '@/types/api';
import { formatCurrency } from '@/utils/format';

interface CartTotals {
  subtotal: number;
  discountAmount: number;
  total: number;
}

interface PosCartPanelProps {
  mode?: 'desktop' | 'mobile';
  items: CartItemType[];
  discountType: DiscountType;
  discountInput: string;
  totals: CartTotals;
  locationName?: string;
  checkoutDisabledReason?: string | null;
  className?: string;
  onClearCart: () => void;
  onDiscountTypeChange: (value: DiscountType) => void;
  onDiscountInputChange: (value: string) => void;
  onChangeQty: (key: string, qty: number) => void;
  onRemove: (key: string) => void;
  onCheckout: () => void;
}

export function PosCartPanel({
  mode = 'desktop',
  items,
  discountType,
  discountInput,
  totals,
  locationName,
  checkoutDisabledReason,
  className,
  onClearCart,
  onDiscountTypeChange,
  onDiscountInputChange,
  onChangeQty,
  onRemove,
  onCheckout,
}: PosCartPanelProps) {
  const totalUnits = items.reduce((sum, item) => sum + item.qty, 0);
  const activeDiscountLabel = resolveDiscountLabel(discountType, discountInput);
  const isMobile = mode === 'mobile';
  const lineCountLabel = items.length === 1 ? '1 linea' : `${items.length} lineas`;
  const checkoutBlocked = Boolean(checkoutDisabledReason);
  const discountApplied = totals.discountAmount > 0;

  return (
    <div
      className={clsx(
        'pos-cart-panel',
        isMobile
          ? 'pos-cart-panel--mobile grid h-full min-h-0 grid-rows-[auto_auto_minmax(0,1fr)_auto] overflow-hidden'
          : 'pos-cart-panel--desktop flex min-h-0 flex-col overflow-hidden',
        className,
      )}
    >
      <header className="pos-cart-panel__hero">
        <div className="pos-cart-panel__hero-copy">
          <p className="section-kicker">Carrito</p>
          <h2 className="pos-cart-panel__title theme-text-strong">Venta actual</h2>
          <p className="pos-cart-panel__subtitle theme-text-secondary">
            {locationName
              ? `${locationName} listo para revisar items, descuento y cobro.`
              : 'Selecciona POS, carga items y prepara el cobro.'}
          </p>
        </div>

        <div className="pos-cart-panel__hero-actions">
          <span className="pos-cart-panel__count-chip" aria-label={`${lineCountLabel} en carrito`}>
            {lineCountLabel}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearCart}
            disabled={items.length === 0}
            className="pos-cart-panel__clear"
          >
            <Trash2 size={14} aria-hidden="true" />
            <span>Limpiar</span>
          </Button>
        </div>
      </header>

      <div className="pos-cart-panel__stats-grid" aria-label="Resumen rapido del carrito">
        <CartStatCard
          variant="items"
          icon={<ShoppingCart size={15} />}
          label="Items"
          value={formatItemCount(totalUnits)}
          note={lineCountLabel}
        />
        <CartStatCard
          variant="total"
          icon={<ReceiptText size={15} />}
          label="Total actual"
          value={formatCurrency(totals.total)}
          note="Venta actual"
          strong
        />
        <CartStatCard
          variant="discount"
          icon={<BadgePercent size={15} />}
          label="Descuento"
          value={discountApplied ? formatCurrency(totals.discountAmount) : 'Sin descuento'}
          note={activeDiscountLabel}
        />
      </div>

      <div className={clsx('pos-cart-panel__content', isMobile && 'pos-cart-panel__content--mobile')}>
        <section className="pos-cart-panel__list-shell" aria-label="Items cargados">
          <div className="pos-cart-panel__section-head">
            <div>
              <p className="pos-cart-panel__section-kicker">Items cargados</p>
              <p className="pos-cart-panel__section-title">Detalle de venta</p>
            </div>
            <span className="pos-cart-panel__section-pill">{formatItemCount(totalUnits)}</span>
          </div>

          <div className="pos-cart-panel__list-scroll">
            {renderCartItemsList(items, onChangeQty, onRemove)}
          </div>
        </section>

        <section className="pos-cart-panel__discount-shell" aria-label="Descuento de venta">
          <div className="pos-cart-panel__discount-head">
            <div>
              <p className="pos-cart-panel__section-kicker">Descuento</p>
              <p className="pos-cart-panel__section-title">Ajuste comercial</p>
            </div>
            <span
              className={clsx(
                'pos-cart-panel__discount-state',
                discountApplied && 'pos-cart-panel__discount-state--active',
              )}
            >
              {discountApplied ? 'Aplicado' : 'Opcional'}
            </span>
          </div>

          <div className="pos-cart-panel__discount-controls">
            <Select
              label="Tipo"
              value={discountType}
              onChange={(event) => onDiscountTypeChange(event.target.value as DiscountType)}
            >
              <option value="NONE">Sin descuento</option>
              <option value="PERCENT">Porcentaje</option>
              <option value="FIXED">Valor fijo</option>
            </Select>

            <Input
              type="number"
              min={0}
              label="Valor"
              placeholder={discountType === 'PERCENT' ? 'Ej: 10' : 'Ej: 2000'}
              hint={resolveDiscountHint(discountType)}
              value={discountInput}
              onChange={(event) => onDiscountInputChange(event.target.value)}
            />
          </div>
        </section>

        <FinancialSummary totals={totals} totalUnits={totalUnits} />
      </div>

      <footer className="pos-cart-panel__footer">
        <div
          className={clsx(
            'pos-cart-panel__checkout-status',
            checkoutBlocked && 'pos-cart-panel__checkout-status--blocked',
          )}
          role="status"
        >
          <span className="pos-cart-panel__checkout-status-icon" aria-hidden="true">
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
          className="pos-cart-panel__checkout-button"
        >
          <CreditCard size={18} aria-hidden="true" />
          <span>Cobrar {formatCurrency(totals.total)}</span>
        </Button>
      </footer>
    </div>
  );
}

function CartStatCard({
  variant,
  icon,
  label,
  value,
  note,
  strong = false,
}: {
  variant: 'items' | 'total' | 'discount';
  icon: ReactNode;
  label: string;
  value: string;
  note: string;
  strong?: boolean;
}) {
  return (
    <div
      className={clsx(
        'pos-cart-panel__stat surface-subtle',
        `pos-cart-panel__stat--${variant}`,
        strong && 'pos-cart-panel__stat--strong',
      )}
    >
      <span className="pos-cart-panel__stat-icon" aria-hidden="true">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="pos-cart-panel__stat-label">{label}</p>
        <p className={clsx('pos-cart-panel__stat-value', strong && 'metric-accent-strong')}>
          {value}
        </p>
        <p className="pos-cart-panel__stat-note theme-text-secondary">{note}</p>
      </div>
    </div>
  );
}

function FinancialSummary({
  totals,
  totalUnits,
}: {
  totals: CartTotals;
  totalUnits: number;
}) {
  return (
    <section className="pos-cart-summary surface-subtle-strong" aria-label="Resumen financiero">
      <div className="pos-cart-summary__rows">
        <div className="pos-cart-summary__row">
          <span>Subtotal</span>
          <span>{formatCurrency(totals.subtotal)}</span>
        </div>
        <div className="pos-cart-summary__row">
          <span>Descuento</span>
          <span>{formatCurrency(totals.discountAmount)}</span>
        </div>
        <div className="pos-cart-summary__row">
          <span>Items</span>
          <span>{formatItemCount(totalUnits)}</span>
        </div>
      </div>

      <div className="pos-cart-summary__total">
        <span>Total final</span>
        <span>{formatCurrency(totals.total)}</span>
      </div>
    </section>
  );
}

function renderCartItemsList(
  items: CartItemType[],
  onChangeQty: (key: string, qty: number) => void,
  onRemove: (key: string) => void,
) {
  if (items.length === 0) {
    return (
      <EmptyState
        icon={<ShoppingCart size={20} />}
        title="Sin items cargados"
        description="Agrega productos, variantes o combos desde el catalogo para preparar la venta."
      />
    );
  }

  return (
    <div className="pos-cart-panel__items-grid">
      {items.map((item) => (
        <CartItem
          key={item.key}
          item={item}
          onChangeQty={(qty) => onChangeQty(item.key, qty)}
          onRemove={() => onRemove(item.key)}
        />
      ))}
    </div>
  );
}

function resolveDiscountLabel(discountType: DiscountType, discountInput: string) {
  if (discountType === 'NONE') {
    return 'Sin descuento aplicado';
  }

  if (!discountInput.trim()) {
    return discountType === 'PERCENT'
      ? 'Porcentaje pendiente'
      : 'Valor fijo pendiente';
  }

  return discountType === 'PERCENT'
    ? `${discountInput}% sobre subtotal`
    : `${formatCurrency(Number(discountInput))} de descuento`;
}

function resolveDiscountHint(discountType: DiscountType) {
  if (discountType === 'NONE') {
    return 'Sin ajuste aplicado al total.';
  }

  if (discountType === 'PERCENT') {
    return 'Porcentaje sobre subtotal.';
  }

  return 'Monto fijo a descontar.';
}

function formatItemCount(value: number) {
  return value === 1 ? '1 item' : `${value} items`;
}
