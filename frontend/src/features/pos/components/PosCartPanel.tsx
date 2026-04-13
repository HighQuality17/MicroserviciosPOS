import clsx from 'clsx';
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

  if (isMobile) {
    return (
      <div
        className={clsx(
          'grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden',
          className,
        )}
      >
        <div className="grid gap-4 pb-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="section-kicker">Venta en curso</p>
              <h2 className="font-display mt-2 text-2xl font-bold theme-text-strong">Carrito</h2>
              <p className="mt-2 text-sm leading-6 theme-text-secondary">
                {locationName
                  ? `Venta activa en ${locationName}. Revisa items, descuento y cobro.`
                  : 'Revisa items, descuento y cobro sin salir de la operacion.'}
              </p>
            </div>
            <Button
              variant="ghost"
              onClick={onClearCart}
              disabled={items.length === 0}
              className="shrink-0"
            >
              Limpiar
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="surface-subtle rounded-[1.2rem] p-3.5">
              <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] theme-text-faint">
                Items
              </p>
              <p className="mt-2 font-display text-xl font-bold theme-text-strong">
                {formatItemCount(totalUnits)}
              </p>
              <p className="mt-1 text-xs theme-text-secondary">
                {items.length === 1 ? '1 linea' : `${items.length} lineas`}
              </p>
            </div>

            <div className="surface-subtle rounded-[1.2rem] p-3.5">
              <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] theme-text-faint">
                Total actual
              </p>
              <p className="mt-2 font-display text-xl font-bold metric-accent-strong">
                {formatCurrency(totals.total)}
              </p>
              <p className="mt-1 text-xs theme-text-secondary">{activeDiscountLabel}</p>
            </div>
          </div>
        </div>

        <div className="pos-cart-panel__scroll min-h-0 overflow-y-auto pr-1">
          <div className="grid content-start gap-5 pb-4">
            {renderCartItemsList(items, onChangeQty, onRemove)}

            <div className="grid gap-4">
              <div className="grid gap-4">
                <Select
                  label="Descuento"
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
                  hint={
                    discountType === 'PERCENT'
                      ? 'Ingresa el porcentaje a descontar sobre el subtotal.'
                      : 'Ingresa el monto del descuento si aplica.'
                  }
                  value={discountInput}
                  onChange={(event) => onDiscountInputChange(event.target.value)}
                />
              </div>

              <div className="surface-subtle-strong rounded-[1.6rem] p-4">
                <div className="flex items-center justify-between text-sm text-[color:var(--text-secondary)]">
                  <span>Subtotal</span>
                  <span className="metric-accent">{formatCurrency(totals.subtotal)}</span>
                </div>
                <div className="mt-2 flex items-center justify-between text-sm text-[color:var(--text-secondary)]">
                  <span>Descuento</span>
                  <span className="metric-accent">{formatCurrency(totals.discountAmount)}</span>
                </div>
                <div className="mt-2 flex items-center justify-between text-sm text-[color:var(--text-secondary)]">
                  <span>Items</span>
                  <span className="metric-accent">{formatItemCount(totalUnits)}</span>
                </div>
                <div className="mt-4 flex items-center justify-between border-t border-[color:var(--line)] pt-4">
                  <span className="font-display text-xl font-bold theme-text-strong">Total</span>
                  <span className="metric-accent-strong font-display text-3xl font-bold">
                    {formatCurrency(totals.total)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-3 border-t border-[color:var(--line)] pt-4">
          <p className="text-xs leading-5 theme-text-muted">
            {checkoutDisabledReason ?? 'Listo para cobrar con el flujo actual del POS.'}
          </p>

          <Button
            disabled={Boolean(checkoutDisabledReason)}
            aria-haspopup="dialog"
            aria-controls="payment-dialog"
            onClick={onCheckout}
            className="w-full"
          >
            Cobrar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={clsx('flex min-h-0 flex-col overflow-hidden', className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="section-kicker">Venta en curso</p>
          <h2 className="font-display mt-2 text-2xl font-bold theme-text-strong">Carrito</h2>
          <p className="mt-2 text-sm leading-6 theme-text-secondary">
            {locationName
              ? `Venta activa en ${locationName}. Ajusta cantidades, descuentos y cobro sin salir del POS.`
              : 'Ajusta cantidades, descuentos y cobro sin salir de la operacion.'}
          </p>
        </div>
        <Button
          variant="ghost"
          onClick={onClearCart}
          disabled={items.length === 0}
          className="shrink-0"
        >
          Limpiar
        </Button>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="surface-subtle rounded-[1.35rem] p-4">
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.22em] theme-text-faint">
            Items cargados
          </p>
          <p className="mt-2 font-display text-2xl font-bold theme-text-strong">
            {formatItemCount(totalUnits)}
          </p>
          <p className="mt-1 text-xs theme-text-secondary">
            {items.length === 1 ? '1 linea en la venta' : `${items.length} lineas en la venta`}
          </p>
        </div>

        <div className="surface-subtle rounded-[1.35rem] p-4">
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.22em] theme-text-faint">
            Total actual
          </p>
          <p className="mt-2 font-display text-2xl font-bold metric-accent-strong">
            {formatCurrency(totals.total)}
          </p>
          <p className="mt-1 text-xs theme-text-secondary">{activeDiscountLabel}</p>
        </div>
      </div>

      <div className="mt-5 min-h-0 flex-1 overflow-hidden pr-1">
        <div className="pos-cart-panel__scroll max-h-[min(24rem,38vh)] overflow-y-auto xl:max-h-[calc(100vh-29rem)]">
          {renderCartItemsList(items, onChangeQty, onRemove)}
        </div>
      </div>

      <div className="mt-5 grid gap-4 border-t border-[color:var(--line)] pt-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            label="Descuento"
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
            hint={
              discountType === 'PERCENT'
                ? 'Ingresa el porcentaje a descontar sobre el subtotal.'
                : 'Ingresa el monto del descuento si aplica.'
            }
            value={discountInput}
            onChange={(event) => onDiscountInputChange(event.target.value)}
          />
        </div>

        <div className="surface-subtle-strong rounded-[1.6rem] p-4 sm:p-5">
          <div className="flex items-center justify-between text-sm text-[color:var(--text-secondary)]">
            <span>Subtotal</span>
            <span className="metric-accent">{formatCurrency(totals.subtotal)}</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-sm text-[color:var(--text-secondary)]">
            <span>Descuento</span>
            <span className="metric-accent">{formatCurrency(totals.discountAmount)}</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-sm text-[color:var(--text-secondary)]">
            <span>Items</span>
            <span className="metric-accent">{formatItemCount(totalUnits)}</span>
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-[color:var(--line)] pt-4">
            <span className="font-display text-xl font-bold theme-text-strong">Total</span>
            <span className="metric-accent-strong font-display text-3xl font-bold">
              {formatCurrency(totals.total)}
            </span>
          </div>
        </div>

        <p className="text-xs leading-5 theme-text-muted">
          {checkoutDisabledReason ?? 'Listo para cobrar con el flujo actual del POS.'}
        </p>

        <Button
          disabled={Boolean(checkoutDisabledReason)}
          aria-haspopup="dialog"
          aria-controls="payment-dialog"
          onClick={onCheckout}
          className="w-full"
        >
          Cobrar
        </Button>
      </div>
    </div>
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
        title="Sin items cargados"
        description="Agrega productos, variantes o combos desde el catalogo para preparar la venta."
      />
    );
  }

  return (
    <div className="grid content-start gap-3">
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
      ? 'Descuento porcentual listo para configurar'
      : 'Descuento fijo listo para configurar';
  }

  return discountType === 'PERCENT'
    ? `${discountInput}% sobre subtotal`
    : `${formatCurrency(Number(discountInput))} de descuento`;
}

function formatItemCount(value: number) {
  return value === 1 ? '1 item' : `${value} items`;
}
