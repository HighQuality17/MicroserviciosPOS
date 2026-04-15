import { useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import { ChevronUp, CircleDot, MapPin, Receipt, Search, ShoppingCart, User } from 'lucide-react';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { FeedbackMessage } from '@/components/FeedbackMessage';
import { FilterChip } from '@/components/FilterChip';
import { LoadingState } from '@/components/LoadingState';
import { ModuleStatusCard, ModuleStatusHeader } from '@/components/ModuleStatusHeader';
import { PaymentModal } from '@/components/PaymentModal';
import { SearchField } from '@/components/SearchField';
import { SectionHeader } from '@/components/SectionHeader';
import {
  PosCartPanel,
} from '@/features/pos/components/PosCartPanel';
import { PosCartSheet } from '@/features/pos/components/PosCartSheet';
import {
  PosCatalogCard,
  type PosCatalogCardKind,
  type PosCatalogCardMetaRow,
} from '@/features/pos/components/PosCatalogCard';
import {
  PosMobileCartToast,
  type PosMobileCartToastData,
} from '@/features/pos/components/PosMobileCartToast';
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
const cartSheetId = 'mobile-cart-sheet';

type CatalogFilter = 'ALL' | PosCatalogCardKind;

interface PosCatalogEntry extends CartItemType {
  kind: PosCatalogCardKind;
  badge: string;
  eyebrow: string;
  description: string;
  metaRows: PosCatalogCardMetaRow[];
  searchText: string;
}

export function PosPage() {
  const currentUser = useSessionStore((state) => state.currentUser);
  const currentLocation = useAppStore((state) => state.currentLocation);
  const currentCashSession = useAppStore((state) => state.currentCashSession);
  const setCurrentCashSession = useAppStore((state) => state.setCurrentCashSession);
  const setPosMobileOverlayOpen = useAppStore((state) => state.setPosMobileOverlayOpen);
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
  const [catalogFilter, setCatalogFilter] = useState<CatalogFilter>('ALL');
  const [discountInput, setDiscountInput] = useState('');
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [lastReceiptId, setLastReceiptId] = useState<number | null>(null);
  const [mobileCartOpen, setMobileCartOpen] = useState(false);
  const [mobileCartToast, setMobileCartToast] = useState<PosMobileCartToastData | null>(null);

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

  useEffect(() => {
    if (!mobileCartToast) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setMobileCartToast(null);
    }, 3200);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [mobileCartToast]);

  useEffect(() => {
    setPosMobileOverlayOpen(mobileCartOpen);

    return () => {
      setPosMobileOverlayOpen(false);
    };
  }, [mobileCartOpen, setPosMobileOverlayOpen]);

  const catalogEntries = useMemo(() => {
    const variantCards: PosCatalogEntry[] = catalog.variants.map((variant: CatalogVariant) => {
      const isSimple = isSimpleOperationalVariant(variant);
      const subtitle = formatVariantSubtitle(variant, { includeSkuPrefix: true }) || undefined;

      return {
        key: `catalog-variant-${variant.id}`,
        item_type: 'VARIANT',
        ref_id: variant.id,
        name: formatVariantDisplayName(variant),
        subtitle,
        unit_price: Number(variant.sale_price),
        qty: 1,
        product_type: variant.product_type,
        is_operational: variant.is_operational,
        kind: isSimple ? 'SIMPLE' : 'VARIANT',
        badge: isSimple ? 'Producto simple' : 'Variante',
        eyebrow: isSimple ? 'Venta directa' : 'Presentacion operativa',
        description: subtitle || (isSimple ? 'Producto simple listo para venta inmediata.' : 'Variante activa lista para vender.'),
        metaRows: buildVariantMetaRows(variant),
        searchText: [
          formatVariantDisplayName(variant),
          subtitle ?? '',
          variant.product_name,
          variant.size,
          variant.sku,
        ]
          .join(' ')
          .toLowerCase(),
      };
    });

    const comboCards: PosCatalogEntry[] = catalog.combos.map((combo: CatalogCombo) => ({
      key: `catalog-combo-${combo.id}`,
      item_type: 'COMBO',
      ref_id: combo.id,
      name: combo.name,
      subtitle: combo.items.length ? `${combo.items.length} items configurados` : 'Combo',
      unit_price: Number(combo.sale_price),
      qty: 1,
      kind: 'COMBO',
      badge: 'Combo',
      eyebrow: 'Combo listo',
      description: combo.items.length
        ? `${combo.items.length} items configurados para venta conjunta.`
        : 'Combo operativo listo para vender en una sola accion.',
      metaRows: [
        {
          label: 'Items',
          value: combo.items.length ? `${combo.items.length} configurados` : 'Sin detalle',
        },
        {
          label: 'Tipo',
          value: 'Venta agrupada',
        },
      ],
      searchText: `${combo.name} ${combo.items.length} combo`.toLowerCase(),
    }));

    return [...variantCards, ...comboCards];
  }, [catalog.combos, catalog.variants]);

  const visibleCatalogItems = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return catalogEntries.filter((item) => {
      const matchesFilter = catalogFilter === 'ALL' || item.kind === catalogFilter;
      const matchesSearch =
        normalizedSearch.length === 0 || item.searchText.includes(normalizedSearch);

      return matchesFilter && matchesSearch;
    });
  }, [catalogEntries, catalogFilter, search]);

  const filterOptions = useMemo(
    () => [
      { value: 'ALL' as const, label: 'Todos', count: catalogEntries.length },
      {
        value: 'SIMPLE' as const,
        label: 'Productos simples',
        count: catalogEntries.filter((item) => item.kind === 'SIMPLE').length,
      },
      {
        value: 'VARIANT' as const,
        label: 'Variantes',
        count: catalogEntries.filter((item) => item.kind === 'VARIANT').length,
      },
      {
        value: 'COMBO' as const,
        label: 'Combos',
        count: catalogEntries.filter((item) => item.kind === 'COMBO').length,
      },
    ],
    [catalogEntries],
  );

  const totals = useMemo(
    () => computeCartTotals(items, discountType, discountValue),
    [discountType, discountValue, items],
  );

  const totalUnits = useMemo(
    () => items.reduce((sum, item) => sum + item.qty, 0),
    [items],
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
  const checkoutDisabledReason = !currentLocation
    ? 'Selecciona un POS valido para cobrar.'
    : !currentCashSession
      ? 'Abre la caja en el modulo Caja antes de cobrar.'
      : items.length === 0
        ? 'Agrega al menos un item para habilitar el cobro.'
        : null;
  const catalogSummaryCopy =
    visibleCatalogItems.length === catalogEntries.length && catalogFilter === 'ALL' && !search.trim()
      ? 'Catalogo completo activo'
      : `de ${catalogEntries.length} disponibles`;

  function handleDiscountInputChange(rawValue: string) {
    const nextValue = normalizeNumberInput(rawValue, {
      allowDecimal: true,
    });

    if (nextValue === null) {
      return;
    }

    setDiscountInput(nextValue);
    setDiscount(discountType, nextValue === '' ? 0 : Number(nextValue));
  }

  function handleDiscountTypeChange(nextType: DiscountType) {
    setDiscount(nextType, discountValue);
  }

  function handleAddCatalogItem(item: PosCatalogEntry) {
    addItem(item);

    const nextState = useCartStore.getState();
    const nextTotals = computeCartTotals(
      nextState.items,
      nextState.discountType,
      nextState.discountValue,
    );
    const nextItemCount = nextState.items.reduce(
      (sum, cartItem) => sum + cartItem.qty,
      0,
    );

    setMobileCartToast({
      itemName: item.name,
      itemCount: nextItemCount,
      subtotal: nextTotals.subtotal,
    });
  }

  function handleOpenMobileCart() {
    setMobileCartToast(null);
    setMobileCartOpen(true);
  }

  function handleOpenPayment() {
    setPaymentError(null);
    setMobileCartOpen(false);
    setPaymentOpen(true);
  }

  async function handleConfirmPayment(payload: {
    method: PaymentMethod;
    amount_received: number;
  }) {
    if (!currentUser || !currentLocation) {
      return;
    }

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
      setMobileCartToast(null);
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

      <div className="grid min-w-0 items-start gap-4 sm:gap-5 lg:grid-cols-[minmax(0,1.16fr)_minmax(24rem,28rem)]">
        <Card className="self-start">
          <SectionHeader
            eyebrow="Catalogo de venta"
            title="POS principal"
            description="Explora productos simples, variantes y combos activos sin perder de vista el flujo de venta."
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

          <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1fr)_15rem]">
            <SearchField
              label="Buscar en catalogo"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              onClear={() => setSearch('')}
              placeholder="Buscar por nombre, presentacion o SKU"
              hint="Filtra por nombre, SKU o presentacion sin salir del teclado."
            />

            <div className="surface-subtle rounded-[1.5rem] p-4">
              <div className="flex items-center gap-2 theme-text-secondary">
                <Search size={16} />
                <span className="text-[0.7rem] font-semibold uppercase tracking-[0.22em] theme-text-faint">
                  Mostrando
                </span>
              </div>
              <p className="mt-3 font-display text-3xl font-bold theme-text-strong">
                {visibleCatalogItems.length}
              </p>
              <p className="mt-1 text-sm theme-text-secondary">{catalogSummaryCopy}</p>
            </div>
          </div>

          <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
            {filterOptions.map((option) => (
              <FilterChip
                key={option.value}
                onClick={() => setCatalogFilter(option.value)}
                active={catalogFilter === option.value}
                label={option.label}
                count={option.count}
                className={clsx(
                  'shrink-0',
                  catalogFilter === option.value ? '' : 'theme-text-secondary',
                )}
              />
            ))}
          </div>

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
          ) : visibleCatalogItems.length === 0 ? (
            <div className="mt-6">
              <EmptyState
                title={search.trim() || catalogFilter !== 'ALL' ? 'Sin coincidencias' : 'Catalogo vacio'}
                description={
                  search.trim() || catalogFilter !== 'ALL'
                    ? `No encontramos items para ${resolveCatalogFilterLabel(catalogFilter).toLowerCase()} con el filtro actual. Ajusta la busqueda o vuelve a mostrar todo el catalogo.`
                    : 'No hay productos operativos ni combos activos disponibles para esta caja.'
                }
                action={
                  search.trim() || catalogFilter !== 'ALL' ? (
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setSearch('');
                        setCatalogFilter('ALL');
                      }}
                    >
                      Limpiar filtros
                    </Button>
                  ) : undefined
                }
              />
            </div>
          ) : (
            <div className="mt-6 grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
              {visibleCatalogItems.map((item) => (
                <PosCatalogCard
                  key={item.key}
                  item={item}
                  kind={item.kind}
                  badge={item.badge}
                  eyebrow={item.eyebrow}
                  description={item.description}
                  metaRows={item.metaRows}
                  disabled={!currentLocation}
                  onAdd={() => handleAddCatalogItem(item)}
                />
              ))}
            </div>
          )}
        </Card>

        <Card className="hidden h-fit self-start lg:sticky lg:top-4 lg:block">
          <PosCartPanel
            mode="desktop"
            items={items}
            discountType={discountType}
            discountInput={discountInput}
            totals={totals}
            locationName={currentLocation?.name}
            checkoutDisabledReason={checkoutDisabledReason}
            onClearCart={() => {
              clearCart();
              setMobileCartToast(null);
            }}
            onDiscountTypeChange={handleDiscountTypeChange}
            onDiscountInputChange={handleDiscountInputChange}
            onChangeQty={(key, qty) => updateQty(key, qty)}
            onRemove={(key) => removeItem(key)}
            onCheckout={handleOpenPayment}
          />
        </Card>
      </div>

      <PosMobileCartToast
        toast={mobileCartToast}
        cartSheetId={cartSheetId}
        onOpenCart={handleOpenMobileCart}
      />

      {items.length > 0 ? (
        <div className="pointer-events-none fixed inset-x-0 bottom-4 z-30 px-4 lg:hidden">
          <button
            type="button"
            onClick={handleOpenMobileCart}
            aria-haspopup="dialog"
            aria-controls={cartSheetId}
            className="pos-mobile-cart-button pointer-events-auto mx-auto flex w-full max-w-lg items-center justify-between gap-3 rounded-[1.6rem] px-4 py-3 text-left"
          >
            <div className="flex min-w-0 items-center gap-3">
              <div className="pos-mobile-cart-button__icon" aria-hidden="true">
                <ShoppingCart size={18} strokeWidth={2} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold theme-text-strong">Carrito</p>
                <p className="truncate text-xs theme-text-secondary">
                  {totalUnits === 1 ? '1 item' : `${totalUnits} items`} - {formatCurrency(totals.total)}
                </p>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <span className="rounded-full border border-[color:var(--line)] bg-[color:rgb(255_255_255_/_0.04)] px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.14em] theme-text-secondary">
                {items.length === 1 ? '1 linea' : `${items.length} lineas`}
              </span>
              <ChevronUp size={18} className="theme-text-secondary" aria-hidden="true" />
            </div>
          </button>
        </div>
      ) : null}

      <PosCartSheet
        id={cartSheetId}
        open={mobileCartOpen}
        onClose={() => setMobileCartOpen(false)}
        title="Carrito"
        subtitle="El catalogo sigue al frente. Abre, revisa y cierra el carrito sin salir de la venta."
      >
        <PosCartPanel
          mode="mobile"
          className="min-h-0"
          items={items}
          discountType={discountType}
          discountInput={discountInput}
          totals={totals}
          locationName={currentLocation?.name}
          checkoutDisabledReason={checkoutDisabledReason}
          onClearCart={() => {
            clearCart();
            setMobileCartToast(null);
          }}
          onDiscountTypeChange={handleDiscountTypeChange}
          onDiscountInputChange={handleDiscountInputChange}
          onChangeQty={(key, qty) => updateQty(key, qty)}
          onRemove={(key) => removeItem(key)}
          onCheckout={handleOpenPayment}
        />
      </PosCartSheet>

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

function resolveCatalogFilterLabel(filter: CatalogFilter) {
  switch (filter) {
    case 'SIMPLE':
      return 'Productos simples';
    case 'VARIANT':
      return 'Variantes';
    case 'COMBO':
      return 'Combos';
    default:
      return 'Todo el catalogo';
  }
}

function buildVariantMetaRows(variant: CatalogVariant): PosCatalogCardMetaRow[] {
  const isSimple = isSimpleOperationalVariant(variant);

  return [
    {
      label: 'SKU',
      value: variant.sku.trim() || 'Sin SKU',
    },
    {
      label: isSimple ? 'Tipo' : 'Presentacion',
      value: isSimple ? 'Venta directa' : variant.size.trim() || 'Sin tamano',
    },
  ];
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




