import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { FeedbackMessage } from '@/components/FeedbackMessage';
import { ScrollPanel } from '@/components/ScrollPanel';
import { StatusBadge } from '@/components/StatusBadge';
import {
  getAdminActivityNavigation,
  getAdminActivityNavigationCapability,
} from '@/features/admin/admin-activity-navigation';
import {
  formatActivityType,
  getActivityHighlights,
  getActivityTone,
} from '@/features/admin/admin-activity-format';
import { usePermissions } from '@/hooks/usePermissions';
import type {
  AdminActivityListItem,
  AdminActivityNavigation,
} from '@/types/api';
import { formatDate } from '@/utils/format';

interface AdminActivityFeedListProps {
  items: AdminActivityListItem[];
  loading: boolean;
  error: string | null;
  total: number;
  page: number;
  totalPages: number;
  rows?: number;
  maxHeightClassName?: string;
  showPagination?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  onPageChange?: (page: number) => void;
  onOpenDetail: (activity: AdminActivityListItem) => void;
  onNavigate: (navigation: AdminActivityNavigation) => void;
}

export function AdminActivityFeedList({
  items,
  loading,
  error,
  total,
  page,
  totalPages,
  rows = 5,
  maxHeightClassName = 'max-h-[30rem]',
  showPagination = true,
  emptyTitle = 'Sin actividad reciente',
  emptyDescription = 'Aparecera con ventas, caja o inventario.',
  onPageChange,
  onOpenDetail,
  onNavigate,
}: AdminActivityFeedListProps) {
  const { can } = usePermissions();

  if (error) {
    return (
      <FeedbackMessage tone="error">
        {error}
      </FeedbackMessage>
    );
  }

  if (loading) {
    return <AdminActivitySkeleton rows={rows} />;
  }

  if (items.length === 0) {
    return (
      <EmptyState
        title={emptyTitle}
        description={emptyDescription}
      />
    );
  }

  return (
    <>
      <ScrollPanel
        className="admin-activity-list"
        maxHeightClassName={maxHeightClassName}
        tabIndex={0}
        aria-label="Actividad del negocio"
      >
        {items.map((item) => {
          const activityNavigation = getAdminActivityNavigation(item);
          const canShowNavigation =
            activityNavigation !== null &&
            can(getAdminActivityNavigationCapability(item.activity_type));

          return (
            <article
              key={`${item.id}-${item.activity_type}-${item.entity_id}`}
              className="admin-activity-item admin-activity-item--rich"
              data-tone={getActivityTone(item.activity_type)}
            >
              <div className="admin-activity-item__content">
                <div className="admin-activity-item__meta">
                  <StatusBadge
                    label={formatActivityType(item.activity_type)}
                    tone={getActivityTone(item.activity_type)}
                  />
                  <span>#{item.entity_id}</span>
                  {item.location?.location_name ? (
                    <span>{item.location.location_name}</span>
                  ) : null}
                  {item.actor?.user_name ? <span>{item.actor.user_name}</span> : null}
                </div>
                <p>{item.title}</p>
                <span>{item.subtitle}</span>
                <div className="admin-activity-item__chips">
                  {getActivityHighlights(item).map((highlight) => (
                    <span key={`${item.id}-${highlight}`}>{highlight}</span>
                  ))}
                </div>
              </div>
              <div className="admin-activity-item__aside">
                <time>{formatDate(item.occurred_at)}</time>
                <div className="admin-activity-item__actions">
                  <Button
                    className="admin-activity-item__details-button"
                    variant="secondary"
                    size="sm"
                    onClick={() => onOpenDetail(item)}
                  >
                    Mas detalles
                  </Button>
                  {canShowNavigation && activityNavigation ? (
                    <Button
                      className="admin-activity-item__nav-button"
                      variant="ghost"
                      size="sm"
                      onClick={() => onNavigate(activityNavigation)}
                    >
                      {activityNavigation.label}
                    </Button>
                  ) : null}
                </div>
              </div>
            </article>
          );
        })}
      </ScrollPanel>

      {showPagination ? (
        <div className="admin-activity-pagination">
          <span>
            {total} eventos - pagina {page} de {Math.max(totalPages, 1)}
          </span>
          <div className="admin-activity-pagination__actions">
            <Button
              variant="secondary"
              size="sm"
              disabled={loading || page <= 1}
              onClick={() => onPageChange?.(Math.max(1, page - 1))}
            >
              Anterior
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={loading || totalPages === 0 || page >= totalPages}
              onClick={() => onPageChange?.(page + 1)}
            >
              Siguiente
            </Button>
          </div>
        </div>
      ) : null}
    </>
  );
}

function AdminActivitySkeleton({ rows }: { rows: number }) {
  return (
    <div className="grid gap-3">
      {Array.from({ length: rows }).map((_, index) => (
        <div
          key={index}
          className="data-list-card h-20 animate-pulse rounded-3xl"
        />
      ))}
    </div>
  );
}
