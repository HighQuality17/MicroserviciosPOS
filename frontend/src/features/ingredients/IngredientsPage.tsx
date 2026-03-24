import { useEffect, useMemo, useState } from 'react';
import { Boxes, CircleDot, FlaskConical, Warehouse } from 'lucide-react';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { AccessState } from '@/components/AccessState';
import { EmptyState } from '@/components/EmptyState';
import { FeedbackMessage } from '@/components/FeedbackMessage';
import { Input } from '@/components/Input';
import { ScrollPanel } from '@/components/ScrollPanel';
import { Select } from '@/components/Select';
import { StatusBadge } from '@/components/StatusBadge';
import { posApi } from '@/services/api/posApi';
import { useAppStore } from '@/store/appStore';
import { useSessionStore } from '@/store/sessionStore';
import type { Ingredient, IngredientDimension, StockListItem } from '@/types/api';
import { isAccessDeniedError, translateProtectedError } from '@/utils/apiError';
import { normalizeNumberInput, parseNumberInput } from '@/utils/numberInput';

const unitsByDimension: Record<IngredientDimension, string[]> = {
  WEIGHT: ['g', 'kg'],
  VOLUME: ['ml', 'L'],
  COUNT: ['unit'],
};

const dimensionLabels: Record<IngredientDimension, string> = {
  WEIGHT: 'Peso',
  VOLUME: 'Volumen',
  COUNT: 'Cantidad',
};

const unitLabels: Record<string, string> = {
  g: 'g',
  kg: 'kg',
  ml: 'ml',
  L: 'L',
  unit: 'unidad',
};

function getDimensionLabel(dimension: IngredientDimension) {
  return dimensionLabels[dimension];
}

function getUnitLabel(unitCode: string) {
  return unitLabels[unitCode] ?? unitCode;
}

export function IngredientsPage() {
  const currentUser = useSessionStore((state) => state.currentUser);
  const currentLocation = useAppStore((state) => state.currentLocation);
  const availableLocations = useAppStore((state) => state.availableLocations);
  const sessionIngredients = useAppStore((state) => state.sessionIngredients);
  const addSessionIngredient = useAppStore((state) => state.addSessionIngredient);

  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [stockItems, setStockItems] = useState<StockListItem[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [loadingStock, setLoadingStock] = useState(true);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [stockError, setStockError] = useState<string | null>(null);
  const [catalogAccessDenied, setCatalogAccessDenied] = useState(false);
  const [stockAccessDenied, setStockAccessDenied] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [creatingIngredient, setCreatingIngredient] = useState(false);
  const [adjustingStock, setAdjustingStock] = useState(false);

  const [name, setName] = useState('');
  const [dimension, setDimension] = useState<IngredientDimension>('WEIGHT');
  const [defaultUnitCode, setDefaultUnitCode] = useState('g');

  const [selectedLocationId, setSelectedLocationId] = useState<number | null>(null);
  const [selectedIngredientId, setSelectedIngredientId] = useState('');
  const [qtyInput, setQtyInput] = useState('');
  const [unitCode, setUnitCode] = useState('g');
  const [reason, setReason] = useState('');

  const mergedIngredients = useMemo(() => {
    const stockIngredients = stockItems.map((item) => item.ingredient);
    const combined = [...ingredients, ...sessionIngredients, ...stockIngredients];
    const map = new Map<number, Ingredient>();

    for (const ingredient of combined) {
      map.set(ingredient.id, ingredient);
    }

    return Array.from(map.values()).sort((left, right) =>
      left.name.localeCompare(right.name),
    );
  }, [ingredients, sessionIngredients, stockItems]);

  const selectedIngredient =
    mergedIngredients.find((ingredient) => ingredient.id === Number(selectedIngredientId)) ?? null;

  const availableDefaultUnits = unitsByDimension[dimension];
  const availableAdjustUnits = selectedIngredient
  ? unitsByDimension[selectedIngredient.dimension]
  : [];

  useEffect(() => {
    setSelectedLocationId(currentLocation?.id ?? null);
  }, [currentLocation]);

  useEffect(() => {
    setDefaultUnitCode(availableDefaultUnits[0]);
  }, [availableDefaultUnits]);

  useEffect(() => {
  if (!selectedIngredient) {
    setUnitCode('');
    return;
  }

  const allowedUnits = unitsByDimension[selectedIngredient.dimension];
  const defaultUnit = selectedIngredient.defaultUnitCode;

  setUnitCode(
    allowedUnits.includes(defaultUnit as (typeof allowedUnits)[number])
      ? defaultUnit
      : allowedUnits[0]
  );
}, [selectedIngredient]);

  useEffect(() => {
    if (mergedIngredients.length === 0 && selectedIngredientId !== '') {
      setSelectedIngredientId('');
    }
  }, [mergedIngredients, selectedIngredientId]);

  useEffect(() => {
    void loadIngredients();
  }, []);

  useEffect(() => {
    if (selectedLocationId === null) {
      setStockItems([]);
      return;
    }

    void loadStock(selectedLocationId);
  }, [selectedLocationId]);

  async function loadIngredients() {
    try {
      setLoadingCatalog(true);
      setCatalogError(null);
      setCatalogAccessDenied(false);
      const response = await posApi.getIngredients();
      setIngredients(response);
    } catch (error) {
      setIngredients([]);
      setCatalogAccessDenied(isAccessDeniedError(error));
      setCatalogError(
        error instanceof Error
          ? translateProtectedError(error, 'No fue posible cargar ingredientes')
          : 'No fue posible cargar ingredientes',
      );
    } finally {
      setLoadingCatalog(false);
    }
  }

  async function loadStock(locationId: number) {
    try {
      setLoadingStock(true);
      setStockError(null);
      setStockAccessDenied(false);
      const response = await posApi.getStock(locationId);
      setStockItems(response.items);
    } catch (error) {
      setStockItems([]);
      setStockAccessDenied(isAccessDeniedError(error));
      setStockError(
        error instanceof Error
          ? translateProtectedError(error, 'No fue posible cargar stock')
          : 'No fue posible cargar stock',
      );
    } finally {
      setLoadingStock(false);
    }
  }

  async function handleCreateIngredient() {
    if (!name.trim()) {
      setSubmitError('El nombre del ingrediente es obligatorio.');
      return;
    }

    try {
      setCreatingIngredient(true);
      setSubmitError(null);
      setMessage(null);

      const ingredient = await posApi.createIngredient({
        name: name.trim(),
        dimension,
        default_unit_code: defaultUnitCode,
      });

      addSessionIngredient(ingredient);
      setSelectedIngredientId(String(ingredient.id));
      setName('');
      setMessage(`Ingrediente #${ingredient.id} creado correctamente.`);
      await loadIngredients();
      if (selectedLocationId !== null) {
        await loadStock(selectedLocationId);
      }
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : 'No se pudo crear el ingrediente',
      );
    } finally {
      setCreatingIngredient(false);
    }
  }

  async function handleAdjustStock() {
    if (!currentUser) return;
    if (!selectedIngredient) {
      setSubmitError('Selecciona un ingrediente para ajustar stock.');
      return;
    }
    if (selectedLocationId === null) {
      setSubmitError('Selecciona una ubicación válida para ajustar stock.');
      return;
    }
    const qty = parseNumberInput(qtyInput);
    if (qty === null || qty <= 0) {
      setSubmitError('Ingresa una cantidad valida mayor a 0.');
      return;
    }

    try {
      setAdjustingStock(true);
      setSubmitError(null);
      setMessage(null);

      await posApi.adjustStock({
        location_id: selectedLocationId,
        ingredient_id: selectedIngredient.id,
        qty,
        unit_code: unitCode,
        reason,
        user_id: currentUser.id,
      });

      setQtyInput('');
      setReason('');
      setMessage('Stock ajustado correctamente.');
      await loadStock(selectedLocationId);
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : 'No se pudo ajustar stock',
      );
    } finally {
      setAdjustingStock(false);
    }
  }

  const selectedLocation =
    availableLocations.find((location) => location.id === selectedLocationId) ??
    currentLocation ??
    null;
  const inventoryStatusTone = catalogAccessDenied || stockAccessDenied
    ? 'danger'
    : catalogError || stockError
      ? 'warning'
      : loadingCatalog || loadingStock
        ? 'info'
        : selectedLocation
          ? 'success'
          : 'default';
  const inventoryStatusLabel = catalogAccessDenied || stockAccessDenied
    ? 'Acceso restringido'
    : catalogError || stockError
      ? 'Revision requerida'
      : loadingCatalog || loadingStock
        ? 'Sincronizando'
        : selectedLocation
          ? 'Inventario operativo'
          : 'Selecciona ubicacion';
  const ingredientCatalogTone = loadingCatalog
    ? 'info'
    : catalogError
      ? 'warning'
      : mergedIngredients.length > 0
        ? 'success'
        : 'default';
  const ingredientCatalogLabel = 'Creados';
  const stockTone = loadingStock
    ? 'info'
    : selectedLocation
      ? stockItems.length > 0
        ? 'info'
        : 'warning'
      : 'default';
  const stockQtyByIngredientId = new Map(
    stockItems.map((item) => [item.ingredientId, Number(item.qtyOnHandBase)]),
  );
  const outOfStockCount = selectedLocation
    ? mergedIngredients.filter((ingredient) => {
        const qtyOnHand = stockQtyByIngredientId.get(ingredient.id) ?? 0;
        return qtyOnHand <= 0;
      }).length
    : 0;
  const outOfStockTone = loadingStock
    ? 'info'
    : !selectedLocation
      ? 'default'
      : outOfStockCount > 0
        ? 'warning'
        : 'success';
  const outOfStockLabel = loadingStock
    ? 'Calculando'
    : !selectedLocation
      ? 'Sin POS'
      : 'Requieren reposicion';
  const outOfStockValue = loadingStock
    ? '...'
    : String(outOfStockCount);
  return (
    <div className="grid min-w-0 gap-4 sm:gap-5">
      <section className="pos-status-bar" aria-label="Estado operativo de ingredientes">
        <div className="pos-status-shell">
          <div className="pos-status-intro">
            <div className="pos-status-beacon" aria-hidden="true">
              <CircleDot size={18} />
            </div>
            <div className="min-w-0">
              <p className="section-kicker">Operacion de inventario</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <h1 className="font-display text-lg font-bold theme-text-strong sm:text-[1.35rem]">
                  Control de ingredientes
                </h1>
                <StatusBadge label={inventoryStatusLabel} tone={inventoryStatusTone} />
              </div>
              <p className="mt-2 max-w-2xl text-sm text-[color:var(--text-secondary)]">
                Resume catalogo, stock por ubicacion y estado operativo sin quitar
                protagonismo a la gestion administrativa.
              </p>
            </div>
          </div>

          <div className="pos-status-grid">
            <div className="pos-status-chip">
              <span className="pos-status-chip__icon" aria-hidden="true" data-tone={ingredientCatalogTone}>
                <FlaskConical size={16} />
              </span>
              <div className="min-w-0">
                <p className="pos-status-chip__label">Ingredientes</p>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <p className="pos-status-chip__value">{String(mergedIngredients.length)}</p>
                  <StatusBadge label={ingredientCatalogLabel} tone={ingredientCatalogTone} />
                </div>
                <p className="pos-status-chip__meta">
                  {catalogError
                    ? 'Usando datos de sesion o stock para mantener la operacion'
                    : loadingCatalog
                      ? 'Leyendo catalogo base desde backend'
                      : 'Catalogo base disponible para inventario'}
                </p>
              </div>
            </div>

            <div className="pos-status-chip">
              <span className="pos-status-chip__icon" aria-hidden="true" data-tone={stockTone}>
                <Warehouse size={16} />
              </span>
              <div className="min-w-0">
                <p className="pos-status-chip__label">Items con stock</p>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <p className="pos-status-chip__value">{String(stockItems.length)}</p>
                  <StatusBadge
                    label={selectedLocation ? `POS #${selectedLocation.id}` : 'Sin POS'}
                    tone={selectedLocation ? 'info' : 'default'}
                  />
                </div>
                <p className="pos-status-chip__meta">
                  {loadingStock
                    ? 'Consultando existencias para la ubicacion seleccionada'
                    : selectedLocation
                      ? selectedLocation.name
                      : 'Selecciona una ubicacion para ver stock real'}
                </p>
              </div>
            </div>

            <div className="pos-status-chip">
              <span className="pos-status-chip__icon" aria-hidden="true" data-tone={outOfStockTone}>
                <Boxes size={16} />
              </span>
              <div className="min-w-0">
                <p className="pos-status-chip__label">Sin stock</p>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <p className="pos-status-chip__value">{outOfStockValue}</p>
                  <StatusBadge label={outOfStockLabel} tone={outOfStockTone} />
                </div>
                <p className="pos-status-chip__meta">
                  {selectedLocation
                    ? 'Ingredientes sin existencias disponibles en la ubicacion actual'
                    : 'Selecciona una ubicacion para detectar ingredientes pendientes de reposicion'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {message ? <FeedbackMessage tone="success">{message}</FeedbackMessage> : null}

      {submitError ? <FeedbackMessage tone="error">{submitError}</FeedbackMessage> : null}

      {!currentLocation ? (
        <Card>
          <EmptyState
            title="Sin punto de venta activo"
            description="Selecciona una ubicación real en el encabezado para consultar y ajustar inventario."
          />
        </Card>
      ) : null}

      {catalogAccessDenied || stockAccessDenied ? (
        <AccessState description="Tu perfil actual no tiene permiso para consultar o gestionar ingredientes e inventario." />
      ) : null}

      <div className="grid min-w-0 items-start gap-4 xl:grid-cols-[440px_minmax(0,1fr)]">
        <div className="grid min-w-0 gap-4 sm:gap-5">
          <Card>
            <p className="text-sm theme-text-muted">Crear ingrediente</p>
            <h2 className="font-display text-2xl font-bold theme-text-strong">
              Gestión base del inventario
            </h2>

            <div className="mt-5 grid gap-4">
              <Input
                label="Nombre"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Leche entera"
              />

              <Select
                label="Dimensión"
                value={dimension}
                onChange={(event) =>
                  setDimension(event.target.value as IngredientDimension)
                }
              >
                <option value="WEIGHT">{getDimensionLabel('WEIGHT')}</option>
                <option value="VOLUME">{getDimensionLabel('VOLUME')}</option>
                <option value="COUNT">{getDimensionLabel('COUNT')}</option>
              </Select>


              <Select
                label="Unidad por defecto"
                value={defaultUnitCode}
                onChange={(event) => setDefaultUnitCode(event.target.value)}
              >
                {availableDefaultUnits.map((unit) => (
                  <option key={unit} value={unit}>
                    {getUnitLabel(unit)}
                  </option>
                ))}
              </Select>


              <Button
                disabled={creatingIngredient || !name.trim()}
                onClick={handleCreateIngredient}
              >
                {creatingIngredient ? 'Guardando...' : 'Crear ingrediente'}
              </Button>
            </div>
          </Card>

          <Card>
            <p className="text-sm theme-text-muted">Ajuste de stock</p>
            <h2 className="font-display text-2xl font-bold theme-text-strong">
              Operación administrativa
            </h2>

            <div className="mt-5 grid gap-4">
              <Select
                label="Ubicación"
                value={selectedLocationId ?? ""}
                onChange={(event) => {
                  const value = event.currentTarget.value;
                  setSelectedLocationId(value ? Number(value) : null);
                }}
              >
                <option value="">Selecciona una ubicación</option>
                {availableLocations.map((location) => (
                  <option key={location.id} value={location.id}>
                    #{location.id} / {location.name}
                  </option>
                ))}
              </Select>


              <Select
                label="Ingrediente"
                value={selectedIngredientId}
                onChange={(event) => setSelectedIngredientId(event.target.value)}
              >
                {mergedIngredients.length === 0 ? (
                  <option value="">
                    {mergedIngredients.length === 0 ? 'Sin ingredientes disponibles' : 'Selecciona un ingrediente'}
                  </option>
                ) : (
                  mergedIngredients.map((ingredient) => (
                    <option key={ingredient.id} value={String(ingredient.id)}>
                      #{ingredient.id} / {ingredient.name}
                    </option>
                  ))
                )}
              </Select>


              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  type="number"
                  label="Cantidad"
                  placeholder="Ej: 2"
                  value={qtyInput}
                  onChange={(event) => {
                    const nextValue = normalizeNumberInput(event.target.value, {
                      allowDecimal: true,
                    });
                    if (nextValue !== null) {
                      setQtyInput(nextValue);
                    }
                  }}
                />

                <Select
                  label="Unidad"
                  value={unitCode}
                  onChange={(event) => setUnitCode(event.target.value)}
                >
                  {availableAdjustUnits.map((unit) => (
                    <option key={unit} value={unit}>
                      {getUnitLabel(unit)}
                    </option>
                  ))}
                </Select>
              </div>

              <Input
                label="Razón"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder="Ej: Ingreso manual"
              />

              <div className="toolbar-shell rounded-2xl px-4 py-3 text-sm text-[color:var(--text-secondary)]">
                Usuario aplicado: <span className="font-medium theme-text-strong">{currentUser?.name ?? 'Sin sesión'}</span>
              </div>

              <Button
                disabled={
                  adjustingStock ||
                  selectedLocationId === null ||
                  mergedIngredients.length === 0
                }
                onClick={handleAdjustStock}
              >
                {adjustingStock ? 'Aplicando...' : 'Ajustar stock'}
              </Button>
            </div>
          </Card>
        </div>

        <div className="grid min-w-0 gap-4 sm:gap-5">
          <Card>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm theme-text-muted">Listado de ingredientes</p>
                <h2 className="font-display text-2xl font-bold theme-text-strong">
                  Catálogo base
                </h2>
              </div>
              <Button variant="secondary" onClick={() => void loadIngredients()}>
                Refrescar
              </Button>
            </div>

            {loadingCatalog ? (
              <div className="mt-6 grid gap-3">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div
                    key={index}
                    className="data-list-card h-20 animate-pulse rounded-3xl"
                  />
                ))}
              </div>
            ) : mergedIngredients.length === 0 ? (
              <div className="mt-6">
                <EmptyState
                  title="Sin ingredientes cargados"
                  description="Crea el primer ingrediente para comenzar a controlar inventario."
                />
              </div>
            ) : (
              <ScrollPanel className="mt-6 grid gap-3" tabIndex={0} aria-label="Catálogo de ingredientes">
                {mergedIngredients.map((ingredient) => (
                  <div
                    key={ingredient.id}
                    className="data-list-card rounded-3xl p-4"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="font-medium theme-text-strong">{ingredient.name}</p>
                        <p className="mt-1 text-sm theme-text-muted">
                          {getDimensionLabel(ingredient.dimension)} -{' '}
                          {getUnitLabel(ingredient.defaultUnitCode)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-[color:var(--text-faint)]">ID {ingredient.id}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </ScrollPanel>
            )}

            {catalogError ? (
              <FeedbackMessage tone="info" className="mt-4">
                GET /ingredients no está disponible o falló. La vista usa ingredientes de sesión y del stock para no bloquear la operación.
              </FeedbackMessage>
            ) : null}
          </Card>

          <Card>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm theme-text-muted">Existencias reales</p>
                <h2 className="font-display text-2xl font-bold theme-text-strong">
                  Stock por ubicación
                </h2>
              </div>
              <Button
                variant="secondary"
                onClick={() => {
                  if (selectedLocationId !== null) {
                    void loadStock(selectedLocationId);
                  }
                }}
              >
                Refrescar
              </Button>
            </div>

            {loadingStock ? (
              <div className="mt-6 grid gap-3">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div
                    key={index}
                    className="data-list-card h-24 animate-pulse rounded-3xl"
                  />
                ))}
              </div>
            ) : stockItems.length === 0 ? (
              <div className="mt-6">
                <EmptyState
                  title="Sin stock registrado"
                  description="Ajusta inventario para empezar a ver existencias por ubicación."
                />
              </div>
            ) : (
              <ScrollPanel className="mt-6 grid gap-3" tabIndex={0} aria-label="Stock por ubicación">
                {stockItems.map((item) => (
                  <div
                    key={`${item.ingredientId}-${item.locationId}`}
                    className="data-list-card rounded-3xl p-4"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="font-medium theme-text-strong">{item.ingredient.name}</p>
                        <p className="mt-1 text-sm theme-text-muted">
                          {item.location.name} -{' '}
                          {getDimensionLabel(item.ingredient.dimension)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="metric-accent font-display text-2xl font-bold">
                          {Number(item.qtyOnHandBase).toLocaleString('es-CO')}
                        </p>
                        <p className="text-xs text-[color:var(--text-faint)]">unidad base</p>
                      </div>
                    </div>
                  </div>
                ))}
              </ScrollPanel>
            )}

            {stockError ? (
              <FeedbackMessage tone="error" className="mt-4">
                {stockError}
              </FeedbackMessage>
            ) : null}
          </Card>

          <Card>
            <p className="text-sm theme-text-muted">Movimientos</p>
            <h2 className="font-display text-2xl font-bold theme-text-strong">
              Auditoría de inventario
            </h2>
            <div className="mt-6">
              <EmptyState
                title="Sin movimientos recientes"
                description="Aquí se mostrarán los últimos ajustes de inventario."
              />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}







