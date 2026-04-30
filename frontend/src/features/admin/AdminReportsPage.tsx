import '@/features/admin/admin-d1.css';
import {
  BarChart3,
  Boxes,
  Building2,
  CalendarDays,
  CreditCard,
  Download,
  FileSpreadsheet,
  PackageSearch,
  ShoppingBag,
  Sparkles,
  TrendingUp,
  type LucideIcon,
} from 'lucide-react';
import { AdminSubmoduleNav } from '@/features/admin/AdminSubmoduleNav';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ModulePageHeader } from '@/components/ModulePageHeader';
import type { ModulePageHeaderCard } from '@/components/ModulePageHeader';
import { SectionHeader } from '@/components/SectionHeader';
import { StatusBadge } from '@/components/StatusBadge';

type BadgeTone = 'default' | 'success' | 'warning' | 'danger' | 'info';

interface FutureReportCard {
  title: string;
  description: string;
  scope: string;
  icon: LucideIcon;
  tone: BadgeTone;
}

const futureReports: FutureReportCard[] = [
  {
    title: 'Ventas por periodo',
    description: 'Lectura de ingresos, tickets y ritmo comercial por rango de fechas.',
    scope: 'Ventas',
    icon: CalendarDays,
    tone: 'info',
  },
  {
    title: 'Productos mas vendidos',
    description: 'Ranking de variantes, combos y unidades con mejor desempeno.',
    scope: 'Catalogo',
    icon: ShoppingBag,
    tone: 'success',
  },
  {
    title: 'Cierres de caja',
    description: 'Consolidado de aperturas, cierres, diferencias y responsables.',
    scope: 'Caja',
    icon: CreditCard,
    tone: 'warning',
  },
  {
    title: 'Movimientos de inventario',
    description: 'Entradas, salidas y ajustes con trazabilidad por insumo.',
    scope: 'Inventario',
    icon: Boxes,
    tone: 'info',
  },
  {
    title: 'Reportes por punto de venta',
    description: 'Comparacion de sedes para ventas, caja y actividad operativa.',
    scope: 'POS',
    icon: Building2,
    tone: 'success',
  },
  {
    title: 'Exportaciones PDF/Excel',
    description: 'Archivos listos para revision interna, contable o gerencial.',
    scope: 'Exportar',
    icon: FileSpreadsheet,
    tone: 'default',
  },
];

export function AdminReportsPage() {
  const headerCards: ModulePageHeaderCard[] = [
    {
      label: 'Estado',
      value: 'En preparacion',
      note: 'Base visual lista para f2.0',
      accent: 'info',
      icon: <Sparkles size={16} />,
      iconTone: 'info',
      badge: { label: 'Proximamente', tone: 'info' },
    },
    {
      label: 'Cobertura futura',
      value: '6 bloques',
      note: 'Ventas, caja, inventario y sedes',
      accent: 'success',
      icon: <BarChart3 size={16} />,
      iconTone: 'success',
      badge: { label: 'Planeado', tone: 'success' },
    },
    {
      label: 'Salida',
      value: 'PDF/Excel',
      note: 'Exportaciones en fase posterior',
      accent: 'default',
      icon: <Download size={16} />,
      iconTone: 'default',
      badge: { label: 'Futuro', tone: 'default' },
    },
  ];

  return (
    <div className="admin-dashboard admin-reports-page grid min-w-0 gap-5 sm:gap-6">
      <AdminSubmoduleNav />

      <ModulePageHeader
        ariaLabel="Reportes administrativos"
        eyebrow="Admin / Reportes"
        title="Reportes"
        description="Base visual para analitica de ventas, caja, inventario y desempeno por sede."
        helpText="Vista de preparacion; los reportes reales se activaran en una fase posterior."
        icon={<BarChart3 size={18} />}
        badges={[{ label: 'Proximamente', tone: 'info' }]}
        summary={{
          label: 'Fase f2.0',
          value: 'Reportes avanzados',
          note: 'Preparado sin funcionalidad falsa',
        }}
        asideAction={
          <Button type="button" variant="secondary" disabled>
            <Sparkles size={16} />
            Disponible en proxima fase
          </Button>
        }
        cards={headerCards}
      />

      <Card padding="none" glow={false} className="admin-panel admin-reports-hero-panel">
        <div className="admin-panel__body admin-reports-hero">
          <div className="admin-reports-hero__copy">
            <p className="admin-kicker">Valor futuro</p>
            <h2>Analisis operativo en un solo lugar</h2>
            <p>
              Esta seccion reunira ventas, caja, inventario y desempeno por punto de venta para tomar decisiones con datos claros.
            </p>
          </div>
          <div className="admin-reports-hero__signal" aria-hidden="true">
            <TrendingUp size={30} />
            <span>f2.0</span>
          </div>
        </div>
      </Card>

      <Card padding="none" glow={false} className="admin-panel admin-reports-catalog-panel">
        <div className="admin-panel__body">
          <SectionHeader
            eyebrow="Catalogo futuro"
            title="Reportes planeados"
            description="Cards preparadas para activar funcionalidad real en una fase posterior."
            actions={<StatusBadge label="Sin acciones reales aun" tone="default" />}
          />

          <div className="admin-reports-grid">
            {futureReports.map((report) => {
              const Icon = report.icon;

              return (
                <article key={report.title} className="admin-reports-card" data-tone={report.tone}>
                  <div className="admin-reports-card__top">
                    <span className="admin-reports-card__icon" aria-hidden="true">
                      <Icon size={18} />
                    </span>
                    <StatusBadge label={report.scope} tone={report.tone} />
                  </div>
                  <div className="admin-reports-card__body">
                    <h3>{report.title}</h3>
                    <p>{report.description}</p>
                  </div>
                  <Button type="button" variant="secondary" size="sm" disabled>
                    Proxima fase
                  </Button>
                </article>
              );
            })}
          </div>
        </div>
      </Card>

      <Card padding="none" glow={false} className="admin-panel admin-reports-empty-panel">
        <div className="admin-panel__body admin-reports-empty">
          <PackageSearch size={28} aria-hidden="true" />
          <div>
            <p className="admin-kicker">Estado actual</p>
            <h2>Placeholder listo, datos reales despues</h2>
            <p>
              La pantalla queda preparada para f2.0 sin acciones activas ni exportaciones simuladas.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
