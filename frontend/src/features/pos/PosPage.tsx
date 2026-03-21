import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, PackageSearch, Receipt } from 'lucide-react';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { CartItem } from '@/components/CartItem';
import { EmptyState } from '@/components/EmptyState';
import { Input } from '@/components/Input';
import { LoadingState } from '@/components/LoadingState';
import { Select } from '@/components/Select';
import { PaymentModal } from '@/components/PaymentModal';
import { SummaryCard } from '@/components/SummaryCard';
import { posApi } from '@/services/api/posApi';
import { useAppStore } from '@/store/appStore';
import { useCartStore } from '@/store/cartStore';
import { useSessionStore } from '@/store/sessionStore';
import type {
  CartItem as CartItemType,
  CatalogCombo,
  CatalogResponse,
  CatalogVariant,
  DiscountType,
  PaymentMethod,
} from '@/types/api';
import { computeCartTotals } from '@/utils/cart';
import { formatCurrency } from '@/utils/format';
import { normalizeNumberInput } from '@/utils/numberInput';

const missingRecipePattern = /^Variant (\d+) has no recipe configured$/i;

export function PosPage() {
  const currentUser = useSessionStore((state) => state.currentUser);
  const currentLocation = useAppStore((state) => state.currentLocation);
  const currentCashSession = useAppStore((state) => state.currentCashSession);
  const setCurrentCashSession = useAppStore((state) => state.setCurrentCashSession);
  const addRecentReceipt = useAppStore((state) => state.addRecentReceipt);
  const items = useCartStore((state) => state.items);
  const discountType = useCartStore((state) => state.discountType);
  const discountValue = useCartStore((state) => state.discountValue);
  const addItem = useCartStore((state) => state.addItem);
  const updateQty = useCartStore((state) => state.updateQty);
  const removeItem = useCartStore((state) => state.removeItem);
  const clearCart = useCartStore((state) => state.clearCart);
  const setDiscount = useCartStore((state) => state.setDiscount);

  const [catalog, setCatalog] = useState<CatalogResponse>({
    products: [],
    variants: [],
    combos: [],
  });
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [discountInput, setDiscountInput] = useState('');
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [lastReceiptId, setLastReceiptId] = useState<number | null>(null);

  useEffect(() => {
    async function loadCurrentCash() {
      if (!currentLocation) {
        setCurrentCashSession(null);
        return;
      }

      try {
        const response = await posApi.getCurrentCash(currentLocation.id);
        setCurrentCashSession(response.current_session);
      } catch {
        setCurrentCashSession(null);
      }
    }

    void loadCurrentCash();
  }, [currentLocation, setCurrentCashSession]);

  useEffect(() => {
    async function loadCatalog() {
      try {
        setCatalogLoading(true);
        setCatalogError(null);
        const response = await posApi.getCatalog();
        setCatalog(response);
      } catch (error) {
        setCatalogError(
          error instanceof Error ? error.message : 'No se pudo cargar el catálogo',
        );
      } finally {
        setCatalogLoading(false);
      }
    }

    void loadCatalog();
  }, []);

  useEffect(() => {
    setDiscountInput(discountValue > 0 ? String(discountValue) : '');
  }, [discountValue]);

  const catalogItems = useMemo(() => {
    const variantCards: CartItemType[] = catalog.variants.map((variant: CatalogVariant) => ({
      key: `catalog-variant-${variant.id}`,
      item_type: 'VARIANT',
      ref_id: variant.id,
      name: variant.product_name,
      subtitle: [variant.size, variant.sku ? `SKU ${variant.sku}` : null]
        .filter(Boolean)
        .join(' · '),
      unit_price: Number(variant.sale_price),
      qty: 1,
    }));

    const comboCards: CartItemType[] = catalog.combos.map((combo: CatalogCombo) => ({
      key: `catalog-combo-${combo.id}`,
      item_type: 'COMBO',
      ref_id: combo.id,
      name: combo.name,
      subtitle: combo.items.length
        ? `${combo.items.length} items configurados`
        : 'Combo',
      unit_price: Number(combo.sale_price),
      qty: 1,
    }));

    return [...variantCards, ...comboCards].filter((item) =>
      `${item.name} ${item.subtitle ?? ''}`.toLowerCase().includes(search.toLowerCase()),
    );
  }, [catalog.combos, catalog.variants, search]);

  const totals = useMemo(
    () => computeCartTotals(items, discountType, discountValue),
    [discountType, discountValue, items],
  );

  const variantNameById = useMemo(() => {
    const map = new Map<number, string>();

    for (const variant of catalog.variants) {
      const label = [variant.product_name, variant.size || null]
        .filter(Boolean)
        .join(' · ');
      map.set(variant.id, label || `Variante #${variant.id}`);
    }

    for (const item of items) {
      if (item.item_type === 'VARIANT' && !map.has(item.ref_id)) {
        const label = [item.name, item.subtitle || null].filter(Boolean).join(' · ');
        map.set(item.ref_id, label || `Variante #${item.ref_id}`);
      }
    }

    return map;
  }, [catalog.variants, items]);

  async function handleConfirmPayment(payload: {
    method: PaymentMethod;
    amount_received: number;
  }) {
    if (!currentUser || !currentLocation) return;
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

      const receipt = await posApi.getSaleReceipt(sale.id);
      addRecentReceipt(receipt);
      setLastReceiptId(receipt.sale_id);
      clearCart();
      setPaymentOpen(false);
    } catch (error) {
      setPaymentError(formatPosPaymentError(error, variantNameById));
    } finally {
      setPaymentLoading(false);
    }
  }

  return (
    <div className="grid min-w-0 gap-4 sm:gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
      <div className="grid min-w-0 gap-4 sm:gap-5">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <SummaryCard
            title="Caja actual"
            value={currentCashSession ? `#${currentCashSession.id}` : 'Sin abrir'}
            hint={
              currentLocation
                ? 'Necesaria para confirmar ventas'
                : 'Selecciona primero un punto de venta real'
            }
            icon={<Receipt size={18} />}
          />
          <SummaryCard
            title="Items en carrito"
            value={String(items.length)}
            hint="Se agrupan por tipo de ítem e identificador"
            icon={<PackageSearch size={18} />}
          />
          <SummaryCard
            title="Último comprobante"
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
                label="Buscar en catalogo"
                labelClassName="sr-only"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar por nombre, talla o SKU"
                hint="Filtra por nombre, tamano o SKU sin salir del teclado."
              />
            </div>
          </div>

          {!currentLocation ? (
            <div className="mt-5 rounded-3xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
              Crea o selecciona un POS válido en el encabezado para cargar la operación.
            </div>
          ) : !currentCashSession ? (
            <div className="mt-5 rounded-3xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
              Abre la caja en la pestaña Caja antes de cobrar.
            </div>
          ) : null}

          {catalogLoading ? (
            <div className="mt-6">
              <LoadingState
                title="Cargando catálogo"
                description="Estamos trayendo variantes y combos activos para esta caja."
                rows={4}
              />
            </div>
          ) : catalogError ? (
            <div className="mt-6">
              <EmptyState
                title="No fue posible cargar el catálogo"
                description={catalogError}
                action={
                  <Button variant="secondary" onClick={() => window.location.reload()}>
                    Reintentar
                  </Button>
                }
              />
            </div>
          ) : catalogItems.length === 0 ? (
            <div className="mt-6">
              <EmptyState
                title="Catálogo vacío"
                description="No hay variantes ni combos activos disponibles para esta caja."
              />
            </div>
          ) : (
            <div className="mt-6 grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
              {catalogItems.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => addItem(item)}
                  disabled={!currentLocation}
                  aria-label={`Agregar ${item.item_type === 'VARIANT' ? 'variante' : 'combo'} ${item.name}${item.subtitle ? ', ' + item.subtitle : ''}, precio ${formatCurrency(item.unit_price)}`}
                  className="glass-panel rounded-3xl p-5 text-left transition hover:-translate-y-0.5 hover:border-violet-300/28 hover:bg-white/[0.05] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[#090b16] disabled:cursor-not-allowed disabled:border-[color:var(--disabled-border)] disabled:bg-[linear-gradient(180deg,rgba(33,37,58,0.96),rgba(20,23,38,0.98))] disabled:shadow-none"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-display text-xl font-bold text-white">{item.name}</p>
                      <p className="mt-1 text-sm text-slate-400">{item.subtitle}</p>
                    </div>
                    <span className="soft-pill rounded-full px-3 py-1 text-xs">
                      {item.item_type === 'VARIANT' ? 'Variante' : 'Combo'}
                    </span>
                  </div>
                  <div className="mt-8 flex items-center justify-between">
                    <span className="metric-accent font-display text-2xl font-bold">
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

        <div className="mt-6 grid gap-4 border-t border-[color:var(--line)] pt-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label="Descuento"
              value={discountType}
              onChange={(event) =>
                setDiscount(event.target.value as DiscountType, discountValue)
              }
            >
              <option value="NONE">Sin descuento</option>
              <option value="PERCENT">Porcentaje</option>
              <option value="FIXED">Valor fijo</option>
            </Select>
            <Input
              type="number"
              min={0}
              label="Valor"
              placeholder="Ej: 10"
              value={discountInput}
              onChange={(event) => {
                const nextValue = normalizeNumberInput(event.target.value, {
                  allowDecimal: true,
                });
                if (nextValue !== null) {
                  setDiscountInput(nextValue);
                  setDiscount(discountType, nextValue === '' ? 0 : Number(nextValue));
                }
              }}
            />
          </div>

          <div className="surface-subtle rounded-3xl p-4">
            <div className="flex items-center justify-between text-sm text-[color:var(--text-secondary)]">
              <span>Subtotal</span>
              <span className="metric-accent">{formatCurrency(totals.subtotal)}</span>
            </div>
            <div className="mt-2 flex items-center justify-between text-sm text-[color:var(--text-secondary)]">
              <span>Descuento</span>
              <span className="metric-accent">{formatCurrency(totals.discountAmount)}</span>
            </div>
            <div className="mt-4 flex items-center justify-between border-t border-[color:var(--line)] pt-4">
              <span className="font-display text-xl font-bold text-white">Total</span>
              <span className="metric-accent-strong font-display text-3xl font-bold">
                {formatCurrency(totals.total)}
              </span>
            </div>
          </div>

          <Button
            disabled={items.length === 0 || !currentLocation || !currentCashSession}
            aria-haspopup="dialog"
            aria-controls="payment-dialog"
            onClick={() => setPaymentOpen(true)}
          >
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

function formatPosPaymentError(error: unknown, variantNameById: Map<number, string>) {
  const fallbackMessage = error instanceof Error ? error.message : 'No fue posible procesar el pago.';
  const missingRecipeMatch = fallbackMessage.match(missingRecipePattern);

  if (!missingRecipeMatch) {
    return fallbackMessage;
  }

  const variantId = Number(missingRecipeMatch[1]);
  const variantName = variantNameById.get(variantId);

  if (variantName) {
    return `La variante "${variantName}" no tiene receta configurada. Revísala en administración antes de cobrar esta venta.`;
  }

  return 'La variante seleccionada no tiene receta configurada. Revísala en administración antes de cobrar esta venta.';
}




