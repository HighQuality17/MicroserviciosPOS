import { Navigate, useLocation } from 'react-router-dom';
import { ReactNode } from 'react';
import { useSessionStore } from '@/store/sessionStore';
import type { UserRole } from '@/types/api';
import { getDefaultRouteForRole } from '@/app/permissions';

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: UserRole[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const currentUser = useSessionStore((state) => state.currentUser);
  const location = useLocation();

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
