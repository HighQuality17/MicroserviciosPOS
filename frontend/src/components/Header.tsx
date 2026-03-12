import { LogOut, MapPin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/Button';
import { useAppStore } from '@/store/appStore';
import { useSessionStore } from '@/store/sessionStore';

export function Header() {
  const navigate = useNavigate();
  const currentUser = useSessionStore((state) => state.currentUser);
  const clearSession = useSessionStore((state) => state.clearSession);
  const location = useAppStore((state) => state.currentLocation);

  return (
    <header className="glass-panel flex flex-col gap-4 rounded-[2rem] p-5 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Sprint 3 Frontend MVP</p>
        <h1 className="font-display text-3xl font-bold text-white">Microservicios POS</h1>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 rounded-2xl border border-slate-700 bg-slate-950/60 px-4 py-3 text-sm text-slate-300">
          <MapPin size={16} className="text-teal-300" />
          {location.name}
        </div>
        <div className="rounded-2xl border border-slate-700 bg-slate-950/60 px-4 py-3 text-sm text-slate-300">
          {currentUser?.name} · {currentUser?.role}
        </div>
        <Button
          variant="secondary"
          onClick={() => {
            clearSession();
            navigate('/login');
          }}
        >
          <LogOut size={16} className="mr-2" />
          Salir
        </Button>
      </div>
    </header>
  );
}
