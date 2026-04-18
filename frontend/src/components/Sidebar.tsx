import { useEffect, useRef } from 'react';
import { Layers3, LogOut, X } from 'lucide-react';
import clsx from 'clsx';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/Button';
import { getNavigationByRole } from '@/app/permissions';
import { useBusinessModules } from '@/hooks/useBusinessModules';
import { useSessionStore } from '@/store/sessionStore';

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
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const isProductsRoute = pathname.startsWith('/products');
  const currentUser = useSessionStore((state) => state.currentUser);
  const clearSession = useSessionStore((state) => state.clearSession);
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
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const isMobile = variant === 'mobile';
  const isDesktopCollapsed = !isMobile && isCollapsed;

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
        'glass-panel-strong min-w-0 overflow-hidden px-4 py-5 transition-[padding] duration-300 lg:min-h-screen',
        isProductsRoute && 'app-sidebar--products-admin',
        isMobile
          ? 'fixed inset-y-0 left-0 z-40 flex w-[min(88vw,320px)] max-w-full flex-col shadow-[0_30px_100px_rgba(0,0,0,0.55)] lg:hidden'
          : clsx(
              'hidden lg:flex lg:flex-col lg:py-6',
              isDesktopCollapsed ? 'lg:px-3' : 'lg:px-6',
            ),
      )}
      aria-label="Navegacion principal"
    >
      <div
        className={clsx(
          'flex items-center gap-3',
          isDesktopCollapsed ? 'justify-center px-1' : 'justify-between px-3',
        )}
      >
        <div className={clsx('flex min-w-0 items-center gap-3', isDesktopCollapsed && 'justify-center')}>
          <div className="app-brand-badge rounded-3xl p-3 text-white">
            <Layers3 size={22} />
          </div>
          <div
            aria-hidden={isDesktopCollapsed}
            className={clsx(
              'min-w-0 overflow-hidden whitespace-nowrap transition-all duration-300',
              isDesktopCollapsed ? 'max-w-0 opacity-0' : 'max-w-[12rem] opacity-100',
            )}
          >
            <p className="font-display text-lg font-bold text-[color:var(--text)]">Registry POS</p>
            <p className="text-xs text-[color:var(--text-faint)]">Operacion centralizada</p>
          </div>
        </div>

        {isMobile ? (
          <Button
            ref={closeButtonRef}
            type="button"
            variant="ghost"
            className="shrink-0"
            aria-label="Cerrar menu de navegacion"
            onClick={onClose}
          >
            <X size={18} />
          </Button>
        ) : null}
      </div>

      <nav
        className={clsx(
          'mt-6 grid gap-2 overflow-y-auto px-1',
          isDesktopCollapsed && 'justify-items-center px-0',
        )}
        aria-label="Secciones del sistema"
      >
        {links.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onClose}
            aria-label={isDesktopCollapsed ? label : undefined}
            title={isDesktopCollapsed ? label : undefined}
            className={({ isActive }) =>
              clsx(
                'app-nav-link flex min-h-11 items-center rounded-2xl py-3 text-sm font-medium transition',
                isDesktopCollapsed ? 'w-[3.25rem] justify-center px-3' : 'gap-3 px-4',
                isActive && 'app-nav-link-active',
              )
            }
          >
            <Icon size={18} className="shrink-0" />
            <span
              aria-hidden={isDesktopCollapsed}
              className={clsx(
                'overflow-hidden whitespace-nowrap transition-all duration-300',
                isDesktopCollapsed ? 'max-w-0 opacity-0' : 'max-w-[12rem] opacity-100',
              )}
            >
              {label}
            </span>
          </NavLink>
        ))}
      </nav>

      <div className="mt-6 border-t border-[color:var(--line)] pt-6 lg:mt-auto">
        <Button
          variant="secondary"
          aria-label={isDesktopCollapsed ? 'Salir' : undefined}
          title={isDesktopCollapsed ? 'Salir' : undefined}
          className={clsx(
            'w-full justify-center overflow-hidden transition-all duration-300',
            isDesktopCollapsed ? 'px-3' : 'px-4',
          )}
          onClick={() => {
            onClose?.();
            clearSession();
            navigate('/login');
          }}
        >
          <LogOut size={16} />
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
