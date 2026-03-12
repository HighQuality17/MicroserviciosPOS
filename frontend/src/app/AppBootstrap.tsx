import { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { router } from '@/app/router';
import { LoadingState } from '@/components/LoadingState';
import { setUnauthorizedHandler } from '@/services/api/authEvents';
import { useSessionStore } from '@/store/sessionStore';

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

  if (!isReady) {
    return (
      <div className="min-h-screen px-4 py-8">
        <div className="mx-auto max-w-3xl">
          <LoadingState
            title="Restaurando sesión"
            description="Estamos validando tu acceso con el backend local."
            rows={3}
          />
        </div>
      </div>
    );
  }

  return <RouterProvider router={router} />;
}
