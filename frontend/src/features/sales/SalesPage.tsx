import { useEffect, useMemo, useRef, useState } from 'react';
import { Filter, History, ReceiptText, Search } from 'lucide-react';
import { AccessState } from '@/components/AccessState';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { FeedbackMessage } from '@/components/FeedbackMessage';
import { Input } from '@/components/Input';
import { LoadingState } from '@/components/LoadingState';
import { ModuleStatusCard, ModuleStatusHeader } from '@/components/ModuleStatusHeader';
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
  return <FeedbackMessage tone="error">{message}</FeedbackMessage>;
}

function SkeletonCard({ height = 'h-40' }: { height?: string }) {
  return (
    <div
      className={`data-list-card animate-pulse rounded-3xl ${height}`}
    />
  );
}

export function SalesPage() {
  const recentReceipts = useAppStore((state) => state.recentReceipts);
  const addRecentReceipt = useAppStore((state) => state.addRecentReceipt);
  const availableLocations = useAppStore((state) => state.availableLocations);
  const { can, isAuditor, isCashier } = usePermissions();

  const detailSectionRef = useRef<HTMLElement | null>(null);
  const [saleIdInput, setSaleIdInput] = useState('');
  const [selectedSaleId, setSelectedSaleId] = useState<number | null>(
    recentReceipts[0]?.sale_id ?? null,
  );
  const [selectedReceipt, setSelectedReceipt] = useState<SelectableReceipt | null>(
    recentReceipts[0] ?? null,
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
  const visibleReceipt = useMemo(() => {
    if (selectedSaleId !== null) {
      if (selectedReceipt?.sale_id === selectedSaleId) {
        return selectedReceipt;
      }

      const cachedReceipt = recentReceipts.find(
        (item) => item.sale_id === selectedSaleId,
      );
      if (cachedReceipt) {
        return cachedReceipt;
      }

      if (latestSale?.sale_id === selectedSaleId) {
        return latestSale;
      }

      return null;
    }

    return selectedReceipt ?? latestSale ?? recentReceipts[0] ?? null;
  }, [latestSale, recentReceipts, selectedReceipt, selectedSaleId]);
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
    if (selectedSaleId !== null || recentReceipts.length === 0) return;

    setSelectedSaleId(recentReceipts[0].sale_id);
    setSelectedReceipt((current) => current ?? recentReceipts[0]);
  }, [recentReceipts, selectedSaleId]);

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
        setSelectedReceipt((current) => current ?? sale);
        setSelectedSaleId((current) => current ?? sale.sale_id);
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
    options?: { receipt?: SelectableReceipt | null },
  ) {
    if (saleId <= 0) {
      setReceiptError('Ingresa un ID de venta valido.');
      return;
    }

    setDetailAnnouncement('');
    setSelectedSaleId(saleId);
    setPendingDetailScroll(true);
    setReceiptError(null);
    setMessage(null);

    if (options?.receipt) {
      addRecentReceipt(options.receipt);
      setSelectedReceipt(options.receipt);
      return;
    }

    const cachedReceipt = recentReceipts.find((item) => item.sale_id === saleId);
    if (cachedReceipt) {
      setSelectedReceipt(cachedReceipt);
      return;
    }

    try {
      setReceiptLoading(true);

      const receipt = await posApi.getSaleReceipt(saleId);
      addRecentReceipt(receipt);
      setSelectedReceipt(receipt);
      setMessage(`Comprobante de la venta #${receipt.sale_id} cargado correctamente.`);
    } catch (error) {
      setPendingDetailScroll(false);
      setReceiptError(
        error instanceof Error ? error.message : 'No se pudo consultar el comprobante',
      );
    } finally {
      setReceiptLoading(false);
    }
  }

  async function handleManualSearch() {
    const saleId = Number(saleIdInput);
    await handleSelectReceipt(saleId);
  }

  function handleApplyFilters() {
    setHistoryPage(1);
    setAppliedFilters(filters);
  }

  function handleClearFilters() {
    setFilters(defaultFilters);
    setAppliedFilters(defaultFilters);
    setHistoryPage(1);
  }

  return (
    <div className="grid min-w-0 gap-4 sm:gap-5">
      {!canOperateSales ? (
        <RoleModeBanner
          title={isAuditor ? 'Modo auditoria' : 'Modo de consulta operativa'}
          description={
            isAuditor
              ? 'Esta vista es completamente de solo lectura. Puedes consultar ventas, revisar filtros historicos y abrir comprobantes sin ejecutar acciones operativas.'
              : 'Como cajero, aqui solo puedes consultar comprobantes y revisar ventas recientes e historicas permitidas. Las acciones operativas avanzadas se mantienen ocultas.'
          }
          tone={isAuditor ? 'warning' : 'info'}
        />
      ) : null}

      <ModuleStatusHeader
        ariaLabel="Estado operativo de ventas"
        eyebrow="Operacion comercial"
        title="Ventas"
        statusLabel={salesStatusLabel}
        statusTone={salesStatusTone}
        description="Recientes, ultima referencia e historial filtrado."
        helpText="Concentra el pulso del modulo de ventas, la ultima referencia disponible y el estado general del historial."
        icon={<ReceiptText size={18} />}
      >
        <ModuleStatusCard
          label="Comprobantes recientes"
          value={recentLoading ? '...' : String(stats.totalReceipts)}
          icon={<ReceiptText size={16} />}
          iconTone={recentSales.length > 0 ? 'success' : 'default'}
          badgeLabel={recentStatusLabel}
          badgeTone={recentStatusTone}
          meta={
            recentLoading
              ? 'Actualizando tickets'
              : recentSales.length > 0
                ? 'Ultimos 5 disponibles'
                : 'Sin actividad reciente'
          }
        />
        <ModuleStatusCard
          label="Ultimo total"
          value={latestLoading ? '...' : stats.latestTotal}
          icon={<Search size={16} />}
          iconTone={latestReference ? 'info' : 'default'}
          badgeLabel={latestStatusLabel}
          badgeTone={latestStatusTone}
          meta={
            latestLoading
              ? 'Consultando ultima venta'
              : latestReference
                ? `Venta #${latestReference.sale_id} - ${formatPaymentMethod(latestReference.payment_method)}`
                : 'Sin referencia reciente'
          }
        />
        <ModuleStatusCard
          label="Ventas filtradas"
          value={stats.filteredSales}
          icon={<History size={16} />}
          iconTone={historyTotal > 0 ? 'warning' : 'default'}
          badgeLabel={filteredStatusLabel}
          badgeTone={filteredStatusTone}
          meta={
            historyLoading
              ? 'Cargando historial'
              : activeFilterCount > 0
                ? `${activeFilterCount} filtros - pag. ${historyPage}/${Math.max(historyTotalPages, 1)}`
                : `Pag. ${historyPage}/${Math.max(historyTotalPages, 1)}`
          }
        />
      </ModuleStatusHeader>

      <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {detailAnnouncement}
      </p>

      {message ? <FeedbackMessage tone="success">{message}</FeedbackMessage> : null}

      {receiptError ? <FeedbackMessage tone="error">{receiptError}</FeedbackMessage> : null}

      {latestAccessDenied || recentAccessDenied || historyAccessDenied ? (
        <AccessState description="Tu perfil actual no tiene permiso para consultar el historial y los comprobantes de ventas." />
      ) : null}

      <div className="grid min-w-0 items-start gap-4 xl:grid-cols-[380px_minmax(0,1fr)] 2xl:grid-cols-[420px_minmax(0,1fr)]">
        <div className="grid gap-4 xl:sticky xl:top-4">
          <Card>
            <p className="text-sm theme-text-muted">Consultar venta</p>
            <h2 className="font-display text-2xl font-bold theme-text-strong">
              Buscar comprobante por ID de venta
            </h2>

            <div className="mt-5 grid gap-4">
              <Input
                type="number"
                min={1}
                label="ID de venta"
                placeholder="Ej: 125"
                value={saleIdInput}
                onChange={(event) => setSaleIdInput(event.target.value)}
              />
              <Button disabled={receiptLoading} onClick={handleManualSearch}>
                {receiptLoading ? 'Consultando...' : 'Buscar comprobante'}
              </Button>
              <p className="text-sm text-[color:var(--text-faint)]">
                Puedes consultar cualquier venta puntual por su identificador y abrir el comprobante completo.
              </p>
            </div>
          </Card>

          <Card>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm theme-text-muted">Ultimos 5 registros</p>
                <h2 className="font-display text-2xl font-bold theme-text-strong">Comprobantes recientes</h2>
              </div>
              <StatusBadge
                label={recentLoading ? 'Actualizando' : recentSales.length > 0 ? 'Listos' : 'Sin ventas'}
                tone={recentLoading ? 'info' : recentSales.length > 0 ? 'success' : 'default'}
              />
            </div>

            {recentError ? (
              <div className="mt-6">
                <BlockError message={recentError} />
              </div>
            ) : recentLoading ? (
              <div className="mt-6 grid gap-3">
                <SkeletonCard height="h-36" />
                <SkeletonCard height="h-36" />
              </div>
            ) : recentSales.length === 0 ? (
              <div className="mt-6">
                <EmptyState
                  title="Sin comprobantes recientes"
                  description="Cuando existan ventas pagadas, veras aqui los ultimos comprobantes disponibles."
                />
              </div>
            ) : (
              <ScrollPanel className="mt-6 grid gap-3" maxHeightClassName="max-h-[28rem]" tabIndex={0} aria-label="Comprobantes recientes">
                {recentSales.map((sale) => {
                  const isSelected = selectedSaleId === sale.sale_id;

                  return (
                    <button
                      key={sale.sale_id}
                      type="button"
                      aria-pressed={isSelected}
                      aria-label={getRecentSaleButtonLabel(sale, isSelected)}
                      onClick={() => void handleSelectReceipt(sale.sale_id)}
                      className={[
                        'data-list-card rounded-3xl p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-strong)]',
                        isSelected
                          ? 'surface-selected theme-text-strong shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]'
                          : 'hover:-translate-y-0.5',
                      ].join(' ')}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm theme-text-muted">Venta #{sale.sale_id}</p>
                            <StatusBadge label={formatStatus(sale.status)} tone={getSaleStatusTone(sale.status)} />
                          </div>
                          <p className="mt-2 text-sm text-[color:var(--text-faint)]">{formatDate(sale.created_at)}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-display text-2xl font-bold metric-accent-strong">{formatCurrency(sale.total)}</p>
                          <p className="mt-1 text-xs text-[color:var(--text-faint)]">Cobro principal</p>
                        </div>
                      </div>

                      <div className="mt-4 grid gap-2 sm:grid-cols-2">
                        <div className="surface-subtle rounded-2xl px-3 py-2">
                          <p className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--text-faint)]">Ubicacion / POS</p>
                          <p className="mt-1 truncate text-sm font-medium theme-text-strong">{sale.location.name}</p>
                        </div>
                        <div className="surface-subtle rounded-2xl px-3 py-2">
                          <p className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--text-faint)]">Cajero</p>
                          <p className="mt-1 truncate text-sm font-medium theme-text-strong">{sale.cashier.name}</p>
                        </div>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <StatusBadge label={formatPaymentMethod(sale.payment_method)} tone={getPaymentMethodTone(sale.payment_method)} />
                        {sale.amount_received !== null ? (
                          <span className="text-xs text-[color:var(--text-faint)]">Recibido {formatCurrency(sale.amount_received)}</span>
                        ) : null}
                        {sale.change_given !== null && sale.change_given > 0 ? (
                          <span className="text-xs text-[color:var(--text-faint)]">Cambio {formatCurrency(sale.change_given)}</span>
                        ) : null}
                      </div>
                    </button>
                  );
                })}
              </ScrollPanel>
            )}
          </Card>

          <Card>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm theme-text-muted">Ultima venta disponible</p>
                <h2 className="font-display text-2xl font-bold theme-text-strong">Ultimo comprobante persistido</h2>
              </div>
              <StatusBadge
                label={latestLoading ? 'Consultando' : latestSale ? 'Disponible' : 'Sin ventas'}
                tone={latestLoading ? 'info' : latestSale ? 'success' : 'default'}
              />
            </div>

            {latestError ? (
              <div className="mt-6">
                <BlockError message={latestError} />
              </div>
            ) : latestLoading ? (
              <div className="mt-6">
                <SkeletonCard height="h-64" />
              </div>
            ) : !latestSale ? (
              <div className="mt-6">
                <EmptyState
                  title="Sin ventas registradas"
                  description="La ultima venta disponible aparecera aqui cuando exista al menos un comprobante persistido."
                />
              </div>
            ) : (
              <div className="mt-6 surface-subtle-strong rounded-3xl p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm theme-text-muted">Venta #{latestSale.sale_id}</p>
                      <StatusBadge label={formatStatus(latestSale.status)} tone={getSaleStatusTone(latestSale.status)} />
                      <StatusBadge label={formatPaymentMethod(latestSale.payment_method)} tone={getPaymentMethodTone(latestSale.payment_method)} />
                    </div>
                    <p className="mt-3 truncate font-display text-2xl font-bold theme-text-strong">{latestSale.location.name}</p>
                    <p className="mt-2 text-sm text-[color:var(--text-faint)]">{formatDate(latestSale.created_at)}</p>
                    <p className="mt-1 text-sm text-[color:var(--text-faint)]">Cajero: {latestSale.cashier.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm theme-text-muted">Total registrado</p>
                    <p className="mt-2 font-display text-3xl font-bold metric-accent-strong">{formatCurrency(latestSale.total)}</p>
                    <p className="mt-1 text-xs text-[color:var(--text-faint)]">{latestSale.items.length} lineas - {latestSale.items.reduce((total, item) => total + item.qty, 0)} items</p>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <div className="surface-subtle rounded-2xl px-4 py-3">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--text-faint)]">Cobro recibido</p>
                    <p className="mt-1 text-sm font-medium theme-text-strong">{latestSale.amount_received !== null ? formatCurrency(latestSale.amount_received) : 'No informado'}</p>
                  </div>
                  <div className="surface-subtle rounded-2xl px-4 py-3">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--text-faint)]">Cambio entregado</p>
                    <p className="mt-1 text-sm font-medium theme-text-strong">{latestSale.change_given !== null ? formatCurrency(latestSale.change_given) : 'No aplica'}</p>
                  </div>
                </div>

                <div className="mt-5 flex gap-3">
                  <Button variant="secondary" aria-label={`Ver detalle de la venta #${latestSale.sale_id}`} onClick={() => void handleSelectReceipt(latestSale.sale_id, { receipt: latestSale })}>
                    Ver detalle
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </div>

        <div className="grid min-w-0 gap-4">
          <section ref={detailSectionRef} aria-labelledby="sales-detail-title" aria-busy={isDetailPending} className="min-w-0 scroll-mt-4 lg:scroll-mt-6">
            <Card aria-labelledby="sales-detail-title">
              <p className="text-sm theme-text-muted">Detalle de venta</p>
              <h2 id="sales-detail-title" className="font-display text-2xl font-bold theme-text-strong">
                Comprobante de consulta
              </h2>

              {isDetailPending ? (
                <div className="mt-6">
                  <LoadingState
                    title="Cargando detalle"
                    description="Estamos preparando el comprobante seleccionado."
                    rows={3}
                  />
                </div>
              ) : !visibleReceipt ? (
                <div className="mt-6">
                  <EmptyState
                    title="Sin comprobante seleccionado"
                    description="Selecciona una venta del historial, carga la ultima disponible o consulta un ID para ver su detalle."
                  />
                </div>
              ) : (
                <div className="mt-6 grid gap-5">
                  <div className="surface-subtle-strong rounded-[2rem] p-6">
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0">
                        <p className="text-xs uppercase tracking-[0.25em] text-[color:var(--text-faint)]">Comprobante</p>
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <h3 className="font-display text-4xl font-bold theme-text-strong">Venta #{visibleReceipt.sale_id}</h3>
                          {detailMetrics.status ? (
                            <StatusBadge label={formatStatus(detailMetrics.status)} tone={getSaleStatusTone(detailMetrics.status)} />
                          ) : null}
                          <StatusBadge label={formatPaymentMethod(visibleReceipt.payment_method)} tone={getPaymentMethodTone(visibleReceipt.payment_method)} />
                        </div>
                        <p className="mt-3 text-sm theme-text-muted">{formatDate(visibleReceipt.created_at)}</p>
                        <p className="mt-1 text-sm text-[color:var(--text-faint)]">Ticket listo para auditoria, caja y validacion comercial.</p>
                      </div>
                      <div className="surface-subtle rounded-3xl px-5 py-4 text-right">
                        <p className="text-sm theme-text-muted">Total</p>
                        <p className="mt-2 font-display text-3xl font-bold metric-accent-strong">{formatCurrency(visibleReceipt.total)}</p>
                        <p className="mt-1 text-xs text-[color:var(--text-faint)]">{detailMetrics.lines} lineas - {detailMetrics.units} items</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <div className="surface-subtle rounded-3xl p-5">
                      <p className="text-sm text-[color:var(--text-faint)]">Fecha y hora</p>
                      <p className="mt-2 font-medium theme-text-strong">{formatDate(visibleReceipt.created_at)}</p>
                    </div>
                    <div className="surface-subtle rounded-3xl p-5">
                      <p className="text-sm text-[color:var(--text-faint)]">Ubicacion</p>
                      <p className="mt-2 font-medium theme-text-strong">{visibleReceipt.location.name}</p>
                    </div>
                    <div className="surface-subtle rounded-3xl p-5">
                      <p className="text-sm text-[color:var(--text-faint)]">Cajero</p>
                      <p className="mt-2 font-medium theme-text-strong">{visibleReceipt.cashier.name}</p>
                    </div>
                    <div className="surface-subtle rounded-3xl p-5">
                      <p className="text-sm text-[color:var(--text-faint)]">Estado comercial</p>
                      {detailMetrics.status ? (
                        <div className="mt-2">
                          <StatusBadge label={formatStatus(detailMetrics.status)} tone={getSaleStatusTone(detailMetrics.status)} />
                        </div>
                      ) : (
                        <p className="mt-2 font-medium theme-text-strong">No informado</p>
                      )}
                    </div>
                  </div>

                  <div className="surface-subtle rounded-3xl p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm theme-text-muted">Items</p>
                        <h3 className="mt-2 font-display text-2xl font-bold theme-text-strong">Detalle de compra</h3>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusBadge label={`${detailMetrics.lines} lineas`} tone="default" />
                        <StatusBadge label={`${detailMetrics.units} items`} tone="info" />
                      </div>
                    </div>

                    <ScrollPanel className="mt-4 grid gap-3" maxHeightClassName="max-h-[18rem]" tabIndex={0} aria-label="Items del comprobante seleccionado">
                      {visibleReceipt.items.map((item) => (
                        <div key={item.id} className="data-list-card rounded-2xl px-4 py-3">
                          <div className="flex flex-wrap items-start justify-between gap-4">
                            <div className="min-w-0">
                              <p className="font-medium theme-text-strong">{item.description}</p>
                              <div className="mt-2 flex flex-wrap items-center gap-2">
                                <StatusBadge label={formatSaleItemType(item.item_type)} tone="default" className="min-w-[88px] justify-center" />
                                <span className="text-xs text-[color:var(--text-faint)]">x{item.qty} - {formatCurrency(item.unit_price)} c/u</span>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--text-faint)]">Total linea</p>
                              <p className="mt-1 font-semibold metric-accent">{formatCurrency(item.line_total)}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </ScrollPanel>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="surface-subtle rounded-3xl p-5">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm text-[color:var(--text-faint)]">Resumen comercial</p>
                        <StatusBadge label={formatDiscountType(visibleReceipt.discount_type)} tone={visibleReceipt.discount_amount > 0 ? 'warning' : 'default'} />
                      </div>
                      <div className="mt-4 grid gap-3 text-sm">
                        <div className="flex items-center justify-between theme-text-secondary">
                          <span>Subtotal</span>
                          <span className="metric-accent">{formatCurrency(visibleReceipt.subtotal)}</span>
                        </div>
                        <div className="flex items-center justify-between theme-text-secondary">
                          <span>Tipo de descuento</span>
                          <span>{formatDiscountType(visibleReceipt.discount_type)}</span>
                        </div>
                        <div className="flex items-center justify-between theme-text-secondary">
                          <span>Valor de regla</span>
                          <span>{formatDiscountValue(visibleReceipt.discount_type, visibleReceipt.discount_value)}</span>
                        </div>
                        <div className="flex items-center justify-between theme-text-secondary">
                          <span>Monto descontado</span>
                          <span className="metric-accent">{formatCurrency(visibleReceipt.discount_amount)}</span>
                        </div>
                        <div className="flex items-center justify-between border-t border-[color:var(--line)] pt-3 font-semibold theme-text-strong">
                          <span>Total</span>
                          <span className="metric-accent-strong">{formatCurrency(visibleReceipt.total)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="surface-subtle rounded-3xl p-5">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm text-[color:var(--text-faint)]">Pago</p>
                        <StatusBadge label={formatPaymentMethod(visibleReceipt.payment_method)} tone={getPaymentMethodTone(visibleReceipt.payment_method)} />
                      </div>
                      <div className="mt-4 grid gap-3 text-sm">
                        {detailMetrics.status ? (
                          <div className="flex items-center justify-between theme-text-secondary">
                            <span>Estado</span>
                            <span>{formatStatus(detailMetrics.status)}</span>
                          </div>
                        ) : null}
                        <div className="flex items-center justify-between theme-text-secondary">
                          <span>Monto recibido</span>
                          <span>{visibleReceipt.amount_received !== null ? formatCurrency(visibleReceipt.amount_received) : 'No informado'}</span>
                        </div>
                        <div className="flex items-center justify-between theme-text-secondary">
                          <span>Cambio entregado</span>
                          <span>{visibleReceipt.change_given !== null ? formatCurrency(visibleReceipt.change_given) : 'No aplica'}</span>
                        </div>
                        <div className="flex items-center justify-between border-t border-[color:var(--line)] pt-3 font-semibold theme-text-strong">
                          <span>Total cobrado</span>
                          <span className="metric-accent-strong">{formatCurrency(visibleReceipt.total)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </Card>
          </section>

          <Card aria-labelledby="sales-history-title">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm theme-text-muted">Historial real</p>
                <h2 id="sales-history-title" className="font-display text-2xl font-bold theme-text-strong">
                  Historial completo de ventas
                </h2>
                <p className="mt-2 text-sm text-[color:var(--text-faint)]">
                  Consulta de solo lectura con filtros y paginacion para auditoria y seguimiento operativo.
                </p>
              </div>
              <div className="soft-pill rounded-full px-4 py-2 text-xs font-medium">
                Pagina {historyPage} de {Math.max(historyTotalPages, 1)}
              </div>
            </div>

            <div className="toolbar-shell mt-5 grid gap-4 rounded-3xl p-4">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <Select
                  label="Estado"
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
                  wrapperClassName="md:col-span-2 xl:col-span-1"
                  value={filters.location_id}
                  onChange={(event) =>
                    setFilters((current) => ({ ...current, location_id: event.target.value }))
                  }
                >
                  <option value="">Todas las ubicaciones</option>
                  {availableLocations.map((location) => (
                    <option key={location.id} value={String(location.id)}>
                      #{location.id} / {location.name}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Input
                  label="Fecha desde"
                  type="date"
                  value={filters.date_from}
                  onChange={(event) =>
                    setFilters((current) => ({ ...current, date_from: event.target.value }))
                  }
                />
                <Input
                  label="Fecha hasta"
                  type="date"
                  value={filters.date_to}
                  onChange={(event) =>
                    setFilters((current) => ({ ...current, date_to: event.target.value }))
                  }
                />
              </div>

              <div className="flex flex-wrap gap-3">
                <Button onClick={handleApplyFilters}>
                  <Filter size={16} className="mr-2" />
                  Aplicar filtros
                </Button>
                <Button variant="secondary" onClick={handleClearFilters}>
                  Limpiar filtros
                </Button>
              </div>
            </div>

            {historyError ? (
              <div className="mt-6">
                <BlockError message={historyError} />
              </div>
            ) : historyLoading ? (
              <div className="mt-6 grid gap-3">
                <SkeletonCard height="h-24" />
                <SkeletonCard height="h-24" />
                <SkeletonCard height="h-24" />
              </div>
            ) : historyItems.length === 0 ? (
              <div className="mt-6">
                <EmptyState
                  title="Sin ventas para esos filtros"
                  description="Prueba ajustando estado, fechas, metodo de pago o ubicacion para ampliar la busqueda."
                />
              </div>
            ) : (
              <>
                <div className="mt-6 overflow-x-auto overscroll-x-contain touch-pan-x pb-1">
                  <div className="min-w-[1100px] overflow-hidden rounded-3xl table-shell">
                    <ScrollPanel
                      className="sm:pr-0"
                      maxHeightClassName="max-h-[30rem]"
                      tabIndex={0}
                      aria-label="Resultados del historial de ventas"
                    >
                      <table className="w-full table-fixed border-separate border-spacing-0 text-sm text-[color:var(--text-secondary)]">
                        <caption className="sr-only">Historial completo de ventas</caption>
                        <colgroup>
                          <col style={{ width: '92px' }} />
                          <col style={{ width: '170px' }} />
                          <col style={{ width: '120px' }} />
                          <col style={{ width: '128px' }} />
                          <col style={{ width: '144px' }} />
                          <col style={{ width: '170px' }} />
                          <col />
                          <col style={{ width: '110px' }} />
                        </colgroup>
                        <thead className="table-head">
                          <tr>
                            <th scope="col" className="table-head-cell px-4 py-3 text-left text-xs font-medium uppercase tracking-[0.18em] text-[color:var(--text-faint)] backdrop-blur-sm">
                              ID
                            </th>
                            <th scope="col" className="table-head-cell px-4 py-3 text-left text-xs font-medium uppercase tracking-[0.18em] text-[color:var(--text-faint)] backdrop-blur-sm">
                              Fecha
                            </th>
                            <th scope="col" className="table-head-cell px-4 py-3 text-right text-xs font-medium uppercase tracking-[0.18em] text-[color:var(--text-faint)] backdrop-blur-sm">
                              Total
                            </th>
                            <th scope="col" className="table-head-cell px-4 py-3 text-left text-xs font-medium uppercase tracking-[0.18em] text-[color:var(--text-faint)] backdrop-blur-sm">
                              Estado
                            </th>
                            <th scope="col" className="table-head-cell px-4 py-3 text-left text-xs font-medium uppercase tracking-[0.18em] text-[color:var(--text-faint)] backdrop-blur-sm">
                              Metodo
                            </th>
                            <th scope="col" className="table-head-cell px-4 py-3 text-left text-xs font-medium uppercase tracking-[0.18em] text-[color:var(--text-faint)] backdrop-blur-sm">
                              Ubicacion
                            </th>
                            <th scope="col" className="table-head-cell px-4 py-3 text-left text-xs font-medium uppercase tracking-[0.18em] text-[color:var(--text-faint)] backdrop-blur-sm">
                              Cajero
                            </th>
                            <th scope="col" className="table-head-cell px-4 py-3 text-left text-xs font-medium uppercase tracking-[0.18em] text-[color:var(--text-faint)] backdrop-blur-sm">
                              Accion
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {historyItems.map((sale, index) => {
                            const isSelected = selectedSaleId === sale.sale_id;

                            return (
                              <tr
                                key={sale.sale_id}
                                tabIndex={0}
                                aria-label={getHistorySaleButtonLabel(sale, isSelected)}
                                onClick={() => void handleSelectReceipt(sale.sale_id)}
                                onKeyDown={(event) => {
                                  if (event.key === 'Enter' || event.key === ' ') {
                                    event.preventDefault();
                                    void handleSelectReceipt(sale.sale_id);
                                  }
                                }}
                                className={[
                                  'cursor-pointer text-[color:var(--text-secondary)] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-inset focus-visible:ring-offset-0',
                                  index > 0 ? 'border-t theme-border-soft' : '',
                                  isSelected
                                    ? 'table-row table-row-selected theme-text-strong'
                                    : 'table-row table-row-interactive',
                                ].join(' ')}
                              >
                                <td className="px-4 py-4 align-middle whitespace-nowrap theme-text-muted">#{sale.sale_id}</td>
                                <td className="px-4 py-4 align-middle whitespace-nowrap">{formatDate(sale.created_at)}</td>
                                <td className="px-4 py-4 align-middle whitespace-nowrap text-right">
                                  <span className="font-medium metric-accent">{formatCurrency(sale.total)}</span>
                                </td>
                                <td className="px-4 py-4 align-middle whitespace-nowrap">
                                  <StatusBadge label={formatStatus(sale.status)} tone={getSaleStatusTone(sale.status)} />
                                </td>
                                <td className="px-4 py-4 align-middle whitespace-nowrap">
                                  <StatusBadge label={formatPaymentMethod(sale.payment_method)} tone={getPaymentMethodTone(sale.payment_method)} />
                                </td>
                                <td className="px-4 py-4 align-middle">
                                  <span className="block truncate theme-text-strong">{sale.location_name}</span>
                                  <span className="mt-1 block truncate text-xs text-[color:var(--text-faint)]">POS #{sale.location_id}</span>
                                </td>
                                <td className="px-4 py-4 align-middle">
                                  <span className="block truncate theme-text-strong">{sale.cashier_name}</span>
                                  <span className="mt-1 block truncate text-xs text-[color:var(--text-faint)]">Usuario #{sale.cashier_id}</span>
                                </td>
                                <td className="px-4 py-4 align-middle whitespace-nowrap">
                                  <span className="table-action-chip theme-text-strong">
                                    Ver detalle
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </ScrollPanel>
                  </div>
                </div>
                <div className="toolbar-shell mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl px-4 py-3 text-sm text-[color:var(--text-muted)]">
                  <span>
                    {historyTotal} ventas encontradas - pagina {historyPage} de {Math.max(historyTotalPages, 1)}
                  </span>
                  <nav className="flex gap-3" aria-label="Paginacion del historial de ventas">
                    <Button
                      variant="secondary"
                      disabled={historyPage <= 1 || historyLoading}
                      onClick={() => setHistoryPage((current) => Math.max(1, current - 1))}
                    >
                      Anterior
                    </Button>
                    <Button
                      variant="secondary"
                      disabled={historyLoading || historyPage >= historyTotalPages || historyTotalPages === 0}
                      onClick={() => setHistoryPage((current) => current + 1)}
                    >
                      Siguiente
                    </Button>
                  </nav>
                </div>
              </>
            )}
          </Card>
        </div>
      </div>
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
