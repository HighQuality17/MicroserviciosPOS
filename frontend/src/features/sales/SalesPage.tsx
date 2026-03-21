import { useEffect, useMemo, useRef, useState } from 'react';
import { Filter, History, ReceiptText, Search } from 'lucide-react';
import { AccessState } from '@/components/AccessState';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { FeedbackMessage } from '@/components/FeedbackMessage';
import { Input } from '@/components/Input';
import { LoadingState } from '@/components/LoadingState';
import { RoleModeBanner } from '@/components/RoleModeBanner';
import { ScrollPanel } from '@/components/ScrollPanel';
import { Select } from '@/components/Select';
import { SummaryCard } from '@/components/SummaryCard';
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
          ? translateProtectedError(error, 'No fue posible cargar la última venta disponible')
          : 'No fue posible cargar la última venta disponible',
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
      setReceiptError('Ingresa un ID de venta válido.');
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
          title={isAuditor ? 'Modo auditoría' : 'Modo de consulta operativa'}
          description={
            isAuditor
              ? 'Esta vista es completamente de solo lectura. Puedes consultar ventas, revisar filtros históricos y abrir comprobantes sin ejecutar acciones operativas.'
              : 'Como cajero, aquí solo puedes consultar comprobantes y revisar ventas recientes e históricas permitidas. Las acciones operativas avanzadas se mantienen ocultas.'
          }
          tone={isAuditor ? 'warning' : 'info'}
        />
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <SummaryCard
          title="Comprobantes recientes"
          value={recentLoading ? '...' : String(stats.totalReceipts)}
          hint="Últimos 5 comprobantes persistidos en base local"
          icon={<ReceiptText size={18} />}
        />
        <SummaryCard
          title="Último total"
          value={latestLoading ? '...' : stats.latestTotal}
          hint="Última venta disponible en el backend"
          icon={<Search size={18} />}
        />
        <SummaryCard
          title="Ventas filtradas"
          value={stats.filteredSales}
          hint="Resultado actual del historial"
          icon={<History size={18} />}
        />
      </div>

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
            <p className="text-sm text-slate-400">Consultar venta</p>
            <h2 className="font-display text-2xl font-bold text-white">
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
            <p className="text-sm text-slate-400">Últimos 5 registros</p>
            <h2 className="font-display text-2xl font-bold text-white">Comprobantes recientes</h2>

            {recentError ? (
              <div className="mt-6">
                <BlockError message={recentError} />
              </div>
            ) : recentLoading ? (
              <div className="mt-6 grid gap-3">
                <SkeletonCard height="h-28" />
                <SkeletonCard height="h-28" />
              </div>
            ) : recentSales.length === 0 ? (
              <div className="mt-6">
                <EmptyState
                  title="Sin comprobantes recientes"
                  description="Cuando existan ventas pagadas, verás aquí los últimos comprobantes disponibles."
                />
              </div>
            ) : (
              <ScrollPanel className="mt-6 grid gap-3" maxHeightClassName="max-h-[24rem]" tabIndex={0} aria-label="Comprobantes recientes">
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
                        'data-list-card rounded-3xl p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[#090b16]',
                        isSelected
                          ? 'border-violet-300/40 bg-[linear-gradient(135deg,rgba(99,102,241,0.16),rgba(139,92,246,0.12))] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]'
                          : 'hover:-translate-y-0.5',
                      ].join(' ')}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <p className="text-sm text-slate-400">Venta #{sale.sale_id}</p>
                          <p className="mt-2 truncate font-medium text-white">{sale.location.name}</p>
                          <p className="mt-1 text-sm text-[color:var(--text-faint)]">{formatDate(sale.created_at)}</p>
                          <p className="mt-2 text-xs text-[color:var(--text-faint)]">
                            {sale.cashier.name} / {formatStatus(sale.status)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold metric-accent">{formatCurrency(sale.total)}</p>
                          <p className="mt-1 text-sm text-slate-400">
                            {formatPaymentMethod(sale.payment_method)}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </ScrollPanel>
            )}
          </Card>

          <Card>
            <p className="text-sm text-slate-400">Última venta disponible</p>
            <h2 className="font-display text-2xl font-bold text-white">Último comprobante persistido</h2>

            {latestError ? (
              <div className="mt-6">
                <BlockError message={latestError} />
              </div>
            ) : latestLoading ? (
              <div className="mt-6">
                <SkeletonCard height="h-52" />
              </div>
            ) : !latestSale ? (
              <div className="mt-6">
                <EmptyState
                  title="Sin ventas registradas"
                  description="La última venta disponible aparecerá aquí cuando exista al menos un comprobante persistido."
                />
              </div>
            ) : (
              <div className="mt-6 surface-subtle-strong rounded-3xl p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm text-slate-400">Venta #{latestSale.sale_id}</p>
                    <p className="mt-2 truncate font-display text-2xl font-bold text-white">
                      {latestSale.location.name}
                    </p>
                    <p className="mt-2 text-sm text-[color:var(--text-faint)]">
                      {formatDate(latestSale.created_at)} · {latestSale.cashier.name}
                    </p>
                    <p className="mt-2 text-xs uppercase tracking-[0.2em] text-[color:var(--text-faint)]">
                      {formatStatus(latestSale.status)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-display text-3xl font-bold metric-accent-strong">
                      {formatCurrency(latestSale.total)}
                    </p>
                    <p className="text-sm text-slate-400">
                      {formatPaymentMethod(latestSale.payment_method)}
                    </p>
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
              <p className="text-sm text-slate-400">Detalle de venta</p>
              <h2 id="sales-detail-title" className="font-display text-2xl font-bold text-white">
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
                  description="Selecciona una venta del historial, carga la última disponible o consulta un ID para ver su detalle."
                />
              </div>
            ) : (
              <div className="mt-6 grid gap-5">
                <div className="surface-subtle-strong rounded-[2rem] p-6">
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-[0.25em] text-[color:var(--text-faint)]">Comprobante</p>
                      <h3 className="mt-3 font-display text-4xl font-bold text-white">
                        Venta #{visibleReceipt.sale_id}
                      </h3>
                      <p className="mt-3 text-sm text-slate-400">{formatDate(visibleReceipt.created_at)}</p>
                    </div>
                    <div className="surface-subtle rounded-3xl px-5 py-4 text-right">
                      <p className="text-sm text-slate-400">Total</p>
                      <p className="mt-2 font-display text-3xl font-bold metric-accent-strong">
                        {formatCurrency(visibleReceipt.total)}
                      </p>
                      <p className="mt-1 text-xs text-[color:var(--text-faint)]">
                        {formatPaymentMethod(visibleReceipt.payment_method)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="surface-subtle rounded-3xl p-5">
                    <p className="text-sm text-[color:var(--text-faint)]">Ubicación</p>
                    <p className="mt-2 font-medium text-white">{visibleReceipt.location.name}</p>
                  </div>
                  <div className="surface-subtle rounded-3xl p-5">
                    <p className="text-sm text-[color:var(--text-faint)]">Cajero</p>
                    <p className="mt-2 font-medium text-white">{visibleReceipt.cashier.name}</p>
                  </div>
                </div>

                <div className="surface-subtle rounded-3xl p-5">
                  <p className="text-sm text-slate-400">Ítems</p>
                  <ScrollPanel className="mt-4 grid gap-3" maxHeightClassName="max-h-[18rem]" tabIndex={0} aria-label="Items del comprobante seleccionado">
                    {visibleReceipt.items.map((item) => (
                      <div
                        key={item.id}
                        className="data-list-card flex items-center justify-between rounded-2xl px-4 py-3"
                      >
                        <div>
                          <p className="font-medium text-white">{item.description}</p>
                          <p className="mt-1 text-xs text-[color:var(--text-faint)]">
                            {item.item_type} · x{item.qty} · {formatCurrency(item.unit_price)}
                          </p>
                        </div>
                        <p className="font-semibold metric-accent">{formatCurrency(item.line_total)}</p>
                      </div>
                    ))}
                  </ScrollPanel>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="surface-subtle rounded-3xl p-5">
                    <p className="text-sm text-[color:var(--text-faint)]">Resumen</p>
                    <div className="mt-4 grid gap-3 text-sm">
                      <div className="flex items-center justify-between text-slate-300">
                        <span>Subtotal</span>
                        <span className="metric-accent">{formatCurrency(visibleReceipt.subtotal)}</span>
                      </div>
                      <div className="flex items-center justify-between text-slate-300">
                        <span>Tipo de descuento</span>
                        <span>{visibleReceipt.discount_type}</span>
                      </div>
                      <div className="flex items-center justify-between text-slate-300">
                        <span>Valor del descuento</span>
                        <span>{visibleReceipt.discount_value}</span>
                      </div>
                      <div className="flex items-center justify-between text-slate-300">
                        <span>Monto descontado</span>
                        <span className="metric-accent">{formatCurrency(visibleReceipt.discount_amount)}</span>
                      </div>
                      <div className="flex items-center justify-between border-t border-[color:var(--line)] pt-3 font-semibold text-white">
                        <span>Total</span>
                        <span className="metric-accent-strong">{formatCurrency(visibleReceipt.total)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="surface-subtle rounded-3xl p-5">
                    <p className="text-sm text-[color:var(--text-faint)]">Pago</p>
                    <div className="mt-4 grid gap-3 text-sm">
                      <div className="flex items-center justify-between text-slate-300">
                        <span>Método de pago</span>
                        <span>{formatPaymentMethod(visibleReceipt.payment_method)}</span>
                      </div>
                      <div className="flex items-center justify-between text-slate-300">
                        <span>Monto recibido</span>
                        <span>
                          {visibleReceipt.amount_received !== null
                            ? formatCurrency(visibleReceipt.amount_received)
                            : 'N/A'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-slate-300">
                        <span>Cambio entregado</span>
                        <span>
                          {visibleReceipt.change_given !== null
                            ? formatCurrency(visibleReceipt.change_given)
                            : 'N/A'}
                        </span>
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
                <p className="text-sm text-slate-400">Historial real</p>
                <h2 id="sales-history-title" className="font-display text-2xl font-bold text-white">
                  Historial completo de ventas
                </h2>
                <p className="mt-2 text-sm text-[color:var(--text-faint)]">
                  Consulta de solo lectura con filtros y paginación para auditoría y seguimiento operativo.
                </p>
              </div>
              <div className="surface-subtle rounded-2xl px-4 py-2 text-xs text-[color:var(--text-muted)]">
                Página {historyPage} de {Math.max(historyTotalPages, 1)}
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
                  description="Prueba ajustando estado, fechas, método de pago o ubicación para ampliar la búsqueda."
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
                          <col style={{ width: '150px' }} />
                          <col style={{ width: '120px' }} />
                          <col style={{ width: '110px' }} />
                          <col style={{ width: '140px' }} />
                          <col style={{ width: '140px' }} />
                          <col />
                          <col style={{ width: '110px' }} />
                        </colgroup>
                        <thead className="table-head">
                          <tr>
                            <th scope="col" className="sticky top-0 z-10 bg-[rgba(255,255,255,0.04)] px-4 py-3 text-left text-xs font-medium uppercase tracking-[0.18em] text-[color:var(--text-faint)] backdrop-blur-sm">
                              ID
                            </th>
                            <th scope="col" className="sticky top-0 z-10 bg-[rgba(255,255,255,0.04)] px-4 py-3 text-left text-xs font-medium uppercase tracking-[0.18em] text-[color:var(--text-faint)] backdrop-blur-sm">
                              Fecha
                            </th>
                            <th scope="col" className="sticky top-0 z-10 bg-[rgba(255,255,255,0.04)] px-4 py-3 text-right text-xs font-medium uppercase tracking-[0.18em] text-[color:var(--text-faint)] backdrop-blur-sm">
                              Total
                            </th>
                            <th scope="col" className="sticky top-0 z-10 bg-[rgba(255,255,255,0.04)] px-4 py-3 text-left text-xs font-medium uppercase tracking-[0.18em] text-[color:var(--text-faint)] backdrop-blur-sm">
                              Estado
                            </th>
                            <th scope="col" className="sticky top-0 z-10 bg-[rgba(255,255,255,0.04)] px-4 py-3 text-left text-xs font-medium uppercase tracking-[0.18em] text-[color:var(--text-faint)] backdrop-blur-sm">
                              M??todo
                            </th>
                            <th scope="col" className="sticky top-0 z-10 bg-[rgba(255,255,255,0.04)] px-4 py-3 text-left text-xs font-medium uppercase tracking-[0.18em] text-[color:var(--text-faint)] backdrop-blur-sm">
                              Ubicaci??n
                            </th>
                            <th scope="col" className="sticky top-0 z-10 bg-[rgba(255,255,255,0.04)] px-4 py-3 text-left text-xs font-medium uppercase tracking-[0.18em] text-[color:var(--text-faint)] backdrop-blur-sm">
                              Cajero
                            </th>
                            <th scope="col" className="sticky top-0 z-10 bg-[rgba(255,255,255,0.04)] px-4 py-3 text-left text-xs font-medium uppercase tracking-[0.18em] text-[color:var(--text-faint)] backdrop-blur-sm">
                              Acción
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
                                  index > 0 ? 'border-t border-white/8' : '',
                                  isSelected
                                    ? 'table-row-selected text-white'
                                    : 'bg-white/[0.03] hover:bg-white/[0.06] hover:text-white',
                                ].join(' ')}
                              >
                                <td className="px-4 py-4 align-middle whitespace-nowrap text-slate-400">#{sale.sale_id}</td>
                                <td className="px-4 py-4 align-middle whitespace-nowrap">{formatDate(sale.created_at)}</td>
                                <td className="px-4 py-4 align-middle whitespace-nowrap text-right">
                                  <span className="font-medium metric-accent">{formatCurrency(sale.total)}</span>
                                </td>
                                <td className="px-4 py-4 align-middle whitespace-nowrap">{formatStatus(sale.status)}</td>
                                <td className="px-4 py-4 align-middle whitespace-nowrap">{formatPaymentMethod(sale.payment_method)}</td>
                                <td className="px-4 py-4 align-middle">
                                  <span className="block truncate">{sale.location_name}</span>
                                </td>
                                <td className="px-4 py-4 align-middle">
                                  <span className="block truncate">{sale.cashier_name}</span>
                                </td>
                                <td className="px-4 py-4 align-middle whitespace-nowrap">
                                  <span className="table-action-chip text-white">
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
                    {historyTotal} ventas encontradas · página {historyPage} de {Math.max(historyTotalPages, 1)}
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
