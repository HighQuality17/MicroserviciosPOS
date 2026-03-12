import { useEffect, useMemo, useState } from 'react';
import { Boxes, PackagePlus, Shapes } from 'lucide-react';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { Input } from '@/components/Input';
import { SummaryCard } from '@/components/SummaryCard';
import { posApi } from '@/services/api/posApi';
import { useAppStore } from '@/store/appStore';
import type { CatalogCombo, CatalogVariant } from '@/types/api';
import { formatCurrency } from '@/utils/format';

export function CombosPage() {
  const addSessionCombo = useAppStore((state) => state.addSessionCombo);

  const [combos, setCombos] = useState<CatalogCombo[]>([]);
  const [variants, setVariants] = useState<CatalogVariant[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [creatingCombo, setCreatingCombo] = useState(false);
  const [addingItems, setAddingItems] = useState(false);

  const [comboName, setComboName] = useState('');
  const [comboPrice, setComboPrice] = useState(0);
  const [comboActive, setComboActive] = useState(true);
  const [selectedComboId, setSelectedComboId] = useState<number>(0);
  const [selectedVariantId, setSelectedVariantId] = useState<number>(0);
  const [qty, setQty] = useState(1);

  const variantsById = useMemo(
    () => new Map(variants.map((variant) => [variant.id, variant])),
    [variants],
  );

  useEffect(() => {
    void refreshCatalog();
  }, []);

  useEffect(() => {
    if (combos.length > 0 && selectedComboId === 0) {
      setSelectedComboId(combos[0].id);
    }
  }, [combos, selectedComboId]);

  useEffect(() => {
    if (variants.length > 0 && selectedVariantId === 0) {
      setSelectedVariantId(variants[0].id);
    }
  }, [selectedVariantId, variants]);

  async function refreshCatalog() {
    try {
      setLoadingCatalog(true);
      setCatalogError(null);

      const [combosResponse, variantsResponse] = await Promise.all([
        posApi.getCombos(),
        posApi.getVariants(),
      ]);

      setCombos(combosResponse);
      setVariants(variantsResponse);
    } catch (error) {
      setCatalogError(
        error instanceof Error
          ? error.message
          : 'No fue posible cargar combos y variantes',
      );
    } finally {
      setLoadingCatalog(false);
    }
  }

  async function handleCreateCombo() {
    if (!comboName.trim()) {
      setSubmitError('El nombre del combo es obligatorio.');
      return;
    }

    try {
      setCreatingCombo(true);
      setSubmitError(null);
      setMessage(null);

      const combo = await posApi.createCombo({
        name: comboName.trim(),
        sale_price: comboPrice,
        active: comboActive,
      });

      addSessionCombo(combo);
      setComboName('');
      setComboPrice(0);
      setComboActive(true);
      setMessage(`Combo #${combo.id} creado correctamente.`);
      await refreshCatalog();
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : 'No se pudo crear el combo',
      );
    } finally {
      setCreatingCombo(false);
    }
  }

  async function handleAddComboItems() {
    if (selectedComboId <= 0 || selectedVariantId <= 0) {
      setSubmitError('Selecciona un combo y una variante.');
      return;
    }
    if (qty <= 0) {
      setSubmitError('La cantidad debe ser mayor a 0.');
      return;
    }

    try {
      setAddingItems(true);
      setSubmitError(null);
      setMessage(null);

      await posApi.addComboItems(selectedComboId, {
        items: [{ variant_id: selectedVariantId, qty }],
      });

      const selectedVariant = variantsById.get(selectedVariantId);
      setMessage(
        `Variante ${selectedVariant?.product_name ?? selectedVariantId} agregada al combo #${selectedComboId}.`,
      );
      setQty(1);
      await refreshCatalog();
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : 'No se pudieron agregar items al combo',
      );
    } finally {
      setAddingItems(false);
    }
  }

  return (
    <div className="grid gap-4">
      <div className="grid gap-4 md:grid-cols-3">
        <SummaryCard
          title="Combos activos"
          value={String(combos.length)}
          hint="Leidos desde backend"
          icon={<Boxes size={18} />}
        />
        <SummaryCard
          title="Variantes disponibles"
          value={String(variants.length)}
          hint="Usadas para armar combos"
          icon={<Shapes size={18} />}
        />
        <SummaryCard
          title="Cobertura"
          value={combos.length > 0 ? 'Activa' : 'Pendiente'}
          hint="Pantalla lista para futura edicion y baja"
          icon={<PackagePlus size={18} />}
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

      {catalogError ? (
        <div className="rounded-3xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {catalogError}
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[440px_minmax(0,1fr)]">
        <div className="grid gap-4">
          <Card>
            <p className="text-sm text-slate-400">Crear combo</p>
            <h2 className="font-display text-2xl font-bold text-white">
              Alta comercial
            </h2>

            <div className="mt-5 grid gap-4">
              <Input
                label="Nombre"
                value={comboName}
                onChange={(event) => setComboName(event.target.value)}
                placeholder="Combo desayuno"
              />
              <Input
                type="number"
                min={0}
                label="Precio de venta"
                value={comboPrice}
                onChange={(event) => setComboPrice(Number(event.target.value))}
              />

              <label className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-950/50 px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-white">Activo</p>
                  <p className="text-xs text-slate-500">
                    Solo combos activos deben aparecer en POS.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={comboActive}
                  onChange={(event) => setComboActive(event.target.checked)}
                  className="h-5 w-5 rounded border-slate-600 bg-slate-900 text-teal-400"
                />
              </label>

              <div className="flex gap-3">
                <Button
                  disabled={creatingCombo || !comboName.trim()}
                  onClick={handleCreateCombo}
                >
                  {creatingCombo ? 'Guardando...' : 'Crear combo'}
                </Button>
                <Button variant="secondary" disabled>
                  Editar proximamente
                </Button>
              </div>
            </div>
          </Card>

          <Card>
            <p className="text-sm text-slate-400">Agregar items al combo</p>
            <h2 className="font-display text-2xl font-bold text-white">
              Composicion comercial
            </h2>

            <div className="mt-5 grid gap-4">
              <label className="block space-y-2">
                <span className="text-sm font-medium text-slate-200">Combo</span>
                <select
                  value={selectedComboId}
                  onChange={(event) => setSelectedComboId(Number(event.target.value))}
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-sm text-slate-100 outline-none focus:border-teal-400/70"
                >
                  {combos.length === 0 ? (
                    <option value={0}>Sin combos cargados</option>
                  ) : (
                    combos.map((combo) => (
                      <option key={combo.id} value={combo.id}>
                        #{combo.id} · {combo.name}
                      </option>
                    ))
                  )}
                </select>
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-medium text-slate-200">Variante</span>
                <select
                  value={selectedVariantId}
                  onChange={(event) => setSelectedVariantId(Number(event.target.value))}
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-sm text-slate-100 outline-none focus:border-teal-400/70"
                >
                  {variants.length === 0 ? (
                    <option value={0}>Sin variantes cargadas</option>
                  ) : (
                    variants.map((variant) => (
                      <option key={variant.id} value={variant.id}>
                        #{variant.id} · {variant.product_name} · {variant.size} · {variant.sku}
                      </option>
                    ))
                  )}
                </select>
              </label>

              <Input
                type="number"
                min={1}
                label="Cantidad"
                value={qty}
                onChange={(event) => setQty(Number(event.target.value))}
              />

              <div className="flex gap-3">
                <Button
                  disabled={addingItems || combos.length === 0 || variants.length === 0}
                  onClick={handleAddComboItems}
                >
                  {addingItems ? 'Guardando...' : 'Agregar item'}
                </Button>
                <Button variant="secondary" disabled>
                  Reordenar proximamente
                </Button>
              </div>
            </div>
          </Card>
        </div>

        <Card>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm text-slate-400">Listado real</p>
              <h2 className="font-display text-2xl font-bold text-white">Combos comerciales</h2>
            </div>
            <Button variant="secondary" onClick={() => void refreshCatalog()}>
              Refrescar
            </Button>
          </div>

          {loadingCatalog ? (
            <div className="mt-6 grid gap-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={index}
                  className="h-28 animate-pulse rounded-3xl border border-slate-800 bg-slate-950/50"
                />
              ))}
            </div>
          ) : combos.length === 0 ? (
            <div className="mt-6">
              <EmptyState
                title="Sin combos cargados"
                description="Crea el primer combo y usa variantes existentes para definir su contenido."
              />
            </div>
          ) : (
            <div className="mt-6 grid gap-4">
              {combos.map((combo) => (
                <div
                  key={combo.id}
                  className="rounded-3xl border border-slate-800 bg-slate-950/50 p-5"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex items-center gap-3">
                        <p className="font-display text-xl font-bold text-white">
                          {combo.name}
                        </p>
                        <span
                          className={`rounded-full px-3 py-1 text-xs ${
                            combo.active
                              ? 'bg-emerald-500/15 text-emerald-300'
                              : 'bg-slate-700/60 text-slate-300'
                          }`}
                        >
                          {combo.active ? 'Activo' : 'Inactivo'}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-slate-500">
                        ID {combo.id} · {combo.items.length} items configurados
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <p className="font-display text-2xl font-bold text-teal-300">
                        {formatCurrency(Number(combo.sale_price))}
                      </p>
                      <div className="flex gap-2">
                        <Button variant="ghost" disabled>
                          Editar
                        </Button>
                        <Button variant="ghost" disabled>
                          Desactivar
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-3">
                    {combo.items.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-slate-700 px-4 py-3 text-sm text-slate-500">
                        El combo aun no tiene variantes asociadas.
                      </div>
                    ) : (
                      combo.items.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-950/40 px-4 py-3"
                        >
                          <div>
                            <p className="text-sm font-medium text-white">
                              {item.variant.product_name}
                            </p>
                            <p className="text-xs text-slate-500">
                              {item.variant.size} · {item.variant.sku} · qty {item.qty}
                            </p>
                          </div>
                          <p className="text-sm font-semibold text-slate-300">
                            {formatCurrency(Number(item.variant.sale_price))}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
