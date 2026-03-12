import { useEffect, useMemo, useState } from 'react';
import { Boxes, FlaskConical, Warehouse } from 'lucide-react';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { Input } from '@/components/Input';
import { SummaryCard } from '@/components/SummaryCard';
import { posApi } from '@/services/api/posApi';
import { useAppStore } from '@/store/appStore';
import { useSessionStore } from '@/store/sessionStore';
import type { Ingredient, IngredientDimension, StockListItem } from '@/types/api';
import { normalizeNumberInput, parseNumberInput } from '@/utils/numberInput';

const unitsByDimension: Record<IngredientDimension, string[]> = {
  WEIGHT: ['g', 'kg'],
  VOLUME: ['ml', 'L'],
  COUNT: ['unit'],
};

export function IngredientsPage() {
  const currentUser = useSessionStore((state) => state.currentUser);
  const currentLocation = useAppStore((state) => state.currentLocation);
  const sessionIngredients = useAppStore((state) => state.sessionIngredients);
  const addSessionIngredient = useAppStore((state) => state.addSessionIngredient);

  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [stockItems, setStockItems] = useState<StockListItem[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [loadingStock, setLoadingStock] = useState(true);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [stockError, setStockError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [creatingIngredient, setCreatingIngredient] = useState(false);
  const [adjustingStock, setAdjustingStock] = useState(false);

  const [name, setName] = useState('');
  const [dimension, setDimension] = useState<IngredientDimension>('WEIGHT');
  const [defaultUnitCode, setDefaultUnitCode] = useState('g');

  const [selectedLocationId, setSelectedLocationId] = useState(currentLocation.id);
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
  const availableAdjustUnits = unitsByDimension[selectedIngredient?.dimension ?? dimension];

  useEffect(() => {
    setDefaultUnitCode(availableDefaultUnits[0]);
  }, [availableDefaultUnits]);

  useEffect(() => {
    setUnitCode(availableAdjustUnits[0]);
  }, [availableAdjustUnits]);

  useEffect(() => {
    if (mergedIngredients.length === 0 && selectedIngredientId !== '') {
      setSelectedIngredientId('');
    }
  }, [mergedIngredients, selectedIngredientId]);

  useEffect(() => {
    void Promise.all([loadIngredients(), loadStock(currentLocation.id)]);
  }, [currentLocation.id]);

  async function loadIngredients() {
    try {
      setLoadingCatalog(true);
      setCatalogError(null);
      const response = await posApi.getIngredients();
      setIngredients(response);
    } catch (error) {
      setIngredients([]);
      setCatalogError(
        error instanceof Error
          ? error.message
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
      const response = await posApi.getStock(locationId);
      setStockItems(response.items);
    } catch (error) {
      setStockItems([]);
      setStockError(
        error instanceof Error ? error.message : 'No fue posible cargar stock',
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
      setName('');
      setMessage(`Ingrediente #${ingredient.id} creado correctamente.`);
      await loadIngredients();
      await loadStock(currentLocation.id);
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

  return (
    <div className="grid gap-4">
      <div className="grid gap-4 md:grid-cols-3">
        <SummaryCard
          title="Ingredientes"
          value={String(mergedIngredients.length)}
          hint={
            ingredients.length > 0
              ? 'Leidos desde backend'
              : 'Usando fallback de sesion o stock'
          }
          icon={<FlaskConical size={18} />}
        />
        <SummaryCard
          title="Items con stock"
          value={String(stockItems.length)}
          hint={currentLocation.name}
          icon={<Warehouse size={18} />}
        />
        <SummaryCard
          title="Movimientos"
          value="Proximamente"
          hint="Seccion visual lista para auditoria de inventario"
          icon={<Boxes size={18} />}
        />
      </div>

      {message ? (
        <div className="rounded-3xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
          {message}
        </div>
      ) : null}

      {submitError ? (
        <div className="rounded-3xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {submitError}
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[440px_minmax(0,1fr)]">
        <div className="grid gap-4">
          <Card>
            <p className="text-sm text-slate-400">Crear ingrediente</p>
            <h2 className="font-display text-2xl font-bold text-white">
              Gestion base del inventario
            </h2>

            <div className="mt-5 grid gap-4">
              <Input
                label="Nombre"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Leche entera"
              />

              <label className="block space-y-2">
                <span className="text-sm font-medium text-slate-200">Dimension</span>
                <select
                  value={dimension}
                  onChange={(event) =>
                    setDimension(event.target.value as IngredientDimension)
                  }
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-sm text-slate-100 outline-none focus:border-teal-400/70"
                >
                  <option value="WEIGHT">WEIGHT</option>
                  <option value="VOLUME">VOLUME</option>
                  <option value="COUNT">COUNT</option>
                </select>
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-medium text-slate-200">
                  Unidad por defecto
                </span>
                <select
                  value={defaultUnitCode}
                  onChange={(event) => setDefaultUnitCode(event.target.value)}
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-sm text-slate-100 outline-none focus:border-teal-400/70"
                >
                  {availableDefaultUnits.map((unit) => (
                    <option key={unit} value={unit}>
                      {unit}
                    </option>
                  ))}
                </select>
              </label>

              <Button
                disabled={creatingIngredient || !name.trim()}
                onClick={handleCreateIngredient}
              >
                {creatingIngredient ? 'Guardando...' : 'Crear ingrediente'}
              </Button>
            </div>
          </Card>

          <Card>
            <p className="text-sm text-slate-400">Ajuste de stock</p>
            <h2 className="font-display text-2xl font-bold text-white">
              Operacion administrativa
            </h2>

            <div className="mt-5 grid gap-4">
              <label className="block space-y-2">
                <span className="text-sm font-medium text-slate-200">Location</span>
                <select
                  value={selectedLocationId}
                  onChange={(event) => setSelectedLocationId(Number(event.target.value))}
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-sm text-slate-100 outline-none focus:border-teal-400/70"
                >
                  <option value={currentLocation.id}>
                    #{currentLocation.id} · {currentLocation.name}
                  </option>
                </select>
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-medium text-slate-200">
                  Ingrediente
                </span>
                <select
                  value={selectedIngredientId}
                  onChange={(event) => setSelectedIngredientId(event.target.value)}
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-sm text-slate-100 outline-none focus:border-teal-400/70"
                >
                  {mergedIngredients.length === 0 ? (
                    <option value="">{mergedIngredients.length === 0 ? 'Sin ingredientes disponibles' : 'Selecciona un ingrediente'}</option>
                  ) : (
                    mergedIngredients.map((ingredient) => (
                      <option key={ingredient.id} value={String(ingredient.id)}>
                        #{ingredient.id} · {ingredient.name}
                      </option>
                    ))
                  )}
                </select>
              </label>

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

                <label className="block space-y-2">
                  <span className="text-sm font-medium text-slate-200">Unidad</span>
                  <select
                    value={unitCode}
                    onChange={(event) => setUnitCode(event.target.value)}
                    className="w-full rounded-2xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-sm text-slate-100 outline-none focus:border-teal-400/70"
                  >
                    {availableAdjustUnits.map((unit) => (
                      <option key={unit} value={unit}>
                        {unit}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <Input
                label="Razon"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder="Ej: Ingreso manual"
              />

              <div className="rounded-2xl border border-slate-800 bg-slate-950/50 px-4 py-3 text-sm text-slate-300">
                Usuario aplicado: <span className="font-medium text-white">{currentUser?.name ?? 'Sin sesion'}</span>
              </div>

              <Button
                disabled={adjustingStock || mergedIngredients.length === 0}
                onClick={handleAdjustStock}
              >
                {adjustingStock ? 'Aplicando...' : 'Ajustar stock'}
              </Button>
            </div>
          </Card>
        </div>

        <div className="grid gap-4">
          <Card>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm text-slate-400">Listado de ingredientes</p>
                <h2 className="font-display text-2xl font-bold text-white">
                  Catalogo base
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
                    className="h-20 animate-pulse rounded-3xl border border-slate-800 bg-slate-950/50"
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
              <div className="mt-6 grid gap-3">
                {mergedIngredients.map((ingredient) => (
                  <div
                    key={ingredient.id}
                    className="rounded-3xl border border-slate-800 bg-slate-950/50 p-4"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="font-medium text-white">{ingredient.name}</p>
                        <p className="mt-1 text-sm text-slate-400">
                          {ingredient.dimension} · {ingredient.defaultUnitCode}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-slate-500">ID {ingredient.id}</p>
                        <p className="text-xs text-slate-600">
                          {ingredients.length > 0 ? 'backend' : 'fallback'}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {catalogError ? (
              <div className="mt-4 rounded-2xl border border-sky-400/20 bg-sky-400/10 px-4 py-3 text-sm text-sky-100">
                GET /ingredients no esta disponible o fallo. La vista usa ingredientes de sesion y del stock para no bloquear la operacion.
              </div>
            ) : null}
          </Card>

          <Card>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm text-slate-400">Existencias reales</p>
                <h2 className="font-display text-2xl font-bold text-white">
                  Stock por location
                </h2>
              </div>
              <Button
                variant="secondary"
                onClick={() => void loadStock(selectedLocationId)}
              >
                Refrescar
              </Button>
            </div>

            {loadingStock ? (
              <div className="mt-6 grid gap-3">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div
                    key={index}
                    className="h-24 animate-pulse rounded-3xl border border-slate-800 bg-slate-950/50"
                  />
                ))}
              </div>
            ) : stockItems.length === 0 ? (
              <div className="mt-6">
                <EmptyState
                  title="Sin stock registrado"
                  description="Ajusta inventario para empezar a ver existencias por location."
                />
              </div>
            ) : (
              <div className="mt-6 grid gap-3">
                {stockItems.map((item) => (
                  <div
                    key={`${item.ingredientId}-${item.locationId}`}
                    className="rounded-3xl border border-slate-800 bg-slate-950/50 p-4"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="font-medium text-white">{item.ingredient.name}</p>
                        <p className="mt-1 text-sm text-slate-400">
                          {item.location.name} · {item.ingredient.dimension}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-display text-2xl font-bold text-teal-300">
                          {Number(item.qtyOnHandBase).toLocaleString('es-CO')}
                        </p>
                        <p className="text-xs text-slate-500">unidad base</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {stockError ? (
              <div className="mt-4 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                {stockError}
              </div>
            ) : null}
          </Card>

          <Card>
            <p className="text-sm text-slate-400">Movimientos</p>
            <h2 className="font-display text-2xl font-bold text-white">
              Auditoria de inventario
            </h2>
            <div className="mt-6">
              <EmptyState
                title="Historial de movimientos proximamente"
                description="La base visual ya esta lista para mostrar ingresos, salidas, ajustes y referencias de venta cuando el backend exponga el endpoint GET correspondiente."
              />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

