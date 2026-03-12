import {
  Navigate,
  createBrowserRouter,
} from 'react-router-dom';
import { AppLayout } from '@/layouts/AppLayout';
import { LoginPage } from '@/features/login/LoginPage';
import { PosPage } from '@/features/pos/PosPage';
import { CashPage } from '@/features/cash/CashPage';
import { ProductsPage } from '@/features/products/ProductsPage';
import { IngredientsPage } from '@/features/ingredients/IngredientsPage';
import { CombosPage } from '@/features/combos/CombosPage';
import { SalesPage } from '@/features/sales/SalesPage';
import { AdminPage } from '@/features/admin/AdminPage';
import { ProtectedRoute } from '@/app/router/ProtectedRoute';
import { AccessDeniedPage } from '@/features/access/AccessDeniedPage';
import { getAllowedRolesForRoute, getDefaultRouteForRole } from '@/app/permissions';
import { useSessionStore } from '@/store/sessionStore';

function HomeRedirect() {
  const currentUser = useSessionStore((state) => state.currentUser);
  return <Navigate to={getDefaultRouteForRole(currentUser?.role)} replace />;
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
            <ProductsPage />
          </ProtectedRoute>
        ),
      },
      {
        path: '/ingredients',
        element: (
          <ProtectedRoute allowedRoles={getAllowedRolesForRoute('/ingredients')}>
            <IngredientsPage />
          </ProtectedRoute>
        ),
      },
      {
        path: '/combos',
        element: (
          <ProtectedRoute allowedRoles={getAllowedRolesForRoute('/combos')}>
            <CombosPage />
          </ProtectedRoute>
        ),
      },
      {
        path: '/sales',
        element: (
          <ProtectedRoute allowedRoles={getAllowedRolesForRoute('/sales')}>
            <SalesPage />
          </ProtectedRoute>
        ),
      },
      {
        path: '/admin',
        element: (
          <ProtectedRoute allowedRoles={getAllowedRolesForRoute('/admin')}>
            <AdminPage />
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
