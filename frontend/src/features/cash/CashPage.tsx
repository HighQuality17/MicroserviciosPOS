import { useEffect, useState } from 'react';
import { Landmark, Wallet } from 'lucide-react';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { Input } from '@/components/Input';
import { LoadingState } from '@/components/LoadingState';
import { SummaryCard } from '@/components/SummaryCard';
import { posApi } from '@/services/api/posApi';
import { useAppStore } from '@/store/appStore';
import { useSessionStore } from '@/store/sessionStore';
import { formatCurrency, formatDate, toNumber } from '@/utils/format';
import { normalizeNumberInput, parseNumberInput } from '@/utils/numberInput';

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
  const [openingCashInput, setOpeningCashInput] = useState('');
  const [closingCashCountedInput, setClosingCashCountedInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [closeSummary, setCloseSummary] = useState<CloseSummary | null>(null);

  useEffect(() => {
    async function loadCurrentCash() {
      if (!currentLocation) {
        setCurrentCashSession(null);
        return;
      }

      try {
        const response = await posApi.getCurrentCash(currentLocation.id);
        setCurrentCashSession(response.current_session);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'No fue posible consultar caja');
      }
    }

    void loadCurrentCash();
  }, [currentLocation, setCurrentCashSession]);

  async function handleOpenCash() {
    if (!currentUser || !currentLocation) return;
    const openingCash = parseNumberInput(openingCashInput);
    if (openingCash === null || openingCash < 0) {
      setError('Ingresa un efectivo inicial válido.');
      return;
    }

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
    if (!closingCashCountedInput.trim()) {
      setError('Ingresa el efectivo contado antes de cerrar caja.');
      return;
    }

    const closingCashCounted = Number(closingCashCountedInput);
    if (Number.isNaN(closingCashCounted) || closingCashCounted < 0) {
      setError('El efectivo contado debe ser un número válido.');
      return;
    }

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
      setClosingCashCountedInput('');
      setMessage(`Caja #${currentCashSession.id} cerrada correctamente.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cerrar caja');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid min-w-0 gap-4 sm:gap-5">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <SummaryCard
          title="Caja activa"
      value={currentCashSession ? `#${currentCashSession.id}` : 'Sin sesión'}
          hint={
            currentCashSession
              ? `Abierta ${formatDate(currentCashSession.openedAt)}`
              : 'Abre una caja para empezar'
          }
          icon={<Wallet size={18} />}
        />
        <SummaryCard
          title="Apertura"
          value={
            currentCashSession
              ? formatCurrency(toNumber(currentCashSession.openingCash))
              : openingCashInput
                ? formatCurrency(Number(openingCashInput))
                : 'Pendiente'
          }
          hint="Efectivo base de la sesión"
          icon={<Landmark size={18} />}
        />
        <SummaryCard
          title="Ubicación"
          value={currentLocation?.name ?? 'Sin POS activo'}
          hint={currentLocation ? `ID ${currentLocation.id}` : 'Crea o selecciona un punto de venta'}
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

      <div className="grid items-start gap-4 xl:grid-cols-2">
        {!currentLocation ? (
          <Card className="xl:col-span-2">
            <EmptyState
              title="Sin punto de venta activo"
              description="Crea una ubicación desde Admin o selecciona un POS válido en el encabezado antes de operar caja."
            />
          </Card>
        ) : null}

        <Card>
          <p className="text-sm text-slate-400">Operación</p>
          <h2 className="font-display text-2xl font-bold text-white">Apertura de caja</h2>
          <div className="mt-5 grid gap-4">
            <Input
              type="number"
              min={0}
              label="Efectivo inicial"
              placeholder="Ej: 50000"
              value={openingCashInput}
              onChange={(event) => {
                const nextValue = normalizeNumberInput(event.target.value);
                if (nextValue !== null) {
                  setOpeningCashInput(nextValue);
                }
              }}
            />
            <Button
              disabled={
                loading ||
                !currentLocation ||
                Boolean(currentCashSession) ||
                !openingCashInput.trim()
              }
              onClick={handleOpenCash}
            >
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
                description="Primero abre una sesión de caja. Más adelante podrás consultar el historial completo desde esta misma vista."
              />
            </div>
          ) : (
            <div className="mt-5 grid gap-4">
              <Input
                type="number"
                min={0}
                inputMode="numeric"
                label="Efectivo contado"
                placeholder="Ej: 80000"
                hint="Escribe el valor real contado. El sistema validara el cierre antes de enviarlo."
                value={closingCashCountedInput}
                onChange={(event) => {
                  const nextValue = normalizeNumberInput(event.target.value);
                  if (nextValue !== null) {
                    setClosingCashCountedInput(nextValue);
                  }
                }}
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
          <p className="text-sm text-slate-400">Resumen calculado por el backend</p>
          <h2 className="font-display text-2xl font-bold text-white">Resultado del cierre</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
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



