import { ShieldAlert } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { getDefaultRouteForRole } from '@/app/permissions';
import { useSessionStore } from '@/store/sessionStore';

interface AccessDeniedLocationState {
  from?: string;
  fallbackPath?: string;
}

export function AccessDeniedPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const currentUser = useSessionStore((state) => state.currentUser);

  const state = (location.state as AccessDeniedLocationState | null) ?? null;
  const fallbackPath = state?.fallbackPath ?? getDefaultRouteForRole(currentUser?.role);

  return (
    <div className="grid min-h-[70vh] place-items-center">
      <Card className="max-w-2xl overflow-hidden">
        <div className="panel-top-glow-danger absolute inset-x-0 top-0 h-28" />
        <div className="relative">
          <div className="panel-icon-shell inline-flex h-16 w-16 items-center justify-center rounded-3xl" data-tone="warning">
            <ShieldAlert size={28} />
          </div>

          <p className="mt-6 text-xs uppercase tracking-[0.28em] theme-text-faint">
            Control de acceso
          </p>
          <h1 className="font-display mt-3 text-4xl font-bold theme-text-strong">
            Acceso denegado
          </h1>
          <p className="mt-3 max-w-xl text-sm theme-text-secondary">
            Tu perfil actual no tiene permisos para abrir esta vista.
            {state?.from ? ` Ruta solicitada: ${state.from}.` : ''}
          </p>

          <div className="mt-6 data-list-card rounded-3xl p-5 text-sm theme-text-secondary">
            <p>
              Usuario: <span className="font-medium theme-text-strong">{currentUser?.name ?? 'Sin sesion'}</span>
            </p>
            <p className="mt-2">
              Rol: <span className="font-medium theme-text-strong">{currentUser?.role ?? 'N/A'}</span>
            </p>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Button onClick={() => navigate(fallbackPath)}>
              Ir a una vista permitida
            </Button>
            <Button variant="secondary" onClick={() => navigate(-1)}>
              Volver
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}