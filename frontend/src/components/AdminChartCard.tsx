import { ReactNode } from 'react';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
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

  return (
    <Card>
      <p className="text-sm text-[color:var(--text-secondary)]">{title}</p>
      <h3 className="font-display mt-2 text-2xl font-bold text-white">{description}</h3>

      {data.length === 0 ? (
        <div className="mt-6">
          <EmptyState title={emptyTitle} description={emptyDescription} />
        </div>
      ) : (
        <div className="mt-6 space-y-4">
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
                      <Cell
                        key={entry.label}
                        fill={entry.color ?? '#a78bfa'}
                      />
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
                      <Cell
                        key={entry.label}
                        fill={entry.color ?? '#a78bfa'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>

          <div className="grid gap-3">
            {chartData.map((item) => (
              <div
                key={item.label}
                className="surface-subtle flex items-center justify-between rounded-2xl px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <span
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: item.color ?? '#a78bfa' }}
                  />
                  <span className="text-sm text-[color:var(--text-secondary)]">{item.label}</span>
                </div>
                <span className="text-sm font-medium text-white">
                  {formatValue(item.value)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {footer ? <div className="mt-6">{footer}</div> : null}
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
      <p className="mt-1 text-xs text-[color:var(--text-secondary)]">{value}</p>
    </div>
  );
}
