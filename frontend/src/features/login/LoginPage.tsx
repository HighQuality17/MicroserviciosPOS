import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { getDefaultRouteForRole } from '@/app/permissions';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Input } from '@/components/Input';
import { useSessionStore } from '@/store/sessionStore';

export function LoginPage() {
  const navigate = useNavigate();
  const currentUser = useSessionStore((state) => state.currentUser);
  const isReady = useSessionStore((state) => state.isReady);
  const isAuthenticating = useSessionStore((state) => state.isAuthenticating);
  const login = useSessionStore((state) => state.login);
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (currentUser) {
      navigate(getDefaultRouteForRole(currentUser.role), { replace: true });
    }
  }, [currentUser, navigate]);

  if (isReady && currentUser) {
    return <Navigate to={getDefaultRouteForRole(currentUser.role)} replace />;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const normalizedIdentifier = identifier.trim();
    if (!normalizedIdentifier || !password.trim()) {
      setError('Ingresa tu usuario y contraseña.');
      return;
    }

    try {
      await login({
        username: normalizedIdentifier.includes('@') ? undefined : normalizedIdentifier,
        email: normalizedIdentifier.includes('@') ? normalizedIdentifier : undefined,
        password,
      });
    } catch (loginError) {
      setError(
        loginError instanceof Error
          ? normalizeLoginError(loginError.message)
          : 'No fue posible iniciar sesión.',
      );
    }
  }

  return (
    <main
      className="flex min-h-screen items-center justify-center px-4 py-6 sm:px-6 sm:py-10"
      aria-labelledby="login-title"
    >
      <div className="grid w-full max-w-6xl items-start gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:gap-6">
        <section
          aria-labelledby="login-title"
          className="glass-panel-strong rounded-[1.75rem] p-6 sm:rounded-[2rem] sm:p-8 lg:p-10 xl:p-12"
        >
          <p className="text-xs uppercase tracking-[0.35em] text-teal-300/70">
            POS local offline-first
          </p>
          <h1 id="login-title" className="font-display mt-5 text-3xl font-bold text-white sm:text-4xl xl:text-5xl">
            Opera ventas, caja e inventario desde una sola superficie.
          </h1>
          <p className="mt-6 max-w-2xl text-base text-slate-300 sm:text-lg">
            Interfaz pensada para escritorio con flujo de venta rápido, control de caja
            y una base lista para crecer hacia administración avanzada y Electron.
          </p>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {[
              'Cobro con cambio automático',
              'Caja por ubicación',
              'Combos y recetas listos para escalar',
            ].map((item) => (
              <div
                key={item}
                className="rounded-3xl border border-slate-800 bg-slate-950/40 p-4 text-sm text-slate-300"
              >
                {item}
              </div>
            ))}
          </div>
        </section>

        <Card className="self-center p-6 sm:p-8">
          <div className="mb-8 flex items-center gap-3">
            <div className="rounded-2xl bg-teal-400/20 p-3 text-teal-300">
              <ShieldCheck size={22} />
            </div>
            <div>
              <h2 className="font-display text-2xl font-bold text-white">Ingreso seguro</h2>
              <p className="text-sm text-slate-400">
                Accede con tu usuario real del backend local.
              </p>
            </div>
          </div>

          <form className="grid gap-4" onSubmit={handleSubmit}>
            <Input
              label="Usuario o correo"
              value={identifier}
              onChange={(event) => setIdentifier(event.target.value)}
              placeholder="Ej: admin o admin@local.pos"
              autoComplete="username"
            />

            <Input
              label="Contraseña"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Tu contraseña"
              autoComplete="current-password"
            />

            {error ? (
              <p
                role="alert"
                className="rounded-2xl border border-rose-400/30 bg-rose-400/10 px-4 py-3 text-sm text-rose-100"
              >
                {error}
              </p>
            ) : null}

            <p className="text-xs text-slate-500">
              Usuarios iniciales: <span className="text-slate-300">admin</span>,
              <span className="ml-1 text-slate-300">cashier</span>,
              <span className="ml-1 text-slate-300">auditor</span>.
            </p>

            <Button type="submit" className="mt-2 w-full sm:w-auto" disabled={isAuthenticating}>
              {isAuthenticating ? 'Ingresando...' : 'Entrar al sistema'}
            </Button>
          </form>
        </Card>
      </div>
    </main>
  );
}

function normalizeLoginError(message: string) {
  const normalizedMessage = message.toLowerCase();

  if (normalizedMessage.includes('credenciales')) {
    return 'Usuario o contraseña incorrectos.';
  }

  if (normalizedMessage.includes('email o username')) {
    return 'Ingresa un usuario o correo válido.';
  }

  return message;
}