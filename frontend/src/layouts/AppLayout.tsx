import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Menu, X } from 'lucide-react';
import clsx from 'clsx';
import { Outlet, useLocation } from 'react-router-dom';
import { ScrollToTop } from '@/app/router/ScrollToTop';
import { Button } from '@/components/Button';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { posApi } from '@/services/api/posApi';
import { useAppStore } from '@/store/appStore';

export function AppLayout() {
  const { pathname } = useLocation();
  const isPosRoute = pathname.startsWith('/pos');
  const setAvailableLocations = useAppStore((state) => state.setAvailableLocations);
  const setLocationsLoading = useAppStore((state) => state.setLocationsLoading);
  const setLocationsError = useAppStore((state) => state.setLocationsError);
  const isPosMobileOverlayOpen = useAppStore((state) => state.isPosMobileOverlayOpen);
  const [isMobileNavigationOpen, setIsMobileNavigationOpen] = useState(false);
  const [isDesktopSidebarCollapsed, setIsDesktopSidebarCollapsed] = useState(false);
  const navigationId = 'primary-navigation-drawer';
  const mobileNavigationButtonStyle = {
    top: 'calc(env(safe-area-inset-top, 0px) + 0.75rem)',
    left: 'calc(env(safe-area-inset-left, 0px) + 0.75rem)',
  };
  const desktopSidebarToggleStyle = {
    top: '1.75rem',
    left: isDesktopSidebarCollapsed ? '104px' : '260px',
  };
  const shouldShowMobileNavigationButton =
    !isMobileNavigationOpen && !isPosMobileOverlayOpen;

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
  }, [pathname]);

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
      <ScrollToTop />

      {shouldShowMobileNavigationButton ? (
        <Button
          type="button"
          variant="secondary"
          className={clsx(
            'fixed z-50 lg:hidden app-mobile-nav-button',
            isPosRoute && 'app-mobile-nav-button--pos',
          )}
          style={mobileNavigationButtonStyle}
          aria-label="Abrir menu de navegacion"
          aria-controls={navigationId}
          aria-expanded={false}
          onClick={() => setIsMobileNavigationOpen(true)}
        >
          <Menu size={18} />
          <span>Menu</span>
        </Button>
      ) : null}

      {isMobileNavigationOpen ? (
        <div
          aria-hidden="true"
          className="fixed inset-0 z-30 bg-[var(--overlay)] backdrop-blur-sm lg:hidden"
          onClick={() => setIsMobileNavigationOpen(false)}
        />
      ) : null}

      <div
        className={clsx(
          'relative min-h-screen lg:grid',
          isDesktopSidebarCollapsed
            ? 'lg:grid-cols-[104px_minmax(0,1fr)]'
            : 'lg:grid-cols-[260px_minmax(0,1fr)]',
        )}
      >
        <Sidebar variant="desktop" isCollapsed={isDesktopSidebarCollapsed} />
        <Sidebar
          variant="mobile"
          isOpen={isMobileNavigationOpen}
          navigationId={navigationId}
          onClose={() => setIsMobileNavigationOpen(false)}
        />
        <div
          className="absolute z-20 hidden -translate-x-1/2 lg:block"
          style={desktopSidebarToggleStyle}
        >
          <Button
            type="button"
            variant="secondary"
            className="surface-subtle-strong h-11 w-11 px-0 shadow-[0_18px_38px_rgba(10,14,28,0.18)] transition-all duration-300 hover:-translate-y-px"
            aria-label={
              isDesktopSidebarCollapsed
                ? 'Expandir navegacion lateral'
                : 'Colapsar navegacion lateral'
            }
            aria-expanded={!isDesktopSidebarCollapsed}
            onClick={() => setIsDesktopSidebarCollapsed((collapsed) => !collapsed)}
          >
            {isDesktopSidebarCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </Button>
        </div>

        <div className="min-w-0">
          <div
            className={clsx(
              'app-layout-shell mx-auto flex min-h-screen w-full max-w-[1680px] flex-col px-3 pb-3 sm:px-4 sm:pb-4 md:px-6 lg:px-8 lg:py-4',
              isPosRoute
                ? 'app-layout-shell--pos pt-[calc(env(safe-area-inset-top,0px)+3.95rem)] sm:pt-[calc(env(safe-area-inset-top,0px)+4.2rem)]'
                : 'pt-[calc(env(safe-area-inset-top,0px)+4.5rem)] sm:pt-[calc(env(safe-area-inset-top,0px)+4.75rem)]',
            )}
          >
            <Header compactForPosMobile={isPosRoute} />
            <main
              id="main-content"
              className={clsx(
                'app-layout-main min-w-0 flex-1',
                isPosRoute ? 'mt-3 sm:mt-4' : 'mt-4',
              )}
              tabIndex={-1}
            >
              <Outlet />
            </main>
          </div>
        </div>
      </div>
    </div>
  );
}
