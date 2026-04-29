import '@/features/admin/admin-d1.css';
import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  Boxes,
  CreditCard,
  RefreshCw,
  Search,
  Settings2,
  ShoppingBag,
  Sparkles,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AdminActivityDetailDialog } from '@/features/admin/AdminActivityDetailDialog';
import { AdminActivityFeedList } from '@/features/admin/AdminActivityFeedList';
import { AdminSubmoduleNav } from '@/features/admin/AdminSubmoduleNav';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Input } from '@/components/Input';
import { ModulePageHeader } from '@/components/ModulePageHeader';
import type { ModulePageHeaderCard } from '@/components/ModulePageHeader';
import { SectionHeader } from '@/components/SectionHeader';
import { StatusBadge } from '@/components/StatusBadge';
import {
  formatActivityType,
  getActivityTone,
} from '@/features/admin/admin-activity-format';
import { posApi } from '@/services/api/posApi';
import type {
  AdminActivityDetailResponse,
  AdminActivityListItem,
  AdminActivityNavigation,
} from '@/types/api';
import { formatDate } from '@/utils/format';

type BadgeTone = 'default' | 'success' | 'warning' | 'danger' | 'info';
type ActivityCategoryFilter = 'ALL' | 'CASH' | 'SALES' | 'INVENTORY' | 'CONFIG';

const activityFilters: Array<{
  value: ActivityCategoryFilter;
  label: string;
  description: string;
}> = [
  { value: 'ALL', label: 'Todos', description: 'Ventas, caja, inventario y config.' },
  { value: 'CASH', label: 'Caja', description: 'Aperturas y cierres.' },
  { value: 'SALES', label: 'Ventas', description: 'Ventas pagadas.' },
  { value: 'INVENTORY', label: 'Inventario', description: 'Movimientos de stock.' },
  { value: 'CONFIG', label: 'Configuracion', description: 'Cambios de BusinessConfig.' },
];

export function AdminActivityPage() {
  const navigate = useNavigate();
  const [activityItems, setActivityItems] = useState<AdminActivityListItem[]>([]);
  const [activityPage, setActivityPage] = useState(1);
  const [activityTotal, setActivityTotal] = useState(0);
  const [activityTotalPages, setActivityTotalPages] = useState(0);
  const [activityLoading, setActivityLoading] = useState(true);
  const [activityError, setActivityError] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<ActivityCategoryFilter>('ALL');
  const [searchDraft, setSearchDraft] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedActivity, setSelectedActivity] = useState<AdminActivityListItem | null>(null);
  const [selectedActivityDetail, setSelectedActivityDetail] =
    useState<AdminActivityDetailResponse | null>(null);
  const [activityDetailCache, setActivityDetailCache] = useState<
    Record<number, AdminActivityDetailResponse>
  >({});
  const [activityDetailLoading, setActivityDetailLoading] = useState(false);
  const [activityDetailError, setActivityDetailError] = useState<string | null>(null);

  useEffect(() => {
    void loadActivity(activityPage);
  }, [activityPage, categoryFilter, searchQuery]);

  const activeFilter = activityFilters.find((filter) => filter.value === categoryFilter);
  const latestActivity = activityItems[0] ?? null;
  const activityTone: BadgeTone = activityLoading
    ? 'info'
    : activityItems.length > 0
      ? 'success'
      : 'default';
  const activityLabel = activityLoading
    ? 'Actualizando'
    : activityItems.length > 0
      ? 'Eventos listos'
      : 'Sin eventos';
  const headerCards: ModulePageHeaderCard[] = [
    {
      label: 'Eventos',
      value: activityLoading ? '...' : String(activityTotal),
      note: searchQuery ? `Busqueda: ${searchQuery}` : 'Feed historico paginado',
      accent: activityTone,
      icon: <Activity size={16} />,
      iconTone: activityTone,
      badge: { label: activityLabel, tone: activityTone },
    },
    {
      label: 'Filtro',
      value: activeFilter?.label ?? 'Todos',
      note: activeFilter?.description ?? 'Actividad completa',
      accent: categoryFilter === 'ALL' ? 'info' : 'success',
      icon: <Sparkles size={16} />,
      iconTone: categoryFilter === 'ALL' ? 'info' : 'success',
      badge: { label: 'Vista actual', tone: 'info' },
    },
    {
      label: 'Pagina',
      value: `${activityPage}/${Math.max(activityTotalPages, 1)}`,
      note: 'Hasta 12 eventos por pagina',
      accent: 'default',
      icon: <Boxes size={16} />,
      iconTone: 'default',
      badge: { label: 'Paginado', tone: 'default' },
    },
    {
      label: 'Ultimo evento',
      value: latestActivity ? formatActivityType(latestActivity.activity_type) : 'Sin eventos',
      note: latestActivity ? formatDate(latestActivity.occurred_at) : 'Esperando movimiento',
      accent: latestActivity ? getActivityTone(latestActivity.activity_type) : 'default',
      icon: <CreditCard size={16} />,
      iconTone: latestActivity ? getActivityTone(latestActivity.activity_type) : 'default',
      badge: {
        label: latestActivity ? 'Reciente' : 'Sin datos',
        tone: latestActivity ? getActivityTone(latestActivity.activity_type) : 'default',
      },
    },
  ];
  const utilityCards = useMemo(
    () => [
      { label: 'Caja', icon: CreditCard, copy: 'Aperturas, cierres y sesiones.' },
      { label: 'Ventas', icon: ShoppingBag, copy: 'Ventas pagadas con total y responsable.' },
      { label: 'Inventario', icon: Boxes, copy: 'Entradas, salidas y ajustes.' },
      { label: 'Configuracion', icon: Settings2, copy: 'Cambios de negocio con before/after.' },
    ],
    [],
  );

  async function loadActivity(page: number) {
    try {
      setActivityLoading(true);
      setActivityError(null);
      const response = await posApi.getAdminActivity({
        page,
        limit: 12,
        category: categoryFilter,
        q: searchQuery || undefined,
      });
      setActivityItems(response.items);
      setActivityTotal(response.total);
      setActivityTotalPages(response.total_pages);
    } catch (error) {
      setActivityItems([]);
      setActivityTotal(0);
      setActivityTotalPages(0);
      setActivityError(
        error instanceof Error
          ? error.message
          : 'No fue posible cargar actividad del negocio',
      );
    } finally {
      setActivityLoading(false);
    }
  }

  async function handleOpenActivityDetail(activity: AdminActivityListItem) {
    setSelectedActivity(activity);
    setActivityDetailError(null);

    const cached = activityDetailCache[activity.id];
    if (cached) {
      setSelectedActivityDetail(cached);
      setActivityDetailLoading(false);
      return;
    }

    try {
      setActivityDetailLoading(true);
      setSelectedActivityDetail(null);
      const detail = await posApi.getAdminActivityDetail(activity.id);
      setActivityDetailCache((current) => ({
        ...current,
        [activity.id]: detail,
      }));
      setSelectedActivityDetail(detail);
    } catch (error) {
      setSelectedActivityDetail(null);
      setActivityDetailError(
        error instanceof Error
          ? error.message
          : 'No fue posible cargar el detalle de actividad',
      );
    } finally {
      setActivityDetailLoading(false);
    }
  }

  function closeActivityDetail() {
    setSelectedActivity(null);
    setSelectedActivityDetail(null);
    setActivityDetailError(null);
    setActivityDetailLoading(false);
  }

  function handleActivityNavigation(navigation: AdminActivityNavigation) {
    const search = navigation.query
      ? new URLSearchParams(navigation.query).toString()
      : '';

    void navigate(search ? `${navigation.path}?${search}` : navigation.path);
  }

  function applyFilter(filter: ActivityCategoryFilter) {
    setCategoryFilter(filter);
    setActivityPage(1);
  }

  function handleSearchSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSearchQuery(searchDraft.trim());
    setActivityPage(1);
  }

  return (
    <div className="admin-dashboard admin-activity-page grid min-w-0 gap-4 sm:gap-5">
      <AdminSubmoduleNav />

      <ModulePageHeader
        ariaLabel="Actividad del negocio"
        eyebrow="Admin / Actividad"
        title="Actividad del negocio"
        description="Consulta ventas, caja, inventario y trazabilidad operativa desde un feed dedicado."
        helpText="Esta vista reutiliza el detalle interactivo existente y conserva CTAs contextuales por evento."
        icon={<Activity size={18} />}
        badges={[{ label: activityLabel, tone: activityTone }]}
        asideAction={
          <Button
            variant="secondary"
            disabled={activityLoading}
            onClick={() => void loadActivity(activityPage)}
          >
            <RefreshCw size={16} />
            Refrescar
          </Button>
        }
        cards={headerCards}
      />

      <Card padding="none" glow={false} className="admin-panel admin-activity-control-panel">
        <div className="admin-panel__body">
          <SectionHeader
            eyebrow="Auditoria operativa"
            title="Filtros de actividad"
            description="Separa movimientos por area sin perder paginacion ni detalle."
            actions={<StatusBadge label={activeFilter?.label ?? 'Todos'} tone="info" />}
          />

          <div className="admin-activity-filter-grid">
            {activityFilters.map((filter) => (
              <button
                key={filter.value}
                type="button"
                className="admin-activity-filter-card"
                data-active={categoryFilter === filter.value}
                onClick={() => applyFilter(filter.value)}
              >
                <span>{filter.label}</span>
                <p>{filter.description}</p>
              </button>
            ))}
          </div>

          <form className="admin-activity-search" onSubmit={handleSearchSubmit}>
            <Input
              label="Buscar actividad"
              placeholder="Titulo, responsable o POS"
              value={searchDraft}
              startAdornment={<Search size={16} />}
              onChange={(event) => setSearchDraft(event.target.value)}
            />
            <div className="admin-activity-search__actions">
              <Button type="submit">
                <Search size={16} />
                Buscar
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={!searchDraft && !searchQuery}
                onClick={() => {
                  setSearchDraft('');
                  setSearchQuery('');
                  setActivityPage(1);
                }}
              >
                Limpiar
              </Button>
            </div>
          </form>
        </div>
      </Card>

      <Card padding="none" glow={false} className="admin-panel admin-activity-utility-panel">
        <div className="admin-panel__body">
          <SectionHeader
            eyebrow="Utilidad"
            title="Cobertura del feed"
            description="Eventos clave para supervision diaria y auditoria puntual."
          />
          <div className="admin-activity-utility-grid">
            {utilityCards.map((item) => {
              const Icon = item.icon;

              return (
                <div key={item.label} className="admin-activity-utility-card">
                  <Icon size={17} />
                  <strong>{item.label}</strong>
                  <span>{item.copy}</span>
                </div>
              );
            })}
          </div>
        </div>
      </Card>

      <Card padding="none" glow={false} className="admin-panel admin-activity-feed-panel">
        <div className="admin-panel__body">
          <SectionHeader
            eyebrow="Feed"
            title="Eventos registrados"
            description="Cards paginadas con fecha, responsable, POS y accion contextual."
            actions={<StatusBadge label={`${activityTotal} eventos`} tone={activityTone} />}
          />

          <AdminActivityFeedList
            items={activityItems}
            loading={activityLoading}
            error={activityError}
            total={activityTotal}
            page={activityPage}
            totalPages={activityTotalPages}
            rows={6}
            maxHeightClassName="max-h-[42rem]"
            emptyTitle="Sin actividad para estos filtros"
            emptyDescription="Prueba otro filtro o limpia la busqueda."
            onPageChange={setActivityPage}
            onOpenDetail={(activity) => void handleOpenActivityDetail(activity)}
            onNavigate={handleActivityNavigation}
          />
        </div>
      </Card>

      <AdminActivityDetailDialog
        open={selectedActivity !== null}
        activity={selectedActivity}
        detail={selectedActivityDetail}
        loading={activityDetailLoading}
        error={activityDetailError}
        onClose={closeActivityDetail}
        onNavigate={handleActivityNavigation}
      />
    </div>
  );
}
