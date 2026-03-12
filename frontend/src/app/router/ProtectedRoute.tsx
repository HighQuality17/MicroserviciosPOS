import { Navigate, useLocation } from 'react-router-dom';
import { ReactNode } from 'react';
import { LoadingState } from '@/components/LoadingState';
import { useSessionStore } from '@/store/sessionStore';
import type { UserRole } from '@/types/api';
import { getDefaultRouteForRole } from '@/app/permissions';

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: UserRole[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const currentUser = useSessionStore((state) => state.currentUser);
  const isReady = useSessionStore((state) => state.isReady);
  const location = useLocation();

  if (!isReady) {
    return (
      <LoadingState
        title="Validando sesión"
        description="Estamos comprobando tus permisos y restaurando el acceso."
        rows={2}
      />
    );
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(currentUser.role)) {
    return (
      <Navigate
        to="/access-denied"
        replace
        state={{
          from: location.pathname,
          fallbackPath: getDefaultRouteForRole(currentUser.role),
        }}
      />
    );
  }

  return <>{children}</>;
}
