import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { posApi } from '@/services/api/posApi';
import { useAppStore } from '@/store/appStore';

export function AppLayout() {
  const location = useLocation();
  const setAvailableLocations = useAppStore((state) => state.setAvailableLocations);
  const setLocationsLoading = useAppStore((state) => state.setLocationsLoading);
  const setLocationsError = useAppStore((state) => state.setLocationsError);
  const [isMobileNavigationOpen, setIsMobileNavigationOpen] = useState(false);
  const navigationId = 'primary-navigation-drawer';

  useEffect(() => {
    let cancelled = false;

    async function loadLocations() {
      try {
        setLocationsLoading(true);
        setLocationsError(null);
        const locations = await posApi.getLocations();
        if (cancelled) return;
        setAvailableLocations(locations);
      } catch (error) {
        if (cancelled) return;
        setAvailableLocations([]);
        setLocationsError(
          error instanceof Error
            ? error.message
            : 'No fue posible cargar los puntos de venta',
        );
      } finally {
        if (!cancelled) {
          setLocationsLoading(false);
        }
      }
    }

    void loadLocations();

    return () => {
      cancelled = true;
    };
  }, [setAvailableLocations, setLocationsError, setLocationsLoading]);

  useEffect(() => {
    setIsMobileNavigationOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!isMobileNavigationOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isMobileNavigationOpen]);

  useEffect(() => {
    if (!isMobileNavigationOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsMobileNavigationOpen(false);
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isMobileNavigationOpen]);

  useEffect(() => {
    function handleResize() {
      if (window.innerWidth >= 1024) {
        setIsMobileNavigationOpen(false);
      }
    }

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <div className="min-h-screen">
      <a href="#main-content" className="skip-link">
        Saltar al contenido principal
      </a>

      {isMobileNavigationOpen ? (
        <div
          aria-hidden="true"
          className="fixed inset-0 z-30 bg-[var(--overlay)] backdrop-blur-sm lg:hidden"
          onClick={() => setIsMobileNavigationOpen(false)}
        />
      ) : null}

      <div className="min-h-screen lg:grid lg:grid-cols-[260px_minmax(0,1fr)]">
        <Sidebar variant="desktop" />
        <Sidebar
          variant="mobile"
          isOpen={isMobileNavigationOpen}
          navigationId={navigationId}
          onClose={() => setIsMobileNavigationOpen(false)}
        />

        <div className="min-w-0">
          <div className="mx-auto flex min-h-screen w-full max-w-[1680px] flex-col px-3 py-3 sm:px-4 sm:py-4 md:px-6 lg:px-8">
            <Header
              navigationId={navigationId}
              isNavigationOpen={isMobileNavigationOpen}
              onOpenNavigation={() => setIsMobileNavigationOpen(true)}
            />
            <main id="main-content" className="mt-4 min-w-0 flex-1" tabIndex={-1}>
              <Outlet />
            </main>
          </div>
        </div>
      </div>
    </div>
  );
}