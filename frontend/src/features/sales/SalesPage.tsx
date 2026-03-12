import { useMemo, useState } from 'react';
import { History, ReceiptText, Search } from 'lucide-react';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { Input } from '@/components/Input';
import { SummaryCard } from '@/components/SummaryCard';
import { posApi } from '@/services/api/posApi';
import { useAppStore } from '@/store/appStore';
import type { SaleReceipt } from '@/types/api';
import { formatCurrency, formatDate } from '@/utils/format';

export function SalesPage() {
  const recentReceipts = useAppStore((state) => state.recentReceipts);
  const addRecentReceipt = useAppStore((state) => state.addRecentReceipt);

  const [saleId, setSaleId] = useState(1);
  const [selectedReceipt, setSelectedReceipt] = useState<SaleReceipt | null>(
    recentReceipts[0] ?? null,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const latestReceipt = recentReceipts[0] ?? null;
  const visibleReceipt = selectedReceipt ?? latestReceipt;

  const stats = useMemo(() => {
    return {
      totalReceipts: recentReceipts.length,
      latestTotal: latestReceipt ? formatCurrency(latestReceipt.total) : 'Sin dato',
      latestPayment: latestReceipt?.payment_method ?? 'Pendiente',
    };
  }, [latestReceipt, recentReceipts.length]);

  async function handleFetchReceipt() {
    if (saleId <= 0) {
      setError('Ingresa un sale_id valido.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setMessage(null);

      const receipt = await posApi.getSaleReceipt(saleId);
      addRecentReceipt(receipt);
      setSelectedReceipt(receipt);
      setMessage(`Comprobante de la venta #${receipt.sale_id} cargado correctamente.`);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'No se pudo consultar el comprobante',
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-4">
      <div className="grid gap-4 md:grid-cols-3">
        <SummaryCard
          title="Comprobantes recientes"
          value={String(stats.totalReceipts)}
          hint="Guardados en sesion desde POS o consulta manual"
          icon={<ReceiptText size={18} />}
        />
        <SummaryCard
          title="Ultimo total"
          value={stats.latestTotal}
          hint="Ultima venta disponible en la sesion"
          icon={<Search size={18} />}
        />
        <SummaryCard
          title="Historial completo"
          value="Proximamente"
          hint="Pendiente de un futuro GET /sales"
          icon={<History size={18} />}
        />
      </div>

      {message ? (
        <div className="rounded-3xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
          {message}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-3xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {error}
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[380px_minmax(0,1fr)]">
        <div className="grid gap-4">
          <Card>
            <p className="text-sm text-slate-400">Consultar venta</p>
            <h2 className="font-display text-2xl font-bold text-white">
              Buscar comprobante por sale_id
            </h2>

            <div className="mt-5 grid gap-4">
              <Input
                type="number"
                min={1}
                label="ID de venta"
                value={saleId}
                onChange={(event) => setSaleId(Number(event.target.value))}
              />
              <Button disabled={loading} onClick={handleFetchReceipt}>
                {loading ? 'Consultando...' : 'Buscar comprobante'}
              </Button>
              <p className="text-sm text-slate-500">
                El backend actual no expone historial completo con `GET /sales`.
                Esta vista se centra en comprobantes recientes y consulta manual por ID.
              </p>
            </div>
          </Card>

          <Card>
            <p className="text-sm text-slate-400">Ultimo comprobante</p>
            <h2 className="font-display text-2xl font-bold text-white">
              Ultima venta disponible
            </h2>

            {!latestReceipt ? (
              <div className="mt-6">
                <EmptyState
                  title="Sin comprobantes recientes"
                  description="Completa una venta desde POS o consulta un sale_id para ver aqui el ultimo comprobante."
                />
              </div>
            ) : (
              <div className="mt-6 rounded-3xl border border-slate-800 bg-slate-950/50 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm text-slate-400">Venta #{latestReceipt.sale_id}</p>
                    <p className="mt-2 font-display text-2xl font-bold text-white">
                      {latestReceipt.location.name}
                    </p>
                    <p className="mt-2 text-sm text-slate-500">
                      {formatDate(latestReceipt.created_at)} · {latestReceipt.cashier.name}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-display text-3xl font-bold text-teal-300">
                      {formatCurrency(latestReceipt.total)}
                    </p>
                    <p className="text-sm text-slate-400">
                      {stats.latestPayment}
                    </p>
                  </div>
                </div>
                <div className="mt-5 flex gap-3">
                  <Button
                    variant="secondary"
                    onClick={() => setSelectedReceipt(latestReceipt)}
                  >
                    Ver detalle
                  </Button>
                  <Button variant="ghost" disabled>
                    Reimprimir proximamente
                  </Button>
                </div>
              </div>
            )}
          </Card>

          <Card>
            <p className="text-sm text-slate-400">Historial</p>
            <h2 className="font-display text-2xl font-bold text-white">
              Proximamente: historial completo
            </h2>
            <div className="mt-6">
              <EmptyState
                title="Tabla de ventas en espera"
                description="La estructura visual queda lista para integrarse cuando el backend exponga un GET /sales con filtros, paginacion y estado."
              />
            </div>
          </Card>
        </div>

        <Card>
          <p className="text-sm text-slate-400">Detalle de venta</p>
          <h2 className="font-display text-2xl font-bold text-white">
            Comprobante administrativo
          </h2>

          {!visibleReceipt ? (
            <div className="mt-6">
              <EmptyState
                title="Sin comprobante seleccionado"
                description="Consulta un sale_id o usa el ultimo comprobante generado desde POS."
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
                      {visibleReceipt.payment_method ?? 'Pendiente'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-3xl border border-slate-800 bg-slate-950/50 p-5">
                  <p className="text-sm text-slate-500">Ubicacion</p>
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
                <div className="mt-4 grid gap-3">
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
                      <p className="font-semibold text-slate-200">
                        {formatCurrency(item.line_total)}
                      </p>
                    </div>
                  ))}
                </div>
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
                      <span>Metodo de pago</span>
                      <span>{visibleReceipt.payment_method ?? 'N/A'}</span>
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
