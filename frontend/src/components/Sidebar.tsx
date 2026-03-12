import { ChefHat, LogOut } from 'lucide-react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Button } from '@/components/Button';
import { getNavigationByRole } from '@/app/permissions';
import { useSessionStore } from '@/store/sessionStore';

export function Sidebar() {
  const navigate = useNavigate();
  const currentUser = useSessionStore((state) => state.currentUser);
  const clearSession = useSessionStore((state) => state.clearSession);
  const links = getNavigationByRole(currentUser?.role);

  return (
    <aside className="border-b border-slate-800/70 bg-slate-950/70 px-4 py-6 lg:flex lg:min-h-screen lg:flex-col lg:border-b-0 lg:border-r lg:px-6">
      <div className="flex items-center gap-3 px-3">
        <div className="rounded-3xl bg-gradient-to-br from-teal-300 to-sky-400 p-3 text-slate-950">
          <ChefHat size={22} />
        </div>
        <div>
          <p className="font-display text-lg font-bold text-white">Caja local</p>
          <p className="text-xs text-slate-500">offline-first</p>
        </div>
      </div>

      <nav className="mt-8 grid gap-2">
        {links.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              [
                'flex items-center gap-3 rounded-2xl px-4 py-3 text-sm transition',
                isActive
                  ? 'bg-teal-300 text-slate-950'
                  : 'text-slate-300 hover:bg-slate-900/80 hover:text-white',
              ].join(' ')
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="mt-8 lg:mt-auto">
        <Button
          variant="secondary"
          className="w-full justify-center"
          onClick={() => {
            clearSession();
            navigate('/login');
          }}
        >
          <LogOut size={16} className="mr-2" />
          Salir
        </Button>
      </div>
    </aside>
  );
}

