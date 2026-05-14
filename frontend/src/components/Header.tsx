import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { LogOut, MapPin, UserRound } from 'lucide-react';
import { ThemeSelector } from '@/components/ThemeSelector';
import { useLogout } from '@/hooks/useLogout';
import { useAppStore } from '@/store/appStore';
import { useSessionStore } from '@/store/sessionStore';
import type { Location } from '@/types/api';
import { formatUserRole } from '@/utils/copy';
import registryMark from '@/assets/branding/registry-pos-mark.png';

const SESSION_MENU_WIDTH = 272;
const LOCATION_MENU_WIDTH = 292;
const COMMAND_MENU_GAP = 8;
const VIEWPORT_GUTTER = 12;

interface CommandMenuPosition {
  top: number;
  left: number;
  width: number;
}

function getAnchoredMenuPosition(
  trigger: HTMLElement | null,
  preferredWidth: number,
): CommandMenuPosition | null {
  if (!trigger) return null;

  const rect = trigger.getBoundingClientRect();
  const maxWidth = Math.max(180, window.innerWidth - VIEWPORT_GUTTER * 2);
  const width = Math.min(preferredWidth, maxWidth);
  const left = Math.min(
    Math.max(VIEWPORT_GUTTER, rect.right - width),
    window.innerWidth - width - VIEWPORT_GUTTER,
  );

  return {
    top: rect.bottom + COMMAND_MENU_GAP,
    left,
    width,
  };
}

export function Header() {
  const logout = useLogout();
  const currentUser = useSessionStore((state) => state.currentUser);
  const currentLocation = useAppStore((state) => state.currentLocation);
  const availableLocations = useAppStore((state) => state.availableLocations);
  const locationsLoading = useAppStore((state) => state.locationsLoading);
  const locationsError = useAppStore((state) => state.locationsError);
  const setCurrentLocation = useAppStore((state) => state.setCurrentLocation);
  const sessionRole = formatUserRole(currentUser?.role);
  const [isLocationMenuOpen, setIsLocationMenuOpen] = useState(false);
  const [locationMenuPosition, setLocationMenuPosition] = useState<CommandMenuPosition | null>(null);
  const [isSessionMenuOpen, setIsSessionMenuOpen] = useState(false);
  const [sessionMenuPosition, setSessionMenuPosition] = useState<CommandMenuPosition | null>(null);
  const locationMenuRef = useRef<HTMLDivElement>(null);
  const locationTriggerRef = useRef<HTMLButtonElement>(null);
  const locationPopoverRef = useRef<HTMLDivElement>(null);
  const selectedLocationOptionRef = useRef<HTMLButtonElement>(null);
  const sessionMenuRef = useRef<HTMLDivElement>(null);
  const sessionTriggerRef = useRef<HTMLButtonElement>(null);
  const sessionPopoverRef = useRef<HTMLDivElement>(null);
  const locationMenuId = useId();
  const sessionMenuId = useId();

  function updateLocationMenuPosition() {
    const position = getAnchoredMenuPosition(
      locationTriggerRef.current,
      LOCATION_MENU_WIDTH,
    );

    if (position) {
      setLocationMenuPosition(position);
    }
  }

  function updateSessionMenuPosition() {
    const position = getAnchoredMenuPosition(
      sessionTriggerRef.current,
      SESSION_MENU_WIDTH,
    );

    if (position) {
      setSessionMenuPosition(position);
    }
  }

  useEffect(() => {
    if (!isLocationMenuOpen) return;

    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node;

      if (
        !locationMenuRef.current?.contains(target) &&
        !locationPopoverRef.current?.contains(target)
      ) {
        setIsLocationMenuOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsLocationMenuOpen(false);
        locationTriggerRef.current?.focus();
      }
    }

    updateLocationMenuPosition();
    const focusFrame = window.requestAnimationFrame(() => {
      selectedLocationOptionRef.current?.focus();
    });

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', updateLocationMenuPosition);
    window.addEventListener('scroll', updateLocationMenuPosition, true);

    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', updateLocationMenuPosition);
      window.removeEventListener('scroll', updateLocationMenuPosition, true);
    };
  }, [isLocationMenuOpen]);

  useEffect(() => {
    if (!isSessionMenuOpen) return;

    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node;

      if (
        !sessionMenuRef.current?.contains(target) &&
        !sessionPopoverRef.current?.contains(target)
      ) {
        setIsSessionMenuOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsSessionMenuOpen(false);
        sessionTriggerRef.current?.focus();
      }
    }

    updateSessionMenuPosition();

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', updateSessionMenuPosition);
    window.addEventListener('scroll', updateSessionMenuPosition, true);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', updateSessionMenuPosition);
      window.removeEventListener('scroll', updateSessionMenuPosition, true);
    };
  }, [isSessionMenuOpen]);

  function handleLogout() {
    setIsSessionMenuOpen(false);
    logout();
  }

  function handleLocationSelect(location: Location) {
    setCurrentLocation(location);
    setIsLocationMenuOpen(false);
    locationTriggerRef.current?.focus();
  }

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
            </div>
          </div>

          <div className="app-header__operations" aria-label="Panel de comando operativo">
            <div className="app-header__operations-kicker">
              <span className="app-header__operations-dot" aria-hidden="true" />
              Comando operativo
            </div>
            <div className="app-header__controls" aria-label="Controles operativos">
              <ThemeSelector />

              <div className="app-header__control app-header__control--location app-header__control-card surface-subtle" ref={locationMenuRef}>
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
                    <button
                      ref={locationTriggerRef}
                      type="button"
                      aria-label="Punto de venta activo"
                      aria-haspopup="listbox"
                      aria-expanded={isLocationMenuOpen}
                      aria-controls={locationMenuId}
                      className="app-header__location-trigger"
                      onClick={() => {
                        updateLocationMenuPosition();
                        setIsSessionMenuOpen(false);
                        setIsLocationMenuOpen((isOpen) => !isOpen);
                      }}
                    >
                      <span className="app-header__location-trigger-value">
                        {currentLocation.name}
                      </span>
                      <span className="app-header__location-trigger-caret" aria-hidden="true" />
                    </button>
                  )}
                </div>
              </div>

              <div className="app-header__session-menu app-header__control-card" ref={sessionMenuRef}>
                <button
                  ref={sessionTriggerRef}
                  type="button"
                  className="app-header__control app-header__control--user app-header__session-trigger surface-subtle"
                  aria-haspopup="menu"
                  aria-expanded={isSessionMenuOpen}
                  aria-controls={sessionMenuId}
                  onClick={() => {
                    updateSessionMenuPosition();
                    setIsLocationMenuOpen(false);
                    setIsSessionMenuOpen((isOpen) => !isOpen);
                  }}
                >
                  <span className="app-header__control-icon" aria-hidden="true">
                    <UserRound size={16} />
                  </span>
                  <span className="app-header__control-copy app-header__control-copy--session">
                    <span className="app-header__control-label">
                      Sesion
                    </span>
                    <span className="app-header__session-value">
                      <span className="app-header__session-role">{sessionRole}</span>
                    </span>
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      {isLocationMenuOpen && locationMenuPosition && currentLocation
        ? createPortal(
            <div
              ref={locationPopoverRef}
              id={locationMenuId}
              role="listbox"
              aria-label="Seleccionar punto de venta"
              className="app-header__location-popover"
              style={locationMenuPosition}
            >
              {availableLocations.map((item) => {
                const isSelected = item.id === currentLocation.id;

                return (
                  <button
                    key={item.id}
                    ref={isSelected ? selectedLocationOptionRef : undefined}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    className="app-header__location-option"
                    data-selected={isSelected ? 'true' : undefined}
                    onClick={() => handleLocationSelect(item)}
                  >
                    <span className="app-header__location-option-indicator" aria-hidden="true" />
                    <span className="app-header__location-option-label">{item.name}</span>
                  </button>
                );
              })}
            </div>,
            document.body,
          )
        : null}
      {isSessionMenuOpen && sessionMenuPosition
        ? createPortal(
            <div
              ref={sessionPopoverRef}
              id={sessionMenuId}
              role="menu"
              className="app-header__session-popover"
              style={sessionMenuPosition}
            >
              <div className="app-header__session-popover-info" aria-hidden="true">
                <span className="app-header__session-popover-label">Sesion activa</span>
                <span className="app-header__session-popover-value">{sessionRole}</span>
              </div>
              <button
                type="button"
                role="menuitem"
                className="app-header__logout-action"
                onClick={handleLogout}
              >
                <LogOut size={15} aria-hidden="true" />
                <span>Cerrar sesión</span>
              </button>
            </div>,
            document.body,
          )
        : null}
    </header>
  );
}
