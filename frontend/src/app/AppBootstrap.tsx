import { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { router } from '@/app/router';
import { LoadingState } from '@/components/LoadingState';
import { setUnauthorizedHandler } from '@/services/api/authEvents';
import { useSessionStore } from '@/store/sessionStore';
import { ThemeProvider } from '@/theme/ThemeProvider';

export function AppBootstrap() {
  const hydrateSession = useSessionStore((state) => state.hydrateSession);
  const clearSession = useSessionStore((state) => state.clearSession);
  const isReady = useSessionStore((state) => state.isReady);

  useEffect(() => {
    void hydrateSession();
  }, [hydrateSession]);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      clearSession();
      if (window.location.pathname !== '/login') {
        window.location.assign('/login');
      }
    });

    return () => {
      setUnauthorizedHandler(null);
    };
  }, [clearSession]);

  return (
    <ThemeProvider>
      {!isReady ? (
        <div className="min-h-screen px-4 py-8">
          <div className="mx-auto max-w-3xl">
            <LoadingState
              title="Restaurando sesion"
              description="Estamos validando tu acceso con el backend local."
              rows={3}
            />
          </div>
        </div>
      ) : (
        <RouterProvider router={router} />
      )}
    </ThemeProvider>
  );
}

