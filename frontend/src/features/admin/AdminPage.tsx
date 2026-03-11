import { AreaChart, Boxes, CreditCard, TrendingUp } from 'lucide-react';
import { Card } from '@/components/Card';

export function AdminPage() {
  const cards = [
    {
      title: 'Ventas por franja',
      description: 'Base visual lista para integrar series temporales y comparativos por caja.',
      icon: TrendingUp,
    },
    {
      title: 'Stock crítico',
      description: 'Panel reservado para alertas de ingredientes con umbral mínimo.',
      icon: Boxes,
    },
    {
      title: 'Rendimiento de caja',
      description: 'Bloque futuro para apertura, cierre, diferencias y tickets por sesión.',
      icon: CreditCard,
    },
    {
      title: 'Dashboard gráfico',
      description: 'Espacio preparado para gráficos de barras, donut y tendencias de margen.',
      icon: AreaChart,
    },
  ];

  return (
    <div className="grid gap-4">
      <Card className="overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-r from-teal-300/10 via-sky-300/10 to-transparent" />
        <div className="relative">
          <p className="text-xs uppercase tracking-[0.35em] text-slate-500">Admin</p>
          <h2 className="font-display mt-3 text-4xl font-bold text-white">Dashboard en preparación</h2>
          <p className="mt-4 max-w-3xl text-slate-300">
            La estructura visual y de navegación ya está lista para conectar métricas,
            gráficos y alertas operativas en un Sprint siguiente.
          </p>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {cards.map(({ title, description, icon: Icon }) => (
          <Card key={title} className="group transition hover:-translate-y-0.5 hover:border-teal-300/30">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-display text-2xl font-bold text-white">{title}</p>
                <p className="mt-3 text-sm text-slate-400">{description}</p>
              </div>
              <div className="rounded-3xl bg-slate-950/70 p-4 text-teal-300 transition group-hover:bg-teal-300/10">
                <Icon size={22} />
              </div>
            </div>
            <div className="mt-6 inline-flex rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-500">
              Próximamente
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
