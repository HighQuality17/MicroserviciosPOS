import { useEffect, useRef } from 'react';
import { Layers3, LogOut, X } from 'lucide-react';
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
        'glass-panel-strong min-w-0 px-4 py-5 lg:min-h-screen lg:px-6 lg:py-6',
        isMobile
          ? 'fixed inset-y-0 left-0 z-40 flex w-[min(88vw,320px)] max-w-full flex-col shadow-[0_30px_100px_rgba(0,0,0,0.55)] lg:hidden'
          : 'hidden lg:flex lg:flex-col',
      )}
      aria-label="Navegacion principal"
    >
      <div className="flex items-center justify-between gap-3 px-3">
        <div className="flex items-center gap-3">
          <div className="rounded-3xl bg-gradient-to-br from-indigo-400 via-violet-500 to-fuchsia-500 p-3 text-white shadow-[0_16px_36px_rgba(99,102,241,0.35)]">
            <Layers3 size={22} />
          </div>
          <div>
            <p className="font-display text-lg font-bold text-white">Registry POS</p>
            <p className="text-xs text-[color:var(--text-faint)]">Operación centralizada</p>
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
                'flex min-h-11 items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition',
                isActive
                  ? 'bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500 text-white shadow-[0_16px_34px_rgba(99,102,241,0.28)]'
                  : 'text-[color:var(--text-secondary)] hover:bg-white/[0.05] hover:text-white',
              ].join(' ')
            }
          >
            <Icon size={18} className="shrink-0" />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="mt-6 border-t border-[color:var(--line)] pt-6 lg:mt-auto">
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