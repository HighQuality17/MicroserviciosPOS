import { ReactNode } from 'react';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { SectionHeader } from '@/components/SectionHeader';
import { StatusBadge } from '@/components/StatusBadge';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatCurrency } from '@/utils/format';

interface AdminChartDatum {
  label: string;
  value: number;
  color?: string;
}

interface AdminChartCardProps {
  title: string;
  description: string;
  data: AdminChartDatum[];
  chartType?: 'pie' | 'bar';
  valueFormat?: 'currency' | 'number';
  footer?: ReactNode;
  emptyTitle?: string;
  emptyDescription?: string;
}

export function AdminChartCard({
  title,
  description,
  data,
  chartType = 'bar',
  valueFormat = 'number',
  footer,
  emptyTitle = 'Sin datos disponibles',
  emptyDescription = 'Disponible en la siguiente fase.',
}: AdminChartCardProps) {
  const formatValue = (value: number) =>
    valueFormat === 'currency' ? formatCurrency(value) : value.toLocaleString('es-CO');

  const chartData = data.map((item) => ({
    ...item,
    shortLabel: truncateLabel(item.label),
  }));
  const visibleChartData = chartType === 'bar' ? chartData.slice(0, 5) : chartData;
  const visibleRankData = chartData.slice(0, 5);
  const chartStatusLabel = data.length > 0 ? 'Lectura lista' : 'Sin datos';
  const chartStatusTone = data.length > 0 ? 'success' : 'default';
  const chartSnapshot =
    data.length > 0
      ? chartType === 'bar'
        ? `Top ${visibleRankData.length.toLocaleString('es-CO')}`
        : `${data.length.toLocaleString('es-CO')} metodos`
      : 'Esperando datos reales';

  return (
    <Card padding="none" glow={false} className="admin-panel admin-chart-card" data-chart-type={chartType}>
      <div className="admin-panel__body">
      <SectionHeader
        eyebrow="Analitica ejecutiva"
        title={title}
        description={description}
        actions={<StatusBadge label={chartStatusLabel} tone={chartStatusTone} />}
      />

      {data.length === 0 ? (
        <div className="mt-4">
          <EmptyState title={emptyTitle} description={emptyDescription} />
        </div>
      ) : (
        <div className="admin-chart-card__content">
          <div className="admin-chart-card__toolbar">
            <StatusBadge label={chartSnapshot} tone="default" />
          </div>

          <div className="admin-chart-card__visual">
            <div className="admin-chart-card__canvas">
              <ResponsiveContainer width="100%" height="100%">
                {chartType === 'pie' ? (
                  <PieChart>
                    <Pie
                      data={visibleChartData}
                      dataKey="value"
                      nameKey="label"
                      innerRadius={44}
                      outerRadius={68}
                      paddingAngle={2}
                      stroke="var(--chart-pie-stroke)"
                      strokeWidth={2}
                    >
                      {visibleChartData.map((entry) => (
                        <Cell key={entry.label} fill={entry.color ?? 'var(--chart-series-default)'} />
                      ))}
                    </Pie>
                    <Tooltip content={<ChartTooltip valueFormat={valueFormat} />} />
                  </PieChart>
                ) : (
                  <BarChart
                    data={visibleChartData}
                    layout="vertical"
                    margin={{ top: 4, right: 12, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid stroke="var(--chart-grid)" horizontal={false} />
                    <XAxis
                      type="number"
                      tick={{ fill: 'var(--chart-axis)', fontSize: 12 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      type="category"
                      dataKey="shortLabel"
                      width={112}
                      tick={{ fill: 'var(--chart-axis-strong)', fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip content={<ChartTooltip valueFormat={valueFormat} />} />
                    <Bar dataKey="value" radius={[0, 9, 9, 0]} maxBarSize={20}>
                      {visibleChartData.map((entry) => (
                        <Cell key={entry.label} fill={entry.color ?? 'var(--chart-series-default)'} />
                      ))}
                    </Bar>
                  </BarChart>
                )}
              </ResponsiveContainer>
            </div>
          </div>

          <div className="admin-chart-card__ranking">
            {visibleRankData.map((item, index) => (
              <div
                key={item.label}
                className="admin-chart-card__rank-row"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="chart-rank-badge inline-flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-semibold">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <span
                    className="h-3 w-3 shrink-0 rounded-full"
                    style={{ backgroundColor: item.color ?? 'var(--chart-series-default)' }}
                  />
                  <span className="admin-chart-card__rank-label truncate theme-text-secondary">
                    {item.label}
                  </span>
                </div>
                <span
                  className={
                    valueFormat === 'currency'
                      ? 'text-sm font-medium metric-accent'
                      : 'text-sm font-medium theme-text-strong'
                  }
                >
                  {formatValue(item.value)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {footer ? <div className="theme-border-soft mt-5 border-t pt-4">{footer}</div> : null}
      </div>
    </Card>
  );
}

function truncateLabel(value: string) {
  return value.length > 24 ? `${value.slice(0, 24)}...` : value;
}

function ChartTooltip({
  active,
  payload,
  valueFormat,
}: {
  active?: boolean;
  payload?: Array<{ payload: AdminChartDatum; value: number; name: string }>;
  valueFormat: 'currency' | 'number';
}) {
  if (!active || !payload?.length) {
    return null;
  }

  const item = payload[0].payload;
  const value =
    valueFormat === 'currency'
      ? formatCurrency(Number(payload[0].value))
      : Number(payload[0].value).toLocaleString('es-CO');

  return (
    <div className="chart-tooltip-surface rounded-2xl px-3 py-2 shadow-2xl">
      <p className="text-sm font-medium theme-text-strong">{item.label}</p>
      <p
        className={
          valueFormat === 'currency'
            ? 'metric-accent mt-1 text-xs'
            : 'theme-text-secondary mt-1 text-xs'
        }
      >
        {value}
      </p>
    </div>
  );
}
