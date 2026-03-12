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
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { KpiCard } from '@/components/KpiCard';
import { RoleModeBanner } from '@/components/RoleModeBanner';
import { SectionHeader } from '@/components/SectionHeader';
import { usePermissions } from '@/hooks/usePermissions';
import { posApi } from '@/services/api/posApi';
import { formatCurrency, formatDate } from '@/utils/format';
import type {
  AdminLowStockItem,
  AdminRecentActivityItem,
  AdminSalesByPaymentItem,
  AdminSummary,
  AdminTopItem,
} from '@/types/api';

function BlockError({ message }: { message: string }) {
  return (
    <div className="rounded-3xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
      {message}
    </div>
  );
}

function SkeletonRows({ rows = 4 }: { rows?: number }) {
  return (
    <div className="grid gap-3">
      {Array.from({ length: rows }).map((_, index) => (
        <div
          key={index}
          className="h-20 animate-pulse rounded-3xl border border-slate-800 bg-slate-950/50"
        />
      ))}
    </div>
  );
}

export function AdminPage() {
  const { isAdmin, isAuditor } = usePermissions();
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

  async function loadSummary() {
    try {
      setSummaryLoading(true);
      setSummaryError(null);
      setSummary(await posApi.getAdminSummary());
    } catch (error) {
      setSummaryError(
        error instanceof Error ? error.message : 'No fue posible cargar el resumen',
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
          color: item.method === 'CASH' ? '#34d399' : '#38bdf8',
        })),
    [salesByPayment],
  );

  const topItemsData = useMemo(
    () =>
      topItems.map((item, index) => ({
        label: `${item.name} - ${item.item_type === 'VARIANT' ? 'Variante' : 'Combo'}`,
        value: item.qty_sold,
        color: index % 2 === 0 ? '#2dd4bf' : '#22d3ee',
      })),
    [topItems],
  );

  const currentCashSessionLabel = summary?.current_cash_session
    ? `Abierta #${summary.current_cash_session.id}`
    : 'Sin sesion';

  return (
    <div className="grid gap-6">
      {isAuditor ? (
        <RoleModeBanner
          title="Panel en modo auditoria"
          description="Este dashboard es de solo lectura para el rol AUDITOR. Puedes revisar metricas, alertas y actividad reciente sin ejecutar acciones operativas."
          tone="warning"
        />
      ) : null}

      <Card className="overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-r from-teal-300/12 via-sky-300/10 to-transparent" />
        <div className="relative">
          <SectionHeader
            eyebrow="Administracion"
            title="Panel administrativo"
            description={
              isAdmin
                ? 'Dashboard operativo conectado a metricas reales del backend para monitorear ventas, caja, stock y actividad reciente.'
                : 'Vista de consulta conectada a metricas reales del backend para auditoria, seguimiento y revision operativa.'
            }
          />
        </div>
      </Card>

      {summaryError ? <BlockError message={summaryError} /> : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <KpiCard
          title="Ventas del dia"
          value={summaryLoading ? '...' : formatCurrency(summary?.sales_today_total ?? 0)}
          hint="Total vendido hoy"
          icon={<ShoppingBag size={18} />}
          tone="success"
        />
        <KpiCard
          title="Numero de ventas"
          value={summaryLoading ? '...' : String(summary?.sales_count ?? 0)}
          hint="Ventas pagadas del dia"
          icon={<Receipt size={18} />}
        />
        <KpiCard
          title="Ticket promedio"
          value={summaryLoading ? '...' : formatCurrency(summary?.average_ticket ?? 0)}
          hint="Promedio por venta pagada"
          icon={<Sparkles size={18} />}
        />
        <KpiCard
          title="Caja actual"
          value={summaryLoading ? '...' : currentCashSessionLabel}
          hint={
            summary?.current_cash_session
              ? summary.current_cash_session.location_name
              : 'Sin caja abierta'
          }
          icon={<CreditCard size={18} />}
          tone={summary?.current_cash_session ? 'success' : 'warning'}
        />
        <KpiCard
          title="Productos activos"
          value={summaryLoading ? '...' : String(summary?.active_products_count ?? 0)}
          hint="Conteo real del catalogo"
          icon={<Boxes size={18} />}
        />
        <KpiCard
          title="Ingredientes con stock bajo"
          value={summaryLoading ? '...' : String(summary?.low_stock_count ?? 0)}
          hint="Calculado desde inventario real"
          icon={<AlertTriangle size={18} />}
          tone={(summary?.low_stock_count ?? 0) > 0 ? 'warning' : 'default'}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {salesByPaymentError ? (
          <Card>
            <SectionHeader
              title="Ventas por metodo de pago"
              description="Distribucion operativa reciente"
            />
            <div className="mt-6">
              <BlockError message={salesByPaymentError} />
            </div>
          </Card>
        ) : salesByPaymentLoading ? (
          <Card>
            <SectionHeader
              title="Ventas por metodo de pago"
              description="Distribucion operativa reciente"
            />
            <div className="mt-6">
              <SkeletonRows rows={3} />
            </div>
          </Card>
        ) : (
          <AdminChartCard
            title="Ventas por metodo de pago"
            description="Distribucion operativa reciente"
            data={paymentMethodData}
            chartType="pie"
            valueFormat="currency"
            emptyTitle="Sin ventas por metodo registradas"
            emptyDescription="Aparecera informacion cuando existan pagos confirmados."
            footer={
              <p className="text-xs text-slate-500">
                Totales reales agregados desde pagos registrados.
              </p>
            }
          />
        )}

        {topItemsError ? (
          <Card>
            <SectionHeader
              title="Productos mas vendidos"
              description="Ranking real de items"
            />
            <div className="mt-6">
              <BlockError message={topItemsError} />
            </div>
          </Card>
        ) : topItemsLoading ? (
          <Card>
            <SectionHeader
              title="Productos mas vendidos"
              description="Ranking real de items"
            />
            <div className="mt-6">
              <SkeletonRows rows={4} />
            </div>
          </Card>
        ) : (
          <AdminChartCard
            title="Productos mas vendidos"
            description="Ranking real de items"
            data={topItemsData}
            chartType="bar"
            valueFormat="number"
            emptyTitle="Sin items vendidos"
            emptyDescription="El ranking aparecera cuando existan ventas pagadas."
            footer={
              <p className="text-xs text-slate-500">
                Incluye variantes y combos vendidos segun el backend.
              </p>
            }
          />
        )}
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <Card>
          <SectionHeader
            eyebrow="Alertas"
            title="Estado operativo"
            description="Senales rapidas sobre caja, inventario y ventas."
          />

          <div className="mt-6 grid gap-3">
            {summaryLoading ? (
              <SkeletonRows rows={4} />
            ) : (
              <>
                <AlertCard
                  title={
                    summary?.current_cash_session
                      ? 'Caja abierta'
                      : 'Caja cerrada'
                  }
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
                  title={
                    (summary?.sales_count ?? 0) > 0
                      ? 'Ventas recientes disponibles'
                      : 'Sin ventas registradas hoy'
                  }
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
            <div className="mt-6 grid gap-3">
              {recentActivity.map((item) => (
                <div
                  key={`${item.activity_type}-${item.entity_id}-${item.created_at}`}
                  className="rounded-3xl border border-slate-800 bg-slate-950/50 p-4"
                >
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                        {formatActivityType(item.activity_type)}
                      </p>
                      <p className="mt-2 font-medium text-white">{item.title}</p>
                      <p className="mt-1 text-sm text-slate-400">{item.subtitle}</p>
                    </div>
                    <p className="text-sm text-slate-500">
                      {formatDate(item.created_at)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {isAdmin ? (
        <Card>
          <SectionHeader
            eyebrow="Siguiente fase"
            title="Controles administrativos"
            description="La base visual queda preparada para acciones futuras como exportacion, configuracion de alertas y reglas de supervision."
          />

          <div className="mt-6 grid gap-3 md:grid-cols-3">
            {['Exportacion de reportes', 'Alertas configurables', 'Reglas por sucursal'].map(
              (item) => (
                <div
                  key={item}
                  className="rounded-3xl border border-slate-800 bg-slate-950/50 p-5"
                >
                  <p className="font-medium text-white">{item}</p>
                  <p className="mt-2 text-sm text-slate-400">
                    Disponible cuando la siguiente fase habilite acciones administrativas.
                  </p>
                </div>
              ),
            )}
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

