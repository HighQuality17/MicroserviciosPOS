import '@/features/cash/cash-d2a.css';
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
  // D2A keeps business flow intact and only derives copy/status blocks for the
  // premium layout: hero context, primary opening panel, closing state and summary.
  const closingCashPreview = parseNumberInput(closingCashCountedInput);
  const closingValue =
    closingCashPreview !== null ? formatCurrency(closingCashPreview) : 'Pendiente';
  const openingPanelDescription = currentCashSession
    ? 'Sesion activa para este POS. Revisa el fondo inicial y prepara el cierre cuando termine la operacion.'
    : currentLocation
      ? 'Registra el efectivo inicial o la base para comenzar a operar tu turno.'
      : 'Selecciona un POS valido antes de abrir una nueva sesion.';
  const openingPanelNote = currentCashSession
    ? `Caja #${currentCashSession.id} ya esta operativa. El cierre queda disponible en panel derecho.`
    : currentLocation
      ? 'Define tu base y presiona el boton "Abrir caja".'
      : 'Sin POS activo. Usa encabezado para elegir punto de venta y habilitar apertura.';
  const closingPanelDescription = currentCashSession
    ? 'Confirma el efectivo contado y genera el resumen final de la sesion actual.'
    : 'El cierre quedara listo apenas exista una sesion abierta para este POS.';
  const openingContextItems = [
    {
      label: 'POS activo',
      value: currentLocation?.name ?? 'Sin POS activo',
      meta: currentLocation ? `POS #${currentLocation.id}` : 'Selecciona un POS',
      icon: <MapPin size={16} />,
    },
    {
      label: 'Responsable',
      value: currentUserName,
      meta: `${currentUserRole} · ${currentUserHandle}`,
      icon: <User size={16} />,
    },
  ];
  const closeSessionItems = currentCashSession
    ? [
        {
          label: 'Caja actual',
          value: `Caja #${currentCashSession.id}`,
          meta: 'Sesion operativa',
          icon: <CircleDot size={16} />,
        },
        {
          label: 'Apertura',
          value: formatCurrency(toNumber(currentCashSession.openingCash)),
          meta: 'Fondo inicial registrado',
          icon: <Landmark size={16} />,
        },
        {
          label: 'Abierta',
          value: formatDate(currentCashSession.openedAt),
          meta: currentLocation?.name ?? 'POS activo',
          icon: <Wallet size={16} />,
        },
      ]
    : [];
  const closeEmptyItems = [
    {
      label: 'Estado',
      value: 'Sin sesion activa',
      meta: 'Todavia no hay cierre disponible',
      icon: <CircleDot size={16} />,
    },
    {
      label: 'POS actual',
      value: currentLocation?.name ?? 'Sin POS activo',
      meta: currentLocation ? `POS #${currentLocation.id}` : 'Selecciona un POS',
      icon: <MapPin size={16} />,
    },
    {
      label: 'Siguiente paso',
      value: 'Abrir caja',
      meta: 'Registra fondo inicial para habilitar cierre',
      icon: <Landmark size={16} />,
    },
  ];

  return (
    <div className="cash-page grid min-w-0 gap-5 sm:gap-6">
      {/* Hero keeps POS language and surfaces operational context before actions. */}
      <section className="cash-page__hero">
        <ModuleStatusHeader
          ariaLabel="Estado operativo de caja"
          eyebrow="Operacion de caja"
          title="Caja"
          statusLabel={operationStatusLabel}
          statusTone={cashStatusTone}
          description=""
          helpText="Aqui encontraras el estado de la sesion de caja, el dinero de apertura, la ubicación actúal y el responsable de la operacion."
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
            iconTone={currentUser ? 'info' : 'default'}
            badgeLabel={currentUserRole}
            badgeTone={currentUser ? 'info' : 'default'}
            meta={currentUserHandle}
          />
        </ModuleStatusHeader>
      </section>

      {message ? (
        <FeedbackMessage tone="success" className="cash-feedback">
          {message}
        </FeedbackMessage>
      ) : null}

      {error ? (
        <FeedbackMessage tone="error" className="cash-feedback">
          {error}
        </FeedbackMessage>
      ) : null}

      {/* Workspace: left panel drives opening, right panel resolves close or empty state. */}
      <div className="cash-workspace grid min-w-0 gap-4 sm:gap-5 lg:grid-cols-[minmax(0,1.16fr)_minmax(0,0.84fr)]">
        {!currentLocation ? (
          <Card glow={false} className="cash-alert-card lg:col-span-2">
            <EmptyState
              icon={<MapPin size={20} />}
              title="Sin punto de venta activo"
              description="Crea una ubicacion desde Admin o selecciona un POS valido en el encabezado antes de operar caja."
            />
          </Card>
        ) : null}

        <Card
          padding="none"
          glow={false}
          className="cash-panel cash-panel--open"
          contentClassName="cash-panel__body"
        >
          <div className="cash-panel__hero">
            <SectionHeader
              eyebrow="Operacion principal"
              title="Apertura de caja"
              description={openingPanelDescription}
              actions={
                <StatusBadge
                  label={currentCashSession ? 'Sesion abierta' : cashStatusLabel}
                  tone={cashStatusTone}
                />
              }
              className="cash-panel__heading"
            />
            <div className="cash-panel__spotlight cash-panel__spotlight--open">
              <p className="cash-panel__spotlight-label">Fondo inicial</p>
              <p className="cash-panel__spotlight-value">{openingValue}</p>
              <p className="cash-panel__spotlight-meta">
                {currentCashSession
                  ? 'Registrado para sesion actual'
                  : openingCashPreview !== null
                    ? 'Listo para abrir'
                    : 'Pendiente por definir'}
              </p>
            </div>
          </div>

          <div className="cash-context-grid">
            {openingContextItems.map((item) => (
              <div key={item.label} className="cash-context-item">
                <span className="cash-context-item__icon" aria-hidden="true">
                  {item.icon}
                </span>
                <div className="min-w-0">
                  <p className="cash-context-item__label">{item.label}</p>
                  <p className="cash-context-item__value">{item.value}</p>
                  <p className="cash-context-item__meta">{item.meta}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="cash-form-grid">
            <Input
              type="number"
              min={0}
              label="Efectivo inicial"
              placeholder="Ej: 50000"
              hint="Ingresa el fondo base para arrancar turno con contexto claro y cierre listo."
              wrapperClassName="cash-field"
              labelClassName="cash-field__label"
              fieldClassName="cash-field__shell"
              className="cash-field__control"
              startAdornment={<Landmark size={16} />}
              endAdornment={<span className="cash-field__suffix">COP</span>}
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
              className="cash-panel__cta cash-panel__cta--open"
            >
              {loading ? 'Procesando...' : 'Abrir caja'}
            </Button>
          </div>

          <div className="cash-panel__footnote">
            <p className="cash-panel__footnote-label">Guia rapida</p>
            <p className="cash-panel__footnote-text">{openingPanelNote}</p>
          </div>
        </Card>

        <Card
          padding="none"
          glow={false}
          className="cash-panel cash-panel--close"
          contentClassName="cash-panel__body"
        >
          <div className="cash-panel__hero">
            <SectionHeader
              eyebrow="Operacion final"
              title="Cierre de caja"
              description={closingPanelDescription}
              actions={
                <StatusBadge
                  label={currentCashSession ? 'Disponible' : 'En espera'}
                  tone={currentCashSession ? 'info' : 'default'}
                />
              }
              className="cash-panel__heading"
            />
            <div className="cash-panel__spotlight cash-panel__spotlight--close">
              <p className="cash-panel__spotlight-label">Efectivo contado</p>
              <p className="cash-panel__spotlight-value">
                {currentCashSession ? closingValue : 'Sin sesion'}
              </p>
              <p className="cash-panel__spotlight-meta">
                {currentCashSession
                  ? closingCashPreview !== null
                    ? 'Valor listo para enviar'
                    : 'Ingresa conteo final'
                  : 'Abre caja para habilitar cierre'}
              </p>
            </div>
          </div>

          {!currentCashSession ? (
            <div className="cash-close-empty">
              <div className="cash-close-empty__intro">
                <div className="cash-close-empty__icon" aria-hidden="true">
                  <Wallet size={20} />
                </div>
                <div className="min-w-0">
                  <p className="cash-close-empty__eyebrow">Estado actual</p>
                  <h3 className="cash-close-empty__title">No hay caja abierta</h3>
                  <p className="cash-close-empty__description">
                    Abre una sesion para habilitar cierre, registrar conteo final y ver resumen
                    del turno.
                  </p>
                </div>
              </div>

              <div className="cash-context-grid cash-context-grid--close-empty">
                {closeEmptyItems.map((item) => (
                  <div key={item.label} className="cash-context-item">
                    <span className="cash-context-item__icon" aria-hidden="true">
                      {item.icon}
                    </span>
                    <div className="min-w-0">
                      <p className="cash-context-item__label">{item.label}</p>
                      <p className="cash-context-item__value">{item.value}</p>
                      <p className="cash-context-item__meta">{item.meta}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <>
              <div className="cash-context-grid cash-context-grid--close">
                {closeSessionItems.map((item) => (
                  <div key={item.label} className="cash-context-item">
                    <span className="cash-context-item__icon" aria-hidden="true">
                      {item.icon}
                    </span>
                    <div className="min-w-0">
                      <p className="cash-context-item__label">{item.label}</p>
                      <p className="cash-context-item__value">{item.value}</p>
                      <p className="cash-context-item__meta">{item.meta}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="cash-form-grid cash-form-grid--close">
                <Input
                  type="number"
                  min={0}
                  inputMode="numeric"
                  label="Efectivo contado"
                  placeholder="Ej: 80000"
                  hint="Escribe el valor real contado. El sistema validara el cierre antes de enviarlo."
                  wrapperClassName="cash-field"
                  labelClassName="cash-field__label"
                  fieldClassName="cash-field__shell"
                  className="cash-field__control"
                  startAdornment={<Wallet size={16} />}
                  endAdornment={<span className="cash-field__suffix">COP</span>}
                  value={closingCashCountedInput}
                  onChange={(event) => {
                    const nextValue = normalizeNumberInput(event.target.value);
                    if (nextValue !== null) {
                      setClosingCashCountedInput(nextValue);
                    }
                  }}
                />
                <Button
                  disabled={loading}
                  onClick={handleCloseCash}
                  className="cash-panel__cta cash-panel__cta--close"
                >
                  {loading ? 'Procesando...' : 'Cerrar caja'}
                </Button>
              </div>
            </>
          )}
        </Card>
      </div>

      {closeSummary ? (
        // Summary keeps same premium system so backend-calculated close data feels part of Caja.
        <Card
          padding="none"
          glow={false}
          className="cash-summary-card"
          contentClassName="cash-summary-card__body"
        >
          <SectionHeader
            eyebrow="Resumen calculado por backend"
            title="Resultado del cierre"
            description="Vista final de apertura, ventas, esperado y diferencia para la sesion recien cerrada."
            className="cash-summary-card__heading"
          />
          <div className="cash-summary-grid">
            {[
              ['Apertura', formatCurrency(closeSummary.opening_cash)],
              ['Ventas efectivo', formatCurrency(closeSummary.cash_sales_total)],
              ['Ventas transferencia', formatCurrency(closeSummary.transfer_sales_total)],
              ['Cambio entregado', formatCurrency(closeSummary.total_change_given)],
              ['Esperado', formatCurrency(closeSummary.closing_cash_expected)],
              ['Contado', formatCurrency(closeSummary.closing_cash_counted)],
              ['Diferencia', formatCurrency(closeSummary.difference)],
            ].map(([label, value]) => (
              <div
                key={label}
                className={
                  label === 'Diferencia'
                    ? 'cash-summary-item cash-summary-item--accent'
                    : 'cash-summary-item'
                }
              >
                <p className="cash-summary-item__label">{label}</p>
                <p className="cash-summary-item__value">{value}</p>
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
