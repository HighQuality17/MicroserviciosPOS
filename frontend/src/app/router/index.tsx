import { Suspense, lazy, type ReactNode } from 'react';
import { Navigate, createBrowserRouter } from 'react-router-dom';
import { AppLayout } from '@/layouts/AppLayout';
import { LoginPage } from '@/features/login/LoginPage';
import { PosPage } from '@/features/pos/PosPage';
import { CashPage } from '@/features/cash/CashPage';
import { ProtectedRoute } from '@/app/router/ProtectedRoute';
import { ModuleAccessRoute } from '@/app/router/ModuleAccessRoute';
import { AccessDeniedPage } from '@/features/access/AccessDeniedPage';
import { LoadingState } from '@/components/LoadingState';
import { getAllowedRolesForRoute, getDefaultRouteForRole } from '@/app/permissions';
import { useSessionStore } from '@/store/sessionStore';

const ProductsPage = lazy(() =>
  import('@/features/products/ProductsPage').then((module) => ({
    default: module.ProductsPage,
  })),
);
const IngredientsPage = lazy(() =>
  import('@/features/ingredients/IngredientsPage').then((module) => ({
    default: module.IngredientsPage,
  })),
);
const CombosPage = lazy(() =>
  import('@/features/combos/CombosPage').then((module) => ({
    default: module.CombosPage,
  })),
);
const SalesPage = lazy(() =>
  import('@/features/sales/SalesPage').then((module) => ({
    default: module.SalesPage,
  })),
);
const AdminPage = lazy(() =>
  import('@/features/admin/AdminPage').then((module) => ({
    default: module.AdminPage,
  })),
);
const AdminConfigPage = lazy(() =>
  import('@/features/admin/AdminConfigPage').then((module) => ({
    default: module.AdminConfigPage,
  })),
);
const AdminLocationsPage = lazy(() =>
  import('@/features/admin/AdminLocationsPage').then((module) => ({
    default: module.AdminLocationsPage,
  })),
);

function HomeRedirect() {
  const currentUser = useSessionStore((state) => state.currentUser);
  return <Navigate to={getDefaultRouteForRole(currentUser?.role)} replace />;
}

function LazyRoute({ children }: { children: ReactNode }) {
  return (
    <Suspense
      fallback={
        <LoadingState
          title="Cargando módulo"
          description="Estamos preparando esta pantalla administrativa."
          rows={4}
        />
      }
    >
      {children}
    </Suspense>
  );
}

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <HomeRedirect /> },
      {
        path: '/pos',
        element: (
          <ProtectedRoute allowedRoles={getAllowedRolesForRoute('/pos')}>
            <PosPage />
          </ProtectedRoute>
        ),
      },
      {
        path: '/cash',
        element: (
          <ProtectedRoute allowedRoles={getAllowedRolesForRoute('/cash')}>
            <CashPage />
          </ProtectedRoute>
        ),
      },
      {
        path: '/products',
        element: (
          <ProtectedRoute allowedRoles={getAllowedRolesForRoute('/products')}>
            <LazyRoute>
              <ProductsPage />
            </LazyRoute>
          </ProtectedRoute>
        ),
      },
      {
        path: '/ingredients',
        element: (
          <ProtectedRoute allowedRoles={getAllowedRolesForRoute('/ingredients')}>
            <ModuleAccessRoute
              moduleKey="ingredients"
              description="El modulo de ingredientes esta desactivado para este negocio. Puedes volver a una vista disponible o revisar la configuracion administrativa."
            >
              <LazyRoute>
                <IngredientsPage />
              </LazyRoute>
            </ModuleAccessRoute>
          </ProtectedRoute>
        ),
      },
      {
        path: '/combos',
        element: (
          <ProtectedRoute allowedRoles={getAllowedRolesForRoute('/combos')}>
            <ModuleAccessRoute
              moduleKey="combos"
              description="El modulo de combos esta desactivado para este negocio. La ruta sigue existiendo, pero el acceso operativo queda protegido hasta que el modulo se reactive."
            >
              <LazyRoute>
                <CombosPage />
              </LazyRoute>
            </ModuleAccessRoute>
          </ProtectedRoute>
        ),
      },
      {
        path: '/sales',
        element: (
          <ProtectedRoute allowedRoles={getAllowedRolesForRoute('/sales')}>
            <LazyRoute>
              <SalesPage />
            </LazyRoute>
          </ProtectedRoute>
        ),
      },
      {
        path: '/admin',
        element: (
          <ProtectedRoute allowedRoles={getAllowedRolesForRoute('/admin')}>
            <LazyRoute>
              <AdminPage />
            </LazyRoute>
          </ProtectedRoute>
        ),
      },
      {
        path: '/admin/config',
        element: (
          <ProtectedRoute allowedRoles={getAllowedRolesForRoute('/admin/config')}>
            <LazyRoute>
              <AdminConfigPage />
            </LazyRoute>
          </ProtectedRoute>
        ),
      },
      {
        path: '/admin/locations',
        element: (
          <ProtectedRoute allowedRoles={getAllowedRolesForRoute('/admin/locations')}>
            <LazyRoute>
              <AdminLocationsPage />
            </LazyRoute>
          </ProtectedRoute>
        ),
      },
      {
        path: '/access-denied',
        element: <AccessDeniedPage />,
      },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
]);
