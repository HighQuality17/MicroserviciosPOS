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
      { index: true, element: <Navigate to="/pos" replace /> },
      { path: '/pos', element: <PosPage /> },
      { path: '/cash', element: <CashPage /> },
      { path: '/products', element: <ProductsPage /> },
      { path: '/ingredients', element: <IngredientsPage /> },
      { path: '/combos', element: <CombosPage /> },
      { path: '/sales', element: <SalesPage /> },
      { path: '/admin', element: <AdminPage /> },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/pos" replace />,
  },
]);
