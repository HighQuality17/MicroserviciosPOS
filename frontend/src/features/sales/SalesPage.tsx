import { useState } from 'react';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { Input } from '@/components/Input';
import { posApi } from '@/services/api/posApi';
import { useAppStore } from '@/store/appStore';
import { formatCurrency, formatDate } from '@/utils/format';

export function SalesPage() {
  const recentReceipts = useAppStore((state) => state.recentReceipts);
  const addRecentReceipt = useAppStore((state) => state.addRecentReceipt);
  const [saleId, setSaleId] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleFetchReceipt() {
    try {
      setLoading(true);
      setError(null);
      const receipt = await posApi.getReceipt(saleId);
      addRecentReceipt(receipt);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo consultar receipt');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[380px_minmax(0,1fr)]">
      <Card>
        <p className="text-sm text-slate-400">Consulta puntual</p>
        <h2 className="font-display text-2xl font-bold text-white">Buscar receipt</h2>
        <div className="mt-5 grid gap-4">
          <Input type="number" label="sale_id" value={saleId} onChange={(event) => setSaleId(Number(event.target.value))} />
          <Button disabled={loading} onClick={handleFetchReceipt}>
            {loading ? 'Consultando...' : 'Ver receipt'}
          </Button>
          <p className="text-sm text-slate-500">
            El backend actual no expone listado GET /sales. Esta pantalla muestra receipts consultados o generados durante la sesión.
          </p>
          {error ? <div className="rounded-3xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</div> : null}
        </div>
      </Card>

      <div className="grid gap-4">
        {recentReceipts.length === 0 ? (
          <EmptyState
            title="Sin ventas cargadas"
            description="Busca un sale_id o completa un pago desde POS para ver aquí sus receipts."
          />
        ) : (
          recentReceipts.map((receipt) => (
            <Card key={receipt.sale_id}>
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-sm text-slate-400">Venta #{receipt.sale_id}</p>
                  <h3 className="font-display text-2xl font-bold text-white">
                    {receipt.location.name}
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    {formatDate(receipt.created_at)} · {receipt.cashier.name}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-display text-3xl font-bold text-teal-300">
                    {formatCurrency(receipt.total)}
                  </p>
                  <p className="text-sm text-slate-400">
                    {receipt.payment_method ?? 'Pendiente'}
                  </p>
                </div>
              </div>
              <div className="mt-5 grid gap-3">
                {receipt.items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-950/40 px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-white">{item.description}</p>
                      <p className="text-xs text-slate-500">
                        {item.item_type} · x{item.qty}
                      </p>
                    </div>
                    <p className="text-sm font-semibold text-slate-200">
                      {formatCurrency(item.line_total)}
                    </p>
                  </div>
                ))}
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
