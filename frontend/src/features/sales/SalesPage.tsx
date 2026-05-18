import '@/features/products/products-d2b.css';
import '@/features/sales/sales-d1.css';
import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import {
  Filter,
  History,
  ReceiptText,
  Search,
} from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { AccessState } from '@/components/AccessState';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { FeedbackMessage } from '@/components/FeedbackMessage';
import { Input } from '@/components/Input';
import { LoadingState } from '@/components/LoadingState';
import { ModulePageHeader } from '@/components/ModulePageHeader';
import type {
  ModulePageHeaderBadge,
  ModulePageHeaderCard,
} from '@/components/ModulePageHeader';
import { PaginationControls } from '@/components/PaginationControls';
import { RoleModeBanner } from '@/components/RoleModeBanner';
import { ScrollPanel } from '@/components/ScrollPanel';
import { Select } from '@/components/Select';
import { StatusBadge } from '@/components/StatusBadge';
import { posApi } from '@/services/api/posApi';
import { useAppStore } from '@/store/appStore';
import type {
  LatestSaleResponse,
  PaymentMethod,
  SaleReceipt,
  SaleRecentItem,
  SalesHistoryItem,
} from '@/types/api';
import { usePermissions } from '@/hooks/usePermissions';
import { isAccessDeniedError, translateProtectedError } from '@/utils/apiError';
import { formatCurrency, formatDate } from '@/utils/format';

type SaleStatusFilter = '' | 'PENDING' | 'PAID' | 'VOID';
type PaymentMethodFilter = '' | PaymentMethod;
type StatusBadgeTone = 'default' | 'success' | 'warning' | 'danger' | 'info';
type SalesMobileSection = 'RECEIPTS' | 'DETAIL';

interface HistoryFilters {
  status: SaleStatusFilter;
  payment_method: PaymentMethodFilter;
  date_from: string;
  date_to: string;
  location_id: string;
}

const defaultFilters: HistoryFilters = {
  status: '',
  payment_method: '',
  date_from: '',
  date_to: '',
  location_id: '',
};

type SelectableReceipt = SaleReceipt | LatestSaleResponse;

function BlockError({ message }: { message: string }) {
  return <FeedbackMessage tone="error" className="products-feedback">{message}</FeedbackMessage>;
}

function SkeletonCard({ height = 'h-40' }: { height?: string }) {
  return (
    <div
      className={`products-form-group animate-pulse rounded-lg ${height}`}
    />
  );
}

export function SalesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const recentReceipts = useAppStore((state) => state.recentReceipts);
  const addRecentReceipt = useAppStore((state) => state.addRecentReceipt);
  const availableLocations = useAppStore((state) => state.availableLocations);
  const { can, isAuditor, isCashier } = usePermissions();

  const detailSectionRef = useRef<HTMLElement | null>(null);
  const receiptRequestSequenceRef = useRef(0);
  const saleIdFromQuery = getSaleIdFromSearchParams(searchParams);
  const initialSelectedReceipt =
    saleIdFromQuery !== null
      ? recentReceipts.find((item) => item.sale_id === saleIdFromQuery) ?? null
      : recentReceipts[0] ?? null;
  const [saleIdInput, setSaleIdInput] = useState('');
  const [selectedSaleId, setSelectedSaleId] = useState<number | null>(
    saleIdFromQuery ?? initialSelectedReceipt?.sale_id ?? null,
  );
  const [selectedReceipt, setSelectedReceipt] = useState<SelectableReceipt | null>(
    initialSelectedReceipt,
  );
  const [mobileSection, setMobileSection] = useState<SalesMobileSection>(
    saleIdFromQuery !== null || initialSelectedReceipt ? 'DETAIL' : 'RECEIPTS',
  );
  const [latestSale, setLatestSale] = useState<LatestSaleResponse | null>(null);
  const [recentSales, setRecentSales] = useState<SaleRecentItem[]>([]);
  const [historyItems, setHistoryItems] = useState<SalesHistoryItem[]>([]);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyLimit] = useState(10);
  const [historyTotalPages, setHistoryTotalPages] = useState(0);
  const [filters, setFilters] = useState<HistoryFilters>(defaultFilters);
  const [appliedFilters, setAppliedFilters] = useState<HistoryFilters>(defaultFilters);
  const [filtersExpanded, setFiltersExpanded] = useState(false);

  const [receiptLoading, setReceiptLoading] = useState(false);
  const [latestLoading, setLatestLoading] = useState(true);
  const [recentLoading, setRecentLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(true);

  const [receiptError, setReceiptError] = useState<string | null>(null);
  const [latestError, setLatestError] = useState<string | null>(null);
  const [recentError, setRecentError] = useState<string | null>(null);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [latestAccessDenied, setLatestAccessDenied] = useState(false);
  const [recentAccessDenied, setRecentAccessDenied] = useState(false);
  const [historyAccessDenied, setHistoryAccessDenied] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [pendingDetailScroll, setPendingDetailScroll] = useState(false);
  const [detailAnnouncement, setDetailAnnouncement] = useState('');

  const canOperateSales = can('canOperateSales');
  const fallbackReceipt = latestSale ?? recentReceipts[0] ?? null;
  const cachedSelectedReceipt = useMemo(
    () =>
      selectedSaleId === null
        ? null
        : recentReceipts.find((item) => item.sale_id === selectedSaleId) ?? null,
    [recentReceipts, selectedSaleId],
  );
  const visibleReceipt = useMemo(() => {
    if (selectedSaleId !== null) {
      if (selectedReceipt?.sale_id === selectedSaleId) {
        return selectedReceipt;
      }

      if (cachedSelectedReceipt) {
        return cachedSelectedReceipt;
      }

      return null;
    }

    return fallbackReceipt;
  }, [cachedSelectedReceipt, fallbackReceipt, selectedReceipt, selectedSaleId]);
  const visibleSaleId = visibleReceipt?.sale_id ?? null;
  const isDetailPending =
    receiptLoading && selectedSaleId !== null && visibleSaleId !== selectedSaleId;

  useEffect(() => {
    void loadRecentSales();
    void loadLatestSale();
  }, []);

  useEffect(() => {
    void loadSalesHistory();
  }, [historyPage, appliedFilters]);

  useEffect(() => {
    if (saleIdFromQuery !== null || selectedSaleId !== null || recentReceipts.length === 0) {
      return;
    }

    setSelectedSaleId(recentReceipts[0].sale_id);
    setSelectedReceipt((current) => current ?? recentReceipts[0]);
  }, [recentReceipts, saleIdFromQuery, selectedSaleId]);

  useEffect(() => {
    if (saleIdFromQuery === null) return;
    setSaleIdInput(String(saleIdFromQuery));
    if (
      selectedSaleId === saleIdFromQuery &&
      (selectedReceipt?.sale_id === saleIdFromQuery ||
        cachedSelectedReceipt?.sale_id === saleIdFromQuery ||
        receiptLoading ||
        receiptError !== null)
    ) {
      return;
    }

    void handleSelectReceipt(saleIdFromQuery, { syncQueryParam: false });
  }, [
    cachedSelectedReceipt,
    receiptError,
    receiptLoading,
    saleIdFromQuery,
    selectedReceipt,
    selectedSaleId,
  ]);

  useEffect(() => {
    if (!pendingDetailScroll || selectedSaleId === null) return;
    if (visibleSaleId !== selectedSaleId || !detailSectionRef.current) return;

    const frame = window.requestAnimationFrame(() => {
      detailSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setDetailAnnouncement(
        'Detalle de la venta #' + selectedSaleId + ' listo para consulta.',
      );
      setPendingDetailScroll(false);
    });

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [pendingDetailScroll, selectedSaleId, visibleSaleId]);

  const stats = useMemo(() => {
    const latestReference = latestSale ?? recentReceipts[0] ?? null;

    return {
      totalReceipts: recentSales.length,
      latestTotal: latestReference ? formatCurrency(latestReference.total) : 'Sin dato',
      filteredSales: historyLoading ? '...' : String(historyTotal),
    };
  }, [historyLoading, historyTotal, latestSale, recentReceipts, recentSales.length]);


  const latestReference = latestSale ?? recentReceipts[0] ?? null;
  const activeFilterCount = useMemo(
    () => Object.values(appliedFilters).filter((value) => value !== '').length,
    [appliedFilters],
  );
  const salesStatusTone: StatusBadgeTone = latestAccessDenied || recentAccessDenied || historyAccessDenied
    ? 'warning'
    : latestLoading || recentLoading || historyLoading
      ? 'info'
      : historyTotal > 0 || recentSales.length > 0 || latestReference
        ? 'success'
        : 'default';
  const salesStatusLabel = latestAccessDenied || recentAccessDenied || historyAccessDenied
    ? 'Acceso parcial'
    : latestLoading || recentLoading || historyLoading
      ? 'Sincronizando'
      : historyTotal > 0 || recentSales.length > 0 || latestReference
        ? 'Operacion activa'
        : 'Sin ventas';
  const recentStatusLabel = recentLoading
    ? 'Actualizando'
    : recentSales.length > 0
      ? 'Actividad reciente'
      : 'Sin comprobantes';
  const latestStatusLabel = latestLoading
    ? 'Consultando'
    : latestReference
      ? 'Ticket mas reciente'
      : 'Sin referencia';
  const filteredStatusLabel = historyLoading
    ? 'Consultando'
    : activeFilterCount > 0
      ? 'Filtros aplicados'
      : historyTotal > 0
        ? 'Historial listo'
        : 'Sin resultados';
  const recentStatusTone: StatusBadgeTone = recentLoading
    ? 'info'
    : recentSales.length > 0
      ? 'success'
      : 'default';
  const latestStatusTone: StatusBadgeTone = latestLoading
    ? 'info'
    : latestReference
      ? 'info'
      : 'default';
  const filteredStatusTone: StatusBadgeTone = historyLoading
    ? 'info'
    : historyTotal > 0
      ? activeFilterCount > 0
        ? 'warning'
        : 'success'
      : 'default';
  const salesModeLabel = canOperateSales
    ? 'Operacion habilitada'
    : isAuditor
      ? 'Modo auditoria'
      : 'Modo consulta';
  const salesModeTone: StatusBadgeTone = canOperateSales
    ? 'info'
    : isAuditor
      ? 'warning'
      : 'default';

  const detailMetrics = useMemo(() => {
    if (!visibleReceipt) {
      return {
        status: null as string | null,
        lines: 0,
        units: 0,
      };
    }

    return {
      status: getReceiptStatus(visibleReceipt),
      lines: visibleReceipt.items.length,
      units: visibleReceipt.items.reduce((total, item) => total + item.qty, 0),
    };
  }, [visibleReceipt]);
  const salesHeaderBadges: ModulePageHeaderBadge[] = [
    {
      label: salesStatusLabel,
      tone: salesStatusTone,
    },
    {
      label: salesModeLabel,
      tone: salesModeTone,
    },
  ];
  const salesHeaderCards: ModulePageHeaderCard[] = [
    {
      label: 'Comprobantes recientes',
      value: recentLoading ? '...' : String(stats.totalReceipts),
      note: recentLoading
        ? 'Actualizando.'
        : recentSales.length > 0
          ? 'Ultimos tickets.'
          : 'Sin actividad.',
      accent: recentStatusTone,
      icon: <ReceiptText size={16} />,
      iconTone: recentStatusTone,
      badge: {
        label: recentStatusLabel,
        tone: recentStatusTone,
      },
    },
    {
      label: 'Ultimo total',
      value: latestLoading ? '...' : stats.latestTotal,
      note: latestLoading
        ? 'Consultando.'
        : latestReference
          ? `Venta #${latestReference.sale_id} / ${formatPaymentMethod(latestReference.payment_method)}`
          : 'Sin referencia.',
      accent: latestStatusTone,
      icon: <Search size={16} />,
      iconTone: latestStatusTone,
      badge: {
        label: latestStatusLabel,
        tone: latestStatusTone,
      },
    },
    {
      label: 'Ventas filtradas',
      value: stats.filteredSales,
      note: historyLoading
        ? 'Cargando.'
        : activeFilterCount > 0
          ? `${activeFilterCount} filtro(s) activos`
          : `Pag. ${historyPage}/${Math.max(historyTotalPages, 1)}`,
      accent: filteredStatusTone,
      icon: <History size={16} />,
      iconTone: filteredStatusTone,
      badge: {
        label: filteredStatusLabel,
        tone: filteredStatusTone,
      },
    },
  ];
  const salesHeroSummaryLabel = visibleReceipt ? 'Comprobante activo' : 'Consulta de comprobantes';
  const salesHeroSummaryValue = visibleReceipt
    ? `Venta #${visibleReceipt.sale_id}`
    : historyTotal > 0
      ? `${historyTotal} ventas`
      : 'Sin comprobantes';
  const salesHeroSummaryNote = visibleReceipt
    ? `${detailMetrics.lines} lineas / ${detailMetrics.units} items`
    : activeFilterCount > 0
      ? `${activeFilterCount} filtro(s) activos en historial.`
      : 'Busca por ID o abre un ticket reciente.';
  const activeHistoryFiltersLabel = activeFilterCount > 0
    ? `${activeFilterCount} filtro(s) aplicados`
    : 'Sin filtros activos';
  const receiptDiscountRule = visibleReceipt
    ? visibleReceipt.discount_amount > 0
      ? formatDiscountValue(visibleReceipt.discount_type, visibleReceipt.discount_value)
      : 'No aplica'
    : 'No aplica';
  const receiptHasDiscount = visibleReceipt ? visibleReceipt.discount_amount > 0 : false;
  const receiptHasPaymentValues = visibleReceipt
    ? visibleReceipt.amount_received !== null || visibleReceipt.change_given !== null
    : false;

  async function handleRefreshSalesView() {
    await Promise.all([
      loadRecentSales(),
      loadLatestSale(),
      loadSalesHistory(),
    ]);
  }

  async function loadRecentSales() {
    try {
      setRecentLoading(true);
      setRecentError(null);
      setRecentAccessDenied(false);
      const response = await posApi.getRecentSales(5);
      setRecentSales(response.items);
    } catch (error) {
      setRecentAccessDenied(isAccessDeniedError(error));
      setRecentError(
        error instanceof Error
          ? translateProtectedError(error, 'No fue posible cargar comprobantes recientes')
          : 'No fue posible cargar comprobantes recientes',
      );
    } finally {
      setRecentLoading(false);
    }
  }

  async function loadLatestSale() {
    try {
      setLatestLoading(true);
      setLatestError(null);
      setLatestAccessDenied(false);
      const sale = await posApi.getLatestSale();
      setLatestSale(sale);
      if (sale) {
        addRecentReceipt(sale);
        if (saleIdFromQuery === null) {
          setSelectedReceipt((current) => current ?? sale);
          setSelectedSaleId((current) => current ?? sale.sale_id);
        }
      }
    } catch (error) {
      setLatestAccessDenied(isAccessDeniedError(error));
      setLatestError(
        error instanceof Error
          ? translateProtectedError(error, 'No fue posible cargar la ultima venta disponible')
          : 'No fue posible cargar la ultima venta disponible',
      );
    } finally {
      setLatestLoading(false);
    }
  }

  async function loadSalesHistory() {
    try {
      setHistoryLoading(true);
      setHistoryError(null);
      setHistoryAccessDenied(false);

      const response = await posApi.getSales({
        page: historyPage,
        limit: historyLimit,
        status: appliedFilters.status || undefined,
        payment_method: appliedFilters.payment_method || undefined,
        date_from: appliedFilters.date_from || undefined,
        date_to: appliedFilters.date_to || undefined,
        location_id: appliedFilters.location_id ? Number(appliedFilters.location_id) : undefined,
      });

      setHistoryItems(response.items);
      setHistoryTotal(response.total);
      setHistoryTotalPages(response.total_pages);
    } catch (error) {
      setHistoryAccessDenied(isAccessDeniedError(error));
      setHistoryError(
        error instanceof Error
          ? translateProtectedError(error, 'No fue posible cargar el historial de ventas')
          : 'No fue posible cargar el historial de ventas',
      );
    } finally {
      setHistoryLoading(false);
    }
  }

  async function handleSelectReceipt(
    saleId: number,
    options?: {
      receipt?: SelectableReceipt | null;
      syncQueryParam?: boolean;
    },
  ) {
    if (saleId <= 0) {
      setReceiptError('Ingresa un ID de venta valido.');
      return;
    }

    const requestSequence = ++receiptRequestSequenceRef.current;

    setDetailAnnouncement('');
    setSaleIdInput(String(saleId));
    setSelectedSaleId(saleId);
    setSelectedReceipt((current) => (current?.sale_id === saleId ? current : null));
    setPendingDetailScroll(true);
    setMobileSection('DETAIL');
    setReceiptError(null);
    setMessage(null);
    if (options?.syncQueryParam !== false) {
      const nextSearchParams = new URLSearchParams(searchParams);
      nextSearchParams.set('saleId', String(saleId));
      setSearchParams(nextSearchParams, { replace: true });
    }

    if (options?.receipt) {
      addRecentReceipt(options.receipt);
      if (receiptRequestSequenceRef.current === requestSequence) {
        setReceiptLoading(false);
        setSelectedReceipt(options.receipt);
      }
      return;
    }

    const cachedReceipt = recentReceipts.find((item) => item.sale_id === saleId);
    if (cachedReceipt) {
      if (receiptRequestSequenceRef.current === requestSequence) {
        setReceiptLoading(false);
        setSelectedReceipt(cachedReceipt);
      }
      return;
    }

    try {
      setReceiptLoading(true);

      const receipt = await posApi.getSaleReceipt(saleId);
      if (receiptRequestSequenceRef.current !== requestSequence) {
        return;
      }

      addRecentReceipt(receipt);
      setSelectedReceipt(receipt);
      setMessage(`Comprobante de la venta #${receipt.sale_id} cargado correctamente.`);
    } catch (error) {
      if (receiptRequestSequenceRef.current !== requestSequence) {
        return;
      }

      setPendingDetailScroll(false);
      setReceiptError(
        error instanceof Error ? error.message : 'No se pudo consultar el comprobante',
      );
    } finally {
      if (receiptRequestSequenceRef.current === requestSequence) {
        setReceiptLoading(false);
      }
    }
  }

  async function handleManualSearch() {
    const saleId = Number(saleIdInput);
    await handleSelectReceipt(saleId);
  }

  function handleApplyFilters() {
    setHistoryPage(1);
    setAppliedFilters(filters);
    setFiltersExpanded(false);
  }

  function handleClearFilters() {
    setFilters(defaultFilters);
    setAppliedFilters(defaultFilters);
    setHistoryPage(1);
    setFiltersExpanded(false);
  }

  return (
    <div className="products-page products-page--catalog sales-page grid min-w-0 gap-4 sm:gap-5">
      {!canOperateSales ? (
        <RoleModeBanner
          title={isAuditor ? 'Modo auditoria' : 'Modo de consulta operativa'}
          description={
            isAuditor
              ? 'Solo lectura para consultar comprobantes e historial.'
              : 'Consulta ventas permitidas sin acciones operativas.'
          }
          tone={isAuditor ? 'warning' : 'info'}
        />
      ) : null}

      <ModulePageHeader
        ariaLabel="Estado operativo de ventas"
        eyebrow="Operacion comercial"
        title="Ventas"
        icon={<ReceiptText size={18} />}
        badges={salesHeaderBadges}
        summary={{
          label: salesHeroSummaryLabel,
          value: salesHeroSummaryValue,
          note: salesHeroSummaryNote,
        }}
        asideAction={
          <Button
            variant="secondary"
            disabled={latestLoading || recentLoading || historyLoading}
            onClick={() => void handleRefreshSalesView()}
          >
            {latestLoading || recentLoading || historyLoading
              ? 'Actualizando...'
              : 'Actualizar ventas'}
          </Button>
        }
        cards={salesHeaderCards}
      />

      <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {detailAnnouncement}
      </p>

      {message ? (
        <FeedbackMessage tone="success" className="products-feedback">
          {message}
        </FeedbackMessage>
      ) : null}

      {receiptError ? (
        <FeedbackMessage tone="error" className="products-feedback">
          {receiptError}
        </FeedbackMessage>
      ) : null}

      {latestError ? (
        <FeedbackMessage tone="error" className="products-feedback">
          {latestError}
        </FeedbackMessage>
      ) : null}

      {latestAccessDenied || recentAccessDenied || historyAccessDenied ? (
        <AccessState description="Tu perfil actual no tiene permiso para consultar el historial y los comprobantes de ventas." />
      ) : null}

      <div className="sales-mobile-tabs" role="tablist" aria-label="Vista de ventas">
        <button
          type="button"
          role="tab"
          aria-selected={mobileSection === 'RECEIPTS'}
          className="sales-mobile-tabs__button"
          onClick={() => setMobileSection('RECEIPTS')}
        >
          Comprobantes
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mobileSection === 'DETAIL'}
          className="sales-mobile-tabs__button"
          onClick={() => setMobileSection('DETAIL')}
        >
          Detalle
        </button>
      </div>

      <div className="products-workspace sales-workspace grid min-w-0 items-start gap-4 lg:grid-cols-[minmax(0,24rem)_minmax(0,1fr)] xl:grid-cols-[minmax(0,25rem)_minmax(0,1fr)] xl:gap-5">
        <div
          className={[
            'products-form-rail sales-workspace-rail grid min-w-0 gap-4 sm:gap-5 xl:sticky xl:top-4 sales-mobile-section',
            mobileSection === 'RECEIPTS' ? 'sales-mobile-section--active' : '',
          ].join(' ')}
        >
          <Card
            padding="none"
            glow={false}
            className="products-panel products-panel--form products-panel--creation-workspace sales-workspace-switcher"
            contentClassName="products-panel__body"
          >
            <SalesPanelHeader
              eyebrow="Workspace"
              title="Comprobantes"
              meta={
                <StatusBadge
                  label={visibleReceipt ? `#${visibleReceipt.sale_id}` : 'Sin seleccion'}
                  tone={visibleReceipt ? 'info' : 'default'}
                />
              }
            />
            <SalesPanelToolbar
              label="Consulta activa"
              value={visibleReceipt ? `Venta #${visibleReceipt.sale_id}` : 'Sin comprobante'}
              badges={[
                {
                  label: recentLoading ? 'Actualizando' : `${recentSales.length} recientes`,
                  tone: recentLoading ? 'info' : recentSales.length > 0 ? 'success' : 'default',
                },
              ]}
            />
          </Card>

          <Card
            padding="none"
            glow={false}
            className="products-panel products-panel--form products-panel--creation-workspace sales-workspace-card sales-search-panel"
            contentClassName="products-panel__body"
          >
            <SalesPanelHeader
              eyebrow="Buscador"
              title="Buscar comprobante"
              meta={
                <StatusBadge
                  label={receiptLoading ? 'Consultando' : latestReference ? 'Referencia lista' : 'Sin referencia'}
                  tone={receiptLoading ? 'info' : latestReference ? 'success' : 'default'}
                />
              }
            />

            <div className="products-form-stack sales-search-form grid gap-4">
              <div
                className="products-form-group products-form-group--strong sales-selected-summary rounded-lg p-4 sm:p-5"
                aria-label="Comprobante seleccionado"
              >
                <div className="products-form-group__heading sales-selected-summary__heading">
                  <p className="products-form-group__label">Seleccion activa</p>
                  {detailMetrics.status ? (
                    <StatusBadge
                      label={formatStatus(detailMetrics.status)}
                      tone={getSaleStatusTone(detailMetrics.status)}
                    />
                  ) : null}
                </div>
                <div className="sales-selected-summary__content">
                  <div className="sales-selected-summary__main min-w-0">
                    <span>Comprobante</span>
                    <strong>{visibleReceipt ? `Venta #${visibleReceipt.sale_id}` : 'Ninguno'}</strong>
                    {visibleReceipt ? (
                      <p>{formatDate(visibleReceipt.created_at)}</p>
                    ) : null}
                  </div>
                  <small>
                    {visibleReceipt
                      ? formatCurrency(visibleReceipt.total)
                      : 'Sin total'}
                  </small>
                </div>
                {visibleReceipt ? (
                  <div className="sales-selected-summary__meta">
                    <StatusBadge
                      label={formatPaymentMethod(visibleReceipt.payment_method)}
                      tone={getPaymentMethodTone(visibleReceipt.payment_method)}
                    />
                    <span>{detailMetrics.lines} lineas</span>
                    <span>{detailMetrics.units} items</span>
                  </div>
                ) : (
                  <p className="sales-selected-summary__hint">Busca por ID o abre un comprobante reciente.</p>
                )}
              </div>

              <div className="products-form-group products-form-group--strong sales-search-block rounded-lg p-4 sm:p-5">
                <div className="products-form-group__heading">
                  <p className="products-form-group__label">Referencia</p>
                </div>
                <div className="sales-search-control">
                  <Input
                    type="number"
                    min={1}
                    label="ID de venta"
                    wrapperClassName="products-field sales-search-control__field"
                    labelClassName="products-field__label"
                    className="products-field__control"
                    placeholder="Ej: 125"
                    value={saleIdInput}
                    onChange={(event) => setSaleIdInput(event.target.value)}
                  />
                  <p className="sales-search-reference">
                    <span>Ultima venta</span>
                    <strong>
                      {latestReference
                        ? `#${latestReference.sale_id} / ${stats.latestTotal}`
                        : 'Sin venta reciente'}
                    </strong>
                  </p>
                </div>
              </div>

              <div className="products-panel__actions flex gap-3">
                <Button
                  className="products-panel__cta sales-search-button"
                  disabled={receiptLoading}
                  onClick={handleManualSearch}
                >
                  {receiptLoading ? 'Consultando...' : 'Buscar comprobante'}
                </Button>
              </div>
            </div>
          </Card>

          <Card
            padding="none"
            glow={false}
            className="products-panel products-panel--form products-panel--creation-workspace sales-workspace-card sales-recent-panel"
            contentClassName="products-panel__body"
          >
            <SalesPanelHeader
              eyebrow="Actividad"
              title="Reciente"
              meta={
                <StatusBadge
                  label={recentLoading ? 'Actualizando' : recentSales.length > 0 ? `${recentSales.length} tickets` : 'Sin ventas'}
                  tone={recentLoading ? 'info' : recentSales.length > 0 ? 'success' : 'default'}
                />
              }
            />

            <div className="sales-recent-section">
              <SalesPanelToolbar
                label="Vista activa"
                value={recentSales.length > 0 ? `${recentSales.length} comprobantes` : 'Sin comprobantes'}
                badges={[
                  {
                    label: visibleReceipt ? `Seleccion #${visibleReceipt.sale_id}` : 'Sin seleccion',
                    tone: visibleReceipt ? 'info' : 'default',
                  },
                ]}
              />

              {recentError ? (
                <div className="mt-4">
                  <BlockError message={recentError} />
                </div>
              ) : recentLoading ? (
                <div className="sales-recent-list mt-3 grid gap-2">
                  <SkeletonCard height="h-20" />
                  <SkeletonCard height="h-20" />
                </div>
              ) : recentSales.length === 0 ? (
                <div className="mt-3">
                  <EmptyState
                    title="Sin comprobantes recientes"
                    description="Apareceran aqui nuevas ventas."
                  />
                </div>
              ) : (
                <ScrollPanel
                  className="sales-recent-scroll mt-3 grid gap-2 sales-recent-list"
                  maxHeightClassName="max-h-[24rem] xl:max-h-[28rem]"
                  tabIndex={0}
                  aria-label="Comprobantes recientes"
                >
                  {recentSales.map((sale) => {
                    const isSelected = selectedSaleId === sale.sale_id;

                    return (
                      <button
                        key={sale.sale_id}
                        type="button"
                        aria-pressed={isSelected}
                        aria-label={getRecentSaleButtonLabel(sale, isSelected)}
                        onClick={() => void handleSelectReceipt(sale.sale_id)}
                        data-status={sale.status}
                        className={[
                          'sales-recent-item rounded-lg text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-strong)]',
                          isSelected ? 'sales-recent-item--selected theme-text-strong' : '',
                        ].join(' ')}
                      >
                        <div className="sales-recent-item__top">
                          <div className="sales-recent-item__main">
                            <p className="sales-recent-item__id">Venta #{sale.sale_id}</p>
                            <p className="sales-recent-item__date">{formatDate(sale.created_at)}</p>
                          </div>
                          <strong className="sales-recent-item__total">
                            {formatCurrency(sale.total)}
                          </strong>
                        </div>

                        <div className="sales-recent-item__footer">
                          <div className="sales-recent-item__badges">
                            <StatusBadge
                              label={formatStatus(sale.status)}
                              tone={getSaleStatusTone(sale.status)}
                            />
                            <StatusBadge
                              label={formatPaymentMethod(sale.payment_method)}
                              tone={getPaymentMethodTone(sale.payment_method)}
                            />
                          </div>
                          <span>Detalle</span>
                        </div>
                      </button>
                    );
                  })}
                </ScrollPanel>
              )}
            </div>
          </Card>
        </div>

        <div className="products-data-rail sales-explorer-rail grid min-w-0 gap-4 sm:gap-5">
          <Card
            padding="none"
            glow={false}
            className={[
              'products-panel products-panel--list products-panel--catalog-explorer sales-explorer-shell sales-mobile-section',
              mobileSection === 'DETAIL' ? 'sales-mobile-section--active' : '',
            ].join(' ')}
            contentClassName="products-panel__body"
          >
            <SalesPanelHeader
              eyebrow="Explorador"
              title="Ventas"
              meta={
                <StatusBadge
                  label={visibleReceipt ? 'Detalle activo' : 'Sin seleccion'}
                  tone={visibleReceipt ? 'info' : 'default'}
                />
              }
            />
            <SalesPanelToolbar
              label="Vista activa"
              value={
                visibleReceipt
                  ? `${detailMetrics.lines} lineas / ${detailMetrics.units} items`
                  : historyLoading
                    ? 'Cargando historial'
                    : `${historyTotal} ventas en historial`
              }
              badges={[
                {
                  label: activeHistoryFiltersLabel,
                  tone: activeFilterCount > 0 ? 'warning' : 'default',
                },
                {
                  label: historyLoading ? 'Sincronizando' : filteredStatusLabel,
                  tone: historyLoading ? 'info' : filteredStatusTone,
                },
              ]}
            />
          </Card>
          <section
            ref={detailSectionRef}
            aria-labelledby="sales-detail-title"
            aria-busy={isDetailPending}
            className={[
              'sales-receipt-section sales-mobile-section min-w-0 scroll-mt-4 lg:scroll-mt-6',
              mobileSection === 'DETAIL' ? 'sales-mobile-section--active' : '',
            ].join(' ')}
          >
            <Card
              padding="none"
              glow={false}
              aria-labelledby="sales-detail-title"
              className="products-panel products-panel--list products-panel--catalog-explorer sales-receipt-card sales-detail-panel sales-explorer-panel"
              contentClassName="products-panel__body"
            >
              <SalesPanelHeader
                eyebrow="Detalle"
                title="Comprobante"
                titleId="sales-detail-title"
                meta={
                  visibleReceipt ? (
                    <StatusBadge label={`Venta #${visibleReceipt.sale_id}`} tone="info" />
                  ) : null
                }
              />

              {isDetailPending ? (
                <div className="mt-4">
                  <LoadingState
                    title="Cargando detalle"
                    description="Preparando comprobante."
                    rows={3}
                  />
                </div>
              ) : !visibleReceipt ? (
                <div className="mt-4">
                  <EmptyState
                    title="Sin comprobante seleccionado"
                    description="Selecciona una venta o busca por ID."
                  />
                </div>
              ) : (
                <div className="sales-receipt-shell">
                  <div className="sales-receipt-hero">
                    <div className="sales-receipt-summary-zone">
                      <div className="sales-receipt-title-row">
                        <div className="sales-receipt-identity">
                          <p className="products-form-group__label">Detalle de comprobante</p>
                          <h3 className="sales-receipt-title">
                            Venta #{visibleReceipt.sale_id}
                          </h3>
                          <p className="sales-receipt-subtitle">
                            {detailMetrics.lines} lineas / {detailMetrics.units} items registrados
                          </p>
                        </div>
                        <div className="sales-receipt-badges">
                          {detailMetrics.status ? (
                            <StatusBadge
                              label={formatStatus(detailMetrics.status)}
                              tone={getSaleStatusTone(detailMetrics.status)}
                            />
                          ) : null}
                          <StatusBadge
                            label={formatPaymentMethod(visibleReceipt.payment_method)}
                            tone={getPaymentMethodTone(visibleReceipt.payment_method)}
                          />
                        </div>
                      </div>

                      <div className="sales-total-card">
                        <p className="products-form-group__label">Total cobrado</p>
                        <p className="sales-total-card__amount">
                          {formatCurrency(visibleReceipt.total)}
                        </p>
                        <div className="sales-total-card__meta">
                          <span>{detailMetrics.lines} lineas</span>
                          <span>{detailMetrics.units} items</span>
                        </div>
                      </div>
                    </div>

                    <dl className="sales-receipt-meta">
                      <div>
                        <dt>Fecha</dt>
                        <dd>{formatDate(visibleReceipt.created_at)}</dd>
                      </div>
                      <div>
                        <dt>Ubicacion</dt>
                        <dd>{visibleReceipt.location.name}</dd>
                      </div>
                      <div>
                        <dt>Cajero</dt>
                        <dd>{visibleReceipt.cashier.name}</dd>
                      </div>
                    </dl>
                  </div>

                  <div className="sales-receipt-body-grid sales-receipt-body-grid--with-summary">
                    <div className="products-form-group sales-items-card">
                      <div className="sales-section-heading">
                        <div>
                          <p className="products-form-group__label">Items</p>
                          <h3>Compra</h3>
                        </div>
                        <span className="sales-items-count">
                          {detailMetrics.lines} lineas
                        </span>
                      </div>

                      <ScrollPanel
                        className="sales-line-list"
                        maxHeightClassName="sales-line-list-scroll"
                        tabIndex={0}
                        aria-label="Items del comprobante seleccionado"
                      >
                        <div className="sales-line-table" role="table" aria-label="Items comprados">
                          <div className="sales-line-table__head" role="row">
                            <span role="columnheader">Producto</span>
                            <span role="columnheader">Cant.</span>
                            <span role="columnheader">Unitario</span>
                            <span role="columnheader">Total</span>
                          </div>
                          {visibleReceipt.items.map((item) => (
                            <div key={item.id} className="sales-line-item" role="row">
                              <div className="sales-line-item__product" role="cell">
                                <div className="sales-line-item__type-row">
                                  <StatusBadge
                                    label={formatSaleItemType(item.item_type)}
                                    tone="default"
                                    className="sales-line-item__badge"
                                  />
                                  <span>
                                    {item.item_type === 'VARIANT'
                                      ? `Variante #${item.ref_id}`
                                      : `Combo #${item.ref_id}`}
                                  </span>
                                </div>
                                <p className="sales-line-item__name">{item.description}</p>
                              </div>
                              <div className="sales-line-item__metric" role="cell">
                                <span>Cant.</span>
                                <strong>{item.qty}</strong>
                              </div>
                              <div className="sales-line-item__metric" role="cell">
                                <span>Unitario</span>
                                <strong>{formatCurrency(item.unit_price)}</strong>
                              </div>
                              <div className="sales-line-item__metric sales-line-item__metric--total" role="cell">
                                <span>Total</span>
                                <strong>{formatCurrency(item.line_total)}</strong>
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollPanel>
                    </div>

                    <div className="sales-summary-grid" aria-label="Resumen comercial y pago">
                      {receiptHasDiscount ? (
                        <div className="products-form-group products-form-group--strong sales-ledger-card sales-ledger-card--commercial">
                          <div className="sales-section-heading sales-section-heading--compact">
                            <div>
                              <p className="products-form-group__label">Comercial</p>
                              <h3>Ajustes</h3>
                            </div>
                            <StatusBadge
                              label={formatDiscountType(visibleReceipt.discount_type)}
                              tone="warning"
                            />
                          </div>
                          <div className="sales-ledger">
                            <div className="sales-ledger__row">
                              <span>Subtotal</span>
                              <strong>{formatCurrency(visibleReceipt.subtotal)}</strong>
                            </div>
                            <div className="sales-ledger__row">
                              <span>Regla</span>
                              <strong>{receiptDiscountRule}</strong>
                            </div>
                            <div className="sales-ledger__row">
                              <span>Descuento</span>
                              <strong>{formatCurrency(visibleReceipt.discount_amount)}</strong>
                            </div>
                          </div>
                        </div>
                      ) : null}

                      <div className="products-form-group sales-ledger-card sales-ledger-card--payment">
                        <div className="sales-section-heading sales-section-heading--compact">
                          <div>
                            <p className="products-form-group__label">Pago</p>
                            <h3>Registro</h3>
                          </div>
                          <StatusBadge
                            label={formatPaymentMethod(visibleReceipt.payment_method)}
                            tone={getPaymentMethodTone(visibleReceipt.payment_method)}
                          />
                        </div>
                        <div className="sales-ledger">
                          <div className="sales-ledger__row">
                            <span>Metodo</span>
                            <strong>{formatPaymentMethod(visibleReceipt.payment_method)}</strong>
                          </div>
                          {visibleReceipt.amount_received !== null ? (
                            <div className="sales-ledger__row">
                              <span>Recibido</span>
                              <strong>{formatCurrency(visibleReceipt.amount_received)}</strong>
                            </div>
                          ) : null}
                          {visibleReceipt.change_given !== null ? (
                            <div className="sales-ledger__row">
                              <span>Cambio</span>
                              <strong>{formatCurrency(visibleReceipt.change_given)}</strong>
                            </div>
                          ) : null}
                          {!receiptHasPaymentValues ? (
                            <div className="sales-ledger__row sales-ledger__row--muted">
                              <span>Importes</span>
                              <strong>Sin valores de efectivo</strong>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </Card>
          </section>

          <Card
            padding="none"
            glow={false}
            aria-labelledby="sales-history-title"
            className={[
              'products-panel products-panel--list products-panel--catalog-explorer sales-history-card sales-explorer-panel sales-mobile-section',
              mobileSection === 'RECEIPTS' ? 'sales-mobile-section--active' : '',
            ].join(' ')}
            contentClassName="products-panel__body"
          >
            <SalesPanelHeader
              eyebrow="Historial"
              title="Ventas"
              titleId="sales-history-title"
              meta={
                <StatusBadge
                  label={`Pagina ${historyPage} de ${Math.max(historyTotalPages, 1)}`}
                  tone="default"
                />
              }
            />

            <div
              className="sales-filter-panel mt-4"
              data-open={filtersExpanded}
              data-active={activeFilterCount > 0}
            >
              <div className="sales-filter-panel__bar">
                <div className="min-w-0">
                  <p className="products-form-group__label">Filtros avanzados</p>
                  <p className="sales-filter-panel__summary">Estado, pago, ubicacion y fechas</p>
                </div>
                <div className="sales-filter-panel__actions">
                  <StatusBadge
                    label={activeHistoryFiltersLabel}
                    tone={activeFilterCount > 0 ? 'warning' : 'default'}
                  />
                  <button
                    type="button"
                    className="sales-filter-panel__toggle"
                    aria-expanded={filtersExpanded}
                    onClick={() => setFiltersExpanded((current) => !current)}
                  >
                    {filtersExpanded ? 'Ocultar' : 'Abrir filtros'}
                  </button>
                </div>
              </div>

              {filtersExpanded ? (
                <div className="sales-filter-panel__body">
                  <div className="sales-filter-grid">
                    <Select
                      label="Estado"
                      wrapperClassName="products-field"
                      labelClassName="products-field__label"
                      className="products-field__control"
                      value={filters.status}
                      onChange={(event) =>
                        setFilters((current) => ({
                          ...current,
                          status: event.target.value as SaleStatusFilter,
                        }))
                      }
                    >
                      <option value="">Todos</option>
                      <option value="PAID">Pagada</option>
                      <option value="PENDING">Pendiente</option>
                      <option value="VOID">Anulada</option>
                    </Select>

                    <Select
                      label="Metodo de pago"
                      wrapperClassName="products-field"
                      labelClassName="products-field__label"
                      className="products-field__control"
                      value={filters.payment_method}
                      onChange={(event) =>
                        setFilters((current) => ({
                          ...current,
                          payment_method: event.target.value as PaymentMethodFilter,
                        }))
                      }
                    >
                      <option value="">Todos</option>
                      <option value="CASH">Efectivo</option>
                      <option value="TRANSFER">Transferencia</option>
                    </Select>

                    <Select
                      label="Ubicacion"
                      wrapperClassName="products-field"
                      labelClassName="products-field__label"
                      className="products-field__control"
                      value={filters.location_id}
                      onChange={(event) =>
                        setFilters((current) => ({ ...current, location_id: event.target.value }))
                      }
                    >
                      <option value="">Todas</option>
                      {availableLocations.map((location) => (
                        <option key={location.id} value={String(location.id)}>
                          #{location.id} / {location.name}
                        </option>
                      ))}
                    </Select>

                    <Input
                      label="Fecha desde"
                      type="date"
                      wrapperClassName="products-field"
                      labelClassName="products-field__label"
                      className="products-field__control"
                      value={filters.date_from}
                      onChange={(event) =>
                        setFilters((current) => ({ ...current, date_from: event.target.value }))
                      }
                    />

                    <Input
                      label="Fecha hasta"
                      type="date"
                      wrapperClassName="products-field"
                      labelClassName="products-field__label"
                      className="products-field__control"
                      value={filters.date_to}
                      onChange={(event) =>
                        setFilters((current) => ({ ...current, date_to: event.target.value }))
                      }
                    />
                  </div>

                  <div className="sales-filter-panel__footer">
                    <Button className="products-panel__cta sales-filter-panel__primary" onClick={handleApplyFilters}>
                      <Filter size={16} className="mr-2" />
                      Aplicar filtros
                    </Button>
                    <Button
                      variant="secondary"
                      className="products-panel__secondary sales-filter-panel__secondary"
                      onClick={handleClearFilters}
                    >
                      Limpiar
                    </Button>
                  </div>
                </div>
              ) : null}
            </div>

            {historyError ? (
              <div className="mt-4">
                <BlockError message={historyError} />
              </div>
            ) : historyLoading ? (
              <div className="mt-4 grid gap-3">
                <SkeletonCard height="h-24" />
                <SkeletonCard height="h-24" />
                <SkeletonCard height="h-24" />
              </div>
            ) : historyItems.length === 0 ? (
              <div className="mt-4">
                <EmptyState
                  title="Sin ventas para esos filtros"
                  description="Ajusta filtros para ampliar resultados."
                />
              </div>
            ) : (
              <>
                <div className="sales-history-list mt-4" aria-label="Ventas encontradas">
                  {historyItems.map((sale) => {
                    const isSelected = selectedSaleId === sale.sale_id;

                    return (
                      <button
                        key={sale.sale_id}
                        type="button"
                        aria-pressed={isSelected}
                        aria-label={getHistorySaleButtonLabel(sale, isSelected)}
                        onClick={() => void handleSelectReceipt(sale.sale_id)}
                        data-status={sale.status}
                        className={[
                          'sales-history-row text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-strong)]',
                          isSelected ? 'sales-history-row--selected' : '',
                        ].join(' ')}
                      >
                        <div className="sales-history-row__identity">
                          <p className="sales-history-row__id">Venta #{sale.sale_id}</p>
                          <p className="sales-history-row__date">{formatDate(sale.created_at)}</p>
                        </div>

                        <div className="sales-history-row__signals">
                          <StatusBadge
                            label={formatStatus(sale.status)}
                            tone={getSaleStatusTone(sale.status)}
                          />
                          <StatusBadge
                            label={formatPaymentMethod(sale.payment_method)}
                            tone={getPaymentMethodTone(sale.payment_method)}
                          />
                          <span className="sales-history-row__meta">
                            <span>POS</span>
                            {sale.location_name}
                          </span>
                          <span className="sales-history-row__meta">
                            <span>Cajero</span>
                            {sale.cashier_name}
                          </span>
                        </div>

                        <div className="sales-history-row__amount">
                          <span>Total</span>
                          <strong>{formatCurrency(sale.total)}</strong>
                          <span className="sales-action-chip">Ver detalle</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
                <PaginationControls
                  page={historyPage}
                  totalPages={historyTotalPages}
                  totalItems={historyTotal}
                  itemLabel="ventas encontradas"
                  onPageChange={setHistoryPage}
                  disabled={historyLoading}
                  className="products-inline-note products-inline-note--footer toolbar-shell"
                />
              </>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

type SalesToolbarBadge = {
  label: string;
  tone?: StatusBadgeTone;
};

function SalesPanelHeader({
  eyebrow,
  title,
  titleId,
  meta,
}: {
  eyebrow: string;
  title: string;
  titleId?: string;
  meta?: ReactNode;
}) {
  return (
    <div className="products-panel__header">
      <div className="products-panel__header-copy">
        <p className="products-panel__eyebrow">{eyebrow}</p>
        <div className="products-panel__title-row">
          <h2 id={titleId} className="font-display text-2xl font-bold theme-text-strong">
            {title}
          </h2>
          {meta ? <div className="products-panel__meta">{meta}</div> : null}
        </div>
      </div>
    </div>
  );
}

function SalesPanelToolbar({
  label,
  value,
  badges = [],
  action,
}: {
  label: string;
  value: string;
  badges?: SalesToolbarBadge[];
  action?: ReactNode;
}) {
  const showControls = badges.length > 0 || Boolean(action);

  return (
    <div className="products-list-toolbar toolbar-shell sales-panel-toolbar mt-4 grid gap-3 rounded-lg px-4 py-3 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
      <div className="products-list-toolbar__summary">
        <p className="products-list-toolbar__label">{label}</p>
        <p className="products-list-toolbar__count">{value}</p>
      </div>
      {showControls ? (
        <div className="products-list-toolbar__controls flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-end xl:w-auto">
          {badges.length > 0 ? (
            <div className="products-list-toolbar__filters flex flex-wrap justify-end gap-2">
              {badges.map((badge) => (
                <StatusBadge
                  key={`${badge.label}-${badge.tone ?? 'default'}`}
                  label={badge.label}
                  tone={badge.tone ?? 'default'}
                />
              ))}
            </div>
          ) : null}
          {action ? <div className="sales-toolbar-action-slot">{action}</div> : null}
        </div>
      ) : null}
    </div>
  );
}

function getRecentSaleButtonLabel(sale: SaleRecentItem, isSelected: boolean) {
  return [
    isSelected ? 'Venta seleccionada.' : null,
    'Venta #' + sale.sale_id + '.',
    'Fecha ' + formatDate(sale.created_at) + '.',
    'Total ' + formatCurrency(sale.total) + '.',
    'Estado ' + formatStatus(sale.status) + '.',
    'Pago ' + formatPaymentMethod(sale.payment_method) + '.',
    'Ubicacion ' + sale.location.name + '.',
    'Cajero ' + sale.cashier.name + '.',
    'Abrir detalle.',
  ]
    .filter(Boolean)
    .join(' ');
}

function getHistorySaleButtonLabel(sale: SalesHistoryItem, isSelected: boolean) {
  return [
    isSelected ? 'Venta seleccionada.' : null,
    'Venta #' + sale.sale_id + '.',
    'Fecha ' + formatDate(sale.created_at) + '.',
    'Total ' + formatCurrency(sale.total) + '.',
    'Estado ' + formatStatus(sale.status) + '.',
    'Pago ' + formatPaymentMethod(sale.payment_method) + '.',
    'Ubicacion ' + sale.location_name + '.',
    'Cajero ' + sale.cashier_name + '.',
    'Abrir detalle.',
  ]
    .filter(Boolean)
    .join(' ');
}

function getReceiptStatus(receipt: SelectableReceipt | null) {
  if (!receipt || !('status' in receipt)) return null;
  return receipt.status;
}

function getSaleStatusTone(status: string): StatusBadgeTone {
  if (status === 'PAID') return 'success';
  if (status === 'PENDING') return 'warning';
  if (status === 'VOID') return 'danger';
  return 'default';
}

function getPaymentMethodTone(method: PaymentMethod | null): StatusBadgeTone {
  if (method === 'CASH') return 'success';
  if (method === 'TRANSFER') return 'info';
  return 'default';
}

function formatSaleItemType(type: string) {
  if (type === 'PRODUCT') return 'Producto';
  if (type === 'COMBO') return 'Combo';
  return type;
}

function formatDiscountType(type: string) {
  if (type === 'PERCENT') return 'Descuento porcentual';
  if (type === 'FIXED') return 'Descuento fijo';
  return 'Sin descuento';
}

function formatDiscountValue(type: string, value: number) {
  if (type === 'PERCENT') return `${value}%`;
  if (type === 'FIXED') return formatCurrency(value);
  return value > 0 ? formatCurrency(value) : 'No aplica';
}

function formatPaymentMethod(method: string | null) {
  if (method === 'CASH') return 'Efectivo';
  if (method === 'TRANSFER') return 'Transferencia';
  return 'Pendiente';
}

function formatStatus(status: string) {
  if (status === 'PAID') return 'Pagada';
  if (status === 'PENDING') return 'Pendiente';
  if (status === 'VOID') return 'Anulada';
  return status;
}

function getSaleIdFromSearchParams(searchParams: URLSearchParams) {
  const rawValue = searchParams.get('saleId');
  if (!rawValue) return null;

  const parsed = Number(rawValue);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}
