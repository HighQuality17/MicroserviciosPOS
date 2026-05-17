import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { SectionHeader } from '@/components/SectionHeader';
import { StatusBadge } from '@/components/StatusBadge';
import { formatCurrency } from '@/utils/format';

interface AdminPaymentMethodDatum {
  label: string;
  value: number;
  color?: string;
}

interface AdminPaymentMethodChartCardProps {
  title: string;
  description: string;
  data: AdminPaymentMethodDatum[];
  emptyTitle: string;
  emptyDescription: string;
}

export function AdminPaymentMethodChartCard({
  title,
  description,
  data,
  emptyTitle,
  emptyDescription,
}: AdminPaymentMethodChartCardProps) {
  const chartData = data.filter((item) => item.value > 0);
  const total = chartData.reduce((sum, item) => sum + item.value, 0);
  const dominantMethod = [...chartData].sort((left, right) => right.value - left.value)[0] ?? null;
  const donutGradient = buildDonutGradient(chartData, total);

  return (
    <Card padding="none" glow={false} className="admin-panel admin-payment-chart-card">
      <div className="admin-panel__body">
        <SectionHeader
          eyebrow="Mix de ventas"
          title={title}
          description={description}
          actions={
            <StatusBadge
              label={chartData.length > 0 ? 'Mix listo' : 'Sin pagos'}
              tone={chartData.length > 0 ? 'success' : 'default'}
            />
          }
        />

        {chartData.length === 0 ? (
          <div className="mt-4">
            <EmptyState title={emptyTitle} description={emptyDescription} />
          </div>
        ) : (
          <div className="admin-payment-chart-card__body">
            <div className="admin-payment-chart-card__donut-panel">
              <div
                className="admin-payment-chart-card__chart"
                role="img"
                aria-label={`Distribucion por metodo de pago. Total ${formatCurrency(total)}.`}
                style={{ background: donutGradient }}
              >
                <div className="admin-payment-chart-card__chart-center">
                  <span>Total</span>
                  <strong>{compactCurrency(total)}</strong>
                </div>
              </div>
              <div className="admin-payment-chart-card__total">
                <span>Total cobrado</span>
                <strong>{formatCurrency(total)}</strong>
              </div>
            </div>

            <div className="admin-payment-chart-card__breakdown">
              <div className="admin-payment-chart-card__summary">
                <span>Metodo dominante</span>
                <strong>{dominantMethod?.label ?? 'Sin pagos'}</strong>
                <p>{dominantMethod ? formatCurrency(dominantMethod.value) : 'Pendiente'}</p>
              </div>

              <div className="admin-payment-chart-card__method-list">
                {chartData.map((item) => {
                  const percent = total > 0 ? Math.round((item.value / total) * 100) : 0;

                  return (
                    <div key={item.label} className="admin-payment-chart-card__method">
                      <div className="admin-payment-chart-card__method-heading">
                        <span
                          className="admin-payment-chart-card__swatch"
                          style={{ backgroundColor: item.color ?? 'var(--chart-series-default)' }}
                          aria-hidden="true"
                        />
                        <p>{item.label}</p>
                        <strong>{formatCurrency(item.value)}</strong>
                      </div>
                      <div className="admin-payment-chart-card__method-track" aria-hidden="true">
                        <span
                          style={{
                            backgroundColor: item.color ?? 'var(--chart-series-default)',
                            width: `${percent}%`,
                          }}
                        />
                      </div>
                      <span className="admin-payment-chart-card__method-share">{percent}% del total</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}

function buildDonutGradient(data: AdminPaymentMethodDatum[], total: number) {
  if (total <= 0) {
    return 'conic-gradient(var(--admin-chart-cobalt) 0deg, var(--admin-chart-cobalt) 360deg)';
  }

  let cursor = 0;
  const segments = data.map((item) => {
    const start = cursor;
    const end = cursor + (item.value / total) * 100;
    cursor = end;
    return `${item.color ?? 'var(--chart-series-default)'} ${start}% ${end}%`;
  });

  return `conic-gradient(${segments.join(', ')})`;
}

function compactCurrency(value: number) {
  const prefix = value < 0 ? '-$' : '$';
  const absoluteValue = Math.abs(value);
  if (absoluteValue >= 1_000_000) return `${prefix}${Math.round(absoluteValue / 1_000_000)}M`;
  if (absoluteValue >= 1_000) return `${prefix}${Math.round(absoluteValue / 1_000)}k`;
  return `${prefix}${absoluteValue.toLocaleString('es-CO')}`;
}
