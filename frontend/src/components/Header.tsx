import clsx from 'clsx';
import { MapPin } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { ThemeSelector } from '@/components/ThemeSelector';
import { useAppStore } from '@/store/appStore';
import { useSessionStore } from '@/store/sessionStore';
import { formatUserRole } from '@/utils/copy';

interface HeaderProps {
  compactForPosMobile?: boolean;
}

export function Header({ compactForPosMobile = false }: HeaderProps) {
  const { pathname } = useLocation();
  const isProductsRoute = pathname.startsWith('/products');
  const currentUser = useSessionStore((state) => state.currentUser);
  const currentLocation = useAppStore((state) => state.currentLocation);
  const availableLocations = useAppStore((state) => state.availableLocations);
  const locationsLoading = useAppStore((state) => state.locationsLoading);
  const locationsError = useAppStore((state) => state.locationsError);
  const setCurrentLocation = useAppStore((state) => state.setCurrentLocation);

  return (
    <header
      className={clsx(
        'glass-panel app-header rounded-[1.75rem] p-4 sm:rounded-[2rem] sm:p-5 lg:p-6',
        compactForPosMobile && 'app-header--pos-compact',
        isProductsRoute && 'app-header--products-admin',
      )}
    >
      <div className="app-header__body flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="app-header__identity min-w-0">
          <p className="app-header__eyebrow text-xs uppercase tracking-[0.32em] text-[color:var(--text-faint)]">
            Operacion comercial conectada
          </p>
          <h1 className="app-header__title font-display text-2xl font-bold text-[color:var(--text)] sm:text-3xl">
            Registry POS
          </h1>
        </div>

        <div className="app-header__controls flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
          <div className="app-header__control app-header__control--theme min-w-0">
            <ThemeSelector />
          </div>

          <div className="app-header__control app-header__control--location surface-subtle flex w-full min-w-0 items-center gap-2 rounded-2xl px-4 py-3 text-sm text-[color:var(--text-secondary)] sm:w-auto sm:max-w-full">
            <MapPin size={16} className="theme-accent-icon shrink-0" />
            <div className="min-w-0 flex-1">
              {locationsLoading ? (
                <span>Cargando puntos de venta...</span>
              ) : availableLocations.length === 0 || !currentLocation ? (
                <span className="text-[color:var(--warning)]">
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
                  className="surface-inline-select w-full min-w-0 rounded-xl text-sm sm:min-w-[12rem]"
                >
                  {availableLocations.map((item) => (
                    <option key={item.id} value={String(item.id)}>
                      {item.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          <div className="app-header__control app-header__control--user surface-subtle w-full rounded-2xl px-4 py-3 text-sm text-[color:var(--text-secondary)] sm:w-auto">
            <span className="block truncate text-[color:var(--text)]">
              {currentUser?.name} / {formatUserRole(currentUser?.role)}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
