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
  Scale,
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
import { Modal } from '@/components/Modal';
import { ModulePageHeader } from '@/components/ModulePageHeader';
import type { ModulePageHeaderCard } from '@/components/ModulePageHeader';
import { SectionHeader } from '@/components/SectionHeader';
import { Select } from '@/components/Select';
import { Sheet } from '@/components/Sheet';
import { StatusBadge } from '@/components/StatusBadge';
import { formatPaymentMethod } from '@/features/admin/admin-activity-format';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { posApi } from '@/services/api/posApi';
import { useAppStore } from '@/store/appStore';
import { formatCurrency, formatDate } from '@/utils/format';
import type {
  AdminCashReportClosuresByDayItem,
  AdminCashReportDifferenceByClosureItem,
  AdminCashReportResponse,
  AdminCashReportSessionItem,
  AdminSalesReportDailyItem,
  AdminSalesReportResponse,
  CashReportStatus,
  PaymentMethod,
} from '@/types/api';

type BadgeTone = 'default' | 'success' | 'warning' | 'danger' | 'info';
type ActiveReport = 'sales' | 'cash';

type SalesReportFilters = {
  from: string;
  to: string;
  locationId: string;
  paymentMethod: 'ALL' | PaymentMethod;
};

type CashReportFilters = {
  from: string;
  to: string;
  locationId: string;
  status: CashReportStatus;
};

const allLocationsValue = 'ALL';
const chartPalette = [
  'var(--admin-chart-cyan)',
  'var(--admin-chart-emerald)',
  'var(--admin-chart-amber)',
  'var(--admin-chart-rose)',
];

function getDefaultSalesFilters(): SalesReportFilters {
  const defaults = getDefaultDateRange();

  return {
    ...defaults,
    locationId: allLocationsValue,
    paymentMethod: 'ALL',
  };
}

function getDefaultCashFilters(): CashReportFilters {
  const defaults = getDefaultDateRange();

  return {
    ...defaults,
    locationId: allLocationsValue,
    status: 'ALL',
  };
}

export function AdminReportsPage() {
  const [activeReport, setActiveReport] = useState<ActiveReport>('sales');

  return (
    <div className="admin-dashboard admin-reports-page grid min-w-0 gap-5 sm:gap-6">
      <AdminSubmoduleNav />

      <Card padding="none" glow={false} className="admin-panel admin-reports-tabs-panel">
        <div className="admin-reports-tabs" role="tablist" aria-label="Tipo de reporte">
          <button
            type="button"
            role="tab"
            aria-selected={activeReport === 'sales'}
            data-active={activeReport === 'sales'}
            onClick={() => setActiveReport('sales')}
          >
            <TrendingUp size={16} />
            Ventas
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeReport === 'cash'}
            data-active={activeReport === 'cash'}
            onClick={() => setActiveReport('cash')}
          >
            <Wallet size={16} />
            Caja
          </button>
        </div>
      </Card>

      {activeReport === 'sales' ? <SalesReportView /> : <CashReportView />}
    </div>
  );
}

function SalesReportView() {
  const availableLocations = useAppStore((state) => state.availableLocations);
  const locationsLoading = useAppStore((state) => state.locationsLoading);
  const [filters, setFilters] = useState<SalesReportFilters>(() => getDefaultSalesFilters());
  const [appliedFilters, setAppliedFilters] = useState<SalesReportFilters>(() => getDefaultSalesFilters());
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

  const selectedLocationName = useMemo(
    () => resolveLocationName(appliedFilters.locationId, availableLocations),
    [appliedFilters.locationId, availableLocations],
  );
  const paymentMethodLabel =
    appliedFilters.paymentMethod === 'ALL'
      ? 'Todos los metodos'
      : formatPaymentMethod(appliedFilters.paymentMethod);
  const hasSales = (report?.kpis.sales_count ?? 0) > 0;
  const periodLabel = buildPeriodLabel(appliedFilters.from, appliedFilters.to);
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
  const headerCards = buildSalesHeaderCards(report, loading);
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
    setFilters((current) => ({ ...current, [key]: value }));
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
    const nextFilters = getDefaultSalesFilters();
    setFilters(nextFilters);
    setAppliedFilters(nextFilters);
    setFilterError(null);
  }

  return (
    <>
      <ModulePageHeader
        ariaLabel="Reportes administrativos de ventas"
        eyebrow="Admin / Reportes / Ventas"
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
            <ReportFilterActions loading={loading} onReset={handleResetFilters} />
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
    </>
  );
}

function CashReportView() {
  const availableLocations = useAppStore((state) => state.availableLocations);
  const locationsLoading = useAppStore((state) => state.locationsLoading);
  const [filters, setFilters] = useState<CashReportFilters>(() => getDefaultCashFilters());
  const [appliedFilters, setAppliedFilters] = useState<CashReportFilters>(() => getDefaultCashFilters());
  const [report, setReport] = useState<AdminCashReportResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterError, setFilterError] = useState<string | null>(null);
  const [selectedSession, setSelectedSession] =
    useState<AdminCashReportSessionItem | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadReport() {
      try {
        setLoading(true);
        setError(null);
        const response = await posApi.getAdminCashReport({
          from: appliedFilters.from,
          to: appliedFilters.to,
          status: appliedFilters.status,
          ...(appliedFilters.locationId !== allLocationsValue
            ? { locationId: Number(appliedFilters.locationId) }
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
              : 'No fue posible cargar reportes de caja',
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

  const selectedLocationName = useMemo(
    () => resolveLocationName(appliedFilters.locationId, availableLocations),
    [appliedFilters.locationId, availableLocations],
  );
  const periodLabel = buildPeriodLabel(appliedFilters.from, appliedFilters.to);
  const hasSessions = (report?.sessions.length ?? 0) > 0;
  const hasClosures = (report?.kpis.closed_sessions_count ?? 0) > 0;
  const statusTone: BadgeTone = loading
    ? 'info'
    : error
      ? 'danger'
      : hasSessions
        ? 'success'
        : 'default';
  const statusLabel = loading
    ? 'Actualizando'
    : error
      ? 'Error'
      : hasSessions
        ? 'Caja lista'
        : 'Sin sesiones';
  const headerCards = buildCashHeaderCards(report, loading);
  const expectedVsCountedData = useMemo(
    () =>
      (report?.expected_vs_counted ?? []).map((item, index) => ({
        label: item.label,
        value: item.total,
        color: chartPalette[index % chartPalette.length],
      })),
    [report],
  );

  function handleFilterChange<Key extends keyof CashReportFilters>(
    key: Key,
    value: CashReportFilters[Key],
  ) {
    setFilters((current) => ({ ...current, [key]: value }));
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
    const nextFilters = getDefaultCashFilters();
    setFilters(nextFilters);
    setAppliedFilters(nextFilters);
    setFilterError(null);
  }

  return (
    <>
      <ModulePageHeader
        ariaLabel="Reportes administrativos de caja"
        eyebrow="Admin / Reportes / Caja"
        title="Reportes de caja"
        description="Aperturas, cierres, diferencias y snapshots historicos."
        helpText="Lectura agregada de caja. Usa snapshots de cierre cuando existen."
        icon={<Wallet size={18} />}
        badges={[
          { label: statusLabel, tone: statusTone },
          { label: formatCashStatus(appliedFilters.status), tone: 'info' },
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
            title="Consulta de caja"
            description="Rango, punto de venta y estado."
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
              label="Estado"
              value={filters.status}
              onChange={(event) =>
                handleFilterChange('status', event.target.value as CashReportStatus)
              }
            >
              <option value="ALL">Todas</option>
              <option value="OPEN">Abiertas</option>
              <option value="CLOSED">Cerradas</option>
            </Select>
            <ReportFilterActions loading={loading} onReset={handleResetFilters} />
          </form>

          {filterError ? <FeedbackMessage tone="warning">{filterError}</FeedbackMessage> : null}
        </div>
      </Card>

      {error ? <FeedbackMessage tone="error">{error}</FeedbackMessage> : null}

      {loading && !report ? (
        <ReportsSkeleton />
      ) : !error && report ? (
        <>
          {!hasSessions ? (
            <Card padding="none" glow={false} className="admin-panel">
              <div className="admin-panel__body">
                <EmptyState
                  title="Sin sesiones de caja"
                  description="No hay aperturas o cierres que coincidan con los filtros actuales."
                  icon={<Wallet size={22} />}
                />
              </div>
            </Card>
          ) : null}

          <div className="admin-reports-chart-grid">
            <CashClosuresChartCard
              data={report.closures_by_day}
              hasClosures={hasClosures}
            />
            <CashDifferenceChartCard
              data={report.differences_by_closure}
              hasClosures={hasClosures}
            />
            <AdminChartCard
              title="Esperado vs contado"
              description="Comparacion total de cierres."
              data={expectedVsCountedData}
              chartType="bar"
              valueFormat="currency"
              emptyTitle="Sin cierres contados"
              emptyDescription="Aparecera con cajas cerradas."
            />
          </div>

          <CashSessionsTable
            sessions={report.sessions}
            onOpenDetail={setSelectedSession}
          />
        </>
      ) : null}

      <CashReportDetailDialog
        session={selectedSession}
        onClose={() => setSelectedSession(null)}
      />
    </>
  );
}

function ReportFilterActions({
  loading,
  onReset,
}: {
  loading: boolean;
  onReset: () => void;
}) {
  return (
    <div className="admin-reports-filter-actions">
      <Button type="submit" loading={loading}>
        <Filter size={16} />
        Aplicar
      </Button>
      <Button type="button" variant="secondary" onClick={onReset} disabled={loading}>
        <RotateCcw size={16} />
        Restablecer
      </Button>
    </div>
  );
}

function buildSalesHeaderCards(
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

function buildCashHeaderCards(
  report: AdminCashReportResponse | null,
  loading: boolean,
): ModulePageHeaderCard[] {
  const openCount = report?.kpis.open_sessions_count ?? 0;
  const closedCount = report?.kpis.closed_sessions_count ?? 0;
  const difference = report?.kpis.total_difference ?? 0;
  const diffTone: BadgeTone = loading ? 'info' : difference === 0 ? 'success' : 'warning';

  return [
    {
      label: 'Abiertas',
      value: loading && !report ? '...' : String(openCount),
      note: 'Sesiones activas del rango',
      accent: openCount > 0 ? 'info' : 'default',
      icon: <Wallet size={16} />,
      iconTone: openCount > 0 ? 'info' : 'default',
      badge: { label: 'Open', tone: openCount > 0 ? 'info' : 'default' },
    },
    {
      label: 'Cerradas',
      value: loading && !report ? '...' : String(closedCount),
      note: 'Cierres con snapshot o sesion',
      accent: closedCount > 0 ? 'success' : 'default',
      icon: <Receipt size={16} />,
      iconTone: closedCount > 0 ? 'success' : 'default',
      badge: { label: 'Closed', tone: closedCount > 0 ? 'success' : 'default' },
    },
    {
      label: 'Esperado',
      value: loading && !report ? '...' : formatCurrency(report?.kpis.total_expected ?? 0),
      note: 'Total esperado en cierres',
      accent: closedCount > 0 ? 'info' : 'default',
      icon: <Scale size={16} />,
      iconTone: closedCount > 0 ? 'info' : 'default',
      badge: { label: 'Caja', tone: closedCount > 0 ? 'info' : 'default' },
    },
    {
      label: 'Contado',
      value: loading && !report ? '...' : formatCurrency(report?.kpis.total_counted ?? 0),
      note: 'Total contado en cierres',
      accent: closedCount > 0 ? 'success' : 'default',
      icon: <CreditCard size={16} />,
      iconTone: closedCount > 0 ? 'success' : 'default',
      badge: { label: 'Cierre', tone: closedCount > 0 ? 'success' : 'default' },
    },
    {
      label: 'Diferencia',
      value: loading && !report ? '...' : formatCurrency(difference),
      note: loading && !report
        ? 'Calculando'
        : `Promedio ${formatCurrency(report?.kpis.average_difference_per_closure ?? 0)}`,
      accent: diffTone,
      icon: <BarChart3 size={16} />,
      iconTone: diffTone,
      badge: { label: difference === 0 ? 'Cuadrada' : 'Revisar', tone: diffTone },
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
                <Tooltip content={<DailySalesTooltip />} />
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

function CashClosuresChartCard({
  data,
  hasClosures,
}: {
  data: AdminCashReportClosuresByDayItem[];
  hasClosures: boolean;
}) {
  const total = data.reduce((sum, item) => sum + item.closed_count, 0);

  return (
    <Card padding="none" glow={false} className="admin-panel admin-reports-daily-card">
      <div className="admin-panel__body">
        <SectionHeader
          eyebrow="Cierres"
          title="Cierres por dia"
          description="Cantidad de cajas cerradas en el rango."
          actions={<StatusBadge label={`${total} cierres`} tone={hasClosures ? 'success' : 'default'} />}
        />

        {!hasClosures ? (
          <EmptyState
            title="Sin cierres por dia"
            description="La grafica aparecera cuando existan cierres."
            icon={<CalendarDays size={22} />}
          />
        ) : (
          <div className="admin-reports-daily-chart" role="img" aria-label="Grafica de cierres por dia">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data.map((item) => ({
                  ...item,
                  label: formatDayTick(item.date),
                }))}
                margin={{ top: 12, right: 20, left: 4, bottom: 4 }}
              >
                <CartesianGrid stroke="var(--chart-grid)" strokeDasharray="4 7" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fill: 'var(--chart-axis)', fontSize: 11, fontWeight: 700 }}
                  axisLine={false}
                  tickLine={false}
                  minTickGap={14}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fill: 'var(--chart-axis)', fontSize: 11, fontWeight: 700 }}
                  axisLine={false}
                  tickLine={false}
                  width={48}
                />
                <Tooltip content={<CashClosuresTooltip />} />
                <Bar
                  dataKey="closed_count"
                  name="Cierres"
                  fill="var(--admin-chart-emerald)"
                  radius={[8, 8, 0, 0]}
                  maxBarSize={34}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </Card>
  );
}

function CashDifferenceChartCard({
  data,
  hasClosures,
}: {
  data: AdminCashReportDifferenceByClosureItem[];
  hasClosures: boolean;
}) {
  return (
    <Card padding="none" glow={false} className="admin-panel admin-reports-difference-card">
      <div className="admin-panel__body">
        <SectionHeader
          eyebrow="Diferencias"
          title="Diferencia por cierre"
          description="Ultimos cierres del rango."
          actions={<StatusBadge label={`${data.length} cierres`} tone={hasClosures ? 'warning' : 'default'} />}
        />

        {!hasClosures || data.length === 0 ? (
          <EmptyState
            title="Sin diferencias"
            description="Aparecera cuando existan cierres de caja."
            icon={<Scale size={22} />}
          />
        ) : (
          <div className="admin-reports-difference-chart" role="img" aria-label="Grafica de diferencia por cierre">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data}
                layout="vertical"
                margin={{ top: 10, right: 42, left: 8, bottom: 8 }}
              >
                <CartesianGrid stroke="var(--chart-grid)" strokeDasharray="4 7" horizontal={false} />
                <XAxis
                  type="number"
                  tick={{ fill: 'var(--chart-axis)', fontSize: 11, fontWeight: 700 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(value) => compactCurrency(Number(value))}
                />
                <YAxis
                  type="category"
                  dataKey="label"
                  width={92}
                  tick={{ fill: 'var(--chart-axis-strong)', fontSize: 11, fontWeight: 700 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<CashDifferenceTooltip />} />
                <Bar
                  dataKey="difference"
                  fill="var(--admin-chart-amber)"
                  radius={[0, 8, 8, 0]}
                  maxBarSize={18}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </Card>
  );
}

function DailySalesTooltip({
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

function CashClosuresTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: AdminCashReportClosuresByDayItem; value: number }>;
}) {
  if (!active || !payload?.length) {
    return null;
  }

  const item = payload[0].payload;

  return (
    <div className="chart-tooltip-surface rounded-2xl px-3 py-2 shadow-2xl">
      <p className="text-sm font-medium theme-text-strong">{formatDateLabel(item.date)}</p>
      <p className="metric-accent mt-1 text-xs">{Number(payload[0].value).toLocaleString('es-CO')} cierres</p>
    </div>
  );
}

function CashDifferenceTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: AdminCashReportDifferenceByClosureItem; value: number }>;
}) {
  if (!active || !payload?.length) {
    return null;
  }

  const item = payload[0].payload;

  return (
    <div className="chart-tooltip-surface rounded-2xl px-3 py-2 shadow-2xl">
      <p className="text-sm font-medium theme-text-strong">{item.label}</p>
      <p className="metric-accent mt-1 text-xs">{formatCurrency(Number(payload[0].value))}</p>
      {item.closed_at ? (
        <p className="theme-text-secondary mt-0.5 text-[11px]">{formatDate(item.closed_at)}</p>
      ) : null}
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

function CashSessionsTable({
  sessions,
  onOpenDetail,
}: {
  sessions: AdminCashReportSessionItem[];
  onOpenDetail: (session: AdminCashReportSessionItem) => void;
}) {
  return (
    <Card padding="none" glow={false} className="admin-panel admin-reports-table-panel">
      <div className="admin-panel__body">
        <SectionHeader
          eyebrow="Resumen"
          title="Sesiones y cierres"
          description="Sesiones recientes dentro del rango."
          actions={
            <StatusBadge
              label={`${sessions.length.toLocaleString('es-CO')} sesiones`}
              tone={sessions.length > 0 ? 'success' : 'default'}
            />
          }
        />

        {sessions.length === 0 ? (
          <EmptyState
            title="Sin sesiones"
            description="No hay aperturas o cierres en el rango seleccionado."
            icon={<Wallet size={22} />}
          />
        ) : (
          <div className="admin-reports-table-wrap">
            <table className="admin-reports-table admin-reports-table--cash">
              <thead>
                <tr>
                  <th>Sesion</th>
                  <th>POS</th>
                  <th>Responsable</th>
                  <th>Apertura</th>
                  <th>Cierre</th>
                  <th>Monto apertura</th>
                  <th>Esperado</th>
                  <th>Contado</th>
                  <th>Diferencia</th>
                  <th>Estado</th>
                  <th>Accion</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((item) => (
                  <tr key={`${item.status}-${item.cash_session_id}`}>
                    <td>
                      <div className="admin-reports-product-cell">
                        <span>#{item.cash_session_id}</span>
                        <strong>{item.source === 'SNAPSHOT' ? 'Snapshot' : 'Sesion'}</strong>
                      </div>
                    </td>
                    <td>{item.location_name}</td>
                    <td>{item.responsible_name}</td>
                    <td>{formatDate(item.opened_at)}</td>
                    <td>{item.closed_at ? formatDate(item.closed_at) : 'Abierta'}</td>
                    <td>{formatCurrency(item.opening_cash)}</td>
                    <td>{formatNullableCurrency(item.expected)}</td>
                    <td>{formatNullableCurrency(item.counted)}</td>
                    <td>{formatNullableCurrency(item.difference)}</td>
                    <td>
                      <StatusBadge
                        label={item.status === 'OPEN' ? 'Abierta' : 'Cerrada'}
                        tone={item.status === 'OPEN' ? 'info' : 'success'}
                      />
                    </td>
                    <td>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        aria-label={`Ver detalle de caja ${item.cash_session_id}`}
                        title="Ver detalle"
                        onClick={() => onOpenDetail(item)}
                      >
                        Ver detalle
                      </Button>
                    </td>
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

function CashReportDetailDialog({
  session,
  onClose,
}: {
  session: AdminCashReportSessionItem | null;
  onClose: () => void;
}) {
  const isMobileViewport = useMediaQuery('(max-width: 639px)');
  const open = session !== null;

  if (!open) {
    return null;
  }

  const title = `Detalle caja #${session.cash_session_id}`;
  const subtitle =
    session.status === 'CLOSED'
      ? `Cierre · ${session.closed_at ? formatDate(session.closed_at) : 'Sin fecha'}`
      : `Apertura · ${formatDate(session.opened_at)}`;
  const content = (
    <div className="admin-activity-detail__stack">
      <div className="admin-activity-detail__hero">
        <div className="admin-activity-detail__hero-copy">
          <div className="admin-activity-detail__hero-badges">
            <StatusBadge
              label={session.status === 'OPEN' ? 'Apertura' : 'Cierre'}
              tone={session.status === 'OPEN' ? 'info' : 'success'}
            />
            <StatusBadge label={`Ref #${session.cash_session_id}`} tone="default" />
            <StatusBadge
              label={session.source === 'SNAPSHOT' ? 'Snapshot' : 'Sesion'}
              tone={session.source === 'SNAPSHOT' ? 'success' : 'default'}
            />
          </div>
          <p className="admin-activity-detail__hero-title">
            Caja #{session.cash_session_id}
          </p>
          <span className="admin-activity-detail__hero-subtitle">
            {session.location_name} · {session.responsible_name}
          </span>
        </div>
        <div className="admin-activity-detail__hero-meta">
          <span>{formatDate(session.opened_at)}</span>
          {session.closed_at ? <span>{formatDate(session.closed_at)}</span> : null}
          <span>{session.location_name}</span>
        </div>
      </div>

      <ReportMetricGrid
        items={[
          { label: 'Caja', value: `#${session.cash_session_id}` },
          { label: 'Apertura', value: formatDate(session.opened_at) },
          {
            label: 'Cierre',
            value: session.closed_at ? formatDate(session.closed_at) : 'Abierta',
          },
          { label: 'Esperado', value: formatNullableCurrency(getCashAmount(session, 'expected')) },
          { label: 'Contado', value: formatNullableCurrency(getCashAmount(session, 'counted')) },
          {
            label: 'Diferencia',
            value: formatNullableCurrency(session.difference),
            accent: getCashDifferenceTone(session.difference),
          },
        ]}
      />

      <ReportInfoCard
        title="Snapshot de cierre"
        rows={[
          ['Monto apertura', formatNullableCurrency(getCashAmount(session, 'opening'))],
          ['Ventas en efectivo', formatNullableCurrency(getCashAmount(session, 'cash_sales'))],
          ['Ventas por transferencia', formatNullableCurrency(getCashAmount(session, 'transfer_sales'))],
          ['Cambio entregado', formatNullableCurrency(getCashAmount(session, 'change_given'))],
          ['Responsable apertura', `${session.opened_by_name} (#${session.opened_by_id})`],
          [
            'Responsable cierre',
            session.closed_by_name && session.closed_by_id
              ? `${session.closed_by_name} (#${session.closed_by_id})`
              : 'Sin cierre',
          ],
          ['POS', `${session.location_name} (#${session.location_id})`],
          [
            'Fuente',
            session.source === 'SNAPSHOT'
              ? 'CashClosureSnapshot'
              : 'CashSession sin snapshot',
          ],
        ]}
      />
    </div>
  );

  if (isMobileViewport) {
    return (
      <Sheet
        className="admin-activity-detail-sheet"
        title={title}
        subtitle={subtitle}
        open={open}
        onClose={onClose}
        mobileOnly
        showHandle
        bodyClassName="admin-activity-detail-sheet__body"
      >
        <div className="admin-activity-detail-sheet__scroll">
          <div className="admin-activity-detail admin-activity-detail--sheet">
            {content}
          </div>
        </div>
      </Sheet>
    );
  }

  return (
    <Modal title={title} subtitle={subtitle} open={open} onClose={onClose} size="lg">
      <div className="admin-activity-detail">{content}</div>
    </Modal>
  );
}

function ReportMetricGrid({
  items,
}: {
  items: Array<{
    label: string;
    value: string;
    accent?: 'default' | 'success' | 'warning' | 'danger' | 'info';
  }>;
}) {
  return (
    <div className="admin-activity-detail__metrics">
      {items.map((item) => (
        <div
          key={item.label}
          className="admin-activity-detail__metric"
          data-tone={item.accent ?? 'default'}
        >
          <span>{item.label}</span>
          <strong>{item.value}</strong>
        </div>
      ))}
    </div>
  );
}

function ReportInfoCard({
  title,
  rows,
}: {
  title: string;
  rows: Array<[string, string]>;
}) {
  return (
    <div className="admin-activity-detail__card">
      <div className="admin-activity-detail__card-header">
        <div>
          <p className="admin-kicker">Detalle</p>
          <h3>{title}</h3>
        </div>
      </div>
      <div className="admin-activity-detail__rows">
        {rows.map(([label, value]) => (
          <div key={label} className="admin-activity-detail__row">
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>
    </div>
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

function getDefaultDateRange() {
  const today = new Date();
  const from = new Date(today);
  from.setDate(today.getDate() - 29);

  return {
    from: toDateInputValue(from),
    to: toDateInputValue(today),
  };
}

function resolveLocationName(locationId: string, locations: Array<{ id: number; name: string }>) {
  if (locationId === allLocationsValue) {
    return 'Todos los POS';
  }

  return locations.find((location) => location.id === Number(locationId))?.name ?? `POS #${locationId}`;
}

function buildPeriodLabel(from: string, to: string) {
  return `${formatDateLabel(from)} - ${formatDateLabel(to)}`;
}

function formatCashStatus(status: CashReportStatus) {
  if (status === 'OPEN') return 'Abiertas';
  if (status === 'CLOSED') return 'Cerradas';
  return 'Todas';
}

function formatNullableCurrency(value: unknown) {
  const normalized = normalizeReportNumber(value);
  return normalized === null ? 'No disponible' : formatCurrency(normalized);
}

function normalizeReportNumber(value: unknown) {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const normalized = Number(value);
  return Number.isFinite(normalized) ? normalized : null;
}

function getCashAmount(
  session: AdminCashReportSessionItem,
  field: 'opening' | 'expected' | 'counted' | 'cash_sales' | 'transfer_sales' | 'change_given',
) {
  if (field === 'opening') {
    return session.opening_amount ?? session.opening_cash;
  }

  if (field === 'expected') {
    return session.expected_amount ?? session.expected;
  }

  if (field === 'counted') {
    return session.counted_amount ?? session.counted;
  }

  if (field === 'cash_sales') {
    return session.cash_sales_total;
  }

  if (field === 'transfer_sales') {
    return session.transfer_sales_total;
  }

  return session.total_change_given;
}

function getCashDifferenceTone(value: number | null) {
  const normalized = normalizeReportNumber(value);
  if (normalized === null) return 'default' as const;
  if (normalized === 0) return 'success' as const;
  if (normalized > 0) return 'info' as const;
  return 'danger' as const;
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
  const prefix = value < 0 ? '-$' : '$';
  const absoluteValue = Math.abs(value);
  if (absoluteValue >= 1_000_000) return `${prefix}${Math.round(absoluteValue / 1_000_000)}M`;
  if (absoluteValue >= 1_000) return `${prefix}${Math.round(absoluteValue / 1_000)}k`;
  return `${prefix}${absoluteValue.toLocaleString('es-CO')}`;
}
