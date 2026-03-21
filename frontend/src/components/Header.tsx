import { Menu, MapPin } from 'lucide-react';
import { Button } from '@/components/Button';
import { useAppStore } from '@/store/appStore';
import { useSessionStore } from '@/store/sessionStore';
import { formatUserRole } from '@/utils/copy';

interface HeaderProps {
  navigationId: string;
  isNavigationOpen: boolean;
  onOpenNavigation: () => void;
}

export function Header({
  navigationId,
  isNavigationOpen,
  onOpenNavigation,
}: HeaderProps) {
  const currentUser = useSessionStore((state) => state.currentUser);
  const currentLocation = useAppStore((state) => state.currentLocation);
  const availableLocations = useAppStore((state) => state.availableLocations);
  const locationsLoading = useAppStore((state) => state.locationsLoading);
  const locationsError = useAppStore((state) => state.locationsError);
  const setCurrentLocation = useAppStore((state) => state.setCurrentLocation);

  return (
    <header className="glass-panel rounded-[1.75rem] p-4 sm:rounded-[2rem] sm:p-5 lg:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-3">
          <Button
            type="button"
            variant="secondary"
            className="shrink-0 lg:hidden"
            aria-label="Abrir menu de navegacion"
            aria-controls={navigationId}
            aria-expanded={isNavigationOpen}
            onClick={onOpenNavigation}
          >
            <Menu size={18} />
            <span>Menu</span>
          </Button>
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[0.32em] text-[color:var(--text-faint)]">
              Operación comercial conectada
            </p>
            <h1 className="font-display text-2xl font-bold text-white sm:text-3xl">
              Registry POS
            </h1>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
          <div className="surface-subtle flex w-full min-w-0 items-center gap-2 rounded-2xl px-4 py-3 text-sm text-[color:var(--text-secondary)] sm:w-auto sm:max-w-full">
            <MapPin size={16} className="shrink-0 text-violet-200" />
            <div className="min-w-0 flex-1">
              {locationsLoading ? (
                <span>Cargando puntos de venta...</span>
              ) : availableLocations.length === 0 || !currentLocation ? (
                <span className="text-amber-100">
                  {locationsError ? 'Sin POS disponibles' : 'Sin ubicaciones creadas'}
                </span>
              ) : availableLocations.length <= 1 ? (
                <span className="block truncate text-[color:var(--text)]">{currentLocation.name}</span>
              ) : (
                <select
                  aria-label="Punto de venta activo"
                  value={String(currentLocation.id)}
                  onChange={(event) => {
                    const nextLocation = availableLocations.find(
                      (item) => item.id === Number(event.target.value),
                    );
                    if (nextLocation) {
                      setCurrentLocation(nextLocation);
                    }
                  }}
                  className="w-full min-w-0 rounded-xl bg-transparent text-sm text-[color:var(--text)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[#090b16] sm:min-w-[12rem]"
                >
                  {availableLocations.map((item) => (
                    <option
                      key={item.id}
                      value={String(item.id)}
                      className="bg-[#0d1020] text-[color:var(--text)]"
                    >
                      {item.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          <div className="surface-subtle w-full rounded-2xl px-4 py-3 text-sm text-[color:var(--text-secondary)] sm:w-auto">
            <span className="block truncate text-[color:var(--text)]">
              {currentUser?.name} / {formatUserRole(currentUser?.role)}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}