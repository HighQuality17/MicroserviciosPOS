import { MapPin, UserRound } from 'lucide-react';
import { ThemeSelector } from '@/components/ThemeSelector';
import { useAppStore } from '@/store/appStore';
import { useSessionStore } from '@/store/sessionStore';
import { formatUserRole } from '@/utils/copy';
import registryMark from '@/assets/branding/registry-pos-mark.png';

export function Header() {
  const currentUser = useSessionStore((state) => state.currentUser);
  const currentLocation = useAppStore((state) => state.currentLocation);
  const availableLocations = useAppStore((state) => state.availableLocations);
  const locationsLoading = useAppStore((state) => state.locationsLoading);
  const locationsError = useAppStore((state) => state.locationsError);
  const setCurrentLocation = useAppStore((state) => state.setCurrentLocation);
  const sessionName = currentUser?.name || 'Sin usuario';
  const sessionRole = formatUserRole(currentUser?.role);

  return (
    <header
      className="glass-panel app-header"
      aria-label="Barra superior del sistema"
    >
      <div className="app-header__command-surface">
        <div className="app-header__body">
          <div className="app-header__identity">
            <span className="app-header__brand-mark" aria-hidden="true">
              <img
                src={registryMark}
                alt=""
                className="app-header__brand-mark-image"
                draggable={false}
              />
            </span>
            <div className="app-header__identity-copy min-w-0">
              <p className="app-header__eyebrow">
                Operacion comercial conectada
              </p>
              <div className="app-header__title-row">
                <h1 className="app-header__title font-display">Registry POS</h1>
                <span className="app-header__identity-status" aria-label="Sistema activo">
                  <span className="app-header__status-dot" aria-hidden="true" />
                  Sistema activo
                </span>
              </div>
              <p className="app-header__subtitle">
                Centro de comando para ventas, caja e inventario
              </p>
            </div>
          </div>

          <div className="app-header__operations" aria-label="Panel de comando operativo">
            <div className="app-header__operations-kicker">
              <span className="app-header__operations-dot" aria-hidden="true" />
              Comando operativo
            </div>
            <div className="app-header__controls" aria-label="Controles operativos">
              <ThemeSelector />

              <div className="app-header__control app-header__control--location app-header__control-card surface-subtle">
                <span className="app-header__control-icon" aria-hidden="true">
                  <MapPin size={16} />
                </span>
                <div className="app-header__control-copy">
                  <p className="app-header__control-label">
                    Punto de venta
                  </p>
                  {locationsLoading ? (
                    <span className="app-header__control-value app-header__control-value--status">
                      Cargando puntos de venta...
                    </span>
                  ) : availableLocations.length === 0 || !currentLocation ? (
                    <span className="app-header__control-value app-header__control-value--status app-header__control-value--warning">
                      {locationsError ? 'Sin POS disponibles' : 'Sin ubicaciones creadas'}
                    </span>
                  ) : availableLocations.length <= 1 ? (
                    <span className="app-header__control-value app-header__location-value">
                      {currentLocation.name}
                    </span>
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
                      className="surface-inline-select app-header__location-select"
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

              <div className="app-header__control app-header__control--user app-header__control-card surface-subtle">
                <span className="app-header__control-icon" aria-hidden="true">
                  <UserRound size={16} />
                </span>
                <div className="app-header__control-copy app-header__control-copy--session">
                  <p className="app-header__control-label">
                    Sesion
                  </p>
                  <span className="app-header__session-value">
                    <span className="app-header__session-role">{sessionRole}</span>
                    <span className="app-header__role-pill">
                      {sessionName}
                    </span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
