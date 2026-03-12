import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { posApi } from '@/services/api/posApi';
import { useAppStore } from '@/store/appStore';

export function AppLayout() {
  const setAvailableLocations = useAppStore((state) => state.setAvailableLocations);
  const setLocationsLoading = useAppStore((state) => state.setLocationsLoading);
  const setLocationsError = useAppStore((state) => state.setLocationsError);

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

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[260px_minmax(0,1fr)]">
      <Sidebar />
      <div className="min-h-screen px-4 py-4 sm:px-6">
        <Header />
        <main className="mt-4">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
