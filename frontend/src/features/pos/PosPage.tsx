import '@/features/pos/pos-d1.css';
import { useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import {
  AlertTriangle,
  ChevronUp,
  CheckCircle2,
  CircleDot,
  MapPin,
  PackageOpen,
  Receipt,
  Search,
  SearchX,
  ShoppingCart,
  User,
} from 'lucide-react';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { FeedbackMessage } from '@/components/FeedbackMessage';
import { FilterChip } from '@/components/FilterChip';
import { LoadingState } from '@/components/LoadingState';
import type {
  ModulePageHeaderBadge,
  ModulePageHeaderCard,
} from '@/components/ModulePageHeader';
import { ModuleInfoTooltip } from '@/components/ModuleStatusHeader';
import { PaymentModal } from '@/components/PaymentModal';
import { SearchField } from '@/components/SearchField';
import { SectionHeader } from '@/components/SectionHeader';
import { StatusBadge } from '@/components/StatusBadge';
import { Toast } from '@/components/Toast';
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
import { resolveApiAssetUrl } from '@/services/api/assets';
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
  imageUrl?: string | null;
  imageAlt?: string;
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
  const [saleSuccessMessage, setSaleSuccessMessage] = useState<string | null>(null);

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
    if (!saleSuccessMessage) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setSaleSuccessMessage(null);
    }, 4200);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [saleSuccessMessage]);

  useEffect(() => {
    setPosMobileOverlayOpen(mobileCartOpen);

    return () => {
      setPosMobileOverlayOpen(false);
    };
  }, [mobileCartOpen, setPosMobileOverlayOpen]);

  const catalogEntries = useMemo(() => {
    const productsById = new Map(catalog.products.map((product) => [product.id, product]));

    const variantCards: PosCatalogEntry[] = catalog.variants.map((variant: CatalogVariant) => {
      const isSimple = isSimpleOperationalVariant(variant);
      const subtitle = formatVariantSubtitle(variant, { includeSkuPrefix: true }) || undefined;
      const name = formatVariantDisplayName(variant);
      const image = resolveCatalogEntryImage(
        name,
        variant,
        productsById.get(variant.product_id),
      );

      return {
        key: `catalog-variant-${variant.id}`,
        item_type: 'VARIANT',
        ref_id: variant.id,
        name,
        subtitle,
        detailLabel: isSimple ? 'Venta directa' : variant.size.trim() || undefined,
        metadataLabel: variant.sku.trim() ? `SKU ${variant.sku.trim()}` : undefined,
        unit_price: Number(variant.sale_price),
        qty: 1,
        product_type: variant.product_type,
        is_operational: variant.is_operational,
        kind: isSimple ? 'SIMPLE' : 'VARIANT',
        badge: isSimple ? 'Producto simple' : 'Variante',
        eyebrow: isSimple ? 'Venta directa' : 'Presentacion operativa',
        description: subtitle || (isSimple ? 'Producto simple listo para venta inmediata.' : 'Variante activa lista para vender.'),
        metaRows: buildVariantMetaRows(variant),
        imageUrl: image.imageUrl,
        imageAlt: image.imageAlt,
        searchText: [
          name,
          subtitle ?? '',
          variant.product_name,
          variant.size,
          variant.sku,
        ]
          .join(' ')
          .toLowerCase(),
      };
    });

    const comboCards: PosCatalogEntry[] = catalog.combos.map((combo: CatalogCombo) => {
      const image = resolveCatalogEntryImage(combo.name, combo);

      return {
        key: `catalog-combo-${combo.id}`,
        item_type: 'COMBO',
        ref_id: combo.id,
        name: combo.name,
        subtitle: combo.items.length ? `${combo.items.length} items configurados` : 'Combo',
        detailLabel: combo.items.length ? `${combo.items.length} items configurados` : 'Combo',
        metadataLabel: 'Venta agrupada',
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
        imageUrl: image.imageUrl,
        imageAlt: image.imageAlt,
        searchText: `${combo.name} ${combo.items.length} combo`.toLowerCase(),
      };
    });

    return [...variantCards, ...comboCards];
  }, [catalog.combos, catalog.products, catalog.variants]);

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
  const catalogScopeLabel =
    catalogFilter === 'ALL' ? 'Todo el catalogo' : resolveCatalogFilterLabel(catalogFilter);
  const catalogSearchSummary = search.trim()
    ? `Buscando "${search.trim()}"`
    : catalogScopeLabel;
  const saleSummaryLabel = items.length > 0 ? 'Venta activa' : 'Venta actual';
  const saleSummaryNote = checkoutDisabledReason
    ? checkoutDisabledReason
    : `${formatItemCount(totalUnits)} en ${items.length === 1 ? '1 linea' : `${items.length} lineas`} listas para cobrar.`;
  const posHeaderBadges: ModulePageHeaderBadge[] = [
    {
      label: operationStatusLabel,
      tone: cashStatusTone,
    },
    {
      label: items.length > 0 ? 'Venta en curso' : 'Sin items',
      tone: items.length > 0 ? ('info' as const) : ('default' as const),
    },
  ];
  const posHeaderCards: ModulePageHeaderCard[] = [
    {
      label: 'Caja actual',
      value: currentCashSession ? `Caja #${currentCashSession.id}` : 'Caja sin abrir',
      accent: cashStatusTone,
      icon: <CircleDot size={16} />,
      iconTone: cashStatusTone,
      badge: {
        label: cashStatusLabel,
        tone: cashStatusTone,
      },
    },
    {
      label: 'POS actual',
      value: currentLocation ? currentLocation.name : 'Sin ubicacion',
      accent: currentLocation ? ('info' as const) : ('default' as const),
      icon: <MapPin size={16} />,
      iconTone: currentLocation ? 'info' : 'default',
      badge: {
        label: currentLocation ? `POS #${currentLocation.id}` : 'No definido',
        tone: currentLocation ? 'info' : 'default',
      },
    },
    {
      label: 'Cajero',
      value: currentUserName,
      accent: currentUser ? ('info' as const) : ('default' as const),
      icon: <User size={16} />,
      iconTone: currentUser ? 'info' : 'default',
      badge: {
        label: currentUserRole,
        tone: currentUser ? 'info' : 'default',
      },
    },
    {
      label: 'Ultima venta',
      value: latestReceiptId ? `#${latestReceiptId}` : 'Pendiente',
      accent: latestReceiptId ? ('info' as const) : ('default' as const),
      icon: <Receipt size={16} />,
      iconTone: latestReceiptId ? 'info' : 'default',
      badge: {
        label: latestReceiptId ? 'Emitido' : 'Sin venta',
        tone: latestReceiptId ? 'info' : 'default',
      },
    },
  ];

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
    setSaleSuccessMessage(null);
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
      setSaleSuccessMessage('Venta registrada correctamente.');
      setPaymentOpen(false);
    } catch (error) {
      setPaymentError(formatPosPaymentError(error, variantNameById));
    } finally {
      setPaymentLoading(false);
    }
  }

  return (
    <div className="pos-page grid min-w-0 gap-4 sm:gap-5">
      <section className="module-page-header" aria-label="Estado operativo del POS">
        <div className="module-page-header__shell">
          <div className="module-page-header__main">
            <div className="module-page-header__copy">
              <p className="module-page-header__eyebrow">Operacion de venta</p>
              <div className="module-page-header__title-row">
                <div className="module-page-header__title-wrap">
                  <span className="module-page-header__title-icon" aria-hidden="true">
                    <ShoppingCart size={18} />
                  </span>
                  <h1 className="module-page-header__title">POS</h1>
                  <ModuleInfoTooltip
                    label="Mas info sobre pos"
                    content="Controla estado de caja, POS activo, cajero y ticket mas reciente sin salir del flujo de venta."
                  />
                  <div className="module-page-header__badges">
                    {posHeaderBadges.map((badge, index) => (
                      <StatusBadge
                        key={`${badge.label}-${badge.tone ?? 'default'}-${index}`}
                        label={badge.label}
                        tone={badge.tone ?? 'default'}
                        className={clsx('module-page-header__badge', badge.className)}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="module-page-header__aside">
              <div className="module-page-header__summary">
                <p className="module-page-header__summary-label">{saleSummaryLabel}</p>
                <p className="module-page-header__summary-value">{formatCurrency(totals.total)}</p>
                <p className="module-page-header__summary-note">{saleSummaryNote}</p>
              </div>
            </div>
          </div>

          <div className="module-page-header__cards">
            {posHeaderCards.map((card, index) => (
              <div
                key={`module-card-${index}`}
                className="module-page-header__card"
                data-accent={card.accent ?? 'default'}
              >
                <div className="module-page-header__card-main">
                  {card.icon ? (
                    <span
                      className="module-page-header__card-icon"
                      aria-hidden="true"
                      data-tone={card.iconTone ?? 'default'}
                    >
                      {card.icon}
                    </span>
                  ) : null}
                  <div className="min-w-0">
                    <div className="module-page-header__card-top">
                      <p className="module-page-header__card-label">{card.label}</p>
                      {card.badge ? (
                        <StatusBadge
                          label={card.badge.label}
                          tone={card.badge.tone ?? 'default'}
                          className={clsx('module-page-header__card-badge', card.badge.className)}
                        />
                      ) : null}
                    </div>
                    <p className="module-page-header__card-value">{card.value}</p>
                    {card.note ? <p className="module-page-header__card-note">{card.note}</p> : null}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="pos-workspace grid min-w-0 items-start gap-4 sm:gap-5 lg:grid-cols-[minmax(0,1.16fr)_minmax(24rem,28rem)]">
        <Card padding="none" glow={false} className="self-start pos-workspace__catalog">
          <div className="pos-catalog-shell">
            <div className="pos-catalog-shell__header">
              <SectionHeader
                eyebrow="Catalogo de venta"
                title="Catalogo operativo"
                className="pos-catalog-shell__heading"
              />

              {!currentLocation ? (
                <FeedbackMessage tone="warning" className="pos-catalog-shell__alert">
                  Crea o selecciona un POS valido en el encabezado para cargar la operacion.
                </FeedbackMessage>
              ) : !currentCashSession ? (
                <FeedbackMessage tone="warning" className="pos-catalog-shell__alert pos-catalog-shell__alert--cash-closed">
                  Abre la caja en la pestana Caja antes de cobrar.
                </FeedbackMessage>
              ) : null}
            </div>

            <div className="pos-catalog-toolbar">
              <div className="pos-catalog-toolbar__search">
                <SearchField
                  label="Buscar en catalogo"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  onClear={() => setSearch('')}
                  placeholder="Buscar por nombre, presentacion o SKU"
                  fieldClassName="pos-catalog-toolbar__search-field"
                />
              </div>

              <div className="pos-catalog-toolbar__summary surface-subtle">
                <div className="pos-catalog-toolbar__summary-icon" aria-hidden="true">
                  <Search size={16} />
                </div>
                <div className="min-w-0">
                  <p className="pos-catalog-toolbar__summary-label">Vista activa</p>
                  <p className="pos-catalog-toolbar__summary-value">
                    {visibleCatalogItems.length}
                  </p>
                  <p className="pos-catalog-toolbar__summary-scope">{catalogSearchSummary}</p>
                </div>
              </div>
            </div>

            <div
              className="pos-catalog-filters"
              role="toolbar"
              aria-label="Filtros del catalogo"
            >
              {filterOptions.map((option) => (
                <FilterChip
                  key={option.value}
                  onClick={() => setCatalogFilter(option.value)}
                  active={catalogFilter === option.value}
                  label={option.label}
                  count={option.count}
                  className={clsx(
                    'pos-catalog-filter shrink-0',
                    catalogFilter === option.value ? '' : 'theme-text-secondary',
                  )}
                />
              ))}
            </div>

            {catalogLoading ? (
              <div className="pos-catalog-state">
                <LoadingState
                  title="Cargando catalogo"
                  description="Estamos trayendo productos operativos y combos activos para esta caja."
                  rows={4}
                />
              </div>
            ) : catalogError ? (
              <div className="pos-catalog-state">
                <EmptyState
                  icon={<AlertTriangle size={20} />}
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
              <div className="pos-catalog-state">
                <EmptyState
                  icon={
                    search.trim() || catalogFilter !== 'ALL' ? (
                      <SearchX size={20} />
                    ) : (
                      <PackageOpen size={20} />
                    )
                  }
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
              <div className="pos-catalog-grid">
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
          </div>
        </Card>

        <Card
          padding="none"
          glow={false}
          className="hidden self-start lg:sticky lg:top-4 lg:block pos-workspace__cart"
        >
          <PosCartPanel
            mode="desktop"
            className="pos-cart-panel--desktop-shell"
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

      {saleSuccessMessage ? (
        <div className="pos-sale-success-toast pointer-events-none fixed inset-x-4 bottom-4 z-40 mx-auto max-w-lg lg:inset-x-auto lg:bottom-auto lg:right-6 lg:top-6">
          <Toast
            tone="success"
            role="status"
            aria-live="polite"
            className="pointer-events-auto rounded-[1.45rem] px-4 py-3"
          >
            <div className="flex items-center gap-3">
              <span className="pos-sale-success-toast__icon" aria-hidden="true">
                <CheckCircle2 size={18} />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold theme-text-strong">{saleSuccessMessage}</p>
                <p className="text-xs theme-text-secondary">El carrito quedo listo para una nueva venta.</p>
              </div>
            </div>
          </Toast>
        </div>
      ) : null}

      {items.length > 0 ? (
        <div className="pointer-events-none fixed inset-x-0 bottom-4 z-30 px-4 lg:hidden">
          <button
            type="button"
            onClick={handleOpenMobileCart}
            aria-haspopup="dialog"
            aria-controls={cartSheetId}
            className="pos-mobile-cart-button pointer-events-auto mx-auto flex w-full max-w-lg items-center justify-between gap-3 rounded-[1.6rem] px-4 py-3 text-left"
          >
            <div className="pos-mobile-cart-button__content flex min-w-0 items-center gap-3">
              <div className="pos-mobile-cart-button__icon" aria-hidden="true">
                <ShoppingCart size={18} strokeWidth={2} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold theme-text-strong">Carrito</p>
                <p className="truncate text-xs theme-text-secondary">
                  {totalUnits === 1 ? '1 item' : `${totalUnits} items`} listos para cobrar
                </p>
              </div>
            </div>

            <div className="pos-mobile-cart-button__summary flex shrink-0 items-center gap-2">
              <div className="pos-mobile-cart-button__amount text-right">
                <p className="text-[0.62rem] font-semibold uppercase tracking-[0.18em] theme-text-faint">
                  Total
                </p>
                <p className="mt-1 font-display text-lg font-bold theme-text-strong">
                  {formatCurrency(totals.total)}
                </p>
              </div>
              <span className="pos-mobile-cart-button__pill rounded-full border border-[color:var(--line)] bg-[color:rgb(255_255_255_/_0.04)] px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.14em] theme-text-secondary">
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
        title="Panel de venta"
        subtitle="Revisa items, totales y cobro sin salir del catalogo operativo."
      >
        <PosCartPanel
          mode="mobile"
          className="min-h-0 pos-cart-panel--mobile-shell"
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

function formatItemCount(value: number) {
  return value === 1 ? '1 item' : `${value} items`;
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

const catalogImageUrlKeys = [
  'image_url',
  'imageUrl',
  'thumbnail_url',
  'thumbnailUrl',
  'photo_url',
  'photoUrl',
  'image_src',
  'imageSrc',
] as const;

const catalogImageAltKeys = [
  'image_alt',
  'imageAlt',
  'alt_text',
  'altText',
] as const;

function resolveCatalogEntryImage(label: string, ...candidates: unknown[]) {
  const imageUrl = resolveApiAssetUrl(
    candidates
    .map((candidate) => readOptionalCatalogString(candidate, catalogImageUrlKeys))
    .find(Boolean) ?? null,
  );

  if (!imageUrl) {
    return {
      imageUrl: null,
      imageAlt: undefined,
    };
  }

  const imageAlt = candidates
    .map((candidate) => readOptionalCatalogString(candidate, catalogImageAltKeys))
    .find(Boolean);

  return {
    imageUrl,
    imageAlt: imageAlt ?? `Imagen de ${label}`,
  };
}

function readOptionalCatalogString(
  candidate: unknown,
  keys: readonly string[],
) {
  if (!candidate || typeof candidate !== 'object') {
    return null;
  }

  const record = candidate as Record<string, unknown>;

  for (const key of keys) {
    const value = record[key];

    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }

  return null;
}




