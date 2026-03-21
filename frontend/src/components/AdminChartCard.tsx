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
  Legend,
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
  const chartStatusLabel = data.length > 0 ? 'Lectura lista' : 'Sin datos';
  const chartStatusTone = data.length > 0 ? 'success' : 'default';
  const chartSnapshot =
    data.length > 0
      ? `${data.length.toLocaleString('es-CO')} fuentes visibles`
      : 'Esperando datos reales';

  return (
    <Card className="overflow-hidden xl:min-h-[34rem]">
      <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-r from-cyan-300/10 via-violet-400/12 to-transparent" />
      <SectionHeader
        eyebrow="Analitica ejecutiva"
        title={title}
        description={description}
        actions={<StatusBadge label={chartStatusLabel} tone={chartStatusTone} />}
      />

      {data.length === 0 ? (
        <div className="mt-6">
          <EmptyState title={emptyTitle} description={emptyDescription} />
        </div>
      ) : (
        <div className="mt-6 flex flex-col gap-5">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <StatusBadge label={chartSnapshot} tone="default" />
            <p className="text-xs text-[color:var(--text-faint)]">
              Lectura respaldada por datos reales del backend.
            </p>
          </div>

          <div className="surface-subtle-strong rounded-[1.85rem] p-6">
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                {chartType === 'pie' ? (
                  <PieChart>
                    <Pie
                      data={chartData}
                      dataKey="value"
                      nameKey="label"
                      innerRadius={56}
                      outerRadius={86}
                      paddingAngle={2}
                      stroke="rgba(15, 23, 42, 0.9)"
                      strokeWidth={2}
                    >
                      {chartData.map((entry) => (
                        <Cell key={entry.label} fill={entry.color ?? '#67e8f9'} />
                      ))}
                    </Pie>
                    <Tooltip content={<ChartTooltip valueFormat={valueFormat} />} />
                    <Legend
                      wrapperStyle={{ color: '#d5daf8', paddingTop: 12 }}
                      formatter={(value) => (
                        <span style={{ color: '#d5daf8' }}>{String(value)}</span>
                      )}
                    />
                  </PieChart>
                ) : (
                  <BarChart
                    data={chartData}
                    layout="vertical"
                    margin={{ top: 8, right: 16, left: 8, bottom: 8 }}
                  >
                    <CartesianGrid stroke="rgba(129, 140, 248, 0.12)" horizontal={false} />
                    <XAxis
                      type="number"
                      tick={{ fill: '#9ca6cf', fontSize: 12 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      type="category"
                      dataKey="shortLabel"
                      width={132}
                      tick={{ fill: '#d5daf8', fontSize: 12 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip content={<ChartTooltip valueFormat={valueFormat} />} />
                    <Bar dataKey="value" radius={[0, 10, 10, 0]} maxBarSize={28}>
                      {chartData.map((entry) => (
                        <Cell key={entry.label} fill={entry.color ?? '#67e8f9'} />
                      ))}
                    </Bar>
                  </BarChart>
                )}
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid gap-2.5">
            {chartData.map((item, index) => (
              <div
                key={item.label}
                className="data-list-card flex min-h-[4.25rem] items-center justify-between rounded-2xl px-4 py-3.5"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-[11px] font-semibold text-white">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <span
                    className="h-3 w-3 shrink-0 rounded-full"
                    style={{ backgroundColor: item.color ?? '#67e8f9' }}
                  />
                  <span className="truncate text-sm text-[color:var(--text-secondary)]">
                    {item.label}
                  </span>
                </div>
                <span
                  className={
                    valueFormat === 'currency'
                      ? 'text-sm font-medium metric-accent'
                      : 'text-sm font-medium text-white'
                  }
                >
                  {formatValue(item.value)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {footer ? <div className="mt-5 border-t border-white/8 pt-4">{footer}</div> : null}
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
    <div className="glass-panel-strong rounded-2xl px-3 py-2 shadow-2xl">
      <p className="text-sm font-medium text-white">{item.label}</p>
      <p
        className={
          valueFormat === 'currency'
            ? 'mt-1 text-xs metric-accent'
            : 'mt-1 text-xs text-[color:var(--text-secondary)]'
        }
      >
        {value}
      </p>
    </div>
  );
}
