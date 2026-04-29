import '@/features/admin/admin-d1.css';
import { useMemo, useState } from 'react';
import {
  CheckCircle2,
  CircleOff,
  Hash,
  MapPin,
  MapPinned,
  Plus,
  RefreshCw,
  Search,
  Store,
} from 'lucide-react';
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
import type { Location } from '@/types/api';

type BadgeTone = 'default' | 'success' | 'warning' | 'danger' | 'info';

function SkeletonRows({ rows = 3 }: { rows?: number }) {
  return (
    <div className="admin-location-skeleton-list" aria-hidden="true">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="admin-location-skeleton-card" />
      ))}
    </div>
  );
}

export function AdminLocationsPage() {
  const availableLocations = useAppStore((state) => state.availableLocations);
  const currentLocation = useAppStore((state) => state.currentLocation);
  const locationsLoading = useAppStore((state) => state.locationsLoading);
  const locationsError = useAppStore((state) => state.locationsError);
  const setAvailableLocations = useAppStore((state) => state.setAvailableLocations);
  const setLocationsLoading = useAppStore((state) => state.setLocationsLoading);
  const setLocationsError = useAppStore((state) => state.setLocationsError);
  const [locationName, setLocationName] = useState('');
  const [locationNameError, setLocationNameError] = useState<string | null>(null);
  const [locationMessage, setLocationMessage] = useState<string | null>(null);
  const [locationSubmitError, setLocationSubmitError] = useState<string | null>(null);
  const [creatingLocation, setCreatingLocation] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const totalLocations = availableLocations.length;
  const activeLocations = totalLocations;
  const inactiveLocations = 0;
  const highlightedLocation = currentLocation ?? availableLocations[0] ?? null;
  const filteredLocations = useMemo(() => {
    const normalizedSearch = normalizeSearch(searchTerm);

    if (!normalizedSearch) {
      return availableLocations;
    }

    return availableLocations.filter((location) =>
      normalizeSearch(`${location.name} ${location.id}`).includes(normalizedSearch),
    );
  }, [availableLocations, searchTerm]);

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
      label: 'Total POS',
      value: locationsLoading ? '...' : String(totalLocations),
      note: totalLocations > 0 ? 'Puntos de venta registrados' : 'Crea el primer punto',
      accent: locationsTone === 'success' ? 'success' : 'default',
      icon: <Store size={16} />,
      iconTone: locationsTone,
      badge: {
        label: locationsLabel,
        tone: locationsTone,
      },
    },
    {
      label: 'Activos',
      value: locationsLoading ? '...' : String(activeLocations),
      note: 'Disponibles para caja y POS',
      accent: activeLocations > 0 ? 'success' : 'default',
      icon: <CheckCircle2 size={16} />,
      iconTone: activeLocations > 0 ? 'success' : 'default',
      badge: {
        label: activeLocations > 0 ? 'Operativos' : 'Pendiente',
        tone: activeLocations > 0 ? 'success' : 'default',
      },
    },
    {
      label: 'Inactivos',
      value: String(inactiveLocations),
      note: 'API actual no expone inactivos',
      accent: 'default',
      icon: <CircleOff size={16} />,
      iconTone: 'default',
      badge: {
        label: 'Sin bajas',
        tone: 'default',
      },
    },
    {
      label: 'Punto destacado',
      value: highlightedLocation?.name ?? 'Sin sede',
      note: highlightedLocation ? `ID ${highlightedLocation.id}` : 'Se asigna al cargar sedes',
      accent: highlightedLocation ? 'info' : 'default',
      icon: <MapPinned size={16} />,
      iconTone: highlightedLocation ? 'info' : 'default',
      badge: {
        label: highlightedLocation ? 'Principal visible' : 'Pendiente',
        tone: highlightedLocation ? 'info' : 'default',
      },
    },
  ];

  function focusCreateForm() {
    const input = document.getElementById('admin-location-name');
    input?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    if (input instanceof HTMLInputElement) {
      input.focus();
    }
  }

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

  async function handleCreateLocation(event?: React.FormEvent<HTMLFormElement>) {
    event?.preventDefault();

    const normalizedName = locationName.trim();

    if (!normalizedName) {
      setLocationNameError('Escribe el nombre del punto de venta.');
      setLocationSubmitError('Completa el nombre antes de crear el punto de venta.');
      focusCreateForm();
      return;
    }

    try {
      setCreatingLocation(true);
      setLocationNameError(null);
      setLocationSubmitError(null);
      setLocationMessage(null);
      const location = await posApi.createLocation({ name: normalizedName });
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
        description="Administra sedes operativas del POS con una vista clara para crecimiento, cobertura y control diario."
        helpText="Esta pantalla usa los endpoints existentes de locations. No cambia API, backend ni flujos de caja."
        icon={<Store size={18} />}
        badges={[{ label: locationsLabel, tone: locationsTone }]}
        asideAction={
          <div className="admin-location-header-actions">
            <Button onClick={focusCreateForm}>
              <Plus size={16} />
              Crear punto de venta
            </Button>
            <Button
              variant="secondary"
              disabled={locationsLoading}
              onClick={() => void refreshLocations()}
            >
              <RefreshCw size={16} />
              Refrescar
            </Button>
          </div>
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
        <div className="admin-panel__body admin-location-panel__body">
          <SectionHeader
            eyebrow="Gestion de sedes"
            title="Cobertura operativa"
            description="Crea puntos de venta y revisa que sedes estan disponibles para operar desde POS."
            actions={<StatusBadge label={`${activeLocations} activos`} tone={activeLocations > 0 ? 'success' : 'default'} />}
          />

          <div className="admin-location-grid">
            <form className="admin-location-create" onSubmit={handleCreateLocation}>
              <div className="admin-location-card-heading">
                <span className="admin-location-card-heading__icon" aria-hidden="true">
                  <Plus size={17} />
                </span>
                <div>
                  <p className="admin-kicker">Crear ubicacion</p>
                  <h3>Nuevo punto de venta</h3>
                  <p>Usa nombres cortos y reconocibles para caja, reportes y selector global.</p>
                </div>
              </div>

              <div className="admin-location-create__form">
                <Input
                  id="admin-location-name"
                  label="Nombre del punto"
                  placeholder="Ej: POS Centro"
                  value={locationName}
                  error={locationNameError ?? undefined}
                  hint="Debe ser unico. Ejemplos: Centro, Norte, Bodega, Evento."
                  onChange={(event) => {
                    setLocationName(event.target.value);
                    setLocationNameError(null);
                    setLocationSubmitError(null);
                    setLocationMessage(null);
                  }}
                />

                <div className="admin-location-create__actions">
                  <Button
                    type="submit"
                    disabled={creatingLocation || !locationName.trim()}
                    loading={creatingLocation}
                  >
                    <Plus size={16} />
                    {creatingLocation ? 'Guardando...' : 'Crear punto'}
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={creatingLocation || !locationName}
                    onClick={() => {
                      setLocationName('');
                      setLocationNameError(null);
                      setLocationSubmitError(null);
                    }}
                  >
                    Limpiar
                  </Button>
                </div>
              </div>

              <div className="admin-location-create__note">
                <CheckCircle2 size={15} />
                <span>Al crear, la lista se sincroniza y queda disponible para selector global.</span>
              </div>
            </form>

            <section className="admin-location-list" aria-label="Listado de puntos de venta">
              <div className="admin-location-list__header">
                <div>
                  <p className="admin-kicker">Puntos registrados</p>
                  <h3>Sedes disponibles</h3>
                  <p>{filteredLocations.length} de {totalLocations} visibles</p>
                </div>
                <Button
                  variant="secondary"
                  disabled={locationsLoading}
                  onClick={() => void refreshLocations()}
                >
                  <RefreshCw size={16} />
                  Refrescar
                </Button>
              </div>

              <Input
                label="Buscar punto de venta"
                placeholder="Buscar por nombre o ID"
                value={searchTerm}
                startAdornment={<Search size={16} />}
                onChange={(event) => setSearchTerm(event.target.value)}
              />

              {locationsLoading ? (
                <SkeletonRows rows={4} />
              ) : availableLocations.length === 0 ? (
                <EmptyState
                  title="Sin puntos de venta"
                  description="Crea la primera sede para habilitar operacion POS y organizar la cobertura del negocio."
                  icon={<MapPin size={22} />}
                  action={
                    <Button onClick={focusCreateForm}>
                      <Plus size={16} />
                      Crear primer punto
                    </Button>
                  }
                />
              ) : filteredLocations.length === 0 ? (
                <EmptyState
                  title="Sin resultados"
                  description="No hay puntos de venta con ese nombre o ID."
                  icon={<Search size={22} />}
                  action={
                    <Button variant="secondary" onClick={() => setSearchTerm('')}>
                      Limpiar busqueda
                    </Button>
                  }
                />
              ) : (
                <ScrollPanel
                  className="admin-pos-list"
                  maxHeightClassName="max-h-[30rem]"
                  tabIndex={0}
                  aria-label="Puntos de venta disponibles"
                >
                  {filteredLocations.map((location, index) => (
                    <LocationListItem
                      key={location.id}
                      location={location}
                      index={index}
                      isHighlighted={location.id === highlightedLocation?.id}
                    />
                  ))}
                </ScrollPanel>
              )}
            </section>
          </div>
        </div>
      </Card>
    </div>
  );
}

function LocationListItem({
  location,
  index,
  isHighlighted,
}: {
  location: Location;
  index: number;
  isHighlighted: boolean;
}) {
  return (
    <article className="admin-pos-item" data-highlighted={isHighlighted}>
      <div className="admin-pos-item__main">
        <span className="admin-pos-item__avatar" aria-hidden="true">
          <Store size={17} />
        </span>
        <div className="admin-pos-item__copy">
          <div className="admin-pos-item__title-row">
            <h3>{location.name}</h3>
            <StatusBadge label={isHighlighted ? 'Destacado' : 'Operativo'} tone={isHighlighted ? 'info' : 'success'} />
          </div>
          <div className="admin-pos-item__meta">
            <span>
              <Hash size={13} />
              ID {location.id}
            </span>
            <span>
              <MapPin size={13} />
              Punto {index + 1}
            </span>
          </div>
        </div>
      </div>

      <div className="admin-pos-item__status">
        <StatusBadge label="Activo" tone="success" />
      </div>
    </article>
  );
}

function normalizeSearch(value: string) {
  return value.trim().toLocaleLowerCase('es-CO');
}
