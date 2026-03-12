import { useEffect, useMemo, useState } from 'react';
import { History, ReceiptText, Search, Shield } from 'lucide-react';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { Input } from '@/components/Input';
import { RoleModeBanner } from '@/components/RoleModeBanner';
import { ScrollPanel } from '@/components/ScrollPanel';
import { SummaryCard } from '@/components/SummaryCard';
import { posApi } from '@/services/api/posApi';
import { useAppStore } from '@/store/appStore';
import type { LatestSaleResponse, SaleReceipt, SaleRecentItem } from '@/types/api';
import { usePermissions } from '@/hooks/usePermissions';
import { formatCurrency, formatDate } from '@/utils/format';

function BlockError({ message }: { message: string }) {
  return (
    <div className="rounded-3xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
      {message}
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="mt-6 h-40 animate-pulse rounded-3xl border border-slate-800 bg-slate-950/50" />
  );
}

export function SalesPage() {
  const recentReceipts = useAppStore((state) => state.recentReceipts);
  const addRecentReceipt = useAppStore((state) => state.addRecentReceipt);
  const { can, isAdmin, isAuditor, isCashier } = usePermissions();

  const [saleIdInput, setSaleIdInput] = useState('');
  const [selectedReceipt, setSelectedReceipt] = useState<SaleReceipt | null>(
    recentReceipts[0] ?? null,
  );
  const [latestSale, setLatestSale] = useState<LatestSaleResponse | null>(null);
  const [recentSales, setRecentSales] = useState<SaleRecentItem[]>([]);

  const [receiptLoading, setReceiptLoading] = useState(false);
  const [latestLoading, setLatestLoading] = useState(true);
  const [recentLoading, setRecentLoading] = useState(true);

  const [receiptError, setReceiptError] = useState<string | null>(null);
  const [latestError, setLatestError] = useState<string | null>(null);
  const [recentError, setRecentError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const canOperateSales = can('canOperateSales');
  const visibleReceipt = selectedReceipt ?? latestSale ?? recentReceipts[0] ?? null;

  useEffect(() => {
    void loadRecentSales();
    void loadLatestSale();
  }, []);

  const stats = useMemo(() => {
    const latestReference = latestSale ?? recentReceipts[0] ?? null;

    return {
      totalReceipts: recentSales.length,
      latestTotal: latestReference ? formatCurrency(latestReference.total) : 'Sin dato',
      latestPayment: formatPaymentMethod(latestReference?.payment_method ?? null),
    };
  }, [latestSale, recentReceipts, recentSales.length]);

  async function loadRecentSales() {
    try {
      setRecentLoading(true);
      setRecentError(null);
      const response = await posApi.getRecentSales(5);
      setRecentSales(response.items);
    } catch (error) {
      setRecentError(
        error instanceof Error
          ? error.message
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
      const sale = await posApi.getLatestSale();
      setLatestSale(sale);
      if (sale) {
        addRecentReceipt(sale);
        setSelectedReceipt((current) => current ?? sale);
      }
    } catch (error) {
      setLatestError(
        error instanceof Error
          ? error.message
          : 'No fue posible cargar la ultima venta disponible',
      );
    } finally {
      setLatestLoading(false);
    }
  }

  async function handleFetchReceipt(saleId: number) {
    if (saleId <= 0) {
      setReceiptError('Ingresa un sale_id valido.');
      return;
    }

    try {
      setReceiptLoading(true);
      setReceiptError(null);
      setMessage(null);

      const receipt = await posApi.getSaleReceipt(saleId);
      addRecentReceipt(receipt);
      setSelectedReceipt(receipt);
      setMessage(`Comprobante de la venta #${receipt.sale_id} cargado correctamente.`);
    } catch (err) {
      setReceiptError(
        err instanceof Error ? err.message : 'No se pudo consultar el comprobante',
      );
    } finally {
      setReceiptLoading(false);
    }
  }

  async function handleManualSearch() {
    const saleId = Number(saleIdInput);
    await handleFetchReceipt(saleId);
  }

  return (
    <div className="grid gap-4">
      {!canOperateSales ? (
        <RoleModeBanner
          title={isAuditor ? 'Modo auditoría' : 'Modo de consulta operativa'}
          description={
            isAuditor
              ? 'Esta vista es completamente de solo lectura. Puedes consultar comprobantes y revisar detalle de ventas sin ejecutar acciones operativas.'
              : 'Como cajero, aquí solo puedes consultar comprobantes y revisar ventas recientes. Las acciones administrativas se mantienen ocultas.'
          }
          tone={isAuditor ? 'warning' : 'info'}
        />
      ) : null}

      <div className="grid gap-4 md:grid-cols-3">
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
          title="Historial completo"
          value="Próximamente"
          hint="Base lista para filtros y listado extendido"
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

      <div className="grid gap-4 xl:grid-cols-[420px_minmax(0,1fr)]">
        <div className="grid gap-4">
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
            <p className="text-sm text-slate-400">Última venta disponible</p>
            <h2 className="font-display text-2xl font-bold text-white">
              Último comprobante persistido
            </h2>

            {latestError ? (
              <div className="mt-6">
                <BlockError message={latestError} />
              </div>
            ) : latestLoading ? (
              <SkeletonCard />
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
                  <div>
                    <p className="text-sm text-slate-400">Venta #{latestSale.sale_id}</p>
                    <p className="mt-2 font-display text-2xl font-bold text-white">
                      {latestSale.location.name}
                    </p>
                    <p className="mt-2 text-sm text-slate-500">
                      {formatDate(latestSale.created_at)} - {latestSale.cashier.name}
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
                  <Button
                    variant="secondary"
                    onClick={() => setSelectedReceipt(latestSale)}
                  >
                    Ver detalle
                  </Button>
                  {canOperateSales ? (
                    <Button variant="ghost" disabled>
                      Reimpresión avanzada próximamente
                    </Button>
                  ) : null}
                </div>
              </div>
            )}
          </Card>

          <Card>
            <p className="text-sm text-slate-400">Comprobantes recientes</p>
            <h2 className="font-display text-2xl font-bold text-white">
              Últimos 5 registros
            </h2>

            {recentError ? (
              <div className="mt-6">
                <BlockError message={recentError} />
              </div>
            ) : recentLoading ? (
              <div className="mt-6 grid gap-3">
                <SkeletonCard />
                <SkeletonCard />
              </div>
            ) : recentSales.length === 0 ? (
              <div className="mt-6">
                <EmptyState
                  title="Sin comprobantes recientes"
                  description="Cuando existan ventas pagadas, verás aquí los últimos comprobantes disponibles."
                />
              </div>
            ) : (
              <ScrollPanel className="mt-6 grid gap-3">
                {recentSales.map((sale) => (
                  <button
                    key={sale.sale_id}
                    type="button"
                    onClick={() => void handleFetchReceipt(sale.sale_id)}
                    className="rounded-3xl border border-slate-800 bg-slate-950/50 p-4 text-left transition hover:border-teal-300/40 hover:bg-slate-900/80"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm text-slate-400">Venta #{sale.sale_id}</p>
                        <p className="mt-2 font-medium text-white">
                          {sale.location.name}
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          {formatDate(sale.created_at)}
                        </p>
                        <p className="mt-2 text-xs text-slate-500">
                          {sale.cashier.name} - {formatStatus(sale.status)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-teal-300">
                          {formatCurrency(sale.total)}
                        </p>
                        <p className="mt-1 text-sm text-slate-400">
                          {formatPaymentMethod(sale.payment_method)}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </ScrollPanel>
            )}
          </Card>

          {isAdmin ? (
            <Card>
              <p className="text-sm text-slate-400">Acciones de gestión</p>
              <h2 className="font-display text-2xl font-bold text-white">
                Operaciónes para siguiente fase
              </h2>
              <div className="mt-6 rounded-3xl border border-slate-800 bg-slate-950/50 p-5">
                <div className="flex items-start gap-3">
                  <div className="rounded-2xl border border-slate-700 bg-slate-900/80 p-3 text-slate-200">
                    <Shield size={18} />
                  </div>
                  <div>
                    <p className="font-medium text-white">Vista preparada para gestión</p>
                    <p className="mt-2 text-sm text-slate-400">
                      Aquí se integrarán exportación, reimpresión y filtros avanzados cuando el backend exponga el historial completo.
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          ) : (
            <Card>
              <p className="text-sm text-slate-400">Historial</p>
              <h2 className="font-display text-2xl font-bold text-white">
                Próximamente: historial completo
              </h2>
              <div className="mt-6">
                <EmptyState
                  title={
                    isCashier
                      ? 'Consulta operativa en espera'
                      : 'Historial de auditoría en espera'
                  }
                  description="La estructura visual queda lista para integrarse cuando el backend exponga un GET /sales con filtros, paginación y estado."
                />
              </div>
            </Card>
          )}
        </div>

        <Card>
          <p className="text-sm text-slate-400">Detalle de venta</p>
          <h2 className="font-display text-2xl font-bold text-white">
            {isAdmin ? 'Comprobante administrativo' : 'Comprobante de consulta'}
          </h2>

          {!visibleReceipt ? (
            <div className="mt-6">
              <EmptyState
                title="Sin comprobante seleccionado"
                description="Selecciona una venta reciente, carga la última disponible o consulta un ID de venta para ver su detalle."
              />
            </div>
          ) : (
            <div className="mt-6 grid gap-5">
              <div className="rounded-[2rem] border border-teal-300/15 bg-gradient-to-br from-slate-950/90 to-slate-900/80 p-6">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.25em] text-slate-500">
                      Comprobante
                    </p>
                    <h3 className="mt-3 font-display text-4xl font-bold text-white">
                      Venta #{visibleReceipt.sale_id}
                    </h3>
                    <p className="mt-3 text-sm text-slate-400">
                      {formatDate(visibleReceipt.created_at)}
                    </p>
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
                  <p className="mt-2 font-medium text-white">
                    {visibleReceipt.location.name}
                  </p>
                </div>
                <div className="rounded-3xl border border-slate-800 bg-slate-950/50 p-5">
                  <p className="text-sm text-slate-500">Cajero</p>
                  <p className="mt-2 font-medium text-white">
                    {visibleReceipt.cashier.name}
                  </p>
                </div>
              </div>

              <div className="rounded-3xl border border-slate-800 bg-slate-950/50 p-5">
                <p className="text-sm text-slate-400">Items</p>
                <ScrollPanel className="mt-4 grid gap-3" maxHeightClassName="max-h-[20rem]">
                  {visibleReceipt.items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-950/40 px-4 py-3"
                    >
                      <div>
                        <p className="font-medium text-white">{item.description}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {item.item_type} - x{item.qty} - {formatCurrency(item.unit_price)}
                        </p>
                      </div>
                      <p className="font-semibold text-slate-200">
                        {formatCurrency(item.line_total)}
                      </p>
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


