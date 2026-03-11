import { useEffect, useState } from 'react';
import { Landmark, Wallet } from 'lucide-react';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { Input } from '@/components/Input';
import { SummaryCard } from '@/components/SummaryCard';
import { posApi } from '@/services/api/posApi';
import { useAppStore } from '@/store/appStore';
import { useSessionStore } from '@/store/sessionStore';
import { formatCurrency, formatDate, toNumber } from '@/utils/format';

interface CloseSummary {
  cash_session_id: number;
  opening_cash: number;
  cash_sales_total: number;
  transfer_sales_total: number;
  total_change_given: number;
  closing_cash_expected: number;
  closing_cash_counted: number;
  difference: number;
  closed_at: string;
}

export function CashPage() {
  const currentUser = useSessionStore((state) => state.currentUser);
  const currentLocation = useAppStore((state) => state.currentLocation);
  const currentCashSession = useAppStore((state) => state.currentCashSession);
  const setCurrentCashSession = useAppStore((state) => state.setCurrentCashSession);
  const [openingCash, setOpeningCash] = useState(50000);
  const [closingCashCounted, setClosingCashCounted] = useState(0);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [closeSummary, setCloseSummary] = useState<CloseSummary | null>(null);

  useEffect(() => {
    async function loadCurrentCash() {
      try {
        const response = await posApi.getCurrentCash(currentLocation.id);
        setCurrentCashSession(response.current_session);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'No fue posible consultar caja');
      }
    }

    void loadCurrentCash();
  }, [currentLocation.id, setCurrentCashSession]);

  async function handleOpenCash() {
    if (!currentUser) return;
    try {
      setLoading(true);
      setError(null);
      const session = await posApi.openCash({
        location_id: currentLocation.id,
        opened_by: currentUser.id,
        opening_cash: openingCash,
      });
      setCurrentCashSession(session);
      setMessage(`Caja #${session.id} abierta correctamente.`);
      setCloseSummary(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo abrir caja');
    } finally {
      setLoading(false);
    }
  }

  async function handleCloseCash() {
    if (!currentCashSession || !currentUser) return;
    try {
      setLoading(true);
      setError(null);
      const summary = await posApi.closeCash({
        cash_session_id: currentCashSession.id,
        closed_by: currentUser.id,
        closing_cash_counted: closingCashCounted,
      });
      setCloseSummary(summary as CloseSummary);
      setCurrentCashSession(null);
      setMessage(`Caja #${currentCashSession.id} cerrada correctamente.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cerrar caja');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-4">
      <div className="grid gap-4 md:grid-cols-3">
        <SummaryCard
          title="Caja activa"
          value={currentCashSession ? `#${currentCashSession.id}` : 'Sin sesión'}
          hint={currentCashSession ? `Abierta ${formatDate(currentCashSession.openedAt)}` : 'Abre una caja para empezar'}
          icon={<Wallet size={18} />}
        />
        <SummaryCard
          title="Apertura"
          value={
            currentCashSession
              ? formatCurrency(toNumber(currentCashSession.openingCash))
              : formatCurrency(openingCash)
          }
          hint="Efectivo base de la sesión"
          icon={<Landmark size={18} />}
        />
        <SummaryCard
          title="Location"
          value={currentLocation.name}
          hint={`ID ${currentLocation.id}`}
          icon={<Wallet size={18} />}
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

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <p className="text-sm text-slate-400">Operación</p>
          <h2 className="font-display text-2xl font-bold text-white">Apertura de caja</h2>
          <div className="mt-5 grid gap-4">
            <Input
              type="number"
              min={0}
              label="Efectivo inicial"
              value={openingCash}
              onChange={(event) => setOpeningCash(Number(event.target.value))}
            />
            <Button disabled={loading || Boolean(currentCashSession)} onClick={handleOpenCash}>
              {loading ? 'Procesando...' : 'Abrir caja'}
            </Button>
          </div>
        </Card>

        <Card>
          <p className="text-sm text-slate-400">Operación</p>
          <h2 className="font-display text-2xl font-bold text-white">Cierre de caja</h2>
          {!currentCashSession ? (
            <div className="mt-5">
              <EmptyState
                title="No hay caja abierta"
                description="Primero abre una sesión de caja o consulta la última sesión desde backend cuando exista historial."
              />
            </div>
          ) : (
            <div className="mt-5 grid gap-4">
              <Input
                type="number"
                min={0}
                label="Efectivo contado"
                value={closingCashCounted}
                onChange={(event) => setClosingCashCounted(Number(event.target.value))}
              />
              <Button disabled={loading} onClick={handleCloseCash}>
                {loading ? 'Procesando...' : 'Cerrar caja'}
              </Button>
            </div>
          )}
        </Card>
      </div>

      {closeSummary ? (
        <Card>
          <p className="text-sm text-slate-400">Resumen generado por backend</p>
          <h2 className="font-display text-2xl font-bold text-white">Resultado del cierre</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {[
              ['Apertura', formatCurrency(closeSummary.opening_cash)],
              ['Ventas efectivo', formatCurrency(closeSummary.cash_sales_total)],
              ['Ventas transferencia', formatCurrency(closeSummary.transfer_sales_total)],
              ['Cambio entregado', formatCurrency(closeSummary.total_change_given)],
              ['Esperado', formatCurrency(closeSummary.closing_cash_expected)],
              ['Contado', formatCurrency(closeSummary.closing_cash_counted)],
              ['Diferencia', formatCurrency(closeSummary.difference)],
            ].map(([label, value]) => (
              <div key={label} className="rounded-3xl border border-slate-800 bg-slate-950/50 p-4">
                <p className="text-sm text-slate-500">{label}</p>
                <p className="mt-2 font-display text-2xl font-bold text-white">{value}</p>
              </div>
            ))}
          </div>
        </Card>
      ) : null}
    </div>
  );
}
