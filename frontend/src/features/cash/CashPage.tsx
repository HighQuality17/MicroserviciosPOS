import '@/features/cash/cash-d2a.css';
import { useEffect, useState } from 'react';
import clsx from 'clsx';
import { CircleDot, Landmark, MapPin, User, Wallet } from 'lucide-react';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { FeedbackMessage } from '@/components/FeedbackMessage';
import { Input } from '@/components/Input';
import { ModulePageHeader, type ModulePageHeaderCard } from '@/components/ModulePageHeader';
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

  const hasOpenCashSession = Boolean(currentCashSession);
  const canOpenCash = Boolean(currentLocation && !currentCashSession);
  const openingCashPreview = parseNumberInput(openingCashInput);
  const openingValue = currentCashSession
    ? formatCurrency(toNumber(currentCashSession.openingCash))
    : openingCashPreview !== null
      ? formatCurrency(openingCashPreview)
      : 'Sin definir';
  const cashStatusTone = currentCashSession ? 'success' : 'warning';
  const cashStatusLabel = currentCashSession
    ? 'Abierta'
    : currentLocation
      ? 'Por abrir'
      : 'Sin POS';
  const nextActionLabel = currentCashSession
    ? 'Cerrar caja'
    : currentLocation
      ? 'Abrir caja'
      : 'Seleccionar POS';
  const nextActionNote = currentCashSession
    ? 'Cierre disponible'
    : currentLocation
      ? 'Ingresa fondo inicial'
      : 'POS requerido';
  const openingTone = currentCashSession
    ? 'success'
    : openingCashPreview !== null
      ? 'info'
      : currentLocation
        ? 'warning'
        : 'default';
  const openingStatusLabel = currentCashSession
    ? 'Registrada'
    : openingCashPreview !== null
      ? 'Ingresado'
      : 'Pendiente';
  const currentUserName = currentUser?.name || currentUser?.username || 'Sin usuario';
  const currentUserRole = formatUserRole(currentUser?.role);
  const responsibleBadgeLabel = currentUser
    ? currentUserName.trim().toLowerCase() === currentUserRole.trim().toLowerCase()
      ? 'Activo'
      : currentUserRole
    : 'Sin usuario';
  const closingCashPreview = parseNumberInput(closingCashCountedInput);
  const closingValue =
    closingCashPreview !== null ? formatCurrency(closingCashPreview) : 'Pendiente';
  const locationValue = currentLocation?.name ?? 'Sin POS';
  const closeSessionItems = currentCashSession
    ? [
        {
          label: 'Caja',
          value: `#${currentCashSession.id}`,
          meta: 'Abierta',
          icon: <CircleDot size={16} />,
        },
        {
          label: 'Apertura',
          value: formatCurrency(toNumber(currentCashSession.openingCash)),
          meta: 'Fondo inicial',
          icon: <Landmark size={16} />,
        },
        {
          label: 'Inicio',
          value: formatDate(currentCashSession.openedAt),
          meta: locationValue,
          icon: <Wallet size={16} />,
        },
      ]
    : [];
  const cashHeroSummaryLabel = 'Siguiente accion';
  const cashHeroSummaryValue = nextActionLabel;
  const cashHeroSummaryNote = nextActionNote;
  const cashHeaderCards: ModulePageHeaderCard[] = [
    {
      label: 'Estado',
      value: currentCashSession ? `Caja #${currentCashSession.id}` : 'Sin sesion',
      note: currentCashSession ? formatDate(currentCashSession.openedAt) : undefined,
      accent: cashStatusTone,
      icon: <CircleDot size={16} />,
      iconTone: cashStatusTone,
      badge: {
        label: cashStatusLabel,
        tone: cashStatusTone,
      },
    },
    {
      label: 'POS',
      value: locationValue,
      accent: currentLocation ? ('info' as const) : ('warning' as const),
      icon: <MapPin size={16} />,
      iconTone: currentLocation ? 'info' : 'warning',
      badge: {
        label: currentLocation ? `#${currentLocation.id}` : 'Requerido',
        tone: currentLocation ? 'info' : 'warning',
      },
    },
    {
      label: 'Responsable',
      value: currentUserName,
      accent: currentUser ? ('teal' as const) : ('default' as const),
      icon: <User size={16} />,
      iconTone: currentUser ? 'info' : 'default',
      badge: {
        label: responsibleBadgeLabel,
        tone: currentUser ? 'info' : 'default',
      },
    },
    {
      label: 'Fondo inicial',
      value: openingValue,
      accent: openingTone,
      icon: <Landmark size={16} />,
      iconTone: openingTone,
      badge: {
        label: openingStatusLabel,
        tone: openingTone,
      },
    },
  ];

  return (
    <div className="cash-page grid min-w-0 gap-4 sm:gap-5">
      <ModulePageHeader
        ariaLabel="Estado operativo de caja"
        eyebrow="Operacion"
        title="Caja"
        icon={<Wallet size={18} />}
        badges={[{ label: cashStatusLabel, tone: cashStatusTone }]}
        summary={{
          label: cashHeroSummaryLabel,
          value: cashHeroSummaryValue,
          note: cashHeroSummaryNote,
        }}
        cards={cashHeaderCards}
      />
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

      <div className="cash-workspace grid min-w-0 gap-4 sm:gap-5 lg:grid-cols-[minmax(0,1.16fr)_minmax(0,0.84fr)]">
        {!currentLocation ? (
          <Card glow={false} className="cash-alert-card lg:col-span-2">
            <EmptyState
              icon={<MapPin size={20} />}
              title="Selecciona un POS"
              description="La apertura se habilita con un punto de venta activo."
            />
          </Card>
        ) : null}

        <Card
          padding="none"
          glow={false}
          className={clsx(
            'cash-panel cash-panel--open',
            canOpenCash && 'cash-panel--primary',
            hasOpenCashSession && 'cash-panel--locked',
          )}
          contentClassName="cash-panel__body"
        >
          <div className="cash-panel__hero">
            <SectionHeader
              eyebrow="Apertura"
              title={hasOpenCashSession ? 'Caja abierta' : 'Abrir caja'}
              actions={
                <StatusBadge
                  label={currentCashSession ? 'Abierta' : cashStatusLabel}
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
                  ? 'Registrado'
                  : openingCashPreview !== null
                    ? 'Ingresado'
                    : 'Por ingresar'}
              </p>
            </div>
          </div>

          <div className="cash-form-grid">
            <Input
              type="number"
              min={0}
              label="Efectivo inicial"
              placeholder="Ej: 50000"
              disabled={loading || !canOpenCash}
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
        </Card>

        <Card
          padding="none"
          glow={false}
          className={clsx(
            'cash-panel cash-panel--close',
            !hasOpenCashSession && 'cash-panel--secondary',
          )}
          contentClassName="cash-panel__body"
        >
          <div className="cash-panel__hero">
            <SectionHeader
              eyebrow="Cierre"
              title="Cerrar caja"
              actions={
                <StatusBadge
                  label={currentCashSession ? 'Disponible' : 'En espera'}
                  tone={currentCashSession ? 'success' : 'default'}
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
                    ? 'Listo'
                    : 'Por contar'
                  : 'En espera'}
              </p>
            </div>
          </div>

          {!currentCashSession ? (
            <div className="cash-close-empty" aria-live="polite">
              <div className="cash-close-empty__intro">
                <div className="cash-close-empty__icon" aria-hidden="true">
                  <Wallet size={20} />
                </div>
                <div className="min-w-0">
                  <p className="cash-close-empty__eyebrow">Cierre</p>
                  <h3 className="cash-close-empty__title">No disponible</h3>
                  <p className="cash-close-empty__description">
                    Abre caja para habilitar el cierre.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div
                className="cash-session-strip cash-session-strip--close"
                aria-label="Caja abierta"
              >
                {closeSessionItems.map((item) => (
                  <div key={item.label} className="cash-session-pill">
                    <span className="cash-session-pill__icon" aria-hidden="true">
                      {item.icon}
                    </span>
                    <div className="min-w-0">
                      <p className="cash-session-pill__label">{item.label}</p>
                      <p className="cash-session-pill__value">{item.value}</p>
                      <p className="cash-session-pill__meta">{item.meta}</p>
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
        <Card
          padding="none"
          glow={false}
          className="cash-summary-card"
          contentClassName="cash-summary-card__body"
        >
          <SectionHeader
            eyebrow="Resumen"
            title="Cierre realizado"
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
