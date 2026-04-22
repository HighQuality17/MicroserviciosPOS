import { lazy, Suspense } from 'react';
import type { ApexOptions } from 'apexcharts';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { SectionHeader } from '@/components/SectionHeader';
import { formatCurrency } from '@/utils/format';

const ApexChart = lazy(() => import('react-apexcharts'));

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
  const labels = chartData.map((item) => item.label);
  const series = chartData.map((item) => item.value);
  const colors = chartData.map((item) => item.color ?? 'var(--chart-series-default)');
  const options: ApexOptions = {
    chart: {
      animations: {
        animateGradually: {
          enabled: false,
        },
        dynamicAnimation: {
          enabled: false,
        },
        enabled: true,
        speed: 360,
      },
      parentHeightOffset: 0,
      redrawOnParentResize: false,
      redrawOnWindowResize: false,
      height: '100%',
      sparkline: {
        enabled: true,
      },
      toolbar: {
        show: false,
      },
      type: 'donut',
      width: '100%',
    },
    colors,
    dataLabels: {
      enabled: false,
    },
    fill: {
      opacity: 1,
    },
    labels,
    legend: {
      show: false,
    },
    plotOptions: {
      pie: {
        customScale: 0.92,
        donut: {
          labels: {
            name: {
              color: 'var(--text-muted)',
              fontSize: '12px',
              fontWeight: 700,
              offsetY: -6,
              show: true,
            },
            show: true,
            total: {
              color: 'var(--text-muted)',
              fontSize: '12px',
              fontWeight: 700,
              formatter: () => formatCurrency(total),
              label: 'Total',
              show: true,
              showAlways: true,
            },
            value: {
              color: 'var(--metric-accent-strong-color)',
              fontSize: '20px',
              fontWeight: 800,
              offsetY: 6,
              formatter: (value) => formatCurrency(Number(value)),
              show: true,
            },
          },
          size: '72%',
        },
        expandOnClick: false,
      },
    },
    states: {
      active: {
        filter: {
          type: 'none',
        },
      },
      hover: {
        filter: {
          type: 'lighten',
        },
      },
    },
    stroke: {
      colors: ['var(--admin-surface)'],
      lineCap: 'round',
      width: 4,
    },
    responsive: [
      {
        breakpoint: 767,
        options: {
          chart: {
            height: 128,
            offsetX: 0,
            offsetY: 0,
            width: 128,
          },
          plotOptions: {
            pie: {
              customScale: 0.86,
              donut: {
                labels: {
                  name: {
                    fontSize: '9px',
                    offsetY: -4,
                  },
                  size: '78%',
                  total: {
                    fontSize: '11px',
                  },
                  value: {
                    fontSize: '13px',
                    offsetY: 4,
                  },
                },
              },
            },
          },
          stroke: {
            width: 3,
          },
        },
      },
      {
        breakpoint: 420,
        options: {
          chart: {
            height: 122,
            width: 122,
          },
          plotOptions: {
            pie: {
              customScale: 0.84,
              donut: {
                labels: {
                  total: {
                    fontSize: '10px',
                  },
                  value: {
                    fontSize: '12px',
                  },
                },
              },
            },
          },
        },
      },
    ],
    tooltip: {
      fillSeriesColor: false,
      theme: 'dark',
      y: {
        formatter: (value) => formatCurrency(Number(value)),
      },
    },
  };

  return (
    <Card padding="none" glow={false} className="admin-panel admin-payment-chart-card">
      <div className="admin-panel__body">
        <SectionHeader
          eyebrow="Analitica ejecutiva"
          title={title}
          description={description}
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
              >
                <Suspense fallback={<div className="admin-payment-chart-card__chart-skeleton" />}>
                  <ApexChart
                    options={options}
                    series={series}
                    type="donut"
                    height="100%"
                    width="100%"
                  />
                </Suspense>
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
