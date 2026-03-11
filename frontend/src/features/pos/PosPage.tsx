import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, PackageSearch, Receipt } from 'lucide-react';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { CartItem } from '@/components/CartItem';
import { EmptyState } from '@/components/EmptyState';
import { Input } from '@/components/Input';
import { PaymentModal } from '@/components/PaymentModal';
import { SummaryCard } from '@/components/SummaryCard';
import { posApi } from '@/services/api/posApi';
import { useAppStore } from '@/store/appStore';
import { useCartStore } from '@/store/cartStore';
import { useSessionStore } from '@/store/sessionStore';
import type { CartItem as CartItemType, DiscountType, PaymentMethod } from '@/types/api';
import { computeCartTotals } from '@/utils/cart';
import { formatCurrency } from '@/utils/format';

export function PosPage() {
  const currentUser = useSessionStore((state) => state.currentUser);
  const currentLocation = useAppStore((state) => state.currentLocation);
  const currentCashSession = useAppStore((state) => state.currentCashSession);
  const setCurrentCashSession = useAppStore((state) => state.setCurrentCashSession);
  const sessionVariants = useAppStore((state) => state.sessionVariants);
  const sessionProducts = useAppStore((state) => state.sessionProducts);
  const sessionCombos = useAppStore((state) => state.sessionCombos);
  const addRecentReceipt = useAppStore((state) => state.addRecentReceipt);
  const items = useCartStore((state) => state.items);
  const discountType = useCartStore((state) => state.discountType);
  const discountValue = useCartStore((state) => state.discountValue);
  const addItem = useCartStore((state) => state.addItem);
  const updateQty = useCartStore((state) => state.updateQty);
  const removeItem = useCartStore((state) => state.removeItem);
  const clearCart = useCartStore((state) => state.clearCart);
  const setDiscount = useCartStore((state) => state.setDiscount);

  const [search, setSearch] = useState('');
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [lastReceiptId, setLastReceiptId] = useState<number | null>(null);

  useEffect(() => {
    async function loadCurrentCash() {
      try {
        const response = await posApi.getCurrentCash(currentLocation.id);
        setCurrentCashSession(response.current_session);
      } catch {
        setCurrentCashSession(null);
      }
    }

    void loadCurrentCash();
  }, [currentLocation.id, setCurrentCashSession]);

  const catalog = useMemo(() => {
    const productsById = new Map(sessionProducts.map((product) => [product.id, product]));

    const variantCards: CartItemType[] = sessionVariants.map((variant) => ({
      key: `catalog-variant-${variant.id}`,
      item_type: 'VARIANT',
      ref_id: variant.id,
      name: productsById.get(variant.productId)?.name ?? `Producto ${variant.productId}`,
      subtitle: `${variant.size} · SKU ${variant.sku}`,
      unit_price: Number(variant.salePrice),
      qty: 1,
    }));

    const comboCards: CartItemType[] = sessionCombos.map((combo) => ({
      key: `catalog-combo-${combo.id}`,
      item_type: 'COMBO',
      ref_id: combo.id,
      name: combo.name,
      subtitle: 'Combo',
      unit_price: Number(combo.salePrice),
      qty: 1,
    }));

    return [...variantCards, ...comboCards].filter((item) =>
      `${item.name} ${item.subtitle ?? ''}`.toLowerCase().includes(search.toLowerCase()),
    );
  }, [search, sessionCombos, sessionProducts, sessionVariants]);

  const totals = useMemo(
    () => computeCartTotals(items, discountType, discountValue),
    [discountType, discountValue, items],
  );

  async function handleConfirmPayment(payload: {
    method: PaymentMethod;
    amount_received: number;
  }) {
    if (!currentUser) return;
    if (!currentCashSession) {
      setPaymentError('No hay una caja abierta para registrar la venta.');
      return;
    }

    try {
      setPaymentLoading(true);
      setPaymentError(null);

      const sale = await posApi.createSale({
        location_id: currentLocation.id,
        cashier_id: currentUser.id,
        cash_session_id: currentCashSession.id,
        discount_type: discountType,
        discount_value: discountValue,
        items: items.map((item) => ({
          item_type: item.item_type,
          ref_id: item.ref_id,
          qty: item.qty,
        })),
      });

      await posApi.paySale(sale.id, {
        method: payload.method,
        amount_received: payload.amount_received,
        user_id: currentUser.id,
      });

      const receipt = await posApi.getReceipt(sale.id);
      addRecentReceipt(receipt);
      setLastReceiptId(receipt.sale_id);
      clearCart();
      setPaymentOpen(false);
    } catch (error) {
      setPaymentError(error instanceof Error ? error.message : 'Error de pago');
    } finally {
      setPaymentLoading(false);
    }
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
      <div className="grid gap-4">
        <div className="grid gap-4 md:grid-cols-3">
          <SummaryCard
            title="Caja actual"
            value={currentCashSession ? `#${currentCashSession.id}` : 'Sin abrir'}
            hint="Necesaria para confirmar ventas"
            icon={<Receipt size={18} />}
          />
          <SummaryCard
            title="Items en carrito"
            value={String(items.length)}
            hint="Se agrupan por item_type + ref_id"
            icon={<PackageSearch size={18} />}
          />
          <SummaryCard
            title="Último receipt"
            value={lastReceiptId ? `#${lastReceiptId}` : 'Pendiente'}
            hint="Disponible también en la pantalla de ventas"
            icon={<AlertCircle size={18} />}
          />
        </div>

        <Card>
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm text-slate-400">Catálogo de venta</p>
              <h2 className="font-display text-2xl font-bold text-white">POS principal</h2>
            </div>
            <div className="w-full md:max-w-md">
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar por nombre, talla o SKU"
              />
            </div>
          </div>

          {!currentCashSession ? (
            <div className="mt-5 rounded-3xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
              Abre caja en la pestaña Caja antes de cobrar.
            </div>
          ) : null}

          {catalog.length === 0 ? (
            <div className="mt-6">
              <EmptyState
                title="Catálogo listo, sin endpoint GET aún"
                description="El backend actual no expone listados de productos/variantes/combos. Esta pantalla usa los elementos creados en la sesión desde Productos y Combos."
              />
            </div>
          ) : (
            <div className="mt-6 grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
              {catalog.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => addItem(item)}
                  className="glass-panel rounded-3xl p-5 text-left transition hover:-translate-y-0.5 hover:border-teal-300/30"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-display text-xl font-bold text-white">{item.name}</p>
                      <p className="mt-1 text-sm text-slate-400">{item.subtitle}</p>
                    </div>
                    <span className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-400">
                      {item.item_type}
                    </span>
                  </div>
                  <div className="mt-8 flex items-center justify-between">
                    <span className="font-display text-2xl font-bold text-teal-300">
                      {formatCurrency(item.unit_price)}
                    </span>
                    <span className="text-sm text-slate-300">Agregar</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Card className="h-fit xl:sticky xl:top-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm text-slate-400">Venta en curso</p>
            <h2 className="font-display text-2xl font-bold text-white">Carrito</h2>
          </div>
          <Button variant="ghost" onClick={clearCart}>
            Limpiar
          </Button>
        </div>

        <div className="mt-5 grid gap-3">
          {items.length === 0 ? (
            <EmptyState
              title="Sin items cargados"
              description="Agrega variantes o combos desde el catálogo para preparar la venta."
            />
          ) : (
            items.map((item) => (
              <CartItem
                key={item.key}
                item={item}
                onChangeQty={(qty) => updateQty(item.key, qty)}
                onRemove={() => removeItem(item.key)}
              />
            ))
          )}
        </div>

        <div className="mt-6 grid gap-4 border-t border-slate-800 pt-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block space-y-2">
              <span className="text-sm font-medium text-slate-200">Descuento</span>
              <select
                value={discountType}
                onChange={(event) =>
                  setDiscount(event.target.value as DiscountType, discountValue)
                }
                className="w-full rounded-2xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-sm text-slate-100 outline-none focus:border-teal-400/70"
              >
                <option value="NONE">Sin descuento</option>
                <option value="PERCENT">Porcentaje</option>
                <option value="FIXED">Valor fijo</option>
              </select>
            </label>
            <Input
              type="number"
              min={0}
              value={discountValue}
              onChange={(event) => setDiscount(discountType, Number(event.target.value))}
              label="Valor"
            />
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-950/50 p-4">
            <div className="flex items-center justify-between text-sm text-slate-400">
              <span>Subtotal</span>
              <span>{formatCurrency(totals.subtotal)}</span>
            </div>
            <div className="mt-2 flex items-center justify-between text-sm text-slate-400">
              <span>Descuento</span>
              <span>{formatCurrency(totals.discountAmount)}</span>
            </div>
            <div className="mt-4 flex items-center justify-between border-t border-slate-800 pt-4">
              <span className="font-display text-xl font-bold text-white">Total</span>
              <span className="font-display text-3xl font-bold text-teal-300">
                {formatCurrency(totals.total)}
              </span>
            </div>
          </div>

          <Button disabled={items.length === 0} onClick={() => setPaymentOpen(true)}>
            Cobrar
          </Button>
        </div>
      </Card>

      <PaymentModal
        open={paymentOpen}
        onClose={() => setPaymentOpen(false)}
        total={totals.total}
        loading={paymentLoading}
        error={paymentError}
        onConfirm={handleConfirmPayment}
      />
    </div>
  );
}
