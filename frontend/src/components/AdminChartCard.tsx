import { ReactNode } from 'react';
import clsx from 'clsx';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { SectionHeader } from '@/components/SectionHeader';
import { StatusBadge } from '@/components/StatusBadge';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
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
  meta?: string;
}

interface AdminChartCardProps {
  title: string;
  description: string;
  data: AdminChartDatum[];
  chartType?: 'pie' | 'bar';
  valueFormat?: 'currency' | 'number';
  metricLabel?: string;
  metricUnitLabel?: string;
  snapshotUnitLabel?: string;
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
  metricLabel,
  metricUnitLabel,
  snapshotUnitLabel,
  footer,
  emptyTitle = 'Sin datos disponibles',
  emptyDescription = 'Disponible en la siguiente fase.',
}: AdminChartCardProps) {
  const formatValue = (value: number) =>
    valueFormat === 'currency' ? formatCurrency(value) : value.toLocaleString('es-CO');

  const chartData = data.map((item) => ({
    ...item,
    shortLabel: truncateLabel(item.label, chartType === 'bar' ? 18 : 24),
  }));
  const visibleChartData = chartType === 'bar' ? chartData.slice(0, 5) : chartData;
  const visibleRankData = chartData.slice(0, 5);
  const leader = visibleRankData[0] ?? null;
  const chartStatusLabel = data.length > 0 ? 'Lectura lista' : 'Sin datos';
  const chartStatusTone = data.length > 0 ? 'success' : 'default';
  const chartSnapshot =
    data.length > 0
      ? chartType === 'bar'
        ? `Top ${visibleRankData.length.toLocaleString('es-CO')}`
        : `${data.length.toLocaleString('es-CO')} ${snapshotUnitLabel ?? 'metodos'}`
      : 'Esperando datos reales';
  const resolvedMetricLabel =
    metricLabel ?? (valueFormat === 'currency' ? 'Ventas' : 'Unidades vendidas');
  const resolvedMetricUnitLabel =
    metricUnitLabel ?? (valueFormat === 'currency' ? 'vendido' : 'unidades');

  return (
    <Card padding="none" glow={false} className="admin-panel admin-chart-card" data-chart-type={chartType}>
      <div className="admin-panel__body">
        <SectionHeader
          eyebrow="Analitica ejecutiva"
          title={title}
          description={description}
          actions={
            <div className="admin-chart-card__header-actions">
              <StatusBadge label={chartSnapshot} tone="default" />
              <StatusBadge label={chartStatusLabel} tone={chartStatusTone} />
            </div>
          }
        />

      {data.length === 0 ? (
        <div className="mt-4">
          <EmptyState title={emptyTitle} description={emptyDescription} />
        </div>
      ) : (
        <div className="admin-chart-card__content">
          <div className="admin-chart-card__visual">
            <div className="admin-chart-card__visual-heading">
              <div>
                <span>{resolvedMetricLabel}</span>
                <strong>{leader?.label ?? 'Sin ranking'}</strong>
              </div>
              <p>
                {leader ? formatValue(leader.value) : '0'}
                <span>{resolvedMetricUnitLabel}</span>
              </p>
            </div>

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
                    margin={{ top: 10, right: 48, left: 0, bottom: 8 }}
                  >
                    <defs>
                      <linearGradient id="adminTopItemsBarGradient" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="rgb(var(--theme-primary-rgb))" stopOpacity={0.82} />
                        <stop offset="58%" stopColor="rgb(var(--theme-secondary-rgb))" stopOpacity={0.95} />
                        <stop offset="100%" stopColor="rgb(var(--theme-accent-rgb))" stopOpacity={1} />
                      </linearGradient>
                      <linearGradient id="adminTopItemsBarLeaderGradient" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="rgb(var(--theme-secondary-rgb))" stopOpacity={0.98} />
                        <stop offset="100%" stopColor="rgb(var(--theme-accent-rgb))" stopOpacity={1} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      stroke="var(--chart-grid)"
                      strokeDasharray="4 7"
                      horizontal={false}
                    />
                    <XAxis
                      type="number"
                      tick={{ fill: 'var(--chart-axis)', fontSize: 11, fontWeight: 600 }}
                      axisLine={false}
                      tickLine={false}
                      allowDecimals={false}
                      tickCount={4}
                      tickFormatter={(value) => Number(value).toLocaleString('es-CO')}
                    />
                    <YAxis
                      type="category"
                      dataKey="shortLabel"
                      width={112}
                      tick={{ fill: 'var(--chart-axis-strong)', fontSize: 11, fontWeight: 700 }}
                      axisLine={false}
                      tickLine={false}
                      interval={0}
                      tickMargin={8}
                    />
                    <Tooltip content={<ChartTooltip valueFormat={valueFormat} />} />
                    <Bar
                      dataKey="value"
                      radius={[0, 10, 10, 0]}
                      maxBarSize={18}
                      background={{ fill: 'rgb(var(--theme-primary-rgb) / 0.08)', radius: 10 }}
                    >
                      {visibleChartData.map((entry, index) => (
                        <Cell
                          key={entry.label}
                          fill={
                            index === 0
                              ? 'url(#adminTopItemsBarLeaderGradient)'
                              : 'url(#adminTopItemsBarGradient)'
                          }
                        />
                      ))}
                      <LabelList
                        dataKey="value"
                        position="right"
                        fill="var(--chart-axis-strong)"
                        fontSize={11}
                        fontWeight={700}
                        formatter={(value) => formatValue(Number(value ?? 0))}
                      />
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
                className={clsx(
                  'admin-chart-card__rank-row',
                  index === 0 && 'admin-chart-card__rank-row--leader',
                )}
              >
                <div className="admin-chart-card__rank-main">
                  <span className="admin-chart-card__rank-badge chart-rank-badge">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <div className="admin-chart-card__rank-copy">
                    <span className="admin-chart-card__rank-label" title={item.label}>
                      {item.label}
                    </span>
                    {item.meta ? <span className="admin-chart-card__rank-meta">{item.meta}</span> : null}
                  </div>
                </div>
                <div className="admin-chart-card__rank-value">
                  <strong>{formatValue(item.value)}</strong>
                  <span>{resolvedMetricUnitLabel}</span>
                </div>
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

function truncateLabel(value: string, maxLength = 24) {
  return value.length > maxLength ? `${value.slice(0, maxLength)}...` : value;
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
      {item.meta ? <p className="theme-text-secondary mt-0.5 text-[11px]">{item.meta}</p> : null}
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
