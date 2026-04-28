import type { ReactNode } from 'react';
import { Button } from '@/components/Button';
import { FeedbackMessage } from '@/components/FeedbackMessage';
import { Modal } from '@/components/Modal';
import { Sheet } from '@/components/Sheet';
import { StatusBadge } from '@/components/StatusBadge';
import {
  getAdminActivityNavigation,
  getAdminActivityNavigationCapability,
} from '@/features/admin/admin-activity-navigation';
import { usePermissions } from '@/hooks/usePermissions';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import type {
  AdminActivityDetailResponse,
  AdminActivityListItem,
  AdminActivityNavigation,
  AdminCashClosedActivityDetail,
  AdminCashOpenedActivityDetail,
  AdminSaleCompletedActivityDetail,
  AdminStockMovementActivityDetail,
} from '@/types/api';
import { formatCurrency, formatDate } from '@/utils/format';

interface AdminActivityDetailDialogProps {
  open: boolean;
  activity: AdminActivityListItem | null;
  detail: AdminActivityDetailResponse | null;
  loading: boolean;
  error: string | null;
  onClose: () => void;
  onNavigate: (navigation: AdminActivityNavigation) => void;
}

export function AdminActivityDetailDialog({
  open,
  activity,
  detail,
  loading,
  error,
  onClose,
  onNavigate,
}: AdminActivityDetailDialogProps) {
  const isMobileViewport = useMediaQuery('(max-width: 639px)');
  const { can } = usePermissions();
  const current = detail ?? activity;
  const title = current?.title ?? 'Detalle de actividad';
  const subtitle = current
    ? `${formatAdminActivityType(current.activity_type)} · ${formatDate(current.occurred_at)}`
    : 'Consulta operacional';
  const navigation = current ? getAdminActivityNavigation(current) : null;
  const canShowNavigation =
    current !== null &&
    navigation !== null &&
    can(getAdminActivityNavigationCapability(current.activity_type));
  const content = loading ? (
    <div className="admin-activity-detail__stack">
      <div className="admin-activity-detail__hero animate-pulse" />
      <div className="admin-activity-detail__metrics">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="admin-activity-detail__metric animate-pulse" />
        ))}
      </div>
    </div>
  ) : error ? (
    <FeedbackMessage tone="error">{error}</FeedbackMessage>
  ) : !detail ? (
    <FeedbackMessage tone="error">
      No fue posible cargar detalle de actividad.
    </FeedbackMessage>
  ) : (
    <DetailBody detail={detail} />
  );
  const footerAction = canShowNavigation && navigation ? (
    <Button variant="secondary" onClick={() => onNavigate(navigation)}>
      {navigation.label}
    </Button>
  ) : null;

  if (!open) {
    return null;
  }

  if (isMobileViewport) {
    return (
      <Sheet
        className="admin-activity-detail-sheet"
        title={title}
        subtitle={subtitle}
        open={open}
        onClose={onClose}
        mobileOnly
        showHandle
        bodyClassName="admin-activity-detail-sheet__body"
      >
        <div className="admin-activity-detail-sheet__scroll">
          <div className="admin-activity-detail admin-activity-detail--sheet">
            {content}
          </div>
        </div>
        {footerAction ? (
          <div className="admin-activity-detail__footer admin-activity-detail__footer--sheet">
            {footerAction}
          </div>
        ) : null}
      </Sheet>
    );
  }

  return (
    <Modal
      title={title}
      subtitle={subtitle}
      open={open}
      onClose={onClose}
      size="lg"
    >
      <div className="admin-activity-detail">
        {content}
        {footerAction ? (
          <div className="admin-activity-detail__footer">
            {footerAction}
          </div>
        ) : null}
      </div>
    </Modal>
  );
}

function DetailBody({
  detail,
}: {
  detail: AdminActivityDetailResponse;
}) {
  return (
    <div className="admin-activity-detail__stack">
      <div className="admin-activity-detail__hero">
        <div className="admin-activity-detail__hero-copy">
          <div className="admin-activity-detail__hero-badges">
            <StatusBadge
              label={formatAdminActivityType(detail.activity_type)}
              tone={getActivityTone(detail.activity_type)}
            />
            <StatusBadge label={`Ref #${detail.entity_id}`} tone="default" />
          </div>
          <p className="admin-activity-detail__hero-title">{detail.title}</p>
          <span className="admin-activity-detail__hero-subtitle">{detail.subtitle}</span>
        </div>
        <div className="admin-activity-detail__hero-meta">
          <span>{formatDate(detail.occurred_at)}</span>
          {detail.actor?.user_name ? <span>{detail.actor.user_name}</span> : null}
          {detail.location?.location_name ? <span>{detail.location.location_name}</span> : null}
        </div>
      </div>

      {detail.activity_type === 'CASH_OPENED' ? (
        <CashOpenedDetail detail={detail.detail as AdminCashOpenedActivityDetail} />
      ) : null}
      {detail.activity_type === 'CASH_CLOSED' ? (
        <CashClosedDetail detail={detail.detail as AdminCashClosedActivityDetail} />
      ) : null}
      {detail.activity_type === 'SALE_COMPLETED' ? (
        <SaleCompletedDetail detail={detail.detail as AdminSaleCompletedActivityDetail} />
      ) : null}
      {detail.activity_type === 'STOCK_MOVEMENT' ? (
        <StockMovementDetail detail={detail.detail as AdminStockMovementActivityDetail} />
      ) : null}
    </div>
  );
}

function CashOpenedDetail({ detail }: { detail: AdminCashOpenedActivityDetail }) {
  return (
    <>
      <MetricGrid
        items={[
          { label: 'Sesion', value: `#${detail.cash_session_id}` },
          { label: 'Apertura', value: formatDate(detail.opened_at) },
          { label: 'Base inicial', value: formatCurrency(detail.opening_cash) },
          { label: 'Responsable', value: detail.responsible_name },
          { label: 'POS', value: detail.location_name },
          { label: 'Ubicacion ID', value: `#${detail.location_id}` },
        ]}
      />
      <InfoCard
        title="Contexto de apertura"
        rows={[
          ['Responsable', `${detail.responsible_name} (#${detail.responsible_id})`],
          ['POS', detail.location_name],
          ['Sesion', `Caja #${detail.cash_session_id}`],
        ]}
      />
    </>
  );
}

function CashClosedDetail({ detail }: { detail: AdminCashClosedActivityDetail }) {
  return (
    <>
      <MetricGrid
        items={[
          { label: 'Sesion', value: `#${detail.cash_session_id}` },
          { label: 'Apertura', value: formatDate(detail.opened_at) },
          { label: 'Cierre', value: formatDate(detail.closed_at) },
          { label: 'Esperado', value: formatCurrency(detail.expected) },
          { label: 'Contado', value: formatCurrency(detail.counted) },
          {
            label: 'Diferencia',
            value: formatCurrency(detail.difference),
            accent: getDifferenceTone(detail.difference),
          },
        ]}
      />
      <InfoCard
        title="Snapshot de cierre"
        rows={[
          ['Apertura', formatCurrency(detail.summary_snapshot.opening_cash)],
          ['Ventas en efectivo', formatCurrency(detail.cash_sales_total)],
          ['Ventas por transferencia', formatCurrency(detail.transfer_sales_total)],
          ['Cambio entregado', formatCurrency(detail.total_change_given)],
          ['Responsable apertura', `${detail.opened_by_name} (#${detail.opened_by_id})`],
          ['Responsable cierre', `${detail.closed_by_name} (#${detail.closed_by_id})`],
          ['POS', detail.location_name],
        ]}
      />
    </>
  );
}

function SaleCompletedDetail({
  detail,
}: {
  detail: AdminSaleCompletedActivityDetail;
}) {
  return (
    <>
      <MetricGrid
        items={[
          { label: 'Venta', value: `#${detail.sale_id}` },
          { label: 'Fecha', value: formatDate(detail.created_at) },
          { label: 'Total', value: formatCurrency(detail.total), accent: 'success' },
          { label: 'Pago', value: formatPaymentMethod(detail.payment_method) },
          { label: 'Responsable', value: detail.responsible_name },
          { label: 'POS', value: detail.location_name },
        ]}
      />
      <div className="admin-activity-detail__split">
        <InfoCard
          title="Resumen de cobro"
          rows={[
            ['Estado', formatSaleStatus(detail.status)],
            ['Subtotal', formatCurrency(detail.subtotal)],
            ['Descuento', formatDiscount(detail.discount_type, detail.discount_value)],
            ['Valor descontado', formatCurrency(detail.discount_amount)],
            [
              'Monto recibido',
              detail.amount_received === null
                ? 'No informado'
                : formatCurrency(detail.amount_received),
            ],
            [
              'Cambio entregado',
              detail.change_given === null
                ? 'No aplica'
                : formatCurrency(detail.change_given),
            ],
          ]}
        />
        <InfoCard
          title="Contexto comercial"
          rows={[
            ['Metodo', formatPaymentMethod(detail.payment_method)],
            ['Cajero', `${detail.responsible_name} (#${detail.cashier_id})`],
            ['POS', `${detail.location_name} (#${detail.location_id})`],
            ['Lineas', String(detail.items.length)],
            [
              'Unidades',
              String(detail.items.reduce((total, item) => total + item.qty, 0)),
            ],
          ]}
        />
      </div>
      <div className="admin-activity-detail__card">
        <div className="admin-activity-detail__card-header">
          <div>
            <p className="admin-kicker">Detalle</p>
            <h3>Items de venta</h3>
          </div>
          <StatusBadge label={`${detail.items.length} lineas`} tone="info" />
        </div>
        <div className="admin-activity-detail__list">
          {detail.items.map((item) => (
            <div key={item.id} className="admin-activity-detail__list-item">
              <div>
                <p>{item.description}</p>
                <span>
                  {item.item_type === 'VARIANT' ? 'Variante' : 'Combo'} · Ref #{item.ref_id}
                </span>
              </div>
              <div className="admin-activity-detail__list-meta">
                <strong>{formatCurrency(item.line_total)}</strong>
                <span>
                  {item.qty} x {formatCurrency(item.unit_price)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

function StockMovementDetail({
  detail,
}: {
  detail: AdminStockMovementActivityDetail;
}) {
  return (
    <>
      <MetricGrid
        items={[
          { label: 'Movimiento', value: `#${detail.movement_id}` },
          { label: 'Ingrediente', value: detail.ingredient_name },
          { label: 'Tipo', value: formatMovementType(detail.movement_type) },
          {
            label: 'Delta',
            value: `${detail.qty_delta >= 0 ? '+' : ''}${detail.qty_delta}`,
            accent: detail.qty_delta >= 0 ? 'success' : 'warning',
          },
          { label: 'Responsable', value: detail.responsible_name },
          { label: 'POS', value: detail.location_name },
        ]}
      />
      <div className="admin-activity-detail__split">
        <InfoCard
          title="Trazabilidad"
          rows={[
            ['Fecha', formatDate(detail.created_at)],
            ['Ingrediente', `${detail.ingredient_name} (#${detail.ingredient_id})`],
            ['Razon', detail.reason_code ? formatReasonCode(detail.reason_code) : 'Sin razon'],
            ['Responsable', `${detail.responsible_name} (#${detail.responsible_id})`],
            ['POS', `${detail.location_name} (#${detail.location_id})`],
            [
              'Referencia',
              detail.reference_id !== null
                ? `${detail.reference_type ?? 'N/A'} #${detail.reference_id}`
                : 'Sin referencia',
            ],
          ]}
        />
        <InfoCard
          title="Impacto en stock"
          rows={[
            [
              'Stock previo',
              detail.previous_stock === null ? 'No disponible' : String(detail.previous_stock),
            ],
            [
              'Stock final',
              detail.new_stock === null ? 'No disponible' : String(detail.new_stock),
            ],
            [
              'Conteo',
              detail.counted_stock === null
                ? 'No aplica'
                : String(detail.counted_stock),
            ],
            [
              'Costo unitario',
              detail.unit_cost_at_time === null
                ? 'No aplica'
                : formatCurrency(detail.unit_cost_at_time),
            ],
            ['Lote', detail.batch_number ?? 'No aplica'],
            ['Documento', detail.support_document ?? 'No aplica'],
          ]}
        />
      </div>
      {detail.notes ? (
        <div className="admin-activity-detail__card">
          <div className="admin-activity-detail__card-header">
            <div>
              <p className="admin-kicker">Observaciones</p>
              <h3>Nota operativa</h3>
            </div>
          </div>
          <p className="admin-activity-detail__note">{detail.notes}</p>
        </div>
      ) : null}
    </>
  );
}

function MetricGrid({
  items,
}: {
  items: Array<{
    label: string;
    value: string;
    accent?: 'default' | 'success' | 'warning' | 'danger' | 'info';
  }>;
}) {
  return (
    <div className="admin-activity-detail__metrics">
      {items.map((item) => (
        <div key={item.label} className="admin-activity-detail__metric" data-tone={item.accent ?? 'default'}>
          <span>{item.label}</span>
          <strong>{item.value}</strong>
        </div>
      ))}
    </div>
  );
}

function InfoCard({
  title,
  rows,
  action,
}: {
  title: string;
  rows: Array<[string, string]>;
  action?: ReactNode;
}) {
  return (
    <div className="admin-activity-detail__card">
      <div className="admin-activity-detail__card-header">
        <div>
          <p className="admin-kicker">Detalle</p>
          <h3>{title}</h3>
        </div>
        {action ?? null}
      </div>
      <div className="admin-activity-detail__rows">
        {rows.map(([label, value]) => (
          <div key={label} className="admin-activity-detail__row">
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

function formatAdminActivityType(type: AdminActivityListItem['activity_type']) {
  if (type === 'CASH_OPENED') return 'Apertura';
  if (type === 'CASH_CLOSED') return 'Cierre';
  if (type === 'SALE_COMPLETED') return 'Venta';
  return 'Inventario';
}

function getActivityTone(type: AdminActivityListItem['activity_type']) {
  if (type === 'CASH_OPENED' || type === 'CASH_CLOSED') return 'success' as const;
  if (type === 'SALE_COMPLETED') return 'info' as const;
  return 'warning' as const;
}

function getDifferenceTone(value: number) {
  if (value === 0) return 'success' as const;
  if (value > 0) return 'info' as const;
  return 'danger' as const;
}

function formatPaymentMethod(method: string | null) {
  if (method === 'CASH') return 'Efectivo';
  if (method === 'TRANSFER') return 'Transferencia';
  return 'Pendiente';
}

function formatSaleStatus(status: string) {
  if (status === 'PAID') return 'Pagada';
  if (status === 'PENDING') return 'Pendiente';
  if (status === 'VOID') return 'Anulada';
  return status;
}

function formatDiscount(type: string, value: number) {
  if (type === 'PERCENT') return `${value}%`;
  if (type === 'FIXED') return formatCurrency(value);
  return 'No aplica';
}

function formatMovementType(type: string) {
  if (type === 'ENTRY') return 'Entrada';
  if (type === 'EXIT') return 'Salida';
  if (type === 'ADJUSTMENT') return 'Ajuste';
  return type;
}

function formatReasonCode(reason: string) {
  const labels: Record<string, string> = {
    PURCHASE: 'Compra',
    INITIAL_LOAD: 'Carga inicial',
    SUPPLIER_RETURN: 'Devolucion proveedor',
    POSITIVE_ADJUSTMENT: 'Ajuste positivo',
    WASTE: 'Merma',
    DAMAGE: 'Dano',
    INTERNAL_USE: 'Uso interno',
    EXPIRATION: 'Vencimiento',
    NEGATIVE_ADJUSTMENT: 'Ajuste negativo',
    PHYSICAL_COUNT: 'Conteo fisico',
    ADMIN_CORRECTION: 'Correccion administrativa',
  };

  return labels[reason] ?? reason;
}
