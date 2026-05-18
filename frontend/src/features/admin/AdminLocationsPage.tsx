import '@/features/admin/admin-d1.css';
import { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  CircleOff,
  Edit3,
  Hash,
  MapPin,
  MapPinned,
  Plus,
  Power,
  PowerOff,
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
import { Modal } from '@/components/Modal';
import { ModulePageHeader } from '@/components/ModulePageHeader';
import type { ModulePageHeaderCard } from '@/components/ModulePageHeader';
import { PaginationControls } from '@/components/PaginationControls';
import { ScrollPanel } from '@/components/ScrollPanel';
import { SectionHeader } from '@/components/SectionHeader';
import { StatusBadge } from '@/components/StatusBadge';
import { posApi } from '@/services/api/posApi';
import { useAppStore } from '@/store/appStore';
import type { Location } from '@/types/api';

type BadgeTone = 'default' | 'success' | 'warning' | 'danger' | 'info';
type LocationStatusFilter = 'ALL' | 'ACTIVE' | 'INACTIVE';
const LOCATION_ITEMS_PER_PAGE = 8;

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
  const [adminLocations, setAdminLocations] = useState<Location[]>(availableLocations);
  const [locationName, setLocationName] = useState('');
  const [locationNameError, setLocationNameError] = useState<string | null>(null);
  const [locationMessage, setLocationMessage] = useState<string | null>(null);
  const [locationSubmitError, setLocationSubmitError] = useState<string | null>(null);
  const [creatingLocation, setCreatingLocation] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<LocationStatusFilter>('ALL');
  const [locationsPage, setLocationsPage] = useState(1);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [editName, setEditName] = useState('');
  const [editNameError, setEditNameError] = useState<string | null>(null);
  const [editingLocationSaving, setEditingLocationSaving] = useState(false);
  const [statusTarget, setStatusTarget] = useState<Location | null>(null);
  const [statusUpdatingId, setStatusUpdatingId] = useState<number | null>(null);

  useEffect(() => {
    void refreshLocations();
  }, []);

  const totalLocations = adminLocations.length;
  const activeLocations = adminLocations.filter(isLocationActive).length;
  const inactiveLocations = totalLocations - activeLocations;
  const highlightedLocation =
    (currentLocation && adminLocations.find((location) => location.id === currentLocation.id)) ??
    adminLocations.find(isLocationActive) ??
    adminLocations[0] ??
    null;
  const filteredLocations = useMemo(() => {
    const normalizedSearch = normalizeSearch(searchTerm);

    return adminLocations.filter((location) => {
      const isActive = isLocationActive(location);
      const matchesStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'ACTIVE' && isActive) ||
        (statusFilter === 'INACTIVE' && !isActive);
      const matchesSearch =
        !normalizedSearch ||
        normalizeSearch(`${location.name} ${location.id}`).includes(normalizedSearch);

      return matchesStatus && matchesSearch;
    });
  }, [adminLocations, searchTerm, statusFilter]);
  const locationTotalPages = Math.ceil(filteredLocations.length / LOCATION_ITEMS_PER_PAGE);
  const safeLocationsPage = Math.min(locationsPage, Math.max(locationTotalPages, 1));
  const paginatedLocations = useMemo(() => {
    const startIndex = (safeLocationsPage - 1) * LOCATION_ITEMS_PER_PAGE;

    return filteredLocations.slice(startIndex, startIndex + LOCATION_ITEMS_PER_PAGE);
  }, [filteredLocations, safeLocationsPage]);

  useEffect(() => {
    setLocationsPage(1);
  }, [searchTerm, statusFilter]);

  useEffect(() => {
    if (locationsPage > Math.max(locationTotalPages, 1)) {
      setLocationsPage(Math.max(locationTotalPages, 1));
    }
  }, [locationTotalPages, locationsPage]);

  const locationsTone: BadgeTone = locationsLoading
    ? 'info'
    : activeLocations > 0
      ? 'success'
      : totalLocations > 0
        ? 'warning'
        : 'default';
  const locationsLabel = locationsLoading
    ? 'Actualizando'
    : activeLocations > 0
      ? 'Cobertura lista'
      : totalLocations > 0
        ? 'Todo inactivo'
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
      value: locationsLoading ? '...' : String(inactiveLocations),
      note: inactiveLocations > 0 ? 'Ocultos de operacion normal' : 'Sin sedes pausadas',
      accent: inactiveLocations > 0 ? 'warning' : 'default',
      icon: <CircleOff size={16} />,
      iconTone: inactiveLocations > 0 ? 'warning' : 'default',
      badge: {
        label: inactiveLocations > 0 ? 'Revisar' : 'Sin bajas',
        tone: inactiveLocations > 0 ? 'warning' : 'default',
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
      const locations = await posApi.getLocations({ status: 'ALL' });
      setAdminLocations(locations);
      setAvailableLocations(locations.filter(isLocationActive));
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

  function openEditModal(location: Location) {
    setEditingLocation(location);
    setEditName(location.name);
    setEditNameError(null);
    setLocationSubmitError(null);
    setLocationMessage(null);
  }

  async function handleEditLocation(event?: React.FormEvent<HTMLFormElement>) {
    event?.preventDefault();

    if (!editingLocation) {
      return;
    }

    const normalizedName = editName.trim();

    if (!normalizedName) {
      setEditNameError('Escribe un nombre valido.');
      return;
    }

    try {
      setEditingLocationSaving(true);
      setEditNameError(null);
      setLocationSubmitError(null);
      setLocationMessage(null);
      const updatedLocation = await posApi.updateLocation(editingLocation.id, {
        name: normalizedName,
      });
      setLocationMessage(`Punto de venta ${updatedLocation.name} actualizado.`);
      setEditingLocation(null);
      await refreshLocations();
    } catch (error) {
      setEditNameError(
        error instanceof Error
          ? error.message
          : 'No fue posible actualizar el punto de venta.',
      );
    } finally {
      setEditingLocationSaving(false);
    }
  }

  function requestStatusChange(location: Location) {
    if (isLocationActive(location)) {
      setStatusTarget(location);
      setLocationSubmitError(null);
      setLocationMessage(null);
      return;
    }

    void handleStatusChange(location, true);
  }

  async function handleStatusChange(location: Location, isActive: boolean) {
    try {
      setStatusUpdatingId(location.id);
      setLocationSubmitError(null);
      setLocationMessage(null);
      const updatedLocation = await posApi.updateLocationStatus(location.id, {
        isActive,
      });
      setStatusTarget(null);
      setLocationMessage(
        isActive
          ? `Punto de venta ${updatedLocation.name} activado.`
          : `Punto de venta ${updatedLocation.name} desactivado.`,
      );
      await refreshLocations();
    } catch (error) {
      setLocationSubmitError(
        error instanceof Error
          ? error.message
          : 'No fue posible actualizar el estado del punto de venta.',
      );
    } finally {
      setStatusUpdatingId(null);
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
        helpText="Inactivos se conservan para historial y no aparecen en operacion normal. No hay borrado destructivo."
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
            description="Crea, edita y pausa puntos de venta sin perder historial de caja, ventas o inventario."
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
                <span>Al crear, queda activo y disponible para operacion normal.</span>
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

              <div className="admin-location-toolbar">
                <Input
                  label="Buscar punto de venta"
                  placeholder="Buscar por nombre o ID"
                  value={searchTerm}
                  startAdornment={<Search size={16} />}
                  onChange={(event) => setSearchTerm(event.target.value)}
                />

                <div className="admin-location-filter" aria-label="Filtrar puntos por estado">
                  {locationStatusFilters.map((filter) => (
                    <button
                      key={filter.value}
                      type="button"
                      data-active={statusFilter === filter.value}
                      onClick={() => setStatusFilter(filter.value)}
                    >
                      {filter.label}
                    </button>
                  ))}
                </div>
              </div>

              {locationsLoading ? (
                <SkeletonRows rows={4} />
              ) : adminLocations.length === 0 ? (
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
                  description="No hay puntos de venta con esos filtros."
                  icon={<Search size={22} />}
                  action={
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setSearchTerm('');
                        setStatusFilter('ALL');
                      }}
                    >
                      Limpiar filtros
                    </Button>
                  }
                />
              ) : (
                <>
                  <ScrollPanel
                    className="admin-pos-list"
                    maxHeightClassName="max-h-[34rem]"
                    tabIndex={0}
                    aria-label="Puntos de venta disponibles"
                  >
                    {paginatedLocations.map((location, index) => (
                      <LocationListItem
                        key={location.id}
                        location={location}
                        index={(safeLocationsPage - 1) * LOCATION_ITEMS_PER_PAGE + index}
                        isHighlighted={location.id === highlightedLocation?.id}
                        isUpdatingStatus={statusUpdatingId === location.id}
                        onEdit={() => openEditModal(location)}
                        onStatusChange={() => requestStatusChange(location)}
                      />
                    ))}
                  </ScrollPanel>
                  {filteredLocations.length > LOCATION_ITEMS_PER_PAGE ? (
                    <PaginationControls
                      page={safeLocationsPage}
                      totalPages={locationTotalPages}
                      totalItems={filteredLocations.length}
                      itemLabel="puntos visibles"
                      onPageChange={setLocationsPage}
                    />
                  ) : null}
                </>
              )}
            </section>
          </div>
        </div>
      </Card>

      <Modal
        open={Boolean(editingLocation)}
        title="Editar punto de venta"
        subtitle="Actualiza el nombre visible. Historial de ventas, caja e inventario se mantiene."
        size="sm"
        onClose={() => {
          if (!editingLocationSaving) {
            setEditingLocation(null);
          }
        }}
      >
        <form className="admin-location-modal-form" onSubmit={handleEditLocation}>
          <Input
            label="Nombre del punto"
            value={editName}
            error={editNameError ?? undefined}
            placeholder="Ej: POS Centro"
            onChange={(event) => {
              setEditName(event.target.value);
              setEditNameError(null);
            }}
          />
          <div className="admin-location-modal-actions">
            <Button
              type="button"
              variant="secondary"
              disabled={editingLocationSaving}
              onClick={() => setEditingLocation(null)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              loading={editingLocationSaving}
              disabled={!editName.trim()}
            >
              <Edit3 size={16} />
              Guardar cambios
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={Boolean(statusTarget)}
        title="Desactivar punto de venta"
        subtitle="No se borrara historial. El punto dejara de estar disponible para operacion normal."
        size="sm"
        onClose={() => {
          if (statusUpdatingId === null) {
            setStatusTarget(null);
          }
        }}
      >
        {statusTarget ? (
          <div className="admin-location-confirm">
            <div className="admin-location-confirm__target">
              <span className="admin-pos-item__avatar" aria-hidden="true">
                <Store size={17} />
              </span>
              <div>
                <strong>{statusTarget.name}</strong>
                <p>ID {statusTarget.id}</p>
              </div>
            </div>
            <FeedbackMessage tone="warning">
              Si tiene caja abierta, backend bloqueara esta accion.
            </FeedbackMessage>
            <div className="admin-location-modal-actions">
              <Button
                type="button"
                variant="secondary"
                disabled={statusUpdatingId !== null}
                onClick={() => setStatusTarget(null)}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                variant="danger"
                loading={statusUpdatingId === statusTarget.id}
                onClick={() => void handleStatusChange(statusTarget, false)}
              >
                <PowerOff size={16} />
                Desactivar
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}

const locationStatusFilters: Array<{ value: LocationStatusFilter; label: string }> = [
  { value: 'ALL', label: 'Todos' },
  { value: 'ACTIVE', label: 'Activos' },
  { value: 'INACTIVE', label: 'Inactivos' },
];

function LocationListItem({
  location,
  index,
  isHighlighted,
  isUpdatingStatus,
  onEdit,
  onStatusChange,
}: {
  location: Location;
  index: number;
  isHighlighted: boolean;
  isUpdatingStatus: boolean;
  onEdit: () => void;
  onStatusChange: () => void;
}) {
  const isActive = isLocationActive(location);

  return (
    <article
      className="admin-pos-item"
      data-highlighted={isHighlighted}
      data-active={isActive}
    >
      <div className="admin-pos-item__main">
        <span className="admin-pos-item__avatar" aria-hidden="true">
          <Store size={17} />
        </span>
        <div className="admin-pos-item__copy">
          <div className="admin-pos-item__title-row">
            <h3>{location.name}</h3>
            <div className="admin-pos-item__badges">
              <StatusBadge label={isActive ? 'Activo' : 'Inactivo'} tone={isActive ? 'success' : 'warning'} />
              {isHighlighted ? <StatusBadge label="Destacado" tone="info" /> : null}
            </div>
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

      <div className="admin-pos-item__actions">
        <Button size="sm" variant="secondary" onClick={onEdit} aria-label={`Editar ${location.name}`}>
          <Edit3 size={15} />
          Editar
        </Button>
        <Button
          size="sm"
          variant={isActive ? 'danger' : 'secondary'}
          loading={isUpdatingStatus}
          onClick={onStatusChange}
          aria-label={`${isActive ? 'Desactivar' : 'Activar'} ${location.name}`}
        >
          {isActive ? <PowerOff size={15} /> : <Power size={15} />}
          {isActive ? 'Desactivar' : 'Activar'}
        </Button>
      </div>
    </article>
  );
}

function isLocationActive(location: Location) {
  return location.isActive !== false;
}

function normalizeSearch(value: string) {
  return value.trim().toLocaleLowerCase('es-CO');
}
