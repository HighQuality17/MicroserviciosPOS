import { useEffect, useState } from 'react';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { Input } from '@/components/Input';
import { posApi } from '@/services/api/posApi';
import { useAppStore } from '@/store/appStore';
import { useSessionStore } from '@/store/sessionStore';
import type { IngredientDimension, StockListItem } from '@/types/api';

export function IngredientsPage() {
  const currentUser = useSessionStore((state) => state.currentUser);
  const currentLocation = useAppStore((state) => state.currentLocation);
  const sessionIngredients = useAppStore((state) => state.sessionIngredients);
  const addSessionIngredient = useAppStore((state) => state.addSessionIngredient);

  const [stockItems, setStockItems] = useState<StockListItem[]>([]);
  const [name, setName] = useState('');
  const [dimension, setDimension] = useState<IngredientDimension>('WEIGHT');
  const [defaultUnitCode, setDefaultUnitCode] = useState('g');
  const [ingredientId, setIngredientId] = useState(1);
  const [qty, setQty] = useState(0);
  const [unitCode, setUnitCode] = useState('g');
  const [reason, setReason] = useState('Ingreso manual');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function loadStock() {
    try {
      const response = await posApi.getStock(currentLocation.id);
      setStockItems(response.items);
    } catch {
      setStockItems([]);
    }
  }

  useEffect(() => {
    void loadStock();
  }, [currentLocation.id]);

  async function handleCreateIngredient() {
    try {
      setLoading(true);
      setError(null);
      const ingredient = await posApi.createIngredient({
        name,
        dimension,
        default_unit_code: defaultUnitCode,
      });
      addSessionIngredient(ingredient);
      setName('');
      setMessage(`Ingrediente #${ingredient.id} creado.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear ingrediente');
    } finally {
      setLoading(false);
    }
  }

  async function handleAdjustStock() {
    if (!currentUser) return;
    try {
      setLoading(true);
      setError(null);
      await posApi.adjustStock({
        location_id: currentLocation.id,
        ingredient_id: ingredientId,
        qty,
        unit_code: unitCode,
        reason,
        user_id: currentUser.id,
      });
      setMessage('Stock ajustado correctamente.');
      await loadStock();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo ajustar stock');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[430px_minmax(0,1fr)]">
      <div className="grid gap-4">
        <Card>
          <p className="text-sm text-slate-400">Alta rápida</p>
          <h2 className="font-display text-2xl font-bold text-white">Crear ingrediente</h2>
          <div className="mt-5 grid gap-4">
            <Input label="Nombre" value={name} onChange={(event) => setName(event.target.value)} />
            <label className="block space-y-2">
              <span className="text-sm font-medium text-slate-200">Dimensión</span>
              <select
                value={dimension}
                onChange={(event) => setDimension(event.target.value as IngredientDimension)}
                className="w-full rounded-2xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-sm text-slate-100 outline-none focus:border-teal-400/70"
              >
                <option value="WEIGHT">WEIGHT</option>
                <option value="VOLUME">VOLUME</option>
                <option value="COUNT">COUNT</option>
              </select>
            </label>
            <Input
              label="Unidad por defecto"
              value={defaultUnitCode}
              onChange={(event) => setDefaultUnitCode(event.target.value)}
            />
            <Button disabled={loading || !name.trim()} onClick={handleCreateIngredient}>
              Crear ingrediente
            </Button>
          </div>
        </Card>

        <Card>
          <p className="text-sm text-slate-400">Inventario</p>
          <h2 className="font-display text-2xl font-bold text-white">Ajuste de stock</h2>
          <div className="mt-5 grid gap-4">
            <Input type="number" label="ingredient_id" value={ingredientId} onChange={(event) => setIngredientId(Number(event.target.value))} />
            <Input type="number" label="Cantidad" value={qty} onChange={(event) => setQty(Number(event.target.value))} />
            <Input label="unit_code" value={unitCode} onChange={(event) => setUnitCode(event.target.value)} />
            <Input label="Razón" value={reason} onChange={(event) => setReason(event.target.value)} />
            <Button disabled={loading} onClick={handleAdjustStock}>
              Ajustar stock
            </Button>
          </div>
        </Card>

        {message ? <div className="rounded-3xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">{message}</div> : null}
        {error ? <div className="rounded-3xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</div> : null}
      </div>

      <Card>
        <p className="text-sm text-slate-400">Lectura real del backend</p>
        <h2 className="font-display text-2xl font-bold text-white">Stock por ubicación</h2>
        <div className="mt-6 grid gap-3">
          {stockItems.length === 0 ? (
            <EmptyState
              title="Sin stock registrado"
              description="El endpoint GET /stock ya está conectado. Ajusta inventario o carga datos iniciales."
            />
          ) : (
            stockItems.map((item) => (
              <div key={`${item.ingredientId}-${item.locationId}`} className="rounded-3xl border border-slate-800 bg-slate-950/50 p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-medium text-white">{item.ingredient.name}</p>
                    <p className="mt-1 text-sm text-slate-400">
                      {item.ingredient.dimension} · unidad base
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-display text-2xl font-bold text-teal-300">
                      {Number(item.qtyOnHandBase).toLocaleString('es-CO')}
                    </p>
                    <p className="text-xs text-slate-500">{currentLocation.name}</p>
                  </div>
                </div>
              </div>
            ))
          )}

          {sessionIngredients.length > 0 ? (
            <div className="rounded-3xl border border-sky-400/20 bg-sky-400/10 p-4 text-sm text-sky-100">
              Ingredientes creados en esta sesión: {sessionIngredients.map((item) => item.name).join(', ')}
            </div>
          ) : null}
        </div>
      </Card>
    </div>
  );
}
