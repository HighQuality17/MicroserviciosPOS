import { MapPin } from 'lucide-react';
import { useAppStore } from '@/store/appStore';
import { useSessionStore } from '@/store/sessionStore';
import { formatUserRole } from '@/utils/copy';

export function Header() {
  const currentUser = useSessionStore((state) => state.currentUser);
  const currentLocation = useAppStore((state) => state.currentLocation);
  const availableLocations = useAppStore((state) => state.availableLocations);
  const locationsLoading = useAppStore((state) => state.locationsLoading);
  const locationsError = useAppStore((state) => state.locationsError);
  const setCurrentLocation = useAppStore((state) => state.setCurrentLocation);

  return (
    <header className="glass-panel flex flex-col gap-4 rounded-[2rem] p-5 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
          POS local offline-first
        </p>
        <h1 className="font-display text-3xl font-bold text-white">
          Microservicios POS
        </h1>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 rounded-2xl border border-slate-700 bg-slate-950/60 px-4 py-3 text-sm text-slate-300">
          <MapPin size={16} className="text-teal-300" />
          {locationsLoading ? (
            <span>Cargando puntos de venta...</span>
          ) : availableLocations.length === 0 || !currentLocation ? (
            <span className="text-amber-100">
              {locationsError ? 'Sin POS disponibles' : 'Sin ubicaciones creadas'}
            </span>
          ) : availableLocations.length <= 1 ? (
            <span>{currentLocation.name}</span>
          ) : (
            <select
              aria-label="Punto de venta activo"
              value={String(currentLocation.id)}
              onChange={(event) => {
                const nextLocation = availableLocations.find(
                  (item) => item.id === Number(event.target.value),
                );
                if (nextLocation) {
                  setCurrentLocation(nextLocation);
                }
              }}
              className="min-w-28 bg-transparent text-sm text-slate-200 outline-none"
            >
              {availableLocations.map((item) => (
                <option
                  key={item.id}
                  value={String(item.id)}
                  className="bg-slate-950 text-slate-100"
                >
                  {item.name}
                </option>
              ))}
            </select>
          )}
        </label>
        <div className="rounded-2xl border border-slate-700 bg-slate-950/60 px-4 py-3 text-sm text-slate-300">
          {currentUser?.name} · {formatUserRole(currentUser?.role)}
        </div>
      </div>
    </header>
  );
}
