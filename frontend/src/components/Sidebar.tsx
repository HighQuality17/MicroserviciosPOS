import { useEffect, useRef } from 'react';
import { LogOut, X } from 'lucide-react';
import clsx from 'clsx';
import { NavLink, useLocation } from 'react-router-dom';
import { Button } from '@/components/Button';
import { getAdminSubnavigationByRole, getNavigationByRole } from '@/app/permissions';
import { useBusinessModules } from '@/hooks/useBusinessModules';
import { useLogout } from '@/hooks/useLogout';
import { useSessionStore } from '@/store/sessionStore';
import registryLogo from '@/assets/branding/registry-pos-logo.png';
import registryMark from '@/assets/branding/registry-pos-mark.png';

interface SidebarProps {
  variant?: 'desktop' | 'mobile';
  isOpen?: boolean;
  isCollapsed?: boolean;
  navigationId?: string;
  onClose?: () => void;
}

export function Sidebar({
  variant = 'desktop',
  isOpen = false,
  isCollapsed = false,
  navigationId,
  onClose,
}: SidebarProps) {
  const { pathname } = useLocation();
  const currentUser = useSessionStore((state) => state.currentUser);
  const logout = useLogout();
  const { isModuleEnabled } = useBusinessModules();
  const links = getNavigationByRole(currentUser?.role).filter((link) => {
    if (link.to === '/ingredients') {
      return isModuleEnabled('ingredients');
    }

    if (link.to === '/combos') {
      return isModuleEnabled('combos');
    }

    return true;
  });
  const adminSubLinks = getAdminSubnavigationByRole(currentUser?.role);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const isMobile = variant === 'mobile';
  const isDesktopCollapsed = !isMobile && isCollapsed;
  const canShowSubnav = !isDesktopCollapsed && adminSubLinks.length > 0;
  const isAdminRoute = pathname === '/admin' || pathname.startsWith('/admin/');

  useEffect(() => {
    if (isMobile && isOpen) {
      closeButtonRef.current?.focus();
    }
  }, [isMobile, isOpen]);

  if (isMobile && !isOpen) {
    return null;
  }

  return (
    <aside
      id={navigationId}
      className={clsx(
        'app-sidebar-shell glass-panel-strong min-w-0 overflow-hidden px-4 py-5 transition-[padding] duration-300 lg:min-h-screen',
        isMobile
          ? 'fixed inset-y-0 left-0 z-40 flex w-[min(88vw,320px)] max-w-full flex-col shadow-[0_24px_64px_rgba(2,6,23,0.32)] lg:hidden'
          : clsx(
              'hidden lg:flex lg:flex-col lg:py-6',
              isDesktopCollapsed ? 'lg:px-3' : 'lg:px-6',
            ),
      )}
      data-collapsed={isDesktopCollapsed || undefined}
      data-variant={isMobile ? 'mobile' : 'desktop'}
      aria-label="Navegacion principal"
    >
      <div
        className={clsx(
          'app-sidebar__brand-shell flex items-center gap-3',
          isDesktopCollapsed ? 'justify-center px-1' : 'justify-between px-3',
        )}
      >
        <div
          className={clsx(
            'app-sidebar__brand flex min-w-0 items-center',
            isDesktopCollapsed && 'justify-center',
          )}
        >
          <span
            className={clsx(
              'app-sidebar__brand-logo-panel',
              isDesktopCollapsed
                ? 'app-sidebar__brand-logo-panel--mark'
                : 'app-sidebar__brand-logo-panel--full',
            )}
          >
            <img
              src={isDesktopCollapsed ? registryMark : registryLogo}
              alt="Registry POS"
              className={clsx(
                'app-sidebar__brand-logo',
                isDesktopCollapsed
                  ? 'app-sidebar__brand-logo--mark'
                  : 'app-sidebar__brand-logo--full',
              )}
              draggable={false}
            />
          </span>
        </div>

        {isMobile ? (
          <Button
            ref={closeButtonRef}
            type="button"
            variant="ghost"
            className="app-sidebar__close shrink-0"
            aria-label="Cerrar menu de navegacion"
            onClick={onClose}
          >
            <X size={18} aria-hidden="true" />
          </Button>
        ) : null}
      </div>

      <nav
        className={clsx(
          'app-sidebar__nav mt-6 grid gap-2 overflow-y-auto px-1',
          isDesktopCollapsed && 'justify-items-center px-0',
        )}
        aria-label="Secciones del sistema"
      >
        {links.map(({ to, label, icon: Icon }) => {
          const isAdminLink = to === '/admin';

          return (
            <div
              key={to}
              className={clsx(
                'app-sidebar__nav-group',
                isDesktopCollapsed && 'app-sidebar__nav-group--collapsed',
              )}
            >
              <NavLink
                to={to}
                onClick={onClose}
                aria-label={isDesktopCollapsed ? label : undefined}
                title={isDesktopCollapsed ? label : undefined}
                aria-expanded={isAdminLink && canShowSubnav ? isAdminRoute : undefined}
                className={({ isActive }) =>
                  clsx(
                    'app-nav-link app-sidebar__nav-link flex min-h-11 items-center rounded-2xl py-3 text-sm font-medium transition',
                    isDesktopCollapsed ? 'w-[3.25rem] justify-center px-3' : 'gap-3 px-4',
                    (isActive || (isAdminLink && isAdminRoute)) && 'app-nav-link-active',
                  )
                }
              >
                <span className="app-nav-link__icon shrink-0" aria-hidden="true">
                  <Icon size={18} />
                </span>
                <span
                  aria-hidden={isDesktopCollapsed}
                  className={clsx(
                    'app-nav-link__label overflow-hidden whitespace-nowrap transition-all duration-300',
                    isDesktopCollapsed ? 'max-w-0 opacity-0' : 'max-w-[12rem] opacity-100',
                  )}
                >
                  {label}
                </span>
              </NavLink>

              {isAdminLink && canShowSubnav ? (
                <div className="app-sidebar__subnav" role="group" aria-label="Submodulos Admin">
                  {adminSubLinks.map(({ to: childTo, label: childLabel, icon: ChildIcon }) => (
                    <NavLink
                      key={childTo}
                      to={childTo}
                      end={childTo === '/admin'}
                      onClick={onClose}
                      className={({ isActive }) =>
                        clsx(
                          'app-sidebar__subnav-link',
                          isActive && 'app-sidebar__subnav-link--active',
                        )
                      }
                    >
                      <span className="app-sidebar__subnav-icon" aria-hidden="true">
                        <ChildIcon size={14} />
                      </span>
                      <span className="app-sidebar__subnav-label">{childLabel}</span>
                    </NavLink>
                  ))}
                </div>
              ) : null}
            </div>
          );
        })}
      </nav>

      <div className="app-sidebar__footer mt-6 border-t border-[color:var(--line)] pt-6 lg:mt-auto">
        <Button
          variant="secondary"
          aria-label={isDesktopCollapsed ? 'Salir' : undefined}
          title={isDesktopCollapsed ? 'Salir' : undefined}
          className={clsx(
            'app-sidebar__logout w-full justify-center overflow-hidden transition-all duration-300',
            isDesktopCollapsed ? 'px-3' : 'px-4',
          )}
          onClick={() => {
            onClose?.();
            logout();
          }}
        >
          <LogOut size={16} aria-hidden="true" />
          <span
            aria-hidden={isDesktopCollapsed}
            className={clsx(
              'overflow-hidden whitespace-nowrap transition-all duration-300',
              isDesktopCollapsed ? 'max-w-0 opacity-0' : 'max-w-[8rem] opacity-100',
            )}
          >
            Salir
          </span>
        </Button>
      </div>
    </aside>
  );
}
