import { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { LoadingState } from '@/components/LoadingState';
import { router } from '@/app/router';
import { useSessionStore } from '@/store/sessionStore';

export function AppBootstrap() {
  const hydrateSession = useSessionStore((state) => state.hydrateSession);
  const isReady = useSessionStore((state) => state.isReady);

  useEffect(() => {
    void hydrateSession();
  }, [hydrateSession]);

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
