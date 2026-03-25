import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { ArrowRight, Eye, EyeOff, LockKeyhole, ShieldCheck, Sparkles } from 'lucide-react';
import { getDefaultRouteForRole } from '@/app/permissions';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { FeedbackMessage } from '@/components/FeedbackMessage';
import { Input } from '@/components/Input';
import { useSessionStore } from '@/store/sessionStore';

const accessSummary = [
  {
    label: 'Cobertura',
    value: 'Ventas, inventario y caja',
  },
  {
    label: 'Perfiles',
    value: 'Administración, caja y auditoría',
  },
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
        <div className="absolute left-[-10rem] top-[-9rem] h-[24rem] w-[24rem] rounded-full bg-[radial-gradient(circle,rgb(var(--theme-primary-rgb)/0.2),transparent_68%)] blur-3xl" />
        <div className="absolute right-[-8rem] top-1/4 h-[22rem] w-[22rem] rounded-full bg-[radial-gradient(circle,rgb(var(--theme-secondary-rgb)/0.18),transparent_72%)] blur-3xl" />
        <div className="absolute bottom-[-10rem] left-1/3 h-[18rem] w-[18rem] rounded-full bg-[radial-gradient(circle,rgb(var(--theme-accent-rgb)/0.14),transparent_72%)] blur-3xl" />
      </div>

      <div className="relative mx-auto flex min-h-screen w-full max-w-[1120px] items-center px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
        <section className="login-shell relative w-full overflow-hidden rounded-[2rem] px-5 py-6 backdrop-blur-2xl sm:px-7 sm:py-7 md:px-8 md:py-8 lg:px-10 lg:py-10 xl:px-12 xl:py-12">
          <div aria-hidden="true" className="login-hero-glow absolute inset-0" />

          <div className="relative grid gap-8 md:grid-cols-[minmax(0,1fr)_22rem] md:items-center md:gap-8 lg:grid-cols-[minmax(0,1fr)_24.5rem] xl:gap-14">
            <section className="order-2 flex flex-col gap-7 md:order-1 lg:pr-10">
              <div className="space-y-5 sm:space-y-6">
                <div className="login-brand-mark inline-flex items-center gap-2 rounded-full px-4 py-2 text-[0.68rem] font-semibold uppercase tracking-[0.28em]">
                  <Sparkles size={14} />
                  Registry POS
                </div>

                <div className="max-w-[34rem] space-y-4 sm:space-y-5">
                  <p className="theme-text-secondary text-[0.72rem] font-semibold uppercase tracking-[0.28em] sm:text-xs">
                    Inicio de sesión seguro
                  </p>
                  <h1
                    id="login-title"
                    className="font-display theme-text-strong text-[2.35rem] font-bold leading-[0.98] tracking-[-0.04em] sm:text-[3.4rem] xl:text-[4.3rem]"
                  >
                    Accede a <span className="login-highlight-text">Registry POS</span>
                  </h1>
                  <p className="theme-text-secondary max-w-[31rem] text-sm leading-6 sm:text-base sm:leading-7">
                    Ingresa en segundos y vuelve a caja, inventario y ventas con una experiencia
                    moderna y ágil.
                  </p>
                </div>

                <div className="login-inline-note inline-flex max-w-[24rem] items-start gap-3 rounded-[1.25rem] px-4 py-3 text-xs font-medium sm:text-[0.82rem]">
                  <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[rgb(var(--theme-primary-rgb)/0.16)] text-[rgb(var(--theme-primary-rgb))]">
                    <ShieldCheck size={15} />
                  </span>
                  <span>Acceso protegido por rol y trazabilidad operativa.</span>
                </div>
              </div>

              <div className="login-context-shell hidden xl:grid">
                {accessSummary.map((item) => (
                  <div key={item.label} className="login-context-row">
                    <span className="login-context-label">{item.label}</span>
                    <span className="theme-text-secondary text-sm leading-6">{item.value}</span>
                  </div>
                ))}
              </div>
            </section>

            <Card className="login-form-panel order-1 relative mx-auto w-full max-w-[28rem] overflow-hidden rounded-[1.85rem] p-6 sm:p-7 md:order-2 md:mx-0 md:max-w-none md:p-7 lg:p-8 xl:p-9">
              <div aria-hidden="true" className="login-form-glow absolute inset-x-0 top-0 h-32" />
              <div
                aria-hidden="true"
                className="absolute right-[-3rem] top-[-3rem] h-32 w-32 rounded-full bg-[radial-gradient(circle,rgb(var(--theme-primary-rgb)/0.18),transparent_70%)] blur-3xl"
              />

              <div className="relative">
                <div className="flex items-start gap-4">
                  <div className="login-lock-shell rounded-[1.25rem] p-3">
                    <LockKeyhole size={20} />
                  </div>
                  <div className="min-w-0">
                    <p className="theme-text-secondary text-[11px] font-semibold uppercase tracking-[0.28em]">
                      Acceso seguro
                    </p>
                    <p className="theme-text-secondary mt-1 text-sm leading-6">
                      Usa tu correo o usuario corporativo.
                    </p>
                  </div>
                </div>

                <div className="mt-6">
                  <h2 className="font-display theme-text-strong text-3xl font-bold tracking-[-0.03em] sm:text-[2rem]">
                    Iniciar sesión
                  </h2>
                  <p className="theme-text-secondary mt-3 text-sm leading-6 sm:text-[0.95rem]">
                    Continúa con tu entorno de trabajo en Registry POS.
                  </p>
                  <p className="theme-text-faint mt-3 text-xs leading-5">
                    Disponible para administración, caja y auditoría.
                  </p>
                </div>

                <form className="mt-8 grid gap-4 sm:gap-5" onSubmit={handleSubmit}>
                  <Input
                    id="login-identifier"
                    autoFocus
                    label="Correo o usuario"
                    value={identifier}
                    onChange={(event) => setIdentifier(event.target.value)}
                    placeholder="usuario o correo@empresa.com"
                    autoComplete="username"
                    wrapperClassName="space-y-2.5"
                    labelClassName="theme-text-secondary text-[0.76rem] font-semibold uppercase tracking-[0.18em]"
                    className="min-h-12 rounded-[1.2rem] px-4 py-3.5"
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
                      wrapperClassName="space-y-2.5"
                      labelClassName="theme-text-secondary text-[0.76rem] font-semibold uppercase tracking-[0.18em]"
                      className="min-h-12 rounded-[1.2rem] px-4 py-3.5"
                    />
                    <div className="flex justify-end">
                      <button
                        type="button"
                        aria-controls="login-password"
                        aria-pressed={showPassword}
                        onClick={() => setShowPassword((value) => !value)}
                        className="login-password-toggle inline-flex items-center gap-2 rounded-full px-2.5 py-1.5 text-[11px] font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-strong)]"
                      >
                        {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                        {showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                      </button>
                    </div>
                  </div>

                  {error ? (
                    <FeedbackMessage tone="error" className="login-feedback">
                      {error}
                    </FeedbackMessage>
                  ) : null}

                  <Button
                    type="submit"
                    className="login-submit-button mt-1 w-full justify-between rounded-[1.35rem] px-5 py-3.5"
                    disabled={isAuthenticating}
                  >
                    <span>{isAuthenticating ? 'Ingresando...' : 'Ingresar al sistema'}</span>
                    <ArrowRight size={18} />
                  </Button>
                </form>
              </div>
            </Card>
          </div>
        </section>
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
