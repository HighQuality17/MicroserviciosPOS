import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Boxes,
  CreditCard,
  PackageSearch,
  Receipt,
  ShoppingBag,
  Sparkles,
  Wallet,
} from 'lucide-react';
import { AdminChartCard } from '@/components/AdminChartCard';
import { AlertCard } from '@/components/AlertCard';
import { AccessState } from '@/components/AccessState';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { FeedbackMessage } from '@/components/FeedbackMessage';
import { Input } from '@/components/Input';
import { KpiCard } from '@/components/KpiCard';
import { ModuleStatusCard, ModuleStatusHeader } from '@/components/ModuleStatusHeader';
import { RoleModeBanner } from '@/components/RoleModeBanner';
import { ScrollPanel } from '@/components/ScrollPanel';
import { SectionHeader } from '@/components/SectionHeader';
import { StatusBadge } from '@/components/StatusBadge';
import { usePermissions } from '@/hooks/usePermissions';
import { posApi } from '@/services/api/posApi';
import { useAppStore } from '@/store/appStore';
import { formatCurrency, formatDate } from '@/utils/format';
import { isAccessDeniedError, translateProtectedError } from '@/utils/apiError';
import type {
  AdminLowStockItem,
  AdminRecentActivityItem,
  AdminSalesByPaymentItem,
  AdminSummary,
  AdminTopItem,
  PaymentMethod,
} from '@/types/api';

type BadgeTone = 'default' | 'success' | 'warning' | 'danger' | 'info';

function BlockError({ message }: { message: string }) {
  return <FeedbackMessage tone="error">{message}</FeedbackMessage>;
}

function SkeletonRows({ rows = 4 }: { rows?: number }) {
  return (
    <div className="grid gap-3">
      {Array.from({ length: rows }).map((_, index) => (
        <div
          key={index}
          className="data-list-card h-20 animate-pulse rounded-3xl"
        />
      ))}
    </div>
  );
}

export function AdminPage() {
  const { isAdmin, isAuditor, can } = usePermissions();
  const availableLocations = useAppStore((state) => state.availableLocations);
  const locationsLoading = useAppStore((state) => state.locationsLoading);
  const locationsError = useAppStore((state) => state.locationsError);
  const setAvailableLocations = useAppStore((state) => state.setAvailableLocations);
  const setLocationsLoading = useAppStore((state) => state.setLocationsLoading);
  const setLocationsError = useAppStore((state) => state.setLocationsError);
  const [summary, setSummary] = useState<AdminSummary | null>(null);
  const [salesByPayment, setSalesByPayment] = useState<AdminSalesByPaymentItem[]>([]);
  const [topItems, setTopItems] = useState<AdminTopItem[]>([]);
  const [lowStock, setLowStock] = useState<AdminLowStockItem[]>([]);
  const [recentActivity, setRecentActivity] = useState<AdminRecentActivityItem[]>([]);

  const [summaryLoading, setSummaryLoading] = useState(true);
  const [salesByPaymentLoading, setSalesByPaymentLoading] = useState(true);
  const [topItemsLoading, setTopItemsLoading] = useState(true);
  const [lowStockLoading, setLowStockLoading] = useState(true);
  const [recentActivityLoading, setRecentActivityLoading] = useState(true);

  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [salesByPaymentError, setSalesByPaymentError] = useState<string | null>(null);
  const [topItemsError, setTopItemsError] = useState<string | null>(null);
  const [lowStockError, setLowStockError] = useState<string | null>(null);
  const [recentActivityError, setRecentActivityError] = useState<string | null>(null);
  const [locationName, setLocationName] = useState('');
  const [locationMessage, setLocationMessage] = useState<string | null>(null);
  const [locationSubmitError, setLocationSubmitError] = useState<string | null>(null);
  const [creatingLocation, setCreatingLocation] = useState(false);
  const [summaryAccessDenied, setSummaryAccessDenied] = useState(false);

  useEffect(() => {
    void loadDashboard();
  }, []);

  async function loadDashboard() {
    void loadSummary();
    void loadSalesByPayment();
    void loadTopItems();
    void loadLowStock();
    void loadRecentActivity();
  }

  async function refreshLocations() {
    try {
      setLocationsLoading(true);
      setLocationsError(null);
      const locations = await posApi.getLocations();
      setAvailableLocations(locations);
    } catch (error) {
      setLocationsError(
        error instanceof Error
          ? error.message
          : 'No fue posible cargar los puntos de venta',
      );
    } finally {
      setLocationsLoading(false);
    }
  }

  async function handleCreateLocation() {
    if (!locationName.trim()) {
      setLocationSubmitError('Escribe el nombre del punto de venta.');
      return;
    }

    try {
      setCreatingLocation(true);
      setLocationSubmitError(null);
      setLocationMessage(null);
      const location = await posApi.createLocation({ name: locationName.trim() });
      setLocationName('');
      setLocationMessage(`Punto de venta ${location.name} creado correctamente.`);
      await refreshLocations();
    } catch (error) {
      setLocationSubmitError(
        error instanceof Error
          ? error.message
          : 'No fue posible crear el punto de venta',
      );
    } finally {
      setCreatingLocation(false);
    }
  }

  async function loadSummary() {
    try {
      setSummaryLoading(true);
      setSummaryError(null);
      setSummaryAccessDenied(false);
      setSummary(await posApi.getAdminSummary());
    } catch (error) {
      setSummaryAccessDenied(isAccessDeniedError(error));
      setSummaryError(
        error instanceof Error
          ? translateProtectedError(error, 'No fue posible cargar el resumen')
          : 'No fue posible cargar el resumen',
      );
    } finally {
      setSummaryLoading(false);
    }
  }

  async function loadSalesByPayment() {
    try {
      setSalesByPaymentLoading(true);
      setSalesByPaymentError(null);
      const response = await posApi.getAdminSalesByPayment();
      setSalesByPayment(response.items);
    } catch (error) {
      setSalesByPaymentError(
        error instanceof Error
          ? error.message
          : 'No fue posible cargar ventas por metodo de pago',
      );
    } finally {
      setSalesByPaymentLoading(false);
    }
  }

  async function loadTopItems() {
    try {
      setTopItemsLoading(true);
      setTopItemsError(null);
      const response = await posApi.getAdminTopItems();
      setTopItems(response.items);
    } catch (error) {
      setTopItemsError(
        error instanceof Error
          ? error.message
          : 'No fue posible cargar el top de items',
      );
    } finally {
      setTopItemsLoading(false);
    }
  }

  async function loadLowStock() {
    try {
      setLowStockLoading(true);
      setLowStockError(null);
      setLowStock(await posApi.getAdminLowStock());
    } catch (error) {
      setLowStockError(
        error instanceof Error
          ? error.message
          : 'No fue posible cargar stock bajo',
      );
    } finally {
      setLowStockLoading(false);
    }
  }

  async function loadRecentActivity() {
    try {
      setRecentActivityLoading(true);
      setRecentActivityError(null);
      const response = await posApi.getAdminRecentActivity();
      setRecentActivity(response.items);
    } catch (error) {
      setRecentActivityError(
        error instanceof Error
          ? error.message
          : 'No fue posible cargar actividad reciente',
      );
    } finally {
      setRecentActivityLoading(false);
    }
  }

  const paymentMethodData = useMemo(
    () =>
      salesByPayment
        .filter((item) => item.total > 0)
        .map((item) => ({
          label: item.method === 'CASH' ? 'Efectivo' : 'Transferencia',
          value: item.total,
          color: item.method === 'CASH' ? 'var(--success)' : 'var(--info)',
        })),
    [salesByPayment],
  );

  const topItemsData = useMemo(
    () =>
      topItems.map((item, index) => ({
        label: `${item.name} - ${item.item_type === 'VARIANT' ? 'Variante' : 'Combo'}`,
        value: item.qty_sold,
        color: index % 2 === 0 ? 'var(--chart-series-default)' : 'var(--chart-series-alt)',
      })),
    [topItems],
  );
  const currentCashSessionLabel = summary?.current_cash_session
    ? `Abierta #${summary.current_cash_session.id}`
    : 'Sin sesion';
  const totalLocations = availableLocations.length;
  const leadingPayment = useMemo(() => {
    if (salesByPayment.length === 0) return null;
    return [...salesByPayment].sort((left, right) => right.total - left.total)[0] ?? null;
  }, [salesByPayment]);
  const featuredTopItem = topItems[0] ?? null;
  const latestActivity = recentActivity[0] ?? null;

  const dashboardStatusTone: BadgeTone = summaryAccessDenied
    ? 'warning'
    : summaryLoading || salesByPaymentLoading || topItemsLoading || lowStockLoading || recentActivityLoading
      ? 'info'
      : summary
        ? 'success'
        : 'default';
  const dashboardStatusLabel = summaryAccessDenied
    ? 'Acceso parcial'
    : summaryLoading || salesByPaymentLoading || topItemsLoading || lowStockLoading || recentActivityLoading
      ? 'Sincronizando'
      : summary
        ? 'Centro listo'
        : 'Sin datos';
  const salesStatusTone: BadgeTone = summaryLoading
    ? 'info'
    : (summary?.sales_count ?? 0) > 0
      ? 'success'
      : 'default';
  const salesStatusLabel = summaryLoading
    ? 'Actualizando'
    : (summary?.sales_count ?? 0) > 0
      ? 'Ritmo activo'
      : 'Sin ventas';
  const averageTicketTone: BadgeTone = summaryLoading
    ? 'info'
    : leadingPayment
      ? 'info'
      : 'default';
  const averageTicketLabel = summaryLoading
    ? 'Calculando'
    : leadingPayment
      ? 'Mix disponible'
      : 'Sin pagos';
  const cashStatusTone: BadgeTone = summaryLoading
    ? 'info'
    : summary?.current_cash_session
      ? 'success'
      : 'warning';
  const cashStatusLabel = summaryLoading
    ? 'Consultando'
    : summary?.current_cash_session
      ? 'Caja operativa'
      : 'Sin apertura';
  const stockStatusTone: BadgeTone = summaryLoading || lowStockLoading
    ? 'info'
    : (summary?.low_stock_count ?? 0) > 0
      ? 'warning'
      : 'success';
  const stockStatusLabel = summaryLoading || lowStockLoading
    ? 'Verificando'
    : (summary?.low_stock_count ?? 0) > 0
      ? 'Requiere atencion'
      : 'Controlado';
  const overviewTone: BadgeTone = summaryLoading
    ? 'info'
    : isAdmin
      ? 'success'
      : 'info';
  const overviewLabel = summaryLoading
    ? 'Sincronizando'
    : isAdmin
      ? 'Modo administrador'
      : 'Vista ejecutiva';
  const pulseTone: BadgeTone = recentActivityLoading
    ? 'info'
    : latestActivity || featuredTopItem || leadingPayment
      ? 'success'
      : 'default';
  const pulseLabel = recentActivityLoading
    ? 'Actualizando'
    : latestActivity || featuredTopItem || leadingPayment
      ? 'Panel vivo'
      : 'Esperando datos';
  const alertsTone: BadgeTone = summaryLoading || lowStockLoading
    ? 'info'
    : (summary?.low_stock_count ?? 0) > 0
      ? 'warning'
      : 'success';
  const alertsLabel = summaryLoading || lowStockLoading
    ? 'Sincronizando'
    : (summary?.low_stock_count ?? 0) > 0
      ? 'Alertas activas'
      : 'Sin alertas';
  const activityTone: BadgeTone = recentActivityLoading
    ? 'info'
    : recentActivity.length > 0
      ? 'success'
      : 'default';
  const activityLabel = recentActivityLoading
    ? 'Actualizando'
    : recentActivity.length > 0
      ? 'Eventos listos'
      : 'Sin movimiento';
  const locationsTone: BadgeTone = locationsLoading
    ? 'info'
    : totalLocations > 0
      ? 'info'
      : 'default';
  const locationsLabel = locationsLoading
    ? 'Actualizando'
    : totalLocations > 0
      ? 'Cobertura lista'
      : 'Sin POS';

  return (
    <div className="grid min-w-0 gap-5 sm:gap-6">
      {isAuditor ? (
        <RoleModeBanner
          title="Panel en modo auditoria"
          description="Este dashboard es de solo lectura para el rol AUDITOR. Puedes revisar metricas, alertas y actividad reciente sin ejecutar acciones operativas."
          tone="warning"
        />
      ) : null}

      <ModuleStatusHeader
        ariaLabel="Estado general del dashboard administrativo"
        eyebrow="Centro de control"
        title="Dashboard administrativo"
        statusLabel={dashboardStatusLabel}
        statusTone={dashboardStatusTone}
        description="Ventas, caja, inventario y actividad clave del dia."
        helpText="Entrega una lectura ejecutiva rapida de ventas, caja, stock bajo y actividad reciente desde el primer vistazo."
        icon={<Sparkles size={18} />}
      >
        <ModuleStatusCard
          label="Ventas de hoy"
          value={summaryLoading ? '...' : formatCurrency(summary?.sales_today_total ?? 0)}
          icon={<ShoppingBag size={16} />}
          iconTone={(summary?.sales_count ?? 0) > 0 ? 'success' : 'default'}
          badgeLabel={salesStatusLabel}
          badgeTone={salesStatusTone}
          meta={summaryLoading ? 'Sincronizando jornada' : `${summary?.sales_count ?? 0} ventas pagadas`}
        />
        <ModuleStatusCard
          label="Ticket promedio"
          value={summaryLoading ? '...' : formatCurrency(summary?.average_ticket ?? 0)}
          icon={<Sparkles size={16} />}
          iconTone={leadingPayment ? 'info' : 'default'}
          badgeLabel={averageTicketLabel}
          badgeTone={averageTicketTone}
          meta={
            summaryLoading
              ? 'Calculando promedio'
              : leadingPayment
                ? `Dominante: ${formatPaymentMethod(leadingPayment.method)}`
                : 'Sin pagos confirmados'
          }
        />
        <ModuleStatusCard
          label="Caja actual"
          value={summaryLoading ? '...' : currentCashSessionLabel}
          icon={<CreditCard size={16} />}
          iconTone={summary?.current_cash_session ? 'success' : 'warning'}
          badgeLabel={cashStatusLabel}
          badgeTone={cashStatusTone}
          meta={
            summaryLoading
              ? 'Consultando caja actual'
              : summary?.current_cash_session
                ? `${summary.current_cash_session.location_name} - ${summary.current_cash_session.opened_by_name}`
                : 'Sin caja abierta'
          }
        />
        <ModuleStatusCard
          label="Stock bajo"
          value={summaryLoading ? '...' : String(summary?.low_stock_count ?? 0)}
          icon={<AlertTriangle size={16} />}
          iconTone={(summary?.low_stock_count ?? 0) > 0 ? 'warning' : 'success'}
          badgeLabel={stockStatusLabel}
          badgeTone={stockStatusTone}
          meta={
            summaryLoading || lowStockLoading
              ? 'Verificando alertas'
              : lowStock.length > 0
                ? `${lowStock[0].ingredient_name} en ${lowStock[0].location_name}`
                : 'Sin alertas de inventario'
          }
        />
      </ModuleStatusHeader>

      {summaryError ? <BlockError message={summaryError} /> : null}

      {summaryAccessDenied ? (
        <AccessState description="Tu perfil actual no tiene permiso para consultar el dashboard administrativo." />
      ) : null}

      <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1.12fr)_minmax(0,0.88fr)] xl:items-stretch 2xl:gap-6">
        <Card className="overflow-hidden xl:min-h-[38rem]">
          <div className="panel-top-glow absolute inset-x-0 top-0 h-24" />
          <SectionHeader
            eyebrow="Resumen ejecutivo"
            title="Panorama del negocio"
            description="Lectura principal de ventas, cobertura operativa y capacidad comercial para abrir la jornada con contexto claro."
            actions={<StatusBadge label={overviewLabel} tone={overviewTone} />}
          />

          <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1.03fr)_minmax(0,0.97fr)] xl:min-h-[31rem]">
            <div className="grid auto-rows-fr gap-4 sm:grid-cols-2 [&>*]:h-full">
              <KpiCard
                title="Numero de ventas"
                value={summaryLoading ? '...' : String(summary?.sales_count ?? 0)}
                hint="Ventas pagadas confirmadas en la jornada actual"
                icon={<Receipt size={18} />}
                tone={(summary?.sales_count ?? 0) > 0 ? 'success' : 'default'}
              />
              <KpiCard
                title="Productos activos"
                value={summaryLoading ? '...' : String(summary?.active_products_count ?? 0)}
                hint="Catalogo disponible para venta, combos y administracion"
                icon={<Boxes size={18} />}
              />
              <KpiCard
                title="POS disponibles"
                value={locationsLoading ? '...' : String(totalLocations)}
                hint="Puntos de venta listos para operar caja, inventario y ventas"
                icon={<CreditCard size={18} />}
                tone={totalLocations > 0 ? 'info' : 'default'}
              />
              <KpiCard
                title="Efectivo base"
                value={summaryLoading ? '...' : summary?.current_cash_session ? formatCurrency(summary.current_cash_session.opening_cash) : 'Sin caja'}
                hint={summary?.current_cash_session ? 'Monto de apertura de la caja activa' : 'Abre una caja para definir efectivo inicial'}
                icon={<Wallet size={18} />}
                tone={summary?.current_cash_session ? 'info' : 'warning'}
              />
            </div>

            <div className="surface-subtle-strong flex h-full flex-col rounded-[1.8rem] p-6">
              <p className="section-kicker">Lectura central</p>
              <h3 className="mt-3 font-display text-2xl font-bold theme-text-strong">Centro de lectura</h3>
              <p className="mt-2 text-sm text-[color:var(--text-secondary)]">
                Resume lo que mas importa para decidir rapido sin perder el contexto operativo del negocio.
              </p>

              <div className="mt-6 grid flex-1 gap-3.5">
                <div className="data-list-card flex min-h-[7.5rem] flex-col justify-between rounded-2xl px-4 py-4">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-[color:var(--text-faint)]">Metodo dominante</p>
                  <p className="mt-2 font-medium theme-text-strong">
                    {leadingPayment ? formatPaymentMethod(leadingPayment.method) : 'Sin pagos confirmados'}
                  </p>
                  <p className="mt-1 text-sm text-[color:var(--text-secondary)]">
                    {leadingPayment ? formatCurrency(leadingPayment.total) : 'Todavia sin distribucion reciente'}
                  </p>
                </div>
                <div className="data-list-card flex min-h-[7.5rem] flex-col justify-between rounded-2xl px-4 py-4">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-[color:var(--text-faint)]">Item lider</p>
                  <p className="mt-2 font-medium theme-text-strong">{featuredTopItem ? featuredTopItem.name : 'Sin ranking comercial'}</p>
                  <p className="mt-1 text-sm text-[color:var(--text-secondary)]">
                    {featuredTopItem ? `${featuredTopItem.qty_sold.toLocaleString('es-CO')} unidades vendidas` : 'El ranking aparecera con ventas confirmadas'}
                  </p>
                </div>
                <div className="grid auto-rows-fr gap-3.5 sm:grid-cols-2 [&>*]:h-full">
                  <div className="surface-subtle flex min-h-[7.5rem] flex-col justify-between rounded-2xl px-4 py-4">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--text-faint)]">Ultima actividad</p>
                    <p className="mt-2 font-medium theme-text-strong">{latestActivity ? latestActivity.title : 'Sin eventos recientes'}</p>
                    <p className="mt-1 text-sm text-[color:var(--text-secondary)]">
                      {latestActivity ? formatDate(latestActivity.created_at) : 'La actividad aparecera cuando existan movimientos'}
                    </p>
                  </div>
                  <div className="surface-subtle flex min-h-[7.5rem] flex-col justify-between rounded-2xl px-4 py-4">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--text-faint)]">Cobertura POS</p>
                    <p className="mt-2 font-medium theme-text-strong">{locationsLoading ? 'Actualizando...' : `${totalLocations} POS listos`}</p>
                    <p className="mt-1 text-sm text-[color:var(--text-secondary)]">
                      {totalLocations > 0 ? 'Infraestructura disponible para operar' : 'Crea el primer POS para habilitar cobertura'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Card>

        <Card className="overflow-hidden xl:min-h-[38rem]">
          <SectionHeader
            eyebrow="Pulso ejecutivo"
            title="Radar del negocio"
            description="Senales directas para entender si la operacion esta lista, si hay fricciones y donde conviene mirar primero."
            actions={<StatusBadge label={pulseLabel} tone={pulseTone} />}
          />

          <div className="mt-6 flex flex-col gap-4 xl:min-h-[31rem]">
            <div className="surface-subtle-strong rounded-[1.8rem] p-6">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge label={locationsLabel} tone={locationsTone} />
                <StatusBadge label={alertsLabel} tone={alertsTone} />
                <StatusBadge label={activityLabel} tone={activityTone} />
              </div>
              <p className="mt-4 text-sm leading-6 text-[color:var(--text-secondary)]">
                El panel concentra ventas del dia, situacion de caja, alertas de inventario y senales recientes para que el administrador tenga una primera impresion confiable desde el ingreso.
              </p>
            </div>

            <div className="grid auto-rows-fr gap-3.5 sm:grid-cols-2 [&>*]:h-full">
              <div className="data-list-card rounded-3xl p-4">
                <p className="text-[11px] uppercase tracking-[0.2em] text-[color:var(--text-faint)]">Caja</p>
                <p className="mt-2 font-medium theme-text-strong">{summary?.current_cash_session ? summary.current_cash_session.location_name : 'Sin caja abierta'}</p>
                <p className="mt-1 text-sm text-[color:var(--text-secondary)]">
                  {summary?.current_cash_session ? `Abierta por ${summary.current_cash_session.opened_by_name}` : 'Abre una caja para iniciar operacion'}
                </p>
              </div>
              <div className="data-list-card rounded-3xl p-4">
                <p className="text-[11px] uppercase tracking-[0.2em] text-[color:var(--text-faint)]">Stock</p>
                <p className="mt-2 font-medium theme-text-strong">{(summary?.low_stock_count ?? 0) > 0 ? 'Atencion requerida' : 'Controlado'}</p>
                <p className="mt-1 text-sm text-[color:var(--text-secondary)]">
                  {lowStock.length > 0 ? `${lowStock.length} ingredientes por revisar` : 'Sin ingredientes por debajo del umbral'}
                </p>
              </div>
              <div className="data-list-card rounded-3xl p-4">
                <p className="text-[11px] uppercase tracking-[0.2em] text-[color:var(--text-faint)]">Catalogo</p>
                <p className="mt-2 font-medium theme-text-strong">{summaryLoading ? 'Sincronizando...' : `${summary?.active_products_count ?? 0} activos`}</p>
                <p className="mt-1 text-sm text-[color:var(--text-secondary)]">Base comercial disponible para POS, combos y ventas</p>
              </div>
              <div className="data-list-card rounded-3xl p-4">
                <p className="text-[11px] uppercase tracking-[0.2em] text-[color:var(--text-faint)]">Actividad</p>
                <p className="mt-2 font-medium theme-text-strong">{latestActivity ? formatActivityType(latestActivity.activity_type) : 'Sin eventos'}</p>
                <p className="mt-1 text-sm text-[color:var(--text-secondary)]">
                  {latestActivity ? latestActivity.subtitle : 'La trazabilidad aparecera con movimientos reales'}
                </p>
              </div>
            </div>
          </div>
        </Card>
      </div>
      <div className="grid min-w-0 gap-5 xl:grid-cols-2 xl:items-stretch">
        {salesByPaymentError ? (
          <Card>
            <SectionHeader
              eyebrow="Analitica"
              title="Ventas por metodo de pago"
              description="Distribucion operativa reciente del ingreso registrado."
            />
            <div className="mt-6">
              <BlockError message={salesByPaymentError} />
            </div>
          </Card>
        ) : salesByPaymentLoading ? (
          <Card>
            <SectionHeader
              eyebrow="Analitica"
              title="Ventas por metodo de pago"
              description="Distribucion operativa reciente del ingreso registrado."
            />
            <div className="mt-6">
              <SkeletonRows rows={3} />
            </div>
          </Card>
        ) : (
          <AdminChartCard
            title="Ventas por metodo de pago"
            description="Distribucion operativa reciente del ingreso registrado."
            data={paymentMethodData}
            chartType="pie"
            valueFormat="currency"
            emptyTitle="Sin ventas por metodo registradas"
            emptyDescription="Aparecera informacion cuando existan pagos confirmados."
            footer={
              <p className="text-xs text-[color:var(--text-faint)]">
                Totales reales agregados desde pagos registrados.
              </p>
            }
          />
        )}

        {topItemsError ? (
          <Card>
            <SectionHeader
              eyebrow="Analitica"
              title="Productos mas vendidos"
              description="Ranking real de items vendidos en la operacion."
            />
            <div className="mt-6">
              <BlockError message={topItemsError} />
            </div>
          </Card>
        ) : topItemsLoading ? (
          <Card>
            <SectionHeader
              eyebrow="Analitica"
              title="Productos mas vendidos"
              description="Ranking real de items vendidos en la operacion."
            />
            <div className="mt-6">
              <SkeletonRows rows={4} />
            </div>
          </Card>
        ) : (
          <AdminChartCard
            title="Productos mas vendidos"
            description="Ranking real de items vendidos en la operacion."
            data={topItemsData}
            chartType="bar"
            valueFormat="number"
            emptyTitle="Sin items vendidos"
            emptyDescription="El ranking aparecera cuando existan ventas pagadas."
            footer={
              <p className="text-xs text-[color:var(--text-faint)]">
                Incluye variantes y combos vendidos segun el backend.
              </p>
            }
          />
        )}
      </div>

      <div className="grid min-w-0 gap-5 xl:grid-cols-[0.94fr_1.06fr] xl:items-stretch">
        <Card>
          <SectionHeader
            eyebrow="Alertas"
            title="Estado operativo"
            description="Senales rapidas sobre caja, inventario y disponibilidad comercial."
            actions={<StatusBadge label={alertsLabel} tone={alertsTone} />}
          />

          <div className="mt-6 grid gap-3">
            {summaryLoading ? (
              <SkeletonRows rows={4} />
            ) : (
              <>
                <AlertCard
                  title={summary?.current_cash_session ? 'Caja abierta' : 'Caja cerrada'}
                  description={
                    summary?.current_cash_session
                      ? `Sesion #${summary.current_cash_session.id} activa en ${summary.current_cash_session.location_name}.`
                      : 'No hay una sesion de caja activa en este momento.'
                  }
                  tone={summary?.current_cash_session ? 'success' : 'warning'}
                  icon={<Wallet size={18} />}
                />

                {lowStockError ? (
                  <BlockError message={lowStockError} />
                ) : lowStockLoading ? (
                  <SkeletonRows rows={2} />
                ) : lowStock.length === 0 ? (
                  <AlertCard
                    title="Sin alertas de stock bajo"
                    description="No hay ingredientes por debajo del umbral configurado."
                    tone="success"
                    icon={<PackageSearch size={18} />}
                  />
                ) : (
                  lowStock.slice(0, 3).map((item) => (
                    <AlertCard
                      key={`${item.ingredient_id}-${item.location_id}`}
                      title={item.ingredient_name}
                      description={`${item.location_name} - ${item.qty_on_hand_base} en base - umbral ${item.threshold}`}
                      tone="warning"
                      icon={<AlertTriangle size={18} />}
                    />
                  ))
                )}

                <AlertCard
                  title={(summary?.sales_count ?? 0) > 0 ? 'Ventas recientes disponibles' : 'Sin ventas registradas hoy'}
                  description={
                    (summary?.sales_count ?? 0) > 0
                      ? `${summary?.sales_count ?? 0} ventas pagadas registradas hoy.`
                      : 'Todavia no hay ventas pagadas para el dia actual.'
                  }
                  tone={(summary?.sales_count ?? 0) > 0 ? 'info' : 'warning'}
                  icon={<Receipt size={18} />}
                />
              </>
            )}
          </div>
        </Card>

        <Card>
          <SectionHeader
            eyebrow="Actividad"
            title="Actividad reciente"
            description="Eventos operativos recientes generados por ventas, caja y ajustes de stock."
            actions={<StatusBadge label={activityLabel} tone={activityTone} />}
          />

          {recentActivityError ? (
            <div className="mt-6">
              <BlockError message={recentActivityError} />
            </div>
          ) : recentActivityLoading ? (
            <div className="mt-6">
              <SkeletonRows rows={5} />
            </div>
          ) : recentActivity.length === 0 ? (
            <div className="mt-6">
              <EmptyState
                title="Sin actividad reciente"
                description="Aparecera movimiento aqui cuando existan ventas, aperturas de caja o ajustes de inventario."
              />
            </div>
          ) : (
            <ScrollPanel className="mt-6 grid gap-3.5 pr-1" maxHeightClassName="max-h-[34rem]" tabIndex={0} aria-label="Actividad reciente">
              {recentActivity.map((item) => (
                <div
                  key={`${item.activity_type}-${item.entity_id}-${item.created_at}`}
                  className="data-list-card rounded-3xl p-4"
                >
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusBadge label={formatActivityType(item.activity_type)} tone={getActivityTone(item.activity_type)} />
                        <p className="text-xs text-[color:var(--text-faint)]">Registro #{item.entity_id}</p>
                      </div>
                      <p className="mt-3 font-medium theme-text-strong">{item.title}</p>
                      <p className="mt-1 text-sm theme-text-muted">{item.subtitle}</p>
                    </div>
                    <p className="text-sm text-[color:var(--text-faint)]">
                      {formatDate(item.created_at)}
                    </p>
                  </div>
                </div>
              ))}
            </ScrollPanel>
          )}
        </Card>
      </div>
      {isAdmin ? (
        <Card>
          <SectionHeader
            eyebrow="Siguiente fase"
            title="Controles administrativos"
            description="La base visual queda preparada para acciones futuras como exportacion, configuracion de alertas y reglas de supervision."
            actions={<StatusBadge label="Roadmap visual" tone="default" />}
          />

          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {['Exportacion de reportes', 'Alertas configurables', 'Reglas por sucursal'].map(
              (item) => (
                <div
                  key={item}
                  className="data-list-card rounded-3xl p-5"
                >
                  <p className="font-medium theme-text-strong">{item}</p>
                  <p className="mt-2 text-sm theme-text-muted">
                    Disponible cuando la siguiente fase habilite acciones administrativas.
                  </p>
                </div>
              ),
            )}
          </div>
        </Card>
      ) : null}

      {can('canManageLocations') ? (
        <Card>
          <SectionHeader
            eyebrow="Ubicaciones"
            title="Puntos de venta"
            description="Gestiona los POS reales disponibles para caja, inventario y ventas."
            actions={<StatusBadge label={locationsLabel} tone={locationsTone} />}
          />

          {locationMessage ? (
            <FeedbackMessage tone="success" className="mt-4">
              {locationMessage}
            </FeedbackMessage>
          ) : null}

          {locationSubmitError ? (
            <FeedbackMessage tone="error" className="mt-4">
              {locationSubmitError}
            </FeedbackMessage>
          ) : null}

          {locationsError ? (
            <div className="mt-4">
              <BlockError message={locationsError} />
            </div>
          ) : null}

          <div className="mt-6 grid min-w-0 gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
            <div className="surface-subtle-strong rounded-[1.8rem] p-5">
              <p className="text-sm theme-text-muted">Crear ubicacion</p>
              <h3 className="mt-2 font-display text-2xl font-bold theme-text-strong">
                Nuevo punto de venta
              </h3>
              <p className="mt-2 text-sm text-[color:var(--text-secondary)]">
                Agrega un POS real para operar caja, inventario y ventas desde el dashboard.
              </p>

              <div className="mt-5 grid gap-4">
                <Input
                  label="Nombre del POS"
                  placeholder="Ej: POS Centro"
                  value={locationName}
                  onChange={(event) => setLocationName(event.target.value)}
                />
                <Button
                  disabled={creatingLocation || !locationName.trim()}
                  onClick={handleCreateLocation}
                >
                  {creatingLocation ? 'Guardando...' : 'Crear punto de venta'}
                </Button>
              </div>
            </div>

            <div className="surface-subtle rounded-[1.8rem] p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm theme-text-muted">Ubicaciones reales</p>
                  <h3 className="mt-2 font-display text-2xl font-bold theme-text-strong">
                    POS disponibles
                  </h3>
                </div>
                <Button variant="secondary" onClick={() => void refreshLocations()}>
                  Refrescar
                </Button>
              </div>

              {locationsLoading ? (
                <div className="mt-6">
                  <SkeletonRows rows={3} />
                </div>
              ) : availableLocations.length === 0 ? (
                <div className="mt-6">
                  <EmptyState
                    title="Sin puntos de venta"
                    description="Crea la primera ubicacion para operar caja, inventario y ventas con datos reales."
                  />
                </div>
              ) : (
                <ScrollPanel className="mt-6 grid gap-3" maxHeightClassName="max-h-[20rem]" tabIndex={0} aria-label="Puntos de venta disponibles">
                  {availableLocations.map((location) => (
                    <div
                      key={location.id}
                      className="data-list-card rounded-3xl p-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-medium theme-text-strong">{location.name}</p>
                        <StatusBadge label="POS activo" tone="info" />
                      </div>
                      <p className="mt-1 text-sm theme-text-muted">ID {location.id}</p>
                    </div>
                  ))}
                </ScrollPanel>
              )}
            </div>
          </div>
        </Card>
      ) : null}
    </div>
  );
}

function formatActivityType(activityType: AdminRecentActivityItem['activity_type']) {
  if (activityType === 'SALE') return 'Venta';
  if (activityType === 'CASH_SESSION') return 'Caja';
  return 'Inventario';
}

function getActivityTone(activityType: AdminRecentActivityItem['activity_type']): BadgeTone {
  if (activityType === 'SALE') return 'info';
  if (activityType === 'CASH_SESSION') return 'success';
  return 'warning';
}

function formatPaymentMethod(method: PaymentMethod | null) {
  if (method === 'CASH') return 'Efectivo';
  if (method === 'TRANSFER') return 'Transferencia';
  return 'Pendiente';
}
