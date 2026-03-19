import { useEffect, useRef } from 'react';
import { ChefHat, LogOut, X } from 'lucide-react';
import clsx from 'clsx';
import { NavLink, useNavigate } from 'react-router-dom';
import { Button } from '@/components/Button';
import { getNavigationByRole } from '@/app/permissions';
import { useSessionStore } from '@/store/sessionStore';

interface SidebarProps {
  variant?: 'desktop' | 'mobile';
  isOpen?: boolean;
  navigationId?: string;
  onClose?: () => void;
}

export function Sidebar({
  variant = 'desktop',
  isOpen = false,
  navigationId,
  onClose,
}: SidebarProps) {
  const navigate = useNavigate();
  const currentUser = useSessionStore((state) => state.currentUser);
  const clearSession = useSessionStore((state) => state.clearSession);
  const links = getNavigationByRole(currentUser?.role);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const isMobile = variant === 'mobile';

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
        'min-w-0 border-slate-800/70 bg-slate-950/92 px-4 py-5 backdrop-blur lg:min-h-screen lg:border-r lg:bg-slate-950/70 lg:px-6 lg:py-6',
        isMobile
          ? 'fixed inset-y-0 left-0 z-40 flex w-[min(88vw,320px)] max-w-full flex-col border-r shadow-[0_24px_80px_rgba(0,0,0,0.45)] lg:hidden'
          : 'hidden lg:flex lg:flex-col',
      )}
      aria-label="Navegacion principal"
    >
      <div className="flex items-center justify-between gap-3 px-3">
        <div className="flex items-center gap-3">
          <div className="rounded-3xl bg-gradient-to-br from-teal-300 to-sky-400 p-3 text-slate-950">
            <ChefHat size={22} />
          </div>
          <div>
            <p className="font-display text-lg font-bold text-white">Caja local</p>
            <p className="text-xs text-slate-500">offline-first</p>
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

      <nav className="mt-6 grid gap-2 overflow-y-auto px-1" aria-label="Secciones del sistema">
        {links.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onClose}
            className={({ isActive }) =>
              [
                'flex min-h-11 items-center gap-3 rounded-2xl px-4 py-3 text-sm transition',
                isActive
                  ? 'bg-teal-300 text-slate-950'
                  : 'text-slate-300 hover:bg-slate-900/80 hover:text-white',
              ].join(' ')
            }
          >
            <Icon size={18} className="shrink-0" />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="mt-6 border-t border-slate-800/80 pt-6 lg:mt-auto">
        <Button
          variant="secondary"
          className="w-full justify-center"
          onClick={() => {
            onClose?.();
            clearSession();
            navigate('/login');
          }}
        >
          <LogOut size={16} />
          Salir
        </Button>
      </div>
    </aside>
  );
}