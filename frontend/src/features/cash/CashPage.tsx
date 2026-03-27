import { useEffect, useState } from 'react';
import { CircleDot, Landmark, MapPin, User, Wallet } from 'lucide-react';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { FeedbackMessage } from '@/components/FeedbackMessage';
import { Input } from '@/components/Input';
import { ModuleStatusCard, ModuleStatusHeader } from '@/components/ModuleStatusHeader';
import { SectionHeader } from '@/components/SectionHeader';
import { StatusBadge } from '@/components/StatusBadge';
import { posApi } from '@/services/api/posApi';
import { useAppStore } from '@/store/appStore';
import { useSessionStore } from '@/store/sessionStore';
import type { UserRole } from '@/types/api';
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
      setError('Ingresa un efectivo inicial valido.');
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
      setError('El efectivo contado debe ser un numero valido.');
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

  const openingCashPreview = parseNumberInput(openingCashInput);
  const openingValue = currentCashSession
    ? formatCurrency(toNumber(currentCashSession.openingCash))
    : openingCashPreview !== null
      ? formatCurrency(openingCashPreview)
      : 'Pendiente';
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
    ? 'Caja operativa'
    : currentLocation
      ? 'Lista para apertura'
      : 'Selecciona un POS';
  const openingTone = currentCashSession
    ? 'info'
    : openingCashPreview !== null
      ? 'warning'
      : 'default';
  const openingStatusLabel = currentCashSession
    ? 'Registrada'
    : openingCashPreview !== null
      ? 'Lista'
      : 'Pendiente';
  const currentUserName = currentUser?.name || currentUser?.username || 'Sin usuario';
  const currentUserHandle = currentUser?.username ? `@${currentUser.username}` : 'Sesion actual';
  const currentUserRole = formatUserRole(currentUser?.role);

  return (
    <div className="grid min-w-0 gap-4 sm:gap-5">
      <ModuleStatusHeader
        ariaLabel="Estado operativo de caja"
        eyebrow="Operacion de caja"
        title="Caja"
        statusLabel={operationStatusLabel}
        statusTone={cashStatusTone}
        description="Sesion actual, fondo inicial, POS activo y responsable."
        helpText="Concentra el estado de la sesion de caja, el fondo de apertura y el responsable de la operacion."
        icon={<Wallet size={18} />}
      >
        <ModuleStatusCard
          label="Caja activa"
          value={currentCashSession ? `Caja #${currentCashSession.id}` : 'Sin sesion'}
          icon={<CircleDot size={16} />}
          iconTone={cashStatusTone}
          badgeLabel={cashStatusLabel}
          badgeTone={cashStatusTone}
          meta={
            currentCashSession
              ? `Abierta ${formatDate(currentCashSession.openedAt)}`
              : currentLocation
                ? 'Lista para apertura'
                : 'Selecciona un POS'
          }
        />
        <ModuleStatusCard
          label="Apertura"
          value={openingValue}
          icon={<Landmark size={16} />}
          iconTone={openingTone}
          badgeLabel={openingStatusLabel}
          badgeTone={openingTone}
          meta={
            currentCashSession
              ? 'Fondo inicial registrado'
              : openingCashPreview !== null
                ? 'Listo para abrir'
                : 'Define el efectivo inicial'
          }
        />
        <ModuleStatusCard
          label="Ubicacion"
          value={currentLocation?.name ?? 'Sin POS activo'}
          icon={<MapPin size={16} />}
          iconTone={currentLocation ? 'info' : 'default'}
          badgeLabel={currentLocation ? `POS #${currentLocation.id}` : 'No definido'}
          badgeTone={currentLocation ? 'info' : 'default'}
          meta={currentLocation ? 'POS activo para la sesion' : 'Selecciona un POS'}
        />
        <ModuleStatusCard
          label="Responsable"
          value={currentUserName}
          icon={<User size={16} />}
          iconTone={currentUser ? 'violet' : 'default'}
          badgeLabel={currentUserRole}
          badgeTone={currentUser ? 'info' : 'default'}
          meta={currentUserHandle}
        />
      </ModuleStatusHeader>

      {message ? <FeedbackMessage tone="success">{message}</FeedbackMessage> : null}

      {error ? <FeedbackMessage tone="error">{error}</FeedbackMessage> : null}

      <div className="grid items-start gap-4 xl:grid-cols-2">
        {!currentLocation ? (
          <Card className="xl:col-span-2">
            <EmptyState
              title="Sin punto de venta activo"
              description="Crea una ubicacion desde Admin o selecciona un POS valido en el encabezado antes de operar caja."
            />
          </Card>
        ) : null}

        <Card>
          <SectionHeader
            eyebrow="Operacion"
            title="Apertura de caja"
            description="Registra el efectivo inicial y habilita la operacion diaria para el POS activo."
          />
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
          <SectionHeader
            eyebrow="Operacion"
            title="Cierre de caja"
            description="Confirma el efectivo contado y obten el resumen final de la sesion actual."
          />
          {!currentCashSession ? (
            <div className="mt-5">
              <EmptyState
                title="No hay caja abierta"
                description="Primero abre una sesion de caja. Mas adelante podras consultar el historial completo desde esta misma vista."
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
          <SectionHeader
            eyebrow="Resumen calculado por el backend"
            title="Resultado del cierre"
            description="Vista final de apertura, ventas, esperado y diferencia para la sesion recien cerrada."
          />
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
              <div key={label} className="surface-subtle-strong rounded-3xl p-4">
                <p className="text-sm text-[color:var(--text-faint)]">{label}</p>
                <p className="mt-2 font-display text-2xl font-bold metric-accent">{value}</p>
              </div>
            ))}
          </div>
        </Card>
      ) : null}
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
