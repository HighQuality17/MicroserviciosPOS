import type { AdminActivityListItem, PaymentMethod } from '@/types/api';
import { formatCurrency } from '@/utils/format';

type BadgeTone = 'default' | 'success' | 'warning' | 'danger' | 'info';

export function formatActivityType(activityType: AdminActivityListItem['activity_type']) {
  if (activityType === 'SALE_COMPLETED') return 'Venta';
  if (activityType === 'CASH_OPENED') return 'Apertura';
  if (activityType === 'CASH_CLOSED') return 'Cierre';
  if (activityType === 'CONFIG_UPDATED') return 'Configuracion';
  return 'Inventario';
}

export function getActivityTone(activityType: AdminActivityListItem['activity_type']): BadgeTone {
  if (activityType === 'SALE_COMPLETED') return 'info';
  if (activityType === 'CASH_OPENED') return 'success';
  if (activityType === 'CASH_CLOSED') return 'danger';
  if (activityType === 'CONFIG_UPDATED') return 'info';
  return 'warning';
}

export function getActivityHighlights(item: AdminActivityListItem) {
  if (item.activity_type === 'CASH_OPENED') {
    const summary = item.summary as {
      cash_session_id: number;
      responsible_name: string;
      location_name: string;
    };

    return [
      `Caja #${summary.cash_session_id}`,
      summary.responsible_name,
      summary.location_name,
    ];
  }

  if (item.activity_type === 'CASH_CLOSED') {
    const summary = item.summary as {
      expected: number;
      counted: number;
      difference: number;
    };

    return [
      `Esperado ${formatCurrency(summary.expected)}`,
      `Contado ${formatCurrency(summary.counted)}`,
      `Diff ${formatCurrency(summary.difference)}`,
    ];
  }

  if (item.activity_type === 'SALE_COMPLETED') {
    const summary = item.summary as {
      total: number;
      payment_method: PaymentMethod | null;
      responsible_name: string;
    };

    return [
      formatCurrency(summary.total),
      formatPaymentMethod(summary.payment_method),
      summary.responsible_name,
    ];
  }

  if (item.activity_type === 'CONFIG_UPDATED') {
    const summary = item.summary as {
      changed_count: number;
      changed_fields: string[];
      responsible_name: string;
    };

    return [
      `${summary.changed_count} campos`,
      summary.responsible_name,
      ...(summary.changed_fields.length > 0
        ? summary.changed_fields.slice(0, 1)
        : ['Sin detalle']),
    ];
  }

  const summary = item.summary as {
    ingredient_name: string;
    movement_type: string;
    qty_delta: number;
  };

  return [
    summary.ingredient_name,
    formatInventoryMovementType(summary.movement_type),
    `${summary.qty_delta >= 0 ? '+' : ''}${summary.qty_delta}`,
  ];
}

export function formatPaymentMethod(method: PaymentMethod | null) {
  if (method === 'CASH') return 'Efectivo';
  if (method === 'TRANSFER') return 'Transferencia';
  return 'Pendiente';
}

export function formatInventoryMovementType(value: string) {
  if (value === 'ENTRY') return 'Entrada';
  if (value === 'EXIT') return 'Salida';
  if (value === 'ADJUSTMENT') return 'Ajuste';
  return value;
}
