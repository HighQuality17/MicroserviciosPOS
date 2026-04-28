import '@/features/admin/admin-d1.css';
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
import { useNavigate } from 'react-router-dom';
import { AdminChartCard } from '@/components/AdminChartCard';
import { AlertCard } from '@/components/AlertCard';
import { AccessState } from '@/components/AccessState';
import { AdminActivityDetailDialog } from '@/features/admin/AdminActivityDetailDialog';
import { AdminPaymentMethodChartCard } from '@/features/admin/AdminPaymentMethodChartCard';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { FeedbackMessage } from '@/components/FeedbackMessage';
import { Input } from '@/components/Input';
import { ModulePageHeader } from '@/components/ModulePageHeader';
import type {
  ModulePageHeaderBadge,
  ModulePageHeaderCard,
} from '@/components/ModulePageHeader';
import { RoleModeBanner } from '@/components/RoleModeBanner';
import { ScrollPanel } from '@/components/ScrollPanel';
import { SectionHeader } from '@/components/SectionHeader';
import { StatusBadge } from '@/components/StatusBadge';
import { useBusinessModules } from '@/hooks/useBusinessModules';
import { usePermissions } from '@/hooks/usePermissions';
import { posApi } from '@/services/api/posApi';
import { useAppStore } from '@/store/appStore';
import { formatCurrency, formatDate } from '@/utils/format';
import { isAccessDeniedError, translateProtectedError } from '@/utils/apiError';
import type {
  AdminActivityDetailResponse,
  AdminActivityListItem,
  AdminActivityNavigation,
  AdminLowStockItem,
  AdminSalesByPaymentItem,
  AdminSummary,
  AdminTopItem,
  PaymentMethod,
} from '@/types/api';

type BadgeTone = 'default' | 'success' | 'warning' | 'danger' | 'info';

type OptionalAdminCard = {
  key: string;
  title: string;
  description: string;
  actionLabel: string | null;
  path: string | null;
};

const adminChartPalette = [
  'var(--admin-chart-cyan)',
  'var(--admin-chart-emerald)',
  'var(--admin-chart-amber)',
  'var(--admin-chart-rose)',
];

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
  const navigate = useNavigate();
  const { isAdmin, isAuditor, can } = usePermissions();
  const { isModuleEnabled } = useBusinessModules();
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
  const [recentActivity, setRecentActivity] = useState<AdminActivityListItem[]>([]);
  const [recentActivityPage, setRecentActivityPage] = useState(1);
  const [recentActivityTotal, setRecentActivityTotal] = useState(0);
  const [recentActivityTotalPages, setRecentActivityTotalPages] = useState(0);
  const [selectedActivity, setSelectedActivity] = useState<AdminActivityListItem | null>(null);
  const [selectedActivityDetail, setSelectedActivityDetail] =
    useState<AdminActivityDetailResponse | null>(null);
  const [activityDetailCache, setActivityDetailCache] = useState<
    Record<number, AdminActivityDetailResponse>
  >({});
  const [activityDetailLoading, setActivityDetailLoading] = useState(false);
  const [activityDetailError, setActivityDetailError] = useState<string | null>(null);

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

  useEffect(() => {
    void loadRecentActivity(recentActivityPage);
  }, [recentActivityPage]);

  async function loadDashboard() {
    void loadSummary();
    void loadSalesByPayment();
    void loadTopItems();
    void loadLowStock();
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

  async function loadRecentActivity(page: number) {
    try {
      setRecentActivityLoading(true);
      setRecentActivityError(null);
      const response = await posApi.getAdminActivity({
        page,
        limit: 8,
      });
      setRecentActivity(response.items);
      setRecentActivityTotal(response.total);
      setRecentActivityTotalPages(response.total_pages);
    } catch (error) {
      setRecentActivity([]);
      setRecentActivityTotal(0);
      setRecentActivityTotalPages(0);
      setRecentActivityError(
        error instanceof Error
          ? error.message
          : 'No fue posible cargar actividad reciente',
      );
    } finally {
      setRecentActivityLoading(false);
    }
  }

  async function handleOpenActivityDetail(activity: AdminActivityListItem) {
    setSelectedActivity(activity);
    setActivityDetailError(null);

    const cached = activityDetailCache[activity.id];
    if (cached) {
      setSelectedActivityDetail(cached);
      setActivityDetailLoading(false);
      return;
    }

    try {
      setActivityDetailLoading(true);
      setSelectedActivityDetail(null);
      const detail = await posApi.getAdminActivityDetail(activity.id);
      setActivityDetailCache((current) => ({
        ...current,
        [activity.id]: detail,
      }));
      setSelectedActivityDetail(detail);
    } catch (error) {
      setSelectedActivityDetail(null);
      setActivityDetailError(
        error instanceof Error
          ? error.message
          : 'No fue posible cargar el detalle de actividad',
      );
    } finally {
      setActivityDetailLoading(false);
    }
  }

  function closeActivityDetail() {
    setSelectedActivity(null);
    setSelectedActivityDetail(null);
    setActivityDetailError(null);
    setActivityDetailLoading(false);
  }

  function handleActivityNavigation(navigation: AdminActivityNavigation) {
    const search = navigation.query
      ? new URLSearchParams(navigation.query).toString()
      : '';

    void navigate(search ? `${navigation.path}?${search}` : navigation.path);
  }

  const paymentMethodData = useMemo(
    () =>
      salesByPayment
        .filter((item) => item.total > 0)
        .map((item) => ({
          label: item.method === 'CASH' ? 'Efectivo' : 'Transferencia',
          value: item.total,
          color: item.method === 'CASH' ? 'var(--admin-chart-emerald)' : 'var(--admin-chart-cyan)',
        })),
    [salesByPayment],
  );

  const topItemsData = useMemo(
    () =>
      topItems.map((item, index) => ({
        label: item.name,
        meta: item.item_type === 'VARIANT' ? 'Variante' : 'Combo',
        value: item.qty_sold,
        color: adminChartPalette[index % adminChartPalette.length],
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
  const salesHeaderTone: BadgeTone = summaryLoading
    ? 'info'
    : (summary?.sales_count ?? 0) > 0
      ? 'success'
      : 'default';
  const ticketHeaderTone: BadgeTone = summaryLoading
    ? 'info'
    : leadingPayment
      ? 'info'
      : 'default';
  const cashHeaderTone: BadgeTone = summaryLoading
    ? 'info'
    : summary?.current_cash_session
      ? 'success'
      : 'warning';
  const stockHeaderTone: BadgeTone = summaryLoading || lowStockLoading
    ? 'info'
    : (summary?.low_stock_count ?? 0) > 0
      ? 'warning'
      : 'success';
  const adminModeLabel = isAuditor
    ? 'Modo auditoria'
    : isAdmin
      ? 'Modo administrador'
      : 'Vista ejecutiva';
  const adminModeTone: BadgeTone = isAuditor
    ? 'warning'
    : isAdmin
      ? 'success'
      : 'info';
  const adminHeaderBadges: ModulePageHeaderBadge[] = [
    {
      label: dashboardStatusLabel,
      tone: dashboardStatusTone,
    },
    {
      label: adminModeLabel,
      tone: adminModeTone,
    },
  ];
  const adminHeaderCards: ModulePageHeaderCard[] = [
    {
      label: 'Ventas de hoy',
      value: summaryLoading ? '...' : formatCurrency(summary?.sales_today_total ?? 0),
      note: summaryLoading ? 'Sincronizando' : `${summary?.sales_count ?? 0} ventas pagadas`,
      accent: salesHeaderTone,
      icon: <ShoppingBag size={16} />,
      iconTone: salesHeaderTone,
      badge: {
        label: summaryLoading ? 'Actualizando' : (summary?.sales_count ?? 0) > 0 ? 'Ritmo activo' : 'Sin ventas',
        tone: salesHeaderTone,
      },
    },
    {
      label: 'Ticket promedio',
      value: summaryLoading ? '...' : formatCurrency(summary?.average_ticket ?? 0),
      note: summaryLoading
        ? 'Calculando'
        : leadingPayment
          ? `Dominante: ${formatPaymentMethod(leadingPayment.method)}`
          : 'Sin pagos confirmados',
      accent: ticketHeaderTone,
      icon: <Sparkles size={16} />,
      iconTone: ticketHeaderTone,
      badge: {
        label: summaryLoading ? 'Calculando' : leadingPayment ? 'Mix disponible' : 'Sin pagos',
        tone: ticketHeaderTone,
      },
    },
    {
      label: 'Caja actual',
      value: summaryLoading ? '...' : currentCashSessionLabel,
      note: summaryLoading
        ? 'Consultando'
        : summary?.current_cash_session
          ? `${summary.current_cash_session.location_name} - ${summary.current_cash_session.opened_by_name}`
          : 'Sin caja abierta',
      accent: cashHeaderTone,
      icon: <CreditCard size={16} />,
      iconTone: cashHeaderTone,
      badge: {
        label: summaryLoading ? 'Consultando' : summary?.current_cash_session ? 'Operativa' : 'Sin apertura',
        tone: cashHeaderTone,
      },
    },
    {
      label: 'Stock bajo',
      value: summaryLoading ? '...' : String(summary?.low_stock_count ?? 0),
      note: summaryLoading || lowStockLoading
        ? 'Verificando'
        : lowStock.length > 0
          ? `${lowStock[0].ingredient_name} en ${lowStock[0].location_name}`
          : 'Sin alertas de inventario',
      accent: stockHeaderTone,
      icon: <AlertTriangle size={16} />,
      iconTone: stockHeaderTone,
      badge: {
        label: summaryLoading || lowStockLoading
          ? 'Verificando'
          : (summary?.low_stock_count ?? 0) > 0
            ? 'Revisar'
            : 'Controlado',
        tone: stockHeaderTone,
      },
    },
  ];
  const adminHeaderSummaryNote = latestActivity
    ? `${formatActivityType(latestActivity.activity_type)} - ${formatDate(latestActivity.occurred_at)}`
    : leadingPayment
      ? `Metodo dominante: ${formatPaymentMethod(leadingPayment.method)}`
      : 'Ventas, caja e inventario en una vista.';
  const optionalAdminCards = [
    isModuleEnabled('ingredients')
      ? {
          key: 'ingredients',
          title: 'Ingredientes',
          description: 'Stock base e insumos.',
          actionLabel: 'Abrir',
          path: '/ingredients',
        }
      : null,
    isModuleEnabled('combos')
      ? {
          key: 'combos',
          title: 'Combos',
          description: 'Ofertas y venta agrupada.',
          actionLabel: 'Abrir',
          path: '/combos',
        }
      : null,
    isModuleEnabled('recipes')
      ? {
          key: 'recipes',
          title: 'Productos / recetas',
          description: 'Catalogo y preparacion.',
          actionLabel: 'Abrir',
          path: '/products',
        }
      : null,
    isModuleEnabled('fiscalFields')
      ? {
          key: 'fiscal-fields',
          title: 'Campos fiscales',
          description: 'Datos fiscales del catalogo.',
          actionLabel: 'Abrir',
          path: '/products',
        }
      : null,
    {
      key: 'exports',
      title: 'Reportes',
      description: 'Exportacion ejecutiva.',
      actionLabel: null,
      path: null,
    },
    {
      key: 'alerts',
      title: 'Alertas configurables',
      description: 'Umbrales y avisos.',
      actionLabel: null,
      path: null,
    },
    {
      key: 'branches',
      title: 'Reglas por sucursal',
      description: 'Politicas por POS.',
      actionLabel: null,
      path: null,
    },
  ].reduce<OptionalAdminCard[]>((cards, item) => {
    if (item !== null) {
      cards.push(item);
    }

    return cards;
  }, []);

  return (
    <div className="admin-dashboard grid min-w-0 gap-4 sm:gap-5">
      {isAuditor ? (
        <RoleModeBanner
          title="Panel en modo auditoria"
          description="Vista de solo lectura para metricas, alertas y actividad reciente."
          tone="warning"
        />
      ) : null}

      <ModulePageHeader
        ariaLabel="Estado general del dashboard administrativo"
        eyebrow="Centro de control"
        title="Dashboard administrativo"
        icon={<Sparkles size={18} />}
        helpText="Vista ejecutiva del negocio."
        badges={adminHeaderBadges}
        description="Ventas, caja, inventario y actividad clave."
        summary={{
          label: 'Estado del panel',
          value: summaryLoading ? 'Sincronizando' : dashboardStatusLabel,
          note: adminHeaderSummaryNote,
        }}
        asideAction={
          isAdmin ? (
            <Button
              variant="secondary"
              onClick={() => navigate('/admin/config')}
            >
              Configurar negocio
            </Button>
          ) : null
        }
        cards={adminHeaderCards}
      />

      {summaryError ? <BlockError message={summaryError} /> : null}

      {summaryAccessDenied ? (
        <AccessState description="Tu perfil actual no tiene permiso para consultar el dashboard administrativo." />
      ) : null}

      <div className="admin-command-grid">
        <Card padding="none" glow={false} className="admin-panel admin-panel--executive">
          <div className="admin-panel__body">
            <SectionHeader
              className="admin-command-panel__header"
              eyebrow="Resumen ejecutivo"
              title="Panorama del negocio"
              description="Lectura rapida de ventas, caja, catalogo y cobertura."
              actions={<StatusBadge label={overviewLabel} tone={overviewTone} />}
            />

            <div className="admin-executive-layout">
              <div className="admin-executive-focus">
                <p className="admin-kicker">Ventas del dia</p>
                <p className="admin-executive-focus__value">
                  {summaryLoading ? '...' : formatCurrency(summary?.sales_today_total ?? 0)}
                </p>
                <div className="admin-executive-focus__meta">
                  <span>{summaryLoading ? 'Sincronizando' : `${summary?.sales_count ?? 0} ventas`}</span>
                  <span>{summaryLoading ? 'Ticket pendiente' : `Ticket ${formatCurrency(summary?.average_ticket ?? 0)}`}</span>
                </div>
              </div>

              <div className="admin-metric-grid">
                <div className="admin-metric-tile" data-tone={salesHeaderTone}>
                  <Receipt size={17} />
                  <span>Ventas</span>
                  <strong>{summaryLoading ? '...' : String(summary?.sales_count ?? 0)}</strong>
                </div>
                <div className="admin-metric-tile" data-tone="info">
                  <Boxes size={17} />
                  <span>Productos</span>
                  <strong>{summaryLoading ? '...' : String(summary?.active_products_count ?? 0)}</strong>
                </div>
                <div className="admin-metric-tile" data-tone={locationsTone}>
                  <CreditCard size={17} />
                  <span>POS</span>
                  <strong>{locationsLoading ? '...' : String(totalLocations)}</strong>
                </div>
                <div className="admin-metric-tile" data-tone={cashHeaderTone}>
                  <Wallet size={17} />
                  <span>Caja base</span>
                  <strong>
                    {summaryLoading
                      ? '...'
                      : summary?.current_cash_session
                        ? formatCurrency(summary.current_cash_session.opening_cash)
                        : 'Sin caja'}
                  </strong>
                </div>
              </div>
            </div>

            <div className="admin-insight-grid">
              <div className="admin-insight-tile">
                <span>Metodo dominante</span>
                <strong>{leadingPayment ? formatPaymentMethod(leadingPayment.method) : 'Sin pagos'}</strong>
                <p>{leadingPayment ? formatCurrency(leadingPayment.total) : 'Pendiente'}</p>
              </div>
              <div className="admin-insight-tile">
                <span>Producto lider</span>
                <strong>{featuredTopItem ? featuredTopItem.name : 'Sin ranking'}</strong>
                <p>{featuredTopItem ? `${featuredTopItem.qty_sold.toLocaleString('es-CO')} unidades` : 'Sin ventas'}</p>
              </div>
              <div className="admin-insight-tile">
                <span>Ultima actividad</span>
                <strong>{latestActivity ? latestActivity.title : 'Sin eventos'}</strong>
                <p>{latestActivity ? formatDate(latestActivity.occurred_at) : 'Esperando movimiento'}</p>
              </div>
              <div className="admin-insight-tile">
                <span>Cobertura POS</span>
                <strong>{locationsLoading ? '...' : `${totalLocations} POS`}</strong>
                <p>{totalLocations > 0 ? 'Listos para operar' : 'Sin cobertura'}</p>
              </div>
            </div>
          </div>
        </Card>

        <Card padding="none" glow={false} className="admin-panel admin-panel--radar">
          <div className="admin-panel__body">
            <SectionHeader
              className="admin-command-panel__header"
              eyebrow="Radar operativo"
              title="Pulso del negocio"
              description="Estado de caja, stock, catalogo y actividad."
              actions={<StatusBadge label={pulseLabel} tone={pulseTone} />}
            />

            <div className="admin-radar-state">
              <StatusBadge label={locationsLabel} tone={locationsTone} />
              <StatusBadge label={alertsLabel} tone={alertsTone} />
              <StatusBadge label={activityLabel} tone={activityTone} />
            </div>

            <div className="admin-radar-grid">
              <div className="admin-radar-item" data-tone={cashHeaderTone}>
                <span>Caja</span>
                <strong>{summary?.current_cash_session ? summary.current_cash_session.location_name : 'Sin caja abierta'}</strong>
                <p>{summary?.current_cash_session ? `Por ${summary.current_cash_session.opened_by_name}` : 'Abrir caja'}</p>
              </div>
              <div className="admin-radar-item" data-tone={stockHeaderTone}>
                <span>Stock</span>
                <strong>{(summary?.low_stock_count ?? 0) > 0 ? 'Atencion' : 'Controlado'}</strong>
                <p>{lowStock.length > 0 ? `${lowStock.length} por revisar` : 'Sin alertas'}</p>
              </div>
              <div className="admin-radar-item" data-tone="info">
                <span>Catalogo</span>
                <strong>{summaryLoading ? '...' : `${summary?.active_products_count ?? 0} activos`}</strong>
                <p>Base comercial</p>
              </div>
              <div
                className="admin-radar-item"
                data-tone={latestActivity ? getActivityTone(latestActivity.activity_type) : 'default'}
              >
                <span>Actividad</span>
                <strong>{latestActivity ? formatActivityType(latestActivity.activity_type) : 'Sin eventos'}</strong>
                <p>{latestActivity ? latestActivity.subtitle : 'Sin movimiento'}</p>
              </div>
            </div>
          </div>
        </Card>
      </div>
      <div className="admin-analytics-grid">
        {salesByPaymentError ? (
          <Card padding="none" glow={false} className="admin-panel">
            <div className="admin-panel__body">
            <SectionHeader
              eyebrow="Analitica"
              title="Ventas por metodo de pago"
              description="Distribucion del ingreso."
            />
            <div className="mt-6">
              <BlockError message={salesByPaymentError} />
            </div>
            </div>
          </Card>
        ) : salesByPaymentLoading ? (
          <Card padding="none" glow={false} className="admin-panel">
            <div className="admin-panel__body">
            <SectionHeader
              eyebrow="Analitica"
              title="Ventas por metodo de pago"
              description="Distribucion del ingreso."
            />
            <div className="mt-6">
              <SkeletonRows rows={3} />
            </div>
            </div>
          </Card>
        ) : (
          <AdminPaymentMethodChartCard
            title="Ventas por metodo de pago"
            description="Distribucion del ingreso."
            data={paymentMethodData}
            emptyTitle="Sin ventas por metodo registradas"
            emptyDescription="Aparecera con pagos confirmados."
          />
        )}

        {topItemsError ? (
          <Card padding="none" glow={false} className="admin-panel">
            <div className="admin-panel__body">
            <SectionHeader
              eyebrow="Analitica"
              title="Productos mas vendidos"
              description="Ranking comercial."
            />
            <div className="mt-6">
              <BlockError message={topItemsError} />
            </div>
            </div>
          </Card>
        ) : topItemsLoading ? (
          <Card padding="none" glow={false} className="admin-panel">
            <div className="admin-panel__body">
            <SectionHeader
              eyebrow="Analitica"
              title="Productos mas vendidos"
              description="Ranking comercial."
            />
            <div className="mt-6">
              <SkeletonRows rows={4} />
            </div>
            </div>
          </Card>
        ) : (
          <AdminChartCard
            title="Productos mas vendidos"
            description="Ranking comercial."
            data={topItemsData}
            chartType="bar"
            valueFormat="number"
            emptyTitle="Sin items vendidos"
            emptyDescription="Aparecera con ventas pagadas."
          />
        )}
      </div>

      <div className="admin-ops-grid">
        <Card padding="none" glow={false} className="admin-panel">
          <div className="admin-panel__body">
          <SectionHeader
            eyebrow="Alertas"
            title="Estado operativo"
            description="Caja, stock y ventas."
            actions={<StatusBadge label={alertsLabel} tone={alertsTone} />}
          />

          <div className="admin-alert-list">
            {summaryLoading ? (
              <SkeletonRows rows={4} />
            ) : (
              <>
                <AlertCard
                  title={summary?.current_cash_session ? 'Caja abierta' : 'Caja cerrada'}
                  description={
                    summary?.current_cash_session
                      ? `#${summary.current_cash_session.id} / ${summary.current_cash_session.location_name}`
                      : 'Sin sesion activa.'
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
                    description="Inventario controlado."
                    tone="success"
                    icon={<PackageSearch size={18} />}
                  />
                ) : (
                  lowStock.slice(0, 3).map((item) => (
                    <AlertCard
                      key={`${item.ingredient_id}-${item.location_id}`}
                      title={item.ingredient_name}
                      description={`${item.location_name} / base ${item.qty_on_hand_base} / umbral ${item.threshold}`}
                      tone="warning"
                      icon={<AlertTriangle size={18} />}
                    />
                  ))
                )}

                <AlertCard
                  title={(summary?.sales_count ?? 0) > 0 ? 'Ventas recientes disponibles' : 'Sin ventas registradas hoy'}
                  description={
                    (summary?.sales_count ?? 0) > 0
                      ? `${summary?.sales_count ?? 0} ventas pagadas hoy.`
                      : 'Sin ventas pagadas hoy.'
                  }
                  tone={(summary?.sales_count ?? 0) > 0 ? 'info' : 'warning'}
                  icon={<Receipt size={18} />}
                />
              </>
            )}
          </div>
          </div>
        </Card>

        <Card padding="none" glow={false} className="admin-panel">
          <div className="admin-panel__body">
          <SectionHeader
            eyebrow="Actividad"
            title="Actividad reciente"
            description="Eventos de venta, caja e inventario."
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
                description="Aparecera con ventas, caja o inventario."
              />
            </div>
          ) : (
            <>
              <ScrollPanel className="admin-activity-list" maxHeightClassName="max-h-[22rem]" tabIndex={0} aria-label="Actividad reciente">
                {recentActivity.map((item) => (
                  <div
                    key={`${item.id}-${item.activity_type}-${item.entity_id}`}
                    className="admin-activity-item admin-activity-item--rich"
                    data-tone={getActivityTone(item.activity_type)}
                  >
                    <div className="admin-activity-item__content">
                      <div className="admin-activity-item__meta">
                        <StatusBadge
                          label={formatActivityType(item.activity_type)}
                          tone={getActivityTone(item.activity_type)}
                        />
                        <span>#{item.entity_id}</span>
                        {item.location?.location_name ? (
                          <span>{item.location.location_name}</span>
                        ) : null}
                      </div>
                      <p>{item.title}</p>
                      <span>{item.subtitle}</span>
                      <div className="admin-activity-item__chips">
                        {getActivityHighlights(item).map((highlight) => (
                          <span key={`${item.id}-${highlight}`}>{highlight}</span>
                        ))}
                      </div>
                    </div>
                    <div className="admin-activity-item__aside">
                      <time>{formatDate(item.occurred_at)}</time>
                      <div className="admin-activity-item__actions">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => void handleOpenActivityDetail(item)}
                        >
                          Mas detalles
                        </Button>
                        {item.navigation ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              if (item.navigation) {
                                handleActivityNavigation(item.navigation);
                              }
                            }}
                          >
                            {item.navigation.label}
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ))}
              </ScrollPanel>
              <div className="admin-activity-pagination">
                <span>
                  {recentActivityTotal} eventos - pagina {recentActivityPage} de{' '}
                  {Math.max(recentActivityTotalPages, 1)}
                </span>
                <div className="admin-activity-pagination__actions">
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={recentActivityLoading || recentActivityPage <= 1}
                    onClick={() =>
                      setRecentActivityPage((current) => Math.max(1, current - 1))
                    }
                  >
                    Anterior
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={
                      recentActivityLoading ||
                      recentActivityTotalPages === 0 ||
                      recentActivityPage >= recentActivityTotalPages
                    }
                    onClick={() => setRecentActivityPage((current) => current + 1)}
                  >
                    Siguiente
                  </Button>
                </div>
              </div>
            </>
          )}
          </div>
        </Card>
      </div>
      {isAdmin ? (
        <Card padding="none" glow={false} className="admin-panel admin-panel--shortcuts">
          <div className="admin-panel__body">
          <SectionHeader
            eyebrow="Accesos rapidos"
            title="Acciones administrativas"
            description="Atajos para supervision y configuracion."
            actions={
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="secondary"
                  onClick={() => navigate('/admin/config')}
                >
                  Configurar negocio
                </Button>
              </div>
            }
          />

          <div className="admin-shortcut-grid">
            {optionalAdminCards.map((item) => (
              <div
                key={item.key}
                className="admin-shortcut-card"
              >
                <div>
                  <p>{item.title}</p>
                  <span>{item.description}</span>
                </div>
                {item.path && item.actionLabel ? (
                  <button
                    type="button"
                    className="admin-shortcut-card__action"
                    onClick={() => {
                      if (item.path) {
                        void navigate(item.path);
                      }
                    }}
                  >
                    {item.actionLabel}
                  </button>
                ) : (
                  <StatusBadge label="Proximo" tone="default" />
                )}
              </div>
            ))}
          </div>
          </div>
        </Card>
      ) : null}

      {can('canManageLocations') ? (
        <Card padding="none" glow={false} className="admin-panel admin-panel--locations">
          <div className="admin-panel__body">
          <SectionHeader
            eyebrow="Ubicaciones"
            title="Puntos de venta"
            description="Gestiona cobertura operativa POS."
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

          <div className="admin-location-grid">
            <div className="admin-location-create">
              <div>
                <p className="admin-kicker">Crear ubicacion</p>
                <h3>Nuevo POS</h3>
              </div>

              <div className="admin-location-create__form">
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

            <div className="admin-location-list">
              <div className="admin-location-list__header">
                <div>
                  <p className="admin-kicker">Ubicaciones reales</p>
                  <h3>POS disponibles</h3>
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
                description="Crea la primera ubicacion operativa."
                  />
                </div>
              ) : (
                <ScrollPanel className="admin-pos-list" maxHeightClassName="max-h-[16rem]" tabIndex={0} aria-label="Puntos de venta disponibles">
                  {availableLocations.map((location) => (
                    <div
                      key={location.id}
                      className="admin-pos-item"
                    >
                      <div>
                        <p>{location.name}</p>
                        <span>ID {location.id}</span>
                      </div>
                      <div className="admin-pos-item__status">
                        <StatusBadge label="POS activo" tone="info" />
                      </div>
                    </div>
                  ))}
                </ScrollPanel>
              )}
            </div>
          </div>
          </div>
        </Card>
      ) : null}
      <AdminActivityDetailDialog
        open={selectedActivity !== null}
        activity={selectedActivity}
        detail={selectedActivityDetail}
        loading={activityDetailLoading}
        error={activityDetailError}
        onClose={closeActivityDetail}
        onNavigate={handleActivityNavigation}
      />
    </div>
  );
}

function formatActivityType(activityType: AdminActivityListItem['activity_type']) {
  if (activityType === 'SALE_COMPLETED') return 'Venta';
  if (activityType === 'CASH_OPENED') return 'Apertura';
  if (activityType === 'CASH_CLOSED') return 'Cierre';
  return 'Inventario';
}

function getActivityTone(activityType: AdminActivityListItem['activity_type']): BadgeTone {
  if (activityType === 'SALE_COMPLETED') return 'info';
  if (activityType === 'CASH_OPENED') return 'success';
  if (activityType === 'CASH_CLOSED') return 'danger';
  return 'warning';
}

function getActivityHighlights(item: AdminActivityListItem) {
  if (item.activity_type === 'CASH_OPENED') {
    const summary = item.summary as {
      cash_session_id: number;
      responsible_name: string;
      location_name: string;
    };

    return [
      `Caja #${summary.cash_session_id}`,
      summary.responsible_name,
      summary.location_name,
    ];
  }

  if (item.activity_type === 'CASH_CLOSED') {
    const summary = item.summary as {
      expected: number;
      counted: number;
      difference: number;
    };

    return [
      `Esperado ${formatCurrency(summary.expected)}`,
      `Contado ${formatCurrency(summary.counted)}`,
      `Diff ${formatCurrency(summary.difference)}`,
    ];
  }

  if (item.activity_type === 'SALE_COMPLETED') {
    const summary = item.summary as {
      total: number;
      payment_method: PaymentMethod | null;
      responsible_name: string;
    };

    return [
      formatCurrency(summary.total),
      formatPaymentMethod(summary.payment_method),
      summary.responsible_name,
    ];
  }

  const summary = item.summary as {
    ingredient_name: string;
    movement_type: string;
    qty_delta: number;
  };

  return [
    summary.ingredient_name,
    formatInventoryMovementType(summary.movement_type),
    `${summary.qty_delta >= 0 ? '+' : ''}${summary.qty_delta}`,
  ];
}

function formatPaymentMethod(method: PaymentMethod | null) {
  if (method === 'CASH') return 'Efectivo';
  if (method === 'TRANSFER') return 'Transferencia';
  return 'Pendiente';
}

function formatInventoryMovementType(value: string) {
  if (value === 'ENTRY') return 'Entrada';
  if (value === 'EXIT') return 'Salida';
  if (value === 'ADJUSTMENT') return 'Ajuste';
  return value;
}
