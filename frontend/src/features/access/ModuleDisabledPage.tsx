import { PowerOff } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { getDefaultRouteForRole } from '@/app/permissions';
import { useSessionStore } from '@/store/sessionStore';

interface ModuleDisabledPageProps {
  moduleName: string;
  description?: string;
}

export function ModuleDisabledPage({
  moduleName,
  description,
}: ModuleDisabledPageProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const currentUser = useSessionStore((state) => state.currentUser);
  const fallbackPath = getDefaultRouteForRole(currentUser?.role);
  const canManageConfig = currentUser?.role === 'ADMIN';

  return (
    <div className="grid min-h-[70vh] place-items-center">
      <Card className="max-w-2xl overflow-hidden">
        <div className="panel-top-glow-warning absolute inset-x-0 top-0 h-28" />
        <div className="relative">
          <div
            className="panel-icon-shell inline-flex h-16 w-16 items-center justify-center rounded-3xl"
            data-tone="warning"
          >
            <PowerOff size={28} />
          </div>

          <p className="mt-6 text-xs uppercase tracking-[0.28em] theme-text-faint">
            Business Config
          </p>
          <h1 className="font-display mt-3 text-4xl font-bold theme-text-strong">
            Modulo desactivado
          </h1>
          <p className="mt-3 max-w-xl text-sm theme-text-secondary">
            {description ??
              `El modulo ${moduleName} no esta activo en la configuracion actual del negocio.`}
          </p>

          <div className="mt-6 data-list-card rounded-3xl p-5 text-sm theme-text-secondary">
            <p>
              Modulo: <span className="font-medium theme-text-strong">{moduleName}</span>
            </p>
            <p className="mt-2">
              Ruta solicitada:{' '}
              <span className="font-medium theme-text-strong">{location.pathname}</span>
            </p>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Button onClick={() => navigate(fallbackPath)}>
              Ir a una vista permitida
            </Button>
            {canManageConfig ? (
              <Button variant="secondary" onClick={() => navigate('/admin/config')}>
                Abrir configuracion
              </Button>
            ) : null}
            <Button variant="ghost" onClick={() => navigate(-1)}>
              Volver
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
