import { useEffect, useMemo, useRef, useState } from 'react';
import { Filter, History, ReceiptText, Search } from 'lucide-react';
import { AccessState } from '@/components/AccessState';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { Input } from '@/components/Input';
import { LoadingState } from '@/components/LoadingState';
import { RoleModeBanner } from '@/components/RoleModeBanner';
import { ScrollPanel } from '@/components/ScrollPanel';
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
  return (
    <div className="rounded-3xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
      {message}
    </div>
  );
}

function SkeletonCard({ height = 'h-40' }: { height?: string }) {
  return (
    <div
      className={`animate-pulse rounded-3xl border border-slate-800 bg-slate-950/50 ${height}`}
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

      {message ? (
        <div className="rounded-3xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
          {message}
        </div>
      ) : null}

      {receiptError ? (
        <div className="rounded-3xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {receiptError}
        </div>
      ) : null}

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
              <p className="text-sm text-slate-500">
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
              <ScrollPanel className="mt-6 grid gap-3" maxHeightClassName="max-h-[24rem]">
                {recentSales.map((sale) => {
                  const isSelected = selectedSaleId === sale.sale_id;

                  return (
                    <button
                      key={sale.sale_id}
                      type="button"
                      aria-pressed={isSelected}
                      onClick={() => void handleSelectReceipt(sale.sale_id)}
                      className={[
                        'rounded-3xl border p-4 text-left transition',
                        isSelected
                          ? 'border-teal-300/50 bg-slate-900/80'
                          : 'border-slate-800 bg-slate-950/50 hover:border-teal-300/40 hover:bg-slate-900/80',
                      ].join(' ')}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <p className="text-sm text-slate-400">Venta #{sale.sale_id}</p>
                          <p className="mt-2 truncate font-medium text-white">{sale.location.name}</p>
                          <p className="mt-1 text-sm text-slate-500">{formatDate(sale.created_at)}</p>
                          <p className="mt-2 text-xs text-slate-500">
                            {sale.cashier.name} / {formatStatus(sale.status)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-teal-300">{formatCurrency(sale.total)}</p>
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
              <div className="mt-6 rounded-3xl border border-slate-800 bg-slate-950/50 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm text-slate-400">Venta #{latestSale.sale_id}</p>
                    <p className="mt-2 truncate font-display text-2xl font-bold text-white">
                      {latestSale.location.name}
                    </p>
                    <p className="mt-2 text-sm text-slate-500">
                      {formatDate(latestSale.created_at)} · {latestSale.cashier.name}
                    </p>
                    <p className="mt-2 text-xs uppercase tracking-[0.2em] text-slate-500">
                      {formatStatus(latestSale.status)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-display text-3xl font-bold text-teal-300">
                      {formatCurrency(latestSale.total)}
                    </p>
                    <p className="text-sm text-slate-400">
                      {formatPaymentMethod(latestSale.payment_method)}
                    </p>
                  </div>
                </div>
                <div className="mt-5 flex gap-3">
                  <Button variant="secondary" onClick={() => void handleSelectReceipt(latestSale.sale_id, { receipt: latestSale })}>
                    Ver detalle
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </div>

        <div className="grid min-w-0 gap-4">
          <section ref={detailSectionRef} className="min-w-0 scroll-mt-4 lg:scroll-mt-6">
            <Card>
              <p className="text-sm text-slate-400">Detalle de venta</p>
              <h2 className="font-display text-2xl font-bold text-white">
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
                <div className="rounded-[2rem] border border-teal-300/15 bg-gradient-to-br from-slate-950/90 to-slate-900/80 p-6">
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Comprobante</p>
                      <h3 className="mt-3 font-display text-4xl font-bold text-white">
                        Venta #{visibleReceipt.sale_id}
                      </h3>
                      <p className="mt-3 text-sm text-slate-400">{formatDate(visibleReceipt.created_at)}</p>
                    </div>
                    <div className="rounded-3xl border border-slate-800 bg-slate-950/50 px-5 py-4 text-right">
                      <p className="text-sm text-slate-400">Total</p>
                      <p className="mt-2 font-display text-3xl font-bold text-teal-300">
                        {formatCurrency(visibleReceipt.total)}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {formatPaymentMethod(visibleReceipt.payment_method)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-3xl border border-slate-800 bg-slate-950/50 p-5">
                    <p className="text-sm text-slate-500">Ubicación</p>
                    <p className="mt-2 font-medium text-white">{visibleReceipt.location.name}</p>
                  </div>
                  <div className="rounded-3xl border border-slate-800 bg-slate-950/50 p-5">
                    <p className="text-sm text-slate-500">Cajero</p>
                    <p className="mt-2 font-medium text-white">{visibleReceipt.cashier.name}</p>
                  </div>
                </div>

                <div className="rounded-3xl border border-slate-800 bg-slate-950/50 p-5">
                  <p className="text-sm text-slate-400">Ítems</p>
                  <ScrollPanel className="mt-4 grid gap-3" maxHeightClassName="max-h-[18rem]">
                    {visibleReceipt.items.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-950/40 px-4 py-3"
                      >
                        <div>
                          <p className="font-medium text-white">{item.description}</p>
                          <p className="mt-1 text-xs text-slate-500">
                            {item.item_type} · x{item.qty} · {formatCurrency(item.unit_price)}
                          </p>
                        </div>
                        <p className="font-semibold text-slate-200">{formatCurrency(item.line_total)}</p>
                      </div>
                    ))}
                  </ScrollPanel>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-3xl border border-slate-800 bg-slate-950/50 p-5">
                    <p className="text-sm text-slate-500">Resumen</p>
                    <div className="mt-4 grid gap-3 text-sm">
                      <div className="flex items-center justify-between text-slate-300">
                        <span>Subtotal</span>
                        <span>{formatCurrency(visibleReceipt.subtotal)}</span>
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
                        <span>{formatCurrency(visibleReceipt.discount_amount)}</span>
                      </div>
                      <div className="flex items-center justify-between border-t border-slate-800 pt-3 font-semibold text-white">
                        <span>Total</span>
                        <span>{formatCurrency(visibleReceipt.total)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-3xl border border-slate-800 bg-slate-950/50 p-5">
                    <p className="text-sm text-slate-500">Pago</p>
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

          <Card>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm text-slate-400">Historial real</p>
                <h2 className="font-display text-2xl font-bold text-white">
                  Historial completo de ventas
                </h2>
                <p className="mt-2 text-sm text-slate-500">
                  Consulta de solo lectura con filtros y paginación para auditoría y seguimiento operativo.
                </p>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-950/50 px-4 py-2 text-xs text-slate-400">
                Página {historyPage} de {Math.max(historyTotalPages, 1)}
              </div>
            </div>

            <div className="mt-5 grid gap-4 rounded-3xl border border-slate-800 bg-slate-950/40 p-4">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <label className="block space-y-2">
                  <span className="text-sm font-medium text-slate-200">Estado</span>
                  <select
                    value={filters.status}
                    onChange={(event) =>
                      setFilters((current) => ({
                        ...current,
                        status: event.target.value as SaleStatusFilter,
                      }))
                    }
                    className="w-full rounded-2xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-sm text-slate-100 outline-none focus:border-teal-400/70"
                  >
                    <option value="">Todos</option>
                    <option value="PAID">Pagada</option>
                    <option value="PENDING">Pendiente</option>
                    <option value="VOID">Anulada</option>
                  </select>
                </label>

                <label className="block space-y-2">
                  <span className="text-sm font-medium text-slate-200">Método de pago</span>
                  <select
                    value={filters.payment_method}
                    onChange={(event) =>
                      setFilters((current) => ({
                        ...current,
                        payment_method: event.target.value as PaymentMethodFilter,
                      }))
                    }
                    className="w-full rounded-2xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-sm text-slate-100 outline-none focus:border-teal-400/70"
                  >
                    <option value="">Todos</option>
                    <option value="CASH">Efectivo</option>
                    <option value="TRANSFER">Transferencia</option>
                  </select>
                </label>

                <label className="block space-y-2 md:col-span-2 xl:col-span-1">
                  <span className="text-sm font-medium text-slate-200">Ubicación</span>
                  <select
                    value={filters.location_id}
                    onChange={(event) =>
                      setFilters((current) => ({ ...current, location_id: event.target.value }))
                    }
                    className="w-full rounded-2xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-sm text-slate-100 outline-none focus:border-teal-400/70"
                  >
                    <option value="">Todas las ubicaciones</option>
                    {availableLocations.map((location) => (
                      <option key={location.id} value={String(location.id)}>
                        #{location.id} · {location.name}
                      </option>
                    ))}
                  </select>
                </label>
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
                  <div className="min-w-[1100px] overflow-hidden rounded-3xl border border-slate-800">
                    <div className="grid grid-cols-[92px_150px_120px_110px_140px_140px_minmax(0,1fr)_110px] gap-3 bg-slate-900/80 px-4 py-3 text-xs uppercase tracking-[0.18em] text-slate-500">
                      <span>ID</span>
                      <span>Fecha</span>
                      <span>Total</span>
                      <span>Estado</span>
                      <span>Método</span>
                      <span>Ubicación</span>
                      <span>Cajero</span>
                      <span>Acción</span>
                    </div>
                    <ScrollPanel maxHeightClassName="max-h-[30rem]">
                      {historyItems.map((sale) => {
                        const isSelected = selectedSaleId === sale.sale_id;

                        return (
                          <button
                            key={sale.sale_id}
                            type="button"
                            aria-pressed={isSelected}
                            onClick={() => void handleSelectReceipt(sale.sale_id)}
                            className={[
                              'grid w-full grid-cols-[92px_150px_120px_110px_140px_140px_minmax(0,1fr)_110px] gap-3 border-t border-slate-800 px-4 py-4 text-left text-sm text-slate-200 transition',
                              isSelected
                                ? 'bg-slate-900/90 ring-1 ring-inset ring-teal-300/50'
                                : 'bg-slate-950/50 hover:bg-slate-900/70',
                            ].join(' ')}
                          >
                            <span className="text-slate-400">#{sale.sale_id}</span>
                            <span>{formatDate(sale.created_at)}</span>
                            <span className="font-medium text-teal-300">{formatCurrency(sale.total)}</span>
                            <span>{formatStatus(sale.status)}</span>
                            <span>{formatPaymentMethod(sale.payment_method)}</span>
                            <span className="truncate">{sale.location_name}</span>
                            <span className="truncate">{sale.cashier_name}</span>
                            <span className="text-sm font-medium text-slate-100">Ver detalle</span>
                          </button>
                        );
                      })}
                    </ScrollPanel>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-950/40 px-4 py-3 text-sm text-slate-400">
                  <span>
                    {historyTotal} ventas encontradas · página {historyPage} de {Math.max(historyTotalPages, 1)}
                  </span>
                  <div className="flex gap-3">
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
                  </div>
                </div>
              </>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
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
