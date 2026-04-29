import type { LucideIcon } from 'lucide-react';
import {
  Activity,
  Boxes,
  CreditCard,
  LayoutDashboard,
  Package2,
  ReceiptText,
  ShoppingCart,
  Settings2,
  Store,
  TestTube2,
} from 'lucide-react';
import type { UserRole } from '@/types/api';

export type AppRoutePath =
  | '/pos'
  | '/cash'
  | '/products'
  | '/ingredients'
  | '/combos'
  | '/sales'
  | '/admin'
  | '/admin/activity'
  | '/admin/config'
  | '/admin/locations';

export interface NavigationItem {
  to: AppRoutePath;
  label: string;
  icon: LucideIcon;
}

export type PermissionCapability =
  | 'canViewAdmin'
  | 'canViewSales'
  | 'canOperateSales'
  | 'canOperatePos'
  | 'canOperateCash'
  | 'canManageCatalog'
  | 'canManageInventory'
  | 'canManageLocations';

const navigationItems: NavigationItem[] = [
  { to: '/pos', label: 'POS', icon: ShoppingCart },
  { to: '/cash', label: 'Caja', icon: CreditCard },
  { to: '/products', label: 'Productos', icon: Package2 },
  { to: '/ingredients', label: 'Ingredientes', icon: TestTube2 },
  { to: '/combos', label: 'Combos', icon: Boxes },
  { to: '/sales', label: 'Ventas', icon: ReceiptText },
  { to: '/admin', label: 'Admin', icon: LayoutDashboard },
];

const adminSubnavigationItems: NavigationItem[] = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/admin/activity', label: 'Actividad', icon: Activity },
  { to: '/admin/config', label: 'Configuracion', icon: Settings2 },
  { to: '/admin/locations', label: 'Puntos de venta', icon: Store },
];

const allowedRoutesByRole: Record<UserRole, AppRoutePath[]> = {
  ADMIN: [
    '/pos',
    '/cash',
    '/products',
    '/ingredients',
    '/combos',
    '/sales',
    '/admin',
    '/admin/activity',
    '/admin/config',
    '/admin/locations',
  ],
  CASHIER: ['/pos', '/cash', '/sales'],
  AUDITOR: ['/sales', '/admin', '/admin/activity'],
};

const defaultRouteByRole: Record<UserRole, AppRoutePath> = {
  ADMIN: '/pos',
  CASHIER: '/pos',
  AUDITOR: '/sales',
};

const capabilitiesByRole: Record<UserRole, Record<PermissionCapability, boolean>> = {
  ADMIN: {
    canViewAdmin: true,
    canViewSales: true,
    canOperateSales: true,
    canOperatePos: true,
    canOperateCash: true,
    canManageCatalog: true,
    canManageInventory: true,
    canManageLocations: true,
  },
  CASHIER: {
    canViewAdmin: false,
    canViewSales: true,
    canOperateSales: false,
    canOperatePos: true,
    canOperateCash: true,
    canManageCatalog: false,
    canManageInventory: false,
    canManageLocations: false,
  },
  AUDITOR: {
    canViewAdmin: true,
    canViewSales: true,
    canOperateSales: false,
    canOperatePos: false,
    canOperateCash: false,
    canManageCatalog: false,
    canManageInventory: false,
    canManageLocations: false,
  },
};

export function getNavigationByRole(role?: UserRole | null) {
  if (!role) {
    return [];
  }

  const allowedRoutes = new Set(allowedRoutesByRole[role]);
  return navigationItems.filter((item) => allowedRoutes.has(item.to));
}

export function getAdminSubnavigationByRole(role?: UserRole | null) {
  if (!role) {
    return [];
  }

  const allowedRoutes = new Set(allowedRoutesByRole[role]);
  return adminSubnavigationItems.filter((item) => allowedRoutes.has(item.to));
}

export function getAllowedRolesForRoute(route: AppRoutePath) {
  return (Object.entries(allowedRoutesByRole) as Array<[UserRole, AppRoutePath[]]>)
    .filter(([, routes]) => routes.includes(route))
    .map(([role]) => role);
}

export function canAccessRoute(role: UserRole, route: AppRoutePath) {
  return allowedRoutesByRole[role].includes(route);
}

export function getDefaultRouteForRole(role?: UserRole | null) {
  return role ? defaultRouteByRole[role] : '/login';
}

export function getCapabilitiesForRole(role?: UserRole | null) {
  return role ? capabilitiesByRole[role] : null;
}

export function can(role: UserRole | null | undefined, capability: PermissionCapability) {
  return role ? capabilitiesByRole[role][capability] : false;
}
