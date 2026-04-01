import { useEffect, useMemo, useState } from 'react';
import { CircleDot, MapPin, Receipt, User } from 'lucide-react';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { CartItem } from '@/components/CartItem';
import { EmptyState } from '@/components/EmptyState';
import { FeedbackMessage } from '@/components/FeedbackMessage';
import { Input } from '@/components/Input';
import { LoadingState } from '@/components/LoadingState';
import { PaymentModal } from '@/components/PaymentModal';
import { ModuleStatusCard, ModuleStatusHeader } from '@/components/ModuleStatusHeader';
import { SectionHeader } from '@/components/SectionHeader';
import { Select } from '@/components/Select';
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
  UserRole,
} from '@/types/api';
import { computeCartTotals } from '@/utils/cart';
import {
  formatVariantDisplayName,
  formatVariantSubtitle,
  isSimpleOperationalVariant,
} from '@/utils/catalog';
import { formatCurrency } from '@/utils/format';
import { normalizeNumberInput } from '@/utils/numberInput';

const missingRecipePattern = /^Variant (\d+) has no recipe configured$/i;

export function PosPage() {
  const currentUser = useSessionStore((state) => state.currentUser);
  const currentLocation = useAppStore((state) => state.currentLocation);
  const currentCashSession = useAppStore((state) => state.currentCashSession);
  const setCurrentCashSession = useAppStore((state) => state.setCurrentCashSession);
  const addRecentReceipt = useAppStore((state) => state.addRecentReceipt);
  const recentReceipts = useAppStore((state) => state.recentReceipts);
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
          error instanceof Error ? error.message : 'No se pudo cargar el catalogo',
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
      name: formatVariantDisplayName(variant),
      subtitle: formatVariantSubtitle(variant, { includeSkuPrefix: true }) || undefined,
      unit_price: Number(variant.sale_price),
      qty: 1,
      product_type: variant.product_type,
      is_operational: variant.is_operational,
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
      map.set(variant.id, formatVariantDisplayName(variant));
    }

    for (const item of items) {
      if (item.item_type === 'VARIANT' && !map.has(item.ref_id)) {
        const label = [item.name, item.subtitle || null].filter(Boolean).join(' - ');
        map.set(item.ref_id, label || `Producto ${item.ref_id}`);
      }
    }

    return map;
  }, [catalog.variants, items]);

  const latestReceiptId = lastReceiptId ?? recentReceipts[0]?.sale_id ?? null;
  const currentUserName = currentUser?.name || currentUser?.username || 'Sin usuario';
  const currentUserHandle = currentUser?.username ? `@${currentUser.username}` : 'Sin sesion';
  const currentUserRole = formatUserRole(currentUser?.role);
  const cashStatusTone = currentCashSession
    ? 'success'
    : currentLocation
      ? 'warning'
      : 'default';
  const cashStatusLabel = currentCashSession
    ? 'Abierta'
    : currentLocation
      ? 'Pendiente'
      : 'Sin POS';
  const operationStatusLabel = currentCashSession
    ? 'Caja lista para cobrar'
    : currentLocation
      ? 'Caja pendiente'
      : 'Selecciona un POS';

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
    <div className="grid min-w-0 gap-4 sm:gap-5">
      <ModuleStatusHeader
        ariaLabel="Estado operativo del POS"
        eyebrow="Operacion en curso"
        title="POS"
        statusLabel={operationStatusLabel}
        statusTone={cashStatusTone}
        description="Caja, POS activo, operador y ultimo ticket."
        helpText="Supervisa si el POS esta listo para cobrar, quien opera la sesion y cual fue el ultimo ticket emitido."
        icon={<CircleDot size={18} />}
      >
        <ModuleStatusCard
          label="Caja actual"
          value={currentCashSession ? `Caja #${currentCashSession.id}` : 'Caja sin abrir'}
          icon={<CircleDot size={16} />}
          iconTone={cashStatusTone}
          badgeLabel={cashStatusLabel}
          badgeTone={cashStatusTone}
          meta={
            currentCashSession
              ? 'Lista para cobrar'
              : currentLocation
                ? 'Abre caja para cobrar'
                : 'Selecciona un POS'
          }
        />
        <ModuleStatusCard
          label="POS actual"
          value={currentLocation ? currentLocation.name : 'Sin ubicacion'}
          icon={<MapPin size={16} />}
          iconTone={currentLocation ? 'info' : 'default'}
          badgeLabel={currentLocation ? `POS #${currentLocation.id}` : 'No definido'}
          badgeTone={currentLocation ? 'info' : 'default'}
          meta={currentLocation ? 'Activo en la sesion' : 'Se define en el encabezado'}
        />
        <ModuleStatusCard
          label="Cajero"
          value={currentUserName}
          icon={<User size={16} />}
          iconTone={currentUser ? 'violet' : 'default'}
          badgeLabel={currentUserRole}
          badgeTone={currentUser ? 'info' : 'default'}
          meta={currentUserHandle}
        />
        <ModuleStatusCard
          label="Ultimo ticket"
          value={latestReceiptId ? `#${latestReceiptId}` : 'Pendiente'}
          icon={<Receipt size={16} />}
          iconTone={latestReceiptId ? 'info' : 'default'}
          badgeLabel={latestReceiptId ? 'Emitido' : 'Sin venta'}
          badgeTone={latestReceiptId ? 'info' : 'default'}
          meta={latestReceiptId ? 'Tambien visible en Ventas' : 'Aparece tras el primer cobro'}
        />
      </ModuleStatusHeader>

      <div className="grid min-w-0 items-start gap-4 sm:gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <Card className="self-start">
          <SectionHeader
            eyebrow="Catalogo de venta"
            title="POS principal"
            description="Explora productos simples, variantes y combos activos para la caja seleccionada."
            actions={
              <div className="w-full md:max-w-md">
                <Input
                  label="Buscar en catalogo"
                  labelClassName="sr-only"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Buscar por nombre, presentacion o SKU"
                  hint="Filtra por nombre, SKU o presentacion sin salir del teclado."
                />
              </div>
            }
          />

          {!currentLocation ? (
            <FeedbackMessage tone="warning" className="mt-5">
              Crea o selecciona un POS valido en el encabezado para cargar la operacion.
            </FeedbackMessage>
          ) : !currentCashSession ? (
            <FeedbackMessage tone="warning" className="mt-5">
              Abre la caja en la pestana Caja antes de cobrar.
            </FeedbackMessage>
          ) : null}

          {catalogLoading ? (
            <div className="mt-6">
              <LoadingState
                title="Cargando catalogo"
                description="Estamos trayendo productos operativos y combos activos para esta caja."
                rows={4}
              />
            </div>
          ) : catalogError ? (
            <div className="mt-6">
              <EmptyState
                title="No fue posible cargar el catalogo"
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
                title="Catalogo vacio"
                description="No hay productos operativos ni combos activos disponibles para esta caja."
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
                  aria-label={`Agregar ${resolveCatalogItemLabel(item)} ${item.name}${item.subtitle ? ', ' + item.subtitle : ''}, precio ${formatCurrency(item.unit_price)}`}
                  className="surface-interactive data-list-card group rounded-[1.65rem] p-5 text-left focus-visible:outline-none"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-display text-xl font-bold theme-text-strong">{item.name}</p>
                      <p className="mt-1 text-sm theme-text-muted">{item.subtitle}</p>
                    </div>
                    <span className="soft-pill rounded-full px-3 py-1 text-xs">
                      {resolveCatalogItemBadge(item)}
                    </span>
                  </div>
                  <div className="mt-8 flex items-center justify-between">
                    <span className="metric-accent font-display text-2xl font-bold">
                      {formatCurrency(item.unit_price)}
                    </span>
                    <span className="text-sm theme-text-secondary">Agregar</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </Card>

        <Card className="h-fit self-start xl:sticky xl:top-4">
          <SectionHeader
            eyebrow="Venta en curso"
            title="Carrito"
            description="Ajusta cantidades, aplica descuentos y confirma el cobro sin salir de la operacion."
            actions={
              <Button variant="ghost" onClick={clearCart}>
                Limpiar
              </Button>
            }
          />

          <div className="mt-5 grid gap-3">
            {items.length === 0 ? (
              <EmptyState
                title="Sin items cargados"
                description="Agrega productos, variantes o combos desde el catalogo para preparar la venta."
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

            <div className="surface-subtle-strong rounded-[1.65rem] p-4">
              <div className="flex items-center justify-between text-sm text-[color:var(--text-secondary)]">
                <span>Subtotal</span>
                <span className="metric-accent">{formatCurrency(totals.subtotal)}</span>
              </div>
              <div className="mt-2 flex items-center justify-between text-sm text-[color:var(--text-secondary)]">
                <span>Descuento</span>
                <span className="metric-accent">{formatCurrency(totals.discountAmount)}</span>
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-[color:var(--line)] pt-4">
                <span className="font-display text-xl font-bold theme-text-strong">Total</span>
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
      </div>

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

function formatUserRole(role: UserRole | undefined) {
  switch (role) {
    case 'ADMIN':
      return 'Administrador';
    case 'CASHIER':
      return 'Cajero';
    case 'AUDITOR':
      return 'Auditoria';
    default:
      return 'Sin rol';
  }
}

function resolveCatalogItemBadge(item: CartItemType) {
  if (item.item_type === 'COMBO') {
    return 'Combo';
  }

  return item.is_operational && item.product_type === 'SIMPLE'
    ? 'Producto simple'
    : 'Variante';
}

function resolveCatalogItemLabel(item: CartItemType) {
  if (item.item_type === 'COMBO') {
    return 'combo';
  }

  return item.is_operational && item.product_type === 'SIMPLE'
    ? 'producto'
    : 'variante';
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
    return `El producto "${variantName}" no tiene receta configurada. Revisalo en administracion antes de cobrar esta venta.`;
  }

  return 'El item seleccionado no tiene receta configurada. Revisalo en administracion antes de cobrar esta venta.';
}

