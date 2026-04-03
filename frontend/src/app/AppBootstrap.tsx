import { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { router } from '@/app/router';
import { LoadingState } from '@/components/LoadingState';
import { setUnauthorizedHandler } from '@/services/api/authEvents';
import { useBusinessConfigStore } from '@/store/businessConfigStore';
import { useSessionStore } from '@/store/sessionStore';
import { ThemeProvider } from '@/theme/ThemeProvider';

export function AppBootstrap() {
  const hydrateSession = useSessionStore((state) => state.hydrateSession);
  const clearSession = useSessionStore((state) => state.clearSession);
  const isReady = useSessionStore((state) => state.isReady);
  const currentUserId = useSessionStore((state) => state.currentUser?.id ?? null);
  const refreshConfig = useBusinessConfigStore((state) => state.refreshConfig);
  const resetConfigState = useBusinessConfigStore((state) => state.resetConfigState);

  useEffect(() => {
    void hydrateSession();
  }, [hydrateSession]);

  useEffect(() => {
    if (!isReady) {
      return;
    }

    if (!currentUserId) {
      resetConfigState();
      return;
    }

    void refreshConfig();
  }, [currentUserId, isReady, refreshConfig, resetConfigState]);

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

