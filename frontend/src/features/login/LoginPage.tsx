import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Input } from '@/components/Input';
import { buildMockUser, useSessionStore } from '@/store/sessionStore';
import type { UserRole } from '@/types/api';

export function LoginPage() {
  const navigate = useNavigate();
  const setCurrentUser = useSessionStore((state) => state.setCurrentUser);
  const [name, setName] = useState('Cajero Principal');
  const [role, setRole] = useState<UserRole>('ADMIN');

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-8">
      <div className="grid w-full max-w-6xl gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="glass-panel-strong rounded-[2rem] p-8 lg:p-12">
          <p className="text-xs uppercase tracking-[0.35em] text-teal-300/70">
            Offline-first POS
          </p>
          <h1 className="font-display mt-5 text-5xl font-bold text-white">
            Opera caja, inventario y cobro desde una sola superficie.
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-slate-300">
            Frontend MVP para escritorio con flujo de venta rápido, resumen de caja
            y estructura lista para crecer hacia panel administrativo y Electron.
          </p>
          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {[
              'Cobro con cambio automático',
              'Caja por ubicación',
              'Combos y recetas listas para escalar',
            ].map((item) => (
              <div key={item} className="rounded-3xl border border-slate-800 bg-slate-950/40 p-4 text-sm text-slate-300">
                {item}
              </div>
            ))}
          </div>
        </section>

        <Card className="self-center p-8">
          <div className="mb-8 flex items-center gap-3">
            <div className="rounded-2xl bg-teal-400/20 p-3 text-teal-300">
              <ShieldCheck size={22} />
            </div>
            <div>
              <h2 className="font-display text-2xl font-bold text-white">Ingreso local</h2>
              <p className="text-sm text-slate-400">
                Mock temporal mientras llega autenticación real.
              </p>
            </div>
          </div>

          <div className="grid gap-4">
            <Input
              label="Nombre"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Nombre del cajero"
            />

            <label className="block space-y-2">
              <span className="text-sm font-medium text-slate-200">Rol</span>
              <select
                value={role}
                onChange={(event) => setRole(event.target.value as UserRole)}
                className="w-full rounded-2xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-sm text-slate-100 outline-none focus:border-teal-400/70"
              >
                <option value="ADMIN">ADMIN</option>
                <option value="CASHIER">CASHIER</option>
                <option value="AUDITOR">AUDITOR</option>
              </select>
            </label>

            <Button
              className="mt-2"
              onClick={() => {
                setCurrentUser(buildMockUser(name || 'Usuario local', role));
                navigate('/pos');
              }}
            >
              Entrar al POS
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
