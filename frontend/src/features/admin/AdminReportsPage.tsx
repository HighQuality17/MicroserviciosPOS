import '@/features/admin/admin-d1.css';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  BarChart3,
  Building2,
  CalendarDays,
  CreditCard,
  Filter,
  Receipt,
  RefreshCw,
  RotateCcw,
  ShoppingBag,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { AdminChartCard } from '@/components/AdminChartCard';
import { AdminPaymentMethodChartCard } from '@/features/admin/AdminPaymentMethodChartCard';
import { AdminSubmoduleNav } from '@/features/admin/AdminSubmoduleNav';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { FeedbackMessage } from '@/components/FeedbackMessage';
import { Input } from '@/components/Input';
import { ModulePageHeader } from '@/components/ModulePageHeader';
import type { ModulePageHeaderCard } from '@/components/ModulePageHeader';
import { SectionHeader } from '@/components/SectionHeader';
import { Select } from '@/components/Select';
import { StatusBadge } from '@/components/StatusBadge';
import { formatPaymentMethod } from '@/features/admin/admin-activity-format';
import { posApi } from '@/services/api/posApi';
import { useAppStore } from '@/store/appStore';
import { formatCurrency } from '@/utils/format';
import type {
  AdminSalesReportDailyItem,
  AdminSalesReportResponse,
  PaymentMethod,
} from '@/types/api';

type BadgeTone = 'default' | 'success' | 'warning' | 'danger' | 'info';

type SalesReportFilters = {
  from: string;
  to: string;
  locationId: string;
  paymentMethod: 'ALL' | PaymentMethod;
};

const allLocationsValue = 'ALL';
const chartPalette = [
  'var(--admin-chart-cyan)',
  'var(--admin-chart-emerald)',
  'var(--admin-chart-amber)',
  'var(--admin-chart-rose)',
];

function getDefaultFilters(): SalesReportFilters {
  const today = new Date();
  const from = new Date(today);
  from.setDate(today.getDate() - 29);

  return {
    from: toDateInputValue(from),
    to: toDateInputValue(today),
    locationId: allLocationsValue,
    paymentMethod: 'ALL',
  };
}

export function AdminReportsPage() {
  const availableLocations = useAppStore((state) => state.availableLocations);
  const locationsLoading = useAppStore((state) => state.locationsLoading);
  const [filters, setFilters] = useState<SalesReportFilters>(() => getDefaultFilters());
  const [appliedFilters, setAppliedFilters] = useState<SalesReportFilters>(() => getDefaultFilters());
  const [report, setReport] = useState<AdminSalesReportResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterError, setFilterError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadReport() {
      try {
        setLoading(true);
        setError(null);
        const response = await posApi.getAdminSalesReport({
          from: appliedFilters.from,
          to: appliedFilters.to,
          ...(appliedFilters.locationId !== allLocationsValue
            ? { locationId: Number(appliedFilters.locationId) }
            : {}),
          ...(appliedFilters.paymentMethod !== 'ALL'
            ? { paymentMethod: appliedFilters.paymentMethod }
            : {}),
        });

        if (!cancelled) {
          setReport(response);
        }
      } catch (loadError) {
        if (!cancelled) {
          setReport(null);
          setError(
            loadError instanceof Error
              ? loadError.message
              : 'No fue posible cargar reportes de ventas',
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadReport();

    return () => {
      cancelled = true;
    };
  }, [appliedFilters]);

  const selectedLocationName = useMemo(() => {
    if (appliedFilters.locationId === allLocationsValue) {
      return 'Todos los POS';
    }

    return (
      availableLocations.find(
        (location) => location.id === Number(appliedFilters.locationId),
      )?.name ?? `POS #${appliedFilters.locationId}`
    );
  }, [appliedFilters.locationId, availableLocations]);

  const paymentMethodLabel =
    appliedFilters.paymentMethod === 'ALL'
      ? 'Todos los metodos'
      : formatPaymentMethod(appliedFilters.paymentMethod);
  const hasSales = (report?.kpis.sales_count ?? 0) > 0;
  const periodLabel = `${formatDateLabel(appliedFilters.from)} - ${formatDateLabel(
    appliedFilters.to,
  )}`;
  const statusTone: BadgeTone = loading
    ? 'info'
    : error
      ? 'danger'
      : hasSales
        ? 'success'
        : 'default';
  const statusLabel = loading
    ? 'Actualizando'
    : error
      ? 'Error'
      : hasSales
        ? 'Ventas listas'
        : 'Sin ventas';
  const headerCards = buildHeaderCards(report, loading);
  const paymentMethodData = useMemo(
    () =>
      (report?.sales_by_payment ?? []).map((item) => ({
        label: formatPaymentMethod(item.method),
        value: item.total,
        color:
          item.method === 'CASH'
            ? 'var(--admin-chart-emerald)'
            : 'var(--admin-chart-cyan)',
      })),
    [report],
  );
  const topProductsData = useMemo(
    () =>
      (report?.top_products ?? []).map((item, index) => ({
        label: item.name,
        meta: `${item.qty_sold.toLocaleString('es-CO')} unidades / ${formatCurrency(
          item.total_sold,
        )}`,
        value: item.qty_sold,
        color: chartPalette[index % chartPalette.length],
      })),
    [report],
  );

  function handleFilterChange<Key extends keyof SalesReportFilters>(
    key: Key,
    value: SalesReportFilters[Key],
  ) {
    setFilters((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function handleApplyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (filters.from > filters.to) {
      setFilterError('La fecha inicial no puede ser mayor que la fecha final.');
      return;
    }

    setFilterError(null);
    setAppliedFilters(filters);
  }

  function handleResetFilters() {
    const nextFilters = getDefaultFilters();
    setFilters(nextFilters);
    setAppliedFilters(nextFilters);
    setFilterError(null);
  }

  return (
    <div className="admin-dashboard admin-reports-page grid min-w-0 gap-5 sm:gap-6">
      <AdminSubmoduleNav />

      <ModulePageHeader
        ariaLabel="Reportes administrativos de ventas"
        eyebrow="Admin / Reportes"
        title="Reportes de ventas"
        description="Ventas pagadas por rango, POS y metodo de pago."
        helpText="Lectura agregada de ventas; no incluye exportaciones ni reportes de inventario."
        icon={<BarChart3 size={18} />}
        badges={[
          { label: statusLabel, tone: statusTone },
          { label: paymentMethodLabel, tone: 'info' },
        ]}
        summary={{
          label: 'Periodo',
          value: periodLabel,
          note: selectedLocationName,
        }}
        asideAction={
          <Button
            type="button"
            variant="secondary"
            loading={loading}
            onClick={() => setAppliedFilters({ ...appliedFilters })}
          >
            <RefreshCw size={16} />
            Actualizar
          </Button>
        }
        cards={headerCards}
      />

      <Card padding="none" glow={false} className="admin-panel admin-reports-filter-panel">
        <div className="admin-panel__body">
          <SectionHeader
            eyebrow="Filtros"
            title="Consulta de ventas"
            description="Rango, punto de venta y metodo."
            actions={<StatusBadge label={periodLabel} tone={statusTone} />}
          />

          <form className="admin-reports-filter-grid" onSubmit={handleApplyFilters}>
            <Input
              type="date"
              label="Desde"
              value={filters.from}
              max={filters.to}
              onChange={(event) => handleFilterChange('from', event.target.value)}
              required
            />
            <Input
              type="date"
              label="Hasta"
              value={filters.to}
              min={filters.from}
              onChange={(event) => handleFilterChange('to', event.target.value)}
              required
            />
            <Select
              label="POS"
              value={filters.locationId}
              disabled={locationsLoading}
              onChange={(event) => handleFilterChange('locationId', event.target.value)}
            >
              <option value={allLocationsValue}>
                {locationsLoading ? 'Cargando POS...' : 'Todos los POS'}
              </option>
              {availableLocations.map((location) => (
                <option key={location.id} value={String(location.id)}>
                  {location.name}
                </option>
              ))}
            </Select>
            <Select
              label="Metodo"
              value={filters.paymentMethod}
              onChange={(event) =>
                handleFilterChange(
                  'paymentMethod',
                  event.target.value as SalesReportFilters['paymentMethod'],
                )
              }
            >
              <option value="ALL">Todos los metodos</option>
              <option value="CASH">Efectivo</option>
              <option value="TRANSFER">Transferencia</option>
            </Select>
            <div className="admin-reports-filter-actions">
              <Button type="submit" loading={loading}>
                <Filter size={16} />
                Aplicar
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={handleResetFilters}
                disabled={loading}
              >
                <RotateCcw size={16} />
                Restablecer
              </Button>
            </div>
          </form>

          {filterError ? <FeedbackMessage tone="warning">{filterError}</FeedbackMessage> : null}
        </div>
      </Card>

      {error ? <FeedbackMessage tone="error">{error}</FeedbackMessage> : null}

      {loading && !report ? (
        <ReportsSkeleton />
      ) : !error && report ? (
        <>
          {!hasSales ? (
            <Card padding="none" glow={false} className="admin-panel">
              <div className="admin-panel__body">
                <EmptyState
                  title="Sin ventas en el periodo"
                  description="No hay ventas pagadas que coincidan con los filtros actuales."
                  icon={<Receipt size={22} />}
                />
              </div>
            </Card>
          ) : null}

          <div className="admin-reports-chart-grid">
            <DailySalesChartCard data={report.sales_by_day} hasSales={hasSales} />

            <AdminPaymentMethodChartCard
              title="Ventas por metodo de pago"
              description="Distribucion del ingreso cobrado."
              data={paymentMethodData}
              emptyTitle="Sin pagos en el periodo"
              emptyDescription="Aparecera con ventas pagadas."
            />

            <AdminChartCard
              title="Productos mas vendidos"
              description="Ranking por unidades vendidas."
              data={topProductsData}
              chartType="bar"
              valueFormat="number"
              emptyTitle="Sin productos vendidos"
              emptyDescription="Aparecera con ventas pagadas."
            />
          </div>

          <TopProductsTable report={report} />
        </>
      ) : null}
    </div>
  );
}

function buildHeaderCards(
  report: AdminSalesReportResponse | null,
  loading: boolean,
): ModulePageHeaderCard[] {
  const salesCount = report?.kpis.sales_count ?? 0;
  const hasSales = salesCount > 0;
  const salesTone: BadgeTone = loading ? 'info' : hasSales ? 'success' : 'default';

  return [
    {
      label: 'Total vendido',
      value: loading && !report ? '...' : formatCurrency(report?.kpis.total_sold ?? 0),
      note: loading && !report ? 'Calculando' : `${salesCount} ventas pagadas`,
      accent: salesTone,
      icon: <TrendingUp size={16} />,
      iconTone: salesTone,
      badge: { label: hasSales ? 'Con ventas' : 'Sin ventas', tone: salesTone },
    },
    {
      label: 'Ventas',
      value: loading && !report ? '...' : String(salesCount),
      note: 'Tickets confirmados',
      accent: salesTone,
      icon: <Receipt size={16} />,
      iconTone: salesTone,
      badge: { label: 'Pagadas', tone: salesTone },
    },
    {
      label: 'Ticket promedio',
      value: loading && !report ? '...' : formatCurrency(report?.kpis.average_ticket ?? 0),
      note: 'Promedio por venta',
      accent: hasSales ? 'info' : 'default',
      icon: <ShoppingBag size={16} />,
      iconTone: hasSales ? 'info' : 'default',
      badge: { label: hasSales ? 'Calculado' : 'Sin base', tone: hasSales ? 'info' : 'default' },
    },
    {
      label: 'Efectivo',
      value: loading && !report ? '...' : formatCurrency(report?.kpis.total_cash ?? 0),
      note: 'Total cobrado',
      accent: (report?.kpis.total_cash ?? 0) > 0 ? 'success' : 'default',
      icon: <Wallet size={16} />,
      iconTone: (report?.kpis.total_cash ?? 0) > 0 ? 'success' : 'default',
      badge: {
        label: 'Cash',
        tone: (report?.kpis.total_cash ?? 0) > 0 ? 'success' : 'default',
      },
    },
    {
      label: 'Transferencia',
      value: loading && !report ? '...' : formatCurrency(report?.kpis.total_transfer ?? 0),
      note: 'Total cobrado',
      accent: (report?.kpis.total_transfer ?? 0) > 0 ? 'info' : 'default',
      icon: <CreditCard size={16} />,
      iconTone: (report?.kpis.total_transfer ?? 0) > 0 ? 'info' : 'default',
      badge: {
        label: 'Transfer',
        tone: (report?.kpis.total_transfer ?? 0) > 0 ? 'info' : 'default',
      },
    },
  ];
}

function DailySalesChartCard({
  data,
  hasSales,
}: {
  data: AdminSalesReportDailyItem[];
  hasSales: boolean;
}) {
  const total = data.reduce((sum, item) => sum + item.total, 0);
  const bestDay = [...data].sort((left, right) => right.total - left.total)[0] ?? null;

  return (
    <Card padding="none" glow={false} className="admin-panel admin-reports-daily-card">
      <div className="admin-panel__body">
        <SectionHeader
          eyebrow="Tendencia"
          title="Ventas por dia"
          description="Ingreso diario dentro del rango."
          actions={
            <div className="admin-chart-card__header-actions">
              <StatusBadge label={formatCurrency(total)} tone={hasSales ? 'success' : 'default'} />
              <StatusBadge label={`${data.length} dias`} tone="default" />
            </div>
          }
        />

        {!hasSales ? (
          <EmptyState
            title="Sin ventas por dia"
            description="La grafica aparecera cuando existan ventas pagadas."
            icon={<CalendarDays size={22} />}
          />
        ) : (
          <div
            className="admin-reports-daily-chart"
            role="img"
            aria-label="Grafica de ventas por dia"
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data.map((item) => ({
                  ...item,
                  label: formatDayTick(item.date),
                }))}
                margin={{ top: 12, right: 20, left: 4, bottom: 4 }}
              >
                <CartesianGrid
                  stroke="var(--chart-grid)"
                  strokeDasharray="4 7"
                  vertical={false}
                />
                <XAxis
                  dataKey="label"
                  tick={{ fill: 'var(--chart-axis)', fontSize: 11, fontWeight: 700 }}
                  axisLine={false}
                  tickLine={false}
                  minTickGap={14}
                />
                <YAxis
                  tick={{ fill: 'var(--chart-axis)', fontSize: 11, fontWeight: 700 }}
                  axisLine={false}
                  tickLine={false}
                  width={76}
                  tickFormatter={(value) => compactCurrency(Number(value))}
                />
                <Tooltip content={<DailyChartTooltip />} />
                <Bar
                  dataKey="total"
                  name="Ventas"
                  fill="var(--admin-chart-cyan)"
                  radius={[8, 8, 0, 0]}
                  maxBarSize={34}
                />
              </BarChart>
            </ResponsiveContainer>
            <div className="admin-reports-daily-summary">
              <span>Mejor dia</span>
              <strong>{bestDay ? formatDateLabel(bestDay.date) : 'Sin datos'}</strong>
              <p>{bestDay ? formatCurrency(bestDay.total) : formatCurrency(0)}</p>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}

function DailyChartTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: AdminSalesReportDailyItem; value: number }>;
}) {
  if (!active || !payload?.length) {
    return null;
  }

  const item = payload[0].payload;

  return (
    <div className="chart-tooltip-surface rounded-2xl px-3 py-2 shadow-2xl">
      <p className="text-sm font-medium theme-text-strong">{formatDateLabel(item.date)}</p>
      <p className="metric-accent mt-1 text-xs">{formatCurrency(Number(payload[0].value))}</p>
      <p className="theme-text-secondary mt-0.5 text-[11px]">
        {item.sales_count.toLocaleString('es-CO')} ventas
      </p>
    </div>
  );
}

function TopProductsTable({ report }: { report: AdminSalesReportResponse }) {
  return (
    <Card padding="none" glow={false} className="admin-panel admin-reports-table-panel">
      <div className="admin-panel__body">
        <SectionHeader
          eyebrow="Resumen"
          title="Top productos"
          description="Cantidad vendida y total generado."
          actions={
            <StatusBadge
              label={`${report.top_products.length.toLocaleString('es-CO')} items`}
              tone={report.top_products.length > 0 ? 'success' : 'default'}
            />
          }
        />

        {report.top_products.length === 0 ? (
          <EmptyState
            title="Sin top productos"
            description="No hay productos vendidos en el rango seleccionado."
            icon={<Building2 size={22} />}
          />
        ) : (
          <div className="admin-reports-table-wrap">
            <table className="admin-reports-table">
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>Tipo</th>
                  <th>Cantidad vendida</th>
                  <th>Total generado</th>
                </tr>
              </thead>
              <tbody>
                {report.top_products.map((item, index) => (
                  <tr key={`${item.item_type}-${item.ref_id}`}>
                    <td>
                      <div className="admin-reports-product-cell">
                        <span>{String(index + 1).padStart(2, '0')}</span>
                        <strong title={item.name}>{item.name}</strong>
                      </div>
                    </td>
                    <td>{item.item_type === 'VARIANT' ? 'Variante' : 'Combo'}</td>
                    <td>{item.qty_sold.toLocaleString('es-CO')}</td>
                    <td>{formatCurrency(item.total_sold)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Card>
  );
}

function ReportsSkeleton() {
  return (
    <div className="admin-reports-skeleton" aria-hidden="true">
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index} className="data-list-card h-48 animate-pulse rounded-3xl" />
      ))}
    </div>
  );
}

function toDateInputValue(date: Date) {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

function formatDateLabel(value: string) {
  return new Intl.DateTimeFormat('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(`${value}T00:00:00`));
}

function formatDayTick(value: string) {
  return new Intl.DateTimeFormat('es-CO', {
    day: '2-digit',
    month: 'short',
  }).format(new Date(`${value}T00:00:00`));
}

function compactCurrency(value: number) {
  if (value >= 1_000_000) return `$${Math.round(value / 1_000_000)}M`;
  if (value >= 1_000) return `$${Math.round(value / 1_000)}k`;
  return `$${value.toLocaleString('es-CO')}`;
}
