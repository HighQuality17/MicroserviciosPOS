import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { FeedbackMessage } from '@/components/FeedbackMessage';
import { PaginationControls } from '@/components/PaginationControls';
import { ScrollPanel } from '@/components/ScrollPanel';
import { StatusBadge } from '@/components/StatusBadge';
import {
  formatActivityType,
  getActivityHighlights,
  getActivityTone,
} from '@/features/admin/admin-activity-format';
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
  void onNavigate;

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
                  </div>
                </div>
              </article>
          );
        })}
      </ScrollPanel>

      {showPagination ? (
        <PaginationControls
          page={page}
          totalPages={totalPages}
          totalItems={total}
          itemLabel="eventos"
          onPageChange={(nextPage) => onPageChange?.(nextPage)}
          className="admin-activity-pagination"
          actionsClassName="admin-activity-pagination__actions"
          buttonClassName="admin-activity-pagination__button"
        />
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
