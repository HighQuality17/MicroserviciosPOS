import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  BarChart3,
  Boxes,
  Eye,
  EyeOff,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react';
import { getDefaultRouteForRole } from '@/app/permissions';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { FeedbackMessage } from '@/components/FeedbackMessage';
import { Input } from '@/components/Input';
import { useSessionStore } from '@/store/sessionStore';

const benefits = [
  {
    icon: BarChart3,
    title: 'Visión operativa en tiempo real',
    description: 'Monitorea ventas, caja e indicadores clave desde una sola interfaz.',
  },
  {
    icon: Boxes,
    title: 'Inventario conectado',
    description: 'Controla productos, ingredientes y disponibilidad sin perder ritmo operativo.',
  },
  {
    icon: Users,
    title: 'Operación por roles',
    description: 'Asigna accesos claros para administración, caja y auditoría.',
  },
  {
    icon: ShieldCheck,
    title: 'Trazabilidad confiable',
    description: 'Cada movimiento queda respaldado para una operación más segura.',
  },
] as const;

const roles = ['Administrador', 'Cajero', 'Auditor'] as const;

const systemSignals = [
  'Control de ventas',
  'Gestión de inventario',
  'Operación por roles',
  'Visión del negocio en tiempo real',
] as const;

export function LoginPage() {
  const navigate = useNavigate();
  const currentUser = useSessionStore((state) => state.currentUser);
  const isReady = useSessionStore((state) => state.isReady);
  const isAuthenticating = useSessionStore((state) => state.isAuthenticating);
  const login = useSessionStore((state) => state.login);
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
    <main className="login-screen relative isolate min-h-screen overflow-hidden" aria-labelledby="login-title">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="login-ambient absolute inset-0" />
        <div className="absolute inset-0 login-grid opacity-40" />
        <div className="absolute -left-24 top-[-7rem] h-[24rem] w-[24rem] rounded-full bg-[radial-gradient(circle,rgb(var(--theme-primary-rgb)/0.28),transparent_68%)] blur-3xl" />
        <div className="absolute right-[-7rem] top-1/3 h-[26rem] w-[26rem] rounded-full bg-[radial-gradient(circle,rgb(var(--theme-secondary-rgb)/0.24),transparent_70%)] blur-3xl" />
        <div className="absolute bottom-[-9rem] left-1/3 h-[18rem] w-[18rem] rounded-full bg-[radial-gradient(circle,rgb(var(--theme-accent-rgb)/0.18),transparent_72%)] blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgb(var(--theme-primary-rgb)/0.12),transparent_32%),radial-gradient(circle_at_80%_18%,rgb(var(--theme-secondary-rgb)/0.1),transparent_24%)]" />
      </div>

      <div className="relative mx-auto flex min-h-screen w-full max-w-7xl items-center px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
        <div className="grid w-full gap-6 xl:grid-cols-[minmax(0,1.08fr)_440px] xl:items-center">
          <section className="login-shell relative overflow-hidden rounded-[2rem] p-6 backdrop-blur-2xl sm:p-8 lg:p-10 xl:min-h-[680px] xl:p-12">
            <div aria-hidden="true" className="login-hero-glow absolute inset-0" />

            <div className="relative flex h-full flex-col">
              <div className="flex flex-wrap items-center gap-3">
                <div className="login-accent-pill inline-flex items-center gap-2 rounded-full px-4 py-2 text-[0.68rem] font-semibold uppercase tracking-[0.32em]">
                  <Sparkles size={14} />
                  Registry POS
                </div>
                <div className="login-state-pill inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium">
                  <span className="h-2 w-2 rounded-full bg-[rgb(var(--theme-accent-rgb))] shadow-[0_0_14px_rgb(var(--theme-accent-rgb)/0.45)]" />
                  Operación lista para punto de venta
                </div>
              </div>

              <div className="mt-8 max-w-3xl">
                <p className="theme-text-secondary text-sm font-medium uppercase tracking-[0.28em]">
                  Plataforma POS moderna
                </p>
                <h1
                  id="login-title"
                  className="font-display theme-text-strong mt-4 text-4xl font-bold leading-tight sm:text-5xl xl:text-6xl"
                >
                  Opera tu negocio con una experiencia{' '}
                  <span className="login-highlight-text">
                    premium, rápida y confiable.
                  </span>
                </h1>
                <p className="theme-text-secondary mt-6 max-w-2xl text-base leading-7 sm:text-lg">
                  Registry POS centraliza ventas, inventario y control operativo en una pantalla de
                  acceso pensada para equipos que necesitan velocidad, orden y lectura clara del negocio.
                </p>
              </div>

              <ul className="mt-8 grid gap-4 sm:grid-cols-2" aria-label="Beneficios principales del sistema">
                {benefits.map((benefit) => {
                  const Icon = benefit.icon;

                  return (
                    <li
                      key={benefit.title}
                      className="login-benefit-card group surface-subtle rounded-[1.6rem] p-5 transition duration-300 hover:-translate-y-0.5"
                    >
                      <div className="flex items-start gap-4">
                        <div className="login-benefit-icon rounded-2xl p-3">
                          <Icon size={20} />
                        </div>
                        <div>
                          <h2 className="theme-text-strong text-base font-semibold">{benefit.title}</h2>
                          <p className="theme-text-secondary mt-2 text-sm leading-6">{benefit.description}</p>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>

              <div className="mt-8 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(260px,0.75fr)] xl:mt-auto">
                <div className="surface-subtle rounded-[1.75rem] p-5">
                  <p className="theme-text-secondary text-xs font-semibold uppercase tracking-[0.28em]">
                    Capacidades clave
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {systemSignals.map((signal) => (
                      <span
                        key={signal}
                        className="soft-pill rounded-full px-3 py-2 text-xs font-medium"
                      >
                        {signal}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="surface-subtle-strong rounded-[1.75rem] p-5">
                  <p className="theme-text-secondary text-xs font-semibold uppercase tracking-[0.28em]">
                    Roles actuales
                  </p>
                  <ul className="mt-4 grid gap-3">
                    {roles.map((role) => (
                      <li
                        key={role}
                        className="login-role-row flex items-center justify-between rounded-2xl px-4 py-3 text-sm"
                      >
                        <span>{role}</span>
                        <span className="login-role-badge rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em]">
                          Activo
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </section>

          <Card className="login-shell relative overflow-hidden p-6 sm:p-8 lg:p-9">
            <div aria-hidden="true" className="login-form-glow absolute inset-x-0 top-0 h-40" />
            <div
              aria-hidden="true"
              className="absolute right-[-3rem] top-[-3rem] h-36 w-36 rounded-full bg-[radial-gradient(circle,rgb(var(--theme-primary-rgb)/0.2),transparent_70%)] blur-3xl"
            />

            <div className="relative">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="surface-subtle inline-flex items-center gap-3 rounded-2xl px-4 py-3">
                    <div className="login-lock-shell rounded-2xl p-3">
                      <LockKeyhole size={20} />
                    </div>
                    <div>
                      <p className="theme-text-secondary text-xs font-semibold uppercase tracking-[0.28em]">
                        Acceso seguro
                      </p>
                      <p className="theme-text-secondary mt-1 text-sm">
                        Ingreso para equipos operativos y administrativos
                      </p>
                    </div>
                  </div>

                  <h2 className="font-display theme-text-strong mt-6 text-3xl font-bold sm:text-[2rem]">
                    Entra a Registry POS
                  </h2>
                  <p className="theme-text-secondary mt-3 text-sm leading-6 sm:text-[0.95rem]">
                    Usa tu correo o usuario corporativo para continuar con la operación de tu sucursal.
                  </p>
                </div>
              </div>

              <form className="mt-8 grid gap-5" onSubmit={handleSubmit}>
                <Input
                  id="login-identifier"
                  autoFocus
                  label="Correo o usuario"
                  value={identifier}
                  onChange={(event) => setIdentifier(event.target.value)}
                  placeholder="Ej. admin o admin@registrypos.local"
                  autoComplete="username"
                  hint="Puedes ingresar con usuario o correo, según tu perfil."
                />

                <div className="space-y-3">
                  <Input
                    id="login-password"
                    label="Contraseña"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Tu contraseña"
                    autoComplete="current-password"
                  />
                  <div className="flex justify-end">
                    <button
                      type="button"
                      aria-controls="login-password"
                      aria-pressed={showPassword}
                      onClick={() => setShowPassword((value) => !value)}
                      className="login-password-toggle inline-flex items-center gap-2 rounded-full px-2 py-1 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-strong)]"
                    >
                      {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                      {showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    </button>
                  </div>
                </div>

                {error ? <FeedbackMessage tone="error">{error}</FeedbackMessage> : null}

                <div className="surface-subtle rounded-[1.5rem] p-4">
                  <p className="theme-text-faint text-[11px] font-semibold uppercase tracking-[0.28em]">
                    Perfiles habilitados hoy
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {roles.map((role) => (
                      <span
                        key={role}
                        className="soft-pill rounded-full px-3 py-2 text-xs font-medium"
                      >
                        {role}
                      </span>
                    ))}
                  </div>
                </div>

                <Button
                  type="submit"
                  className="login-submit-button mt-1 w-full justify-between rounded-[1.25rem] px-5 py-3"
                  disabled={isAuthenticating}
                >
                  <span>{isAuthenticating ? 'Ingresando...' : 'Ingresar al sistema'}</span>
                  <ArrowRight size={18} />
                </Button>
              </form>
            </div>
          </Card>
        </div>
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