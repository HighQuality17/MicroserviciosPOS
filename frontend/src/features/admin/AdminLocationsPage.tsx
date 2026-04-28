import '@/features/admin/admin-d1.css';
import { useState } from 'react';
import { MapPin, Plus, RefreshCw, Store } from 'lucide-react';
import { AdminSubmoduleNav } from '@/features/admin/AdminSubmoduleNav';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { FeedbackMessage } from '@/components/FeedbackMessage';
import { Input } from '@/components/Input';
import { ModulePageHeader } from '@/components/ModulePageHeader';
import type { ModulePageHeaderCard } from '@/components/ModulePageHeader';
import { ScrollPanel } from '@/components/ScrollPanel';
import { SectionHeader } from '@/components/SectionHeader';
import { StatusBadge } from '@/components/StatusBadge';
import { posApi } from '@/services/api/posApi';
import { useAppStore } from '@/store/appStore';

type BadgeTone = 'default' | 'success' | 'warning' | 'danger' | 'info';

function SkeletonRows({ rows = 3 }: { rows?: number }) {
  return (
    <div className="grid gap-3">
      {Array.from({ length: rows }).map((_, index) => (
        <div
          key={index}
          className="data-list-card h-20 animate-pulse rounded-3xl"
        />
      ))}
    </div>
  );
}

export function AdminLocationsPage() {
  const availableLocations = useAppStore((state) => state.availableLocations);
  const locationsLoading = useAppStore((state) => state.locationsLoading);
  const locationsError = useAppStore((state) => state.locationsError);
  const setAvailableLocations = useAppStore((state) => state.setAvailableLocations);
  const setLocationsLoading = useAppStore((state) => state.setLocationsLoading);
  const setLocationsError = useAppStore((state) => state.setLocationsError);
  const [locationName, setLocationName] = useState('');
  const [locationMessage, setLocationMessage] = useState<string | null>(null);
  const [locationSubmitError, setLocationSubmitError] = useState<string | null>(null);
  const [creatingLocation, setCreatingLocation] = useState(false);
  const totalLocations = availableLocations.length;
  const locationsTone: BadgeTone = locationsLoading
    ? 'info'
    : totalLocations > 0
      ? 'success'
      : 'default';
  const locationsLabel = locationsLoading
    ? 'Actualizando'
    : totalLocations > 0
      ? 'Cobertura lista'
      : 'Sin POS';
  const locationHeaderCards: ModulePageHeaderCard[] = [
    {
      label: 'POS activos',
      value: locationsLoading ? '...' : String(totalLocations),
      note: totalLocations > 0 ? 'Ubicaciones operativas disponibles' : 'Crea el primer punto',
      accent: locationsTone === 'success' ? 'success' : 'default',
      icon: <Store size={16} />,
      iconTone: locationsTone,
      badge: {
        label: locationsLabel,
        tone: locationsTone,
      },
    },
    {
      label: 'Operacion',
      value: locationsError ? 'Revisar' : 'Lista',
      note: locationsError ?? 'Sincronizada con selector global',
      accent: locationsError ? 'warning' : 'info',
      icon: <MapPin size={16} />,
      iconTone: locationsError ? 'warning' : 'info',
      badge: {
        label: locationsError ? 'Atencion' : 'Global',
        tone: locationsError ? 'warning' : 'info',
      },
    },
  ];

  async function refreshLocations() {
    try {
      setLocationsLoading(true);
      setLocationsError(null);
      const locations = await posApi.getLocations();
      setAvailableLocations(locations);
    } catch (error) {
      setLocationsError(
        error instanceof Error
          ? error.message
          : 'No fue posible cargar los puntos de venta',
      );
    } finally {
      setLocationsLoading(false);
    }
  }

  async function handleCreateLocation() {
    if (!locationName.trim()) {
      setLocationSubmitError('Escribe el nombre del punto de venta.');
      return;
    }

    try {
      setCreatingLocation(true);
      setLocationSubmitError(null);
      setLocationMessage(null);
      const location = await posApi.createLocation({ name: locationName.trim() });
      setLocationName('');
      setLocationMessage(`Punto de venta ${location.name} creado correctamente.`);
      await refreshLocations();
    } catch (error) {
      setLocationSubmitError(
        error instanceof Error
          ? error.message
          : 'No fue posible crear el punto de venta',
      );
    } finally {
      setCreatingLocation(false);
    }
  }

  return (
    <div className="admin-dashboard admin-locations-page grid min-w-0 gap-4 sm:gap-5">
      <AdminSubmoduleNav />

      <ModulePageHeader
        ariaLabel="Gestion de puntos de venta"
        eyebrow="Admin / Puntos de venta"
        title="Puntos de venta"
        description="Gestiona ubicaciones operativas del POS desde un submodulo administrativo dedicado."
        helpText="Esta pantalla conserva la misma API y solo ordena la gestion de ubicaciones fuera del dashboard principal."
        icon={<Store size={18} />}
        badges={[{ label: locationsLabel, tone: locationsTone }]}
        asideAction={
          <Button variant="secondary" onClick={() => void refreshLocations()}>
            <RefreshCw size={16} />
            Refrescar
          </Button>
        }
        cards={locationHeaderCards}
      />

      {locationMessage ? (
        <FeedbackMessage tone="success">
          {locationMessage}
        </FeedbackMessage>
      ) : null}

      {locationSubmitError ? (
        <FeedbackMessage tone="error">
          {locationSubmitError}
        </FeedbackMessage>
      ) : null}

      {locationsError ? (
        <FeedbackMessage tone="warning">
          {locationsError}
        </FeedbackMessage>
      ) : null}

      <Card padding="none" glow={false} className="admin-panel admin-panel--locations">
        <div className="admin-panel__body">
          <SectionHeader
            eyebrow="Ubicaciones"
            title="Gestion POS"
            description="Crea y revisa puntos de venta disponibles para caja y POS."
            actions={<StatusBadge label={locationsLabel} tone={locationsTone} />}
          />

          <div className="admin-location-grid">
            <div className="admin-location-create">
              <div>
                <p className="admin-kicker">Crear ubicacion</p>
                <h3>Nuevo POS</h3>
              </div>

              <div className="admin-location-create__form">
                <Input
                  label="Nombre del POS"
                  placeholder="Ej: POS Centro"
                  value={locationName}
                  onChange={(event) => setLocationName(event.target.value)}
                />
                <Button
                  disabled={creatingLocation || !locationName.trim()}
                  onClick={() => void handleCreateLocation()}
                >
                  <Plus size={16} />
                  {creatingLocation ? 'Guardando...' : 'Crear punto de venta'}
                </Button>
              </div>
            </div>

            <div className="admin-location-list">
              <div className="admin-location-list__header">
                <div>
                  <p className="admin-kicker">Ubicaciones reales</p>
                  <h3>POS disponibles</h3>
                </div>
                <Button variant="secondary" onClick={() => void refreshLocations()}>
                  Refrescar
                </Button>
              </div>

              {locationsLoading ? (
                <div className="mt-6">
                  <SkeletonRows rows={3} />
                </div>
              ) : availableLocations.length === 0 ? (
                <div className="mt-6">
                  <EmptyState
                    title="Sin puntos de venta"
                    description="Crea la primera ubicacion operativa."
                  />
                </div>
              ) : (
                <ScrollPanel
                  className="admin-pos-list"
                  maxHeightClassName="max-h-[24rem]"
                  tabIndex={0}
                  aria-label="Puntos de venta disponibles"
                >
                  {availableLocations.map((location) => (
                    <div key={location.id} className="admin-pos-item">
                      <div>
                        <p>{location.name}</p>
                        <span>ID {location.id}</span>
                      </div>
                      <div className="admin-pos-item__status">
                        <StatusBadge label="POS activo" tone="info" />
                      </div>
                    </div>
                  ))}
                </ScrollPanel>
              )}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
