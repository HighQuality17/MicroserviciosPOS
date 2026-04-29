import type { PermissionCapability } from '@/app/permissions';
import type { AdminActivityListItem, AdminActivityNavigation } from '@/types/api';

type AdminActivityType = AdminActivityListItem['activity_type'];

const activityNavigationLabels: Record<AdminActivityType, string> = {
  CASH_OPENED: 'Ir a caja',
  CASH_CLOSED: 'Ir a caja',
  SALE_COMPLETED: 'Ver venta',
  STOCK_MOVEMENT: 'Ver inventario',
  CONFIG_UPDATED: 'Ver configuracion',
};

export function getAdminActivityNavigationCapability(
  activityType: AdminActivityType,
): PermissionCapability {
  if (activityType === 'CASH_OPENED' || activityType === 'CASH_CLOSED') {
    return 'canOperateCash';
  }

  if (activityType === 'SALE_COMPLETED') {
    return 'canViewSales';
  }

  if (activityType === 'CONFIG_UPDATED') {
    return 'canManageConfig';
  }

  return 'canManageInventory';
}

export function getAdminActivityNavigation(
  activity: Pick<AdminActivityListItem, 'activity_type' | 'entity_id' | 'navigation'>,
): AdminActivityNavigation | null {
  const fallback = getFallbackAdminActivityNavigation(activity);

  if (activity.navigation) {
    return {
      ...activity.navigation,
      label: activityNavigationLabels[activity.activity_type],
      query:
        activity.navigation.query ??
        (fallback?.query ? { ...fallback.query } : undefined),
    };
  }

  return fallback;
}

function getFallbackAdminActivityNavigation(
  activity: Pick<AdminActivityListItem, 'activity_type' | 'entity_id'>,
): AdminActivityNavigation | null {
  if (activity.activity_type === 'CASH_OPENED' || activity.activity_type === 'CASH_CLOSED') {
    return {
      label: activityNavigationLabels[activity.activity_type],
      path: '/cash',
    };
  }

  if (activity.activity_type === 'SALE_COMPLETED') {
    return {
      label: activityNavigationLabels[activity.activity_type],
      path: '/sales',
      query: { saleId: String(activity.entity_id) },
    };
  }

  if (activity.activity_type === 'STOCK_MOVEMENT') {
    return {
      label: activityNavigationLabels[activity.activity_type],
      path: '/ingredients',
    };
  }

  if (activity.activity_type === 'CONFIG_UPDATED') {
    return {
      label: activityNavigationLabels[activity.activity_type],
      path: '/admin/config',
    };
  }

  return null;
}
