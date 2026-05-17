import '@/features/admin/admin-d1.css';
import { type ReactNode, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  Boxes,
  Clock3,
  PackageSearch,
  Receipt,
  ShoppingBag,
  Sparkles,
  Store,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AccessState } from '@/components/AccessState';
import { AdminActivityDetailDialog } from '@/features/admin/AdminActivityDetailDialog';
import { AdminDashboardSectionHeader } from '@/features/admin/AdminDashboardSectionHeader';
import {
  formatActivityType,
  formatPaymentMethod,
  getActivityTone,
} from '@/features/admin/admin-activity-format';
import { AdminPaymentMethodChartCard } from '@/features/admin/AdminPaymentMethodChartCard';
import { AdminSubmoduleNav } from '@/features/admin/AdminSubmoduleNav';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { FeedbackMessage } from '@/components/FeedbackMessage';
import { ModulePageHeader } from '@/components/ModulePageHeader';
import type {
  ModulePageHeaderBadge,
  ModulePageHeaderCard,
} from '@/components/ModulePageHeader';
import { RoleModeBanner } from '@/components/RoleModeBanner';
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
  AdminSalesReportDailyItem,
  AdminSummary,
  AdminTopItem,
} from '@/types/api';

type BadgeTone = 'default' | 'success' | 'warning' | 'danger' | 'info';

interface PaymentMethodDatum {
  label: string;
  value: number;
  color?: string;
}

interface TopItemDatum {
  label: string;
  meta: string;
  value: number;
}

interface TrendPoint {
  date: string;
  label: string;
  total: number;
  sales_count: number;
}

interface TrendSummary {
  total: number;
  salesCount: number;
  averageTicket: number;
  bestDay: TrendPoint | null;
}

interface DashboardKpiCardProps {
  title: string;
  value: ReactNode;
  context: ReactNode;
  statusLabel: string;
  tone: BadgeTone;
  icon: ReactNode;
  primary?: boolean;
  onClick?: () => void;
}

interface QuickAction {
  key: string;
  title: string;
  description: string;
  path: string;
  tone: BadgeTone;
  icon: ReactNode;
}

const adminChartPalette = [
  'var(--admin-chart-cobalt)',
  'var(--admin-chart-cyan)',
  'var(--admin-chart-emerald)',
  'var(--admin-chart-amber)',
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
  const { isAdmin, isAuditor, can: canUse } = usePermissions();
  const { isModuleEnabled } = useBusinessModules();
  const availableLocations = useAppStore((state) => state.availableLocations);
  const locationsLoading = useAppStore((state) => state.locationsLoading);
  const [summary, setSummary] = useState<AdminSummary | null>(null);
  const [salesByPayment, setSalesByPayment] = useState<AdminSalesByPaymentItem[]>([]);
  const [topItems, setTopItems] = useState<AdminTopItem[]>([]);
  const [lowStock, setLowStock] = useState<AdminLowStockItem[]>([]);
  const [salesTrend, setSalesTrend] = useState<AdminSalesReportDailyItem[]>([]);
  const [recentActivity, setRecentActivity] = useState<AdminActivityListItem[]>([]);
  const [recentActivityTotal, setRecentActivityTotal] = useState(0);
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
  const [salesTrendLoading, setSalesTrendLoading] = useState(true);
  const [recentActivityLoading, setRecentActivityLoading] = useState(true);

  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [salesByPaymentError, setSalesByPaymentError] = useState<string | null>(null);
  const [topItemsError, setTopItemsError] = useState<string | null>(null);
  const [lowStockError, setLowStockError] = useState<string | null>(null);
  const [salesTrendError, setSalesTrendError] = useState<string | null>(null);
  const [recentActivityError, setRecentActivityError] = useState<string | null>(null);
  const [summaryAccessDenied, setSummaryAccessDenied] = useState(false);

  useEffect(() => {
    void loadDashboard();
    void loadRecentActivity();
  }, []);

  function loadDashboard() {
    void loadSummary();
    void loadSalesByPayment();
    void loadTopItems();
    void loadLowStock();
    void loadSalesTrend();
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

  async function loadSalesTrend() {
    try {
      setSalesTrendLoading(true);
      setSalesTrendError(null);
      const range = getRecentDateRange(7);
      const response = await posApi.getAdminSalesReport(range);
      setSalesTrend(response.sales_by_day);
    } catch (error) {
      setSalesTrend([]);
      setSalesTrendError(
        error instanceof Error
          ? error.message
          : 'No fue posible cargar la tendencia comercial',
      );
    } finally {
      setSalesTrendLoading(false);
    }
  }

  async function loadRecentActivity() {
    try {
      setRecentActivityLoading(true);
      setRecentActivityError(null);
      const response = await posApi.getAdminActivity({
        page: 1,
        limit: 5,
      });
      setRecentActivity(response.items);
      setRecentActivityTotal(response.total);
    } catch (error) {
      setRecentActivity([]);
      setRecentActivityTotal(0);
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

  const paymentMethodData = useMemo<PaymentMethodDatum[]>(
    () =>
      salesByPayment
        .filter((item) => item.total > 0)
        .map((item) => ({
          label: item.method === 'CASH' ? 'Efectivo' : 'Transferencia',
          value: item.total,
          color: item.method === 'CASH' ? 'var(--admin-chart-emerald)' : 'var(--admin-chart-cobalt)',
        })),
    [salesByPayment],
  );

  const topItemsData = useMemo<TopItemDatum[]>(
    () =>
      topItems.slice(0, 5).map((item) => ({
        label: item.name,
        meta: item.item_type === 'VARIANT' ? 'Variante' : 'Combo',
        value: item.qty_sold,
      })),
    [topItems],
  );

  const trendPoints = useMemo(() => normalizeSalesTrend(salesTrend, 7), [salesTrend]);
  const trendSummary = useMemo(() => summarizeTrend(trendPoints), [trendPoints]);
  const totalLocations = availableLocations.length;
  const lowStockCount = summary?.low_stock_count ?? lowStock.length;
  const latestActivity = recentActivity[0] ?? null;
  const leadingPayment = useMemo(() => {
    if (salesByPayment.length === 0) return null;
    return [...salesByPayment].sort((left, right) => right.total - left.total)[0] ?? null;
  }, [salesByPayment]);
  const featuredTopItem = topItems[0] ?? null;

  const dashboardLoading =
    summaryLoading ||
    salesByPaymentLoading ||
    topItemsLoading ||
    lowStockLoading ||
    salesTrendLoading ||
    recentActivityLoading;
  const salesTone: BadgeTone = summaryLoading
    ? 'info'
    : (summary?.sales_count ?? 0) > 0
      ? 'success'
      : 'default';
  const ticketTone: BadgeTone = summaryLoading
    ? 'info'
    : (summary?.average_ticket ?? 0) > 0
      ? 'info'
      : 'default';
  const cashTone: BadgeTone = summaryLoading
    ? 'info'
    : summary?.current_cash_session
      ? 'success'
      : 'warning';
  const stockTone: BadgeTone = summaryLoading || lowStockLoading
    ? 'info'
    : lowStockCount > 0
      ? 'warning'
      : 'success';
  const catalogTone: BadgeTone = summaryLoading
    ? 'info'
    : (summary?.active_products_count ?? 0) > 0
      ? 'success'
      : 'warning';
  const locationsTone: BadgeTone = locationsLoading
    ? 'info'
    : totalLocations > 0
      ? 'success'
      : 'warning';
  const activityTone: BadgeTone = recentActivityLoading
    ? 'info'
    : recentActivity.length > 0
      ? 'success'
      : 'default';
  const dashboardStatusTone: BadgeTone = summaryAccessDenied
    ? 'warning'
    : dashboardLoading
      ? 'info'
      : summary
        ? 'success'
        : 'default';
  const dashboardStatusLabel = summaryAccessDenied
    ? 'Acceso parcial'
    : dashboardLoading
      ? 'Sincronizando'
      : summary
        ? 'Centro listo'
        : 'Sin datos';
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
  const adminHeaderSummaryNote = summaryLoading
    ? 'Consultando estado actual.'
    : lowStockCount > 0
      ? `${lowStockCount.toLocaleString('es-CO')} alertas de stock`
      : summary?.current_cash_session
        ? `Caja abierta en ${summary.current_cash_session.location_name}`
        : 'Caja sin apertura';
  const adminHeaderCards: ModulePageHeaderCard[] = [
    {
      label: 'Ventas hoy',
      value: summaryLoading ? '...' : formatCurrency(summary?.sales_today_total ?? 0),
      note: summaryLoading ? 'Sincronizando' : `${summary?.sales_count ?? 0} ventas`,
      accent: salesTone,
      icon: <ShoppingBag size={16} />,
      iconTone: salesTone,
      badge: {
        label: (summary?.sales_count ?? 0) > 0 ? 'Activo' : 'Sin ventas',
        tone: salesTone,
      },
    },
    {
      label: 'Caja',
      value: summaryLoading ? '...' : summary?.current_cash_session ? 'Abierta' : 'Cerrada',
      note: summary?.current_cash_session
        ? summary.current_cash_session.location_name
        : 'Sin sesion',
      accent: cashTone,
      icon: <Wallet size={16} />,
      iconTone: cashTone,
      badge: {
        label: summary?.current_cash_session ? 'Operativa' : 'Pendiente',
        tone: cashTone,
      },
    },
    {
      label: 'Stock',
      value: summaryLoading || lowStockLoading ? '...' : lowStockCount.toLocaleString('es-CO'),
      note: lowStockCount > 0 ? 'Alertas activas' : 'Controlado',
      accent: stockTone,
      icon: <AlertTriangle size={16} />,
      iconTone: stockTone,
      badge: {
        label: lowStockCount > 0 ? 'Revisar' : 'OK',
        tone: stockTone,
      },
    },
  ];

  const kpiCards: DashboardKpiCardProps[] = [
    {
      title: 'Ventas del dia',
      value: summaryLoading ? '...' : formatCurrency(summary?.sales_today_total ?? 0),
      context: summaryLoading
        ? 'Sincronizando'
        : `${(summary?.sales_count ?? 0).toLocaleString('es-CO')} ventas pagadas`,
      statusLabel: summaryLoading
        ? 'Actualizando'
        : (summary?.sales_count ?? 0) > 0
          ? 'Ritmo activo'
          : 'Sin ventas',
      tone: salesTone,
      icon: <ShoppingBag size={18} />,
      primary: true,
      onClick: isAdmin || isAuditor ? () => navigate('/admin/reports') : undefined,
    },
    {
      title: 'Numero de ventas',
      value: summaryLoading ? '...' : (summary?.sales_count ?? 0).toLocaleString('es-CO'),
      context: 'Ventas pagadas',
      statusLabel: (summary?.sales_count ?? 0) > 0 ? 'Con movimiento' : 'Sin pagos',
      tone: salesTone,
      icon: <Receipt size={18} />,
      onClick: isAdmin || isAuditor ? () => navigate('/admin/reports') : undefined,
    },
    {
      title: 'Ticket promedio',
      value: summaryLoading ? '...' : formatCurrency(summary?.average_ticket ?? 0),
      context: leadingPayment
        ? `Dominante: ${formatPaymentMethod(leadingPayment.method)}`
        : 'Sin pagos',
      statusLabel: leadingPayment ? 'Mix listo' : 'Sin pagos',
      tone: ticketTone,
      icon: <Sparkles size={18} />,
      onClick: isAdmin || isAuditor ? () => navigate('/admin/reports') : undefined,
    },
    {
      title: 'Caja actual',
      value: summaryLoading ? '...' : summary?.current_cash_session ? 'Abierta' : 'Cerrada',
      context: summary?.current_cash_session
        ? `${summary.current_cash_session.location_name} / ${summary.current_cash_session.opened_by_name}`
        : 'Sin sesion activa',
      statusLabel: summaryLoading
        ? 'Consultando'
        : summary?.current_cash_session
          ? 'Operativa'
          : 'Abrir caja',
      tone: cashTone,
      icon: <Wallet size={18} />,
      onClick: canUse('canOperateCash') ? () => navigate('/cash') : undefined,
    },
    {
      title: 'Catalogo operativo',
      value: summaryLoading ? '...' : (summary?.active_products_count ?? 0).toLocaleString('es-CO'),
      context: featuredTopItem
        ? `Lider: ${featuredTopItem.name}`
        : 'Productos activos',
      statusLabel: (summary?.active_products_count ?? 0) > 0 ? 'Disponible' : 'Revisar',
      tone: catalogTone,
      icon: <Boxes size={18} />,
      onClick: canUse('canManageCatalog') ? () => navigate('/products') : undefined,
    },
    {
      title: 'Alertas de stock',
      value: summaryLoading || lowStockLoading ? '...' : lowStockCount.toLocaleString('es-CO'),
      context: lowStock.length > 0
        ? `${lowStock[0].ingredient_name} en ${lowStock[0].location_name}`
        : 'Sin alertas',
      statusLabel: lowStockCount > 0 ? 'Revisar' : 'Controlado',
      tone: stockTone,
      icon: <AlertTriangle size={18} />,
      onClick: canUse('canManageInventory') && isModuleEnabled('ingredients')
        ? () => navigate('/ingredients')
        : undefined,
    },
  ];

  const quickActions: QuickAction[] = [
    ...(canUse('canOperateCash')
      ? [
          {
            key: 'cash',
            title: summary?.current_cash_session ? 'Revisar caja' : 'Abrir caja',
            description: summary?.current_cash_session
              ? 'Controlar sesion actual'
              : 'Iniciar operacion de caja',
            path: '/cash',
            tone: cashTone,
            icon: <Wallet size={17} />,
          },
        ]
      : []),
    ...(canUse('canOperatePos')
      ? [
          {
            key: 'pos',
            title: 'Ir a POS',
            description: 'Vender y cobrar rapido',
            path: '/pos',
            tone: 'info' as BadgeTone,
            icon: <ShoppingBag size={17} />,
          },
        ]
      : []),
    ...(isAdmin || isAuditor
      ? [
          {
            key: 'reports',
            title: 'Ver reportes',
            description: 'Analisis detallado',
            path: '/admin/reports',
            tone: 'info' as BadgeTone,
            icon: <BarChart3 size={17} />,
          },
          {
            key: 'activity',
            title: 'Ver actividad',
            description: 'Auditoria completa',
            path: '/admin/activity',
            tone: activityTone,
            icon: <Activity size={17} />,
          },
        ]
      : []),
    ...(canUse('canManageInventory') && isModuleEnabled('ingredients')
      ? [
          {
            key: 'inventory',
            title: 'Revisar inventario',
            description: lowStockCount > 0 ? 'Atender stock bajo' : 'Mantener control',
            path: '/ingredients',
            tone: stockTone,
            icon: <PackageSearch size={17} />,
          },
        ]
      : canUse('canManageCatalog')
        ? [
            {
              key: 'products',
              title: 'Revisar catalogo',
              description: 'Productos y variantes',
              path: '/products',
              tone: catalogTone,
              icon: <Boxes size={17} />,
            },
          ]
        : []),
  ];

  return (
    <div className="admin-dashboard admin-dashboard--refactor grid min-w-0 gap-4 sm:gap-5">
      <AdminSubmoduleNav />

      {isAuditor ? (
        <RoleModeBanner
          title="Panel en modo auditoria"
          description="Vista de solo lectura."
          tone="warning"
        />
      ) : null}

      <ModulePageHeader
        ariaLabel="Estado del dashboard"
        className="admin-dashboard__hero"
        eyebrow="Centro de control"
        title="Dashboard"
        icon={<Sparkles size={18} />}
        badges={adminHeaderBadges}
        summary={{
          label: 'Estado',
          value: summaryLoading ? 'Sincronizando' : dashboardStatusLabel,
          note: adminHeaderSummaryNote,
        }}
        asideAction={
          <div className="admin-dashboard__header-actions">
            {canUse('canOperatePos') ? (
              <Button variant="secondary" onClick={() => navigate('/pos')}>
                POS
              </Button>
            ) : null}
            {isAdmin || isAuditor ? (
              <Button variant="secondary" onClick={() => navigate('/admin/reports')}>
                Reportes
              </Button>
            ) : null}
          </div>
        }
        cards={adminHeaderCards}
      />

      {summaryError && !summaryAccessDenied ? <BlockError message={summaryError} /> : null}

      {summaryAccessDenied ? (
        <AccessState description="Tu perfil actual no tiene permiso para consultar el dashboard." />
      ) : (
        <>
          <Card padding="none" glow={false} className="admin-panel admin-panel--overview">
            <div className="admin-panel__body admin-overview-panel__body">
              <AdminDashboardSectionHeader
                eyebrow="Resumen ejecutivo"
                title="Indicadores clave"
                meta={<StatusBadge label={dashboardStatusLabel} tone={dashboardStatusTone} />}
              />

              <div className="admin-kpi-grid">
                {kpiCards.map((item) => (
                  <DashboardKpiCard key={item.title} {...item} />
                ))}
              </div>
            </div>
          </Card>

          <div className="admin-dashboard-workspace">
            <div className="admin-dashboard-workspace__main">
              <SalesTrendCard
                points={trendPoints}
                summary={trendSummary}
                loading={salesTrendLoading}
                error={salesTrendError}
                onOpenReports={() => navigate('/admin/reports')}
              />

              <div className="admin-business-grid">
                {salesByPaymentError ? (
                  <Card padding="none" glow={false} className="admin-panel">
                    <div className="admin-panel__body">
                      <AdminDashboardSectionHeader
                        eyebrow="Mix de ventas"
                        title="Metodo de pago"
                      />
                      <BlockError message={salesByPaymentError} />
                    </div>
                  </Card>
                ) : salesByPaymentLoading ? (
                  <Card padding="none" glow={false} className="admin-panel">
                    <div className="admin-panel__body">
                      <AdminDashboardSectionHeader
                        eyebrow="Mix de ventas"
                        title="Metodo de pago"
                      />
                      <SkeletonRows rows={3} />
                    </div>
                  </Card>
                ) : (
                  <AdminPaymentMethodChartCard
                    title="Metodo de pago"
                    data={paymentMethodData}
                    emptyTitle="Sin ventas por metodo"
                    emptyDescription="Aparecera cuando existan pagos confirmados."
                    headingVariant="dashboard"
                  />
                )}

                <TopItemsSignalCard
                  items={topItemsData}
                  loading={topItemsLoading}
                  error={topItemsError}
                  onOpenReports={() => navigate('/admin/reports')}
                />
              </div>

              <RecentActivitySummary
                items={recentActivity}
                total={recentActivityTotal}
                loading={recentActivityLoading}
                error={recentActivityError}
                onOpenActivity={(activity) => void handleOpenActivityDetail(activity)}
                onOpenAll={() => navigate('/admin/activity')}
              />
            </div>

            <aside className="admin-dashboard-workspace__side" aria-label="Salud operativa y acciones">
              <OperationalHealthCard
                summary={summary}
                summaryLoading={summaryLoading}
                lowStock={lowStock}
                lowStockCount={lowStockCount}
                lowStockLoading={lowStockLoading}
                lowStockError={lowStockError}
                totalLocations={totalLocations}
                locationsLoading={locationsLoading}
                cashTone={cashTone}
                stockTone={stockTone}
                catalogTone={catalogTone}
                locationsTone={locationsTone}
                onOpenCash={canUse('canOperateCash') ? () => navigate('/cash') : undefined}
                onOpenInventory={
                  canUse('canManageInventory') && isModuleEnabled('ingredients')
                    ? () => navigate('/ingredients')
                    : undefined
                }
              />

              <QuickActionsCard
                actions={quickActions}
                onNavigate={(path) => navigate(path)}
              />
            </aside>
          </div>
        </>
      )}

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

function DashboardKpiCard({
  title,
  value,
  context,
  statusLabel,
  tone,
  icon,
  primary = false,
  onClick,
}: DashboardKpiCardProps) {
  const className = `admin-kpi-card${primary ? ' admin-kpi-card--primary' : ''}`;
  const content = (
    <>
      <div className="admin-kpi-card__top">
        <span className="admin-kpi-card__icon" aria-hidden="true">
          {icon}
        </span>
        <StatusBadge label={statusLabel} tone={tone} />
      </div>
      <div className="admin-kpi-card__copy">
        <span>{title}</span>
        <strong>{value}</strong>
        <p>{context}</p>
      </div>
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        className={className}
        data-tone={tone}
        data-actionable="true"
        onClick={onClick}
      >
        {content}
      </button>
    );
  }

  return (
    <article className={className} data-tone={tone}>
      {content}
    </article>
  );
}

function SalesTrendCard({
  points,
  summary,
  loading,
  error,
  onOpenReports,
}: {
  points: TrendPoint[];
  summary: TrendSummary;
  loading: boolean;
  error: string | null;
  onOpenReports: () => void;
}) {
  const hasSales = summary.salesCount > 0;
  const statusTone: BadgeTone = loading ? 'info' : error ? 'danger' : hasSales ? 'success' : 'default';
  const statusLabel = loading ? 'Actualizando' : error ? 'Error' : hasSales ? 'Con tendencia' : 'Sin ventas';

  return (
    <Card padding="none" glow={false} className="admin-panel admin-panel--trend">
      <div className="admin-panel__body admin-trend-card">
        <AdminDashboardSectionHeader
          eyebrow="Tendencia"
          title="Ventas recientes"
          meta={<StatusBadge label={statusLabel} tone={statusTone} />}
        />

        {error ? (
          <BlockError message={error} />
        ) : loading ? (
          <div className="admin-trend-card__skeleton" aria-hidden="true" />
        ) : (
          <div className="admin-trend-card__body">
            <div className="admin-trend-card__chart-shell">
              <div className="admin-trend-card__chart-head">
                <div>
                  <span>Ingresos del periodo</span>
                  <strong>{formatCurrency(summary.total)}</strong>
                </div>
                <Button variant="secondary" size="sm" onClick={onOpenReports}>
                  Reportes
                  <ArrowUpRight size={14} />
                </Button>
              </div>

              <SalesTrendSvg points={points} />

              <div className="admin-trend-card__axis" aria-hidden="true">
                {points.map((point, index) => (
                  index === 0 || index === points.length - 1 || index === Math.floor(points.length / 2) ? (
                    <span key={point.date}>{point.label}</span>
                  ) : null
                ))}
              </div>
            </div>

            <div className="admin-trend-card__stats">
              <TrendStat
                label="Ventas"
                value={summary.salesCount.toLocaleString('es-CO')}
                note="Pagadas en el periodo"
                icon={<Receipt size={16} />}
              />
              <TrendStat
                label="Ticket promedio"
                value={formatCurrency(summary.averageTicket)}
                note="Base ultimos 7 dias"
                icon={<Sparkles size={16} />}
              />
              <TrendStat
                label="Mejor dia"
                value={summary.bestDay ? compactCurrency(summary.bestDay.total) : '$0'}
                note={summary.bestDay ? summary.bestDay.label : 'Sin ventas'}
                icon={<TrendingUp size={16} />}
              />
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}

function SalesTrendSvg({ points }: { points: TrendPoint[] }) {
  const maxTotal = Math.max(...points.map((point) => point.total), 1);
  const topPadding = 5;
  const bottomY = 45;
  const coordinates = points.map((point, index) => {
    const x = points.length > 1 ? (index / (points.length - 1)) * 100 : 50;
    const y = bottomY - (point.total / maxTotal) * (bottomY - topPadding);
    return { ...point, x, y };
  });
  const linePath = coordinates
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
    .join(' ');
  const areaPath = `${linePath} L 100 ${bottomY} L 0 ${bottomY} Z`;

  return (
    <div
      className="admin-trend-card__chart"
      role="img"
      aria-label={`Tendencia de ventas ultimos 7 dias. Total ${formatCurrency(
        points.reduce((sum, point) => sum + point.total, 0),
      )}.`}
    >
      <svg viewBox="0 0 100 52" preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <linearGradient id="adminTrendArea" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="rgb(var(--theme-accent-rgb))" stopOpacity="0.34" />
            <stop offset="100%" stopColor="rgb(var(--theme-accent-rgb))" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="adminTrendLine" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor="rgb(var(--theme-primary-rgb))" />
            <stop offset="58%" stopColor="rgb(var(--theme-secondary-rgb))" />
            <stop offset="100%" stopColor="rgb(var(--theme-accent-rgb))" />
          </linearGradient>
        </defs>
        {[12, 24, 36, 48].map((y) => (
          <line key={y} x1="0" x2="100" y1={y} y2={y} className="admin-trend-card__grid-line" />
        ))}
        <path d={areaPath} className="admin-trend-card__area" />
        <path d={linePath} className="admin-trend-card__line" />
        {coordinates.map((point) => (
          <circle
            key={point.date}
            cx={point.x}
            cy={point.y}
            r="1.5"
            className="admin-trend-card__point"
          />
        ))}
      </svg>
    </div>
  );
}

function TrendStat({
  label,
  value,
  note,
  icon,
}: {
  label: string;
  value: string;
  note: string;
  icon: ReactNode;
}) {
  return (
    <div className="admin-trend-stat">
      <span className="admin-trend-stat__icon" aria-hidden="true">
        {icon}
      </span>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        <p>{note}</p>
      </div>
    </div>
  );
}

function TopItemsSignalCard({
  items,
  loading,
  error,
  onOpenReports,
}: {
  items: TopItemDatum[];
  loading: boolean;
  error: string | null;
  onOpenReports: () => void;
}) {
  const maxValue = Math.max(...items.map((item) => item.value), 1);
  const statusTone: BadgeTone = loading ? 'info' : error ? 'danger' : items.length > 0 ? 'success' : 'default';
  const statusLabel = loading ? 'Actualizando' : error ? 'Error' : items.length > 0 ? 'Top listo' : 'Sin ranking';

  return (
    <Card padding="none" glow={false} className="admin-panel admin-top-items-card">
      <div className="admin-panel__body">
        <AdminDashboardSectionHeader
          eyebrow="Demanda"
          title="Productos lideres"
          meta={<StatusBadge label={statusLabel} tone={statusTone} />}
        />

        {error ? (
          <BlockError message={error} />
        ) : loading ? (
          <SkeletonRows rows={4} />
        ) : items.length === 0 ? (
          <InlineEmptyState
            icon={<PackageSearch size={18} />}
            title="Sin items vendidos"
            description="Aparecera cuando existan ventas pagadas."
          />
        ) : (
          <div className="admin-top-items-card__list">
            {items.map((item, index) => {
              const width = Math.max((item.value / maxValue) * 100, 6);

              return (
                <div key={`${item.label}-${index}`} className="admin-top-items-card__item">
                  <div className="admin-top-items-card__item-head">
                    <span>{String(index + 1).padStart(2, '0')}</span>
                    <div>
                      <strong title={item.label}>{item.label}</strong>
                      <p>{item.meta}</p>
                    </div>
                    <em>{item.value.toLocaleString('es-CO')}</em>
                  </div>
                  <div className="admin-top-items-card__track" aria-hidden="true">
                    <span
                      style={{
                        background: adminChartPalette[index % adminChartPalette.length],
                        width: `${width}%`,
                      }}
                    />
                  </div>
                </div>
              );
            })}
            <Button variant="secondary" size="sm" onClick={onOpenReports}>
              Ver ranking completo
              <ArrowUpRight size={14} />
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}

function OperationalHealthCard({
  summary,
  summaryLoading,
  lowStock,
  lowStockCount,
  lowStockLoading,
  lowStockError,
  totalLocations,
  locationsLoading,
  cashTone,
  stockTone,
  catalogTone,
  locationsTone,
  onOpenCash,
  onOpenInventory,
}: {
  summary: AdminSummary | null;
  summaryLoading: boolean;
  lowStock: AdminLowStockItem[];
  lowStockCount: number;
  lowStockLoading: boolean;
  lowStockError: string | null;
  totalLocations: number;
  locationsLoading: boolean;
  cashTone: BadgeTone;
  stockTone: BadgeTone;
  catalogTone: BadgeTone;
  locationsTone: BadgeTone;
  onOpenCash?: () => void;
  onOpenInventory?: () => void;
}) {
  return (
    <Card padding="none" glow={false} className="admin-panel admin-health-panel">
      <div className="admin-panel__body">
        <AdminDashboardSectionHeader
          eyebrow="Operacion"
          title="Salud operacional"
          meta={<StatusBadge label={lowStockCount > 0 ? 'Revisar' : 'Controlado'} tone={stockTone} />}
        />

        <div className="admin-health-grid">
          <HealthSignal
            title="Caja"
            value={summaryLoading ? '...' : summary?.current_cash_session ? 'Abierta' : 'Cerrada'}
            description={summary?.current_cash_session
              ? `${summary.current_cash_session.location_name} / base ${formatCurrency(
                  summary.current_cash_session.opening_cash,
                )}`
              : 'Sin sesion activa'}
            tone={cashTone}
            icon={<Wallet size={17} />}
            onClick={onOpenCash}
          />
          <HealthSignal
            title="Inventario"
            value={lowStockLoading ? '...' : `${lowStockCount.toLocaleString('es-CO')} alertas`}
            description={lowStock.length > 0 ? `${lowStock[0].ingredient_name} requiere revision` : 'Sin stock bajo'}
            tone={stockTone}
            icon={<AlertTriangle size={17} />}
            onClick={onOpenInventory}
          />
          <HealthSignal
            title="Catalogo"
            value={summaryLoading ? '...' : `${(summary?.active_products_count ?? 0).toLocaleString('es-CO')} activos`}
            description="Activos"
            tone={catalogTone}
            icon={<Boxes size={17} />}
          />
          <HealthSignal
            title="Puntos de venta"
            value={locationsLoading ? '...' : `${totalLocations.toLocaleString('es-CO')} POS`}
            description={totalLocations > 0 ? 'Cobertura lista' : 'Sin POS'}
            tone={locationsTone}
            icon={<Store size={17} />}
          />
        </div>

        <div className="admin-low-stock-summary">
          <div className="admin-low-stock-summary__head">
            <span>Alertas de stock</span>
            <strong>{lowStockLoading ? '...' : lowStockCount.toLocaleString('es-CO')}</strong>
          </div>

          {lowStockError ? (
            <BlockError message={lowStockError} />
          ) : lowStockLoading ? (
            <SkeletonRows rows={2} />
          ) : lowStock.length === 0 ? (
            <InlineEmptyState
              icon={<PackageSearch size={18} />}
              title="Inventario controlado"
              description="No hay ingredientes bajo umbral."
            />
          ) : (
            <div className="admin-low-stock-summary__list">
              {lowStock.slice(0, 3).map((item) => (
                <div key={`${item.ingredient_id}-${item.location_id}`}>
                  <strong>{item.ingredient_name}</strong>
                  <span>{item.location_name}</span>
                  <p>
                    Base {item.qty_on_hand_base} / umbral {item.threshold}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

function HealthSignal({
  title,
  value,
  description,
  tone,
  icon,
  onClick,
}: {
  title: string;
  value: string;
  description: string;
  tone: BadgeTone;
  icon: ReactNode;
  onClick?: () => void;
}) {
  const content = (
    <>
      <span className="admin-health-signal__icon" aria-hidden="true">
        {icon}
      </span>
      <div>
        <span>{title}</span>
        <strong>{value}</strong>
        <p>{description}</p>
      </div>
    </>
  );

  if (onClick) {
    return (
      <button type="button" className="admin-health-signal" data-tone={tone} onClick={onClick}>
        {content}
      </button>
    );
  }

  return (
    <article className="admin-health-signal" data-tone={tone}>
      {content}
    </article>
  );
}

function RecentActivitySummary({
  items,
  total,
  loading,
  error,
  onOpenActivity,
  onOpenAll,
}: {
  items: AdminActivityListItem[];
  total: number;
  loading: boolean;
  error: string | null;
  onOpenActivity: (activity: AdminActivityListItem) => void;
  onOpenAll: () => void;
}) {
  const visibleItems = items.slice(0, 4);
  const statusTone: BadgeTone = loading ? 'info' : error ? 'danger' : visibleItems.length > 0 ? 'success' : 'default';
  const statusLabel = loading ? 'Actualizando' : error ? 'Error' : `${total.toLocaleString('es-CO')} eventos`;

  return (
    <Card padding="none" glow={false} className="admin-panel admin-activity-summary-panel">
      <div className="admin-panel__body">
        <AdminDashboardSectionHeader
          eyebrow="Resumen"
          title="Actividad reciente"
          meta={
            <div className="admin-activity-summary-panel__actions">
              <StatusBadge label={statusLabel} tone={statusTone} />
              <Button variant="secondary" size="sm" onClick={onOpenAll}>
                Ver actividad
            </Button>
          </div>
        }
      />

        {error ? (
          <BlockError message={error} />
        ) : loading ? (
          <SkeletonRows rows={3} />
        ) : visibleItems.length === 0 ? (
          <InlineEmptyState
            icon={<Activity size={18} />}
            title="Sin actividad reciente"
            description="Los eventos apareceran cuando exista movimiento."
          />
        ) : (
          <div className="admin-activity-summary-list">
            {visibleItems.map((item) => (
              <button
                key={item.id}
                type="button"
                className="admin-activity-summary-item"
                data-tone={getActivityTone(item.activity_type)}
                onClick={() => onOpenActivity(item)}
              >
                <div className="admin-activity-summary-item__main">
                  <StatusBadge label={formatActivityType(item.activity_type)} tone={getActivityTone(item.activity_type)} />
                  <strong>{item.title}</strong>
                  <p>{item.subtitle}</p>
                </div>
                <time dateTime={item.occurred_at}>
                  <Clock3 size={14} />
                  {formatDate(item.occurred_at)}
                </time>
              </button>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}

function QuickActionsCard({
  actions,
  onNavigate,
}: {
  actions: QuickAction[];
  onNavigate: (path: string) => void;
}) {
  return (
    <Card padding="none" glow={false} className="admin-panel admin-quick-actions-panel">
      <div className="admin-panel__body">
        <AdminDashboardSectionHeader
          eyebrow="Accesos"
          title="Acciones rapidas"
        />

        {actions.length === 0 ? (
          <InlineEmptyState
            icon={<Activity size={18} />}
            title="Sin accesos disponibles"
            description="Tu rol no tiene acciones rapidas en este panel."
          />
        ) : (
          <div className="admin-quick-actions-grid">
            {actions.map((action) => (
              <button
                key={action.key}
                type="button"
                className="admin-quick-action"
                data-tone={action.tone}
                onClick={() => onNavigate(action.path)}
              >
                <span className="admin-quick-action__icon" aria-hidden="true">
                  {action.icon}
                </span>
                <span className="admin-quick-action__copy">
                  <strong>{action.title}</strong>
                  <span>{action.description}</span>
                </span>
                <ArrowUpRight size={15} aria-hidden="true" />
              </button>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}

function InlineEmptyState({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="admin-inline-empty">
      <span aria-hidden="true">{icon}</span>
      <div>
        <strong>{title}</strong>
        <p>{description}</p>
      </div>
    </div>
  );
}

function normalizeSalesTrend(items: AdminSalesReportDailyItem[], days: number): TrendPoint[] {
  const byDate = new Map(items.map((item) => [item.date, item]));
  const today = new Date();

  return Array.from({ length: days }).map((_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (days - 1 - index));
    const dateKey = toDateInputValue(date);
    const item = byDate.get(dateKey);

    return {
      date: dateKey,
      label: formatDayLabel(dateKey),
      total: item?.total ?? 0,
      sales_count: item?.sales_count ?? 0,
    };
  });
}

function summarizeTrend(points: TrendPoint[]): TrendSummary {
  const total = points.reduce((sum, point) => sum + point.total, 0);
  const salesCount = points.reduce((sum, point) => sum + point.sales_count, 0);
  const bestDay = points.reduce<TrendPoint | null>((best, point) => {
    if (!best || point.total > best.total) return point;
    return best;
  }, null);

  return {
    total,
    salesCount,
    averageTicket: salesCount > 0 ? total / salesCount : 0,
    bestDay: bestDay && bestDay.total > 0 ? bestDay : null,
  };
}

function getRecentDateRange(days: number) {
  const to = new Date();
  const from = new Date();
  from.setDate(to.getDate() - (days - 1));

  return {
    from: toDateInputValue(from),
    to: toDateInputValue(to),
  };
}

function toDateInputValue(date: Date) {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

function formatDayLabel(value: string) {
  return new Intl.DateTimeFormat('es-CO', {
    day: '2-digit',
    month: 'short',
  }).format(new Date(`${value}T00:00:00`));
}

function compactCurrency(value: number) {
  const prefix = value < 0 ? '-$' : '$';
  const absoluteValue = Math.abs(value);
  if (absoluteValue >= 1_000_000) return `${prefix}${Math.round(absoluteValue / 1_000_000)}M`;
  if (absoluteValue >= 1_000) return `${prefix}${Math.round(absoluteValue / 1_000)}k`;
  return `${prefix}${absoluteValue.toLocaleString('es-CO')}`;
}
