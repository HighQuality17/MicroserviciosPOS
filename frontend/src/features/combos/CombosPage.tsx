import { useEffect, useMemo, useState } from 'react';
import { Boxes, PackagePlus, Shapes } from 'lucide-react';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { AccessState } from '@/components/AccessState';
import { EmptyState } from '@/components/EmptyState';
import { FeedbackMessage } from '@/components/FeedbackMessage';
import { CheckboxField } from '@/components/CheckboxField';
import { Input } from '@/components/Input';
import { ScrollPanel } from '@/components/ScrollPanel';
import { Select } from '@/components/Select';
import { SummaryCard } from '@/components/SummaryCard';
import { posApi } from '@/services/api/posApi';
import { useAppStore } from '@/store/appStore';
import type { CatalogCombo, CatalogVariant } from '@/types/api';
import { isAccessDeniedError, translateProtectedError } from '@/utils/apiError';
import { formatCurrency } from '@/utils/format';
import { normalizeNumberInput, parseNumberInput } from '@/utils/numberInput';

export function CombosPage() {
  const addSessionCombo = useAppStore((state) => state.addSessionCombo);

  const [combos, setCombos] = useState<CatalogCombo[]>([]);
  const [variants, setVariants] = useState<CatalogVariant[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [catalogAccessDenied, setCatalogAccessDenied] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [creatingCombo, setCreatingCombo] = useState(false);
  const [addingItems, setAddingItems] = useState(false);

  const [comboName, setComboName] = useState('');
  const [comboPriceInput, setComboPriceInput] = useState('');
  const [comboActive, setComboActive] = useState(true);
  const [selectedComboId, setSelectedComboId] = useState('');
  const [selectedVariantId, setSelectedVariantId] = useState('');
  const [qtyInput, setQtyInput] = useState('');

  const variantsById = useMemo(
    () => new Map(variants.map((variant) => [variant.id, variant])),
    [variants],
  );

  useEffect(() => {
    void refreshCatalog();
  }, []);

  async function refreshCatalog() {
    try {
      setLoadingCatalog(true);
      setCatalogError(null);
      setCatalogAccessDenied(false);

      const [combosResponse, variantsResponse] = await Promise.all([
        posApi.getCombos(),
        posApi.getVariants(),
      ]);

      setCombos(combosResponse);
      setVariants(variantsResponse);
    } catch (error) {
      setCatalogAccessDenied(isAccessDeniedError(error));
      setCatalogError(
        error instanceof Error
          ? translateProtectedError(error, 'No fue posible cargar combos y variantes')
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
    const comboPrice = parseNumberInput(comboPriceInput);
    if (comboPrice === null || comboPrice < 0) {
      setSubmitError('Ingresa un precio de venta válido.');
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
      setComboPriceInput('');
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
    const comboId = Number(selectedComboId);
    const variantId = Number(selectedVariantId);
    const qty = parseNumberInput(qtyInput);

    if (!selectedComboId || !selectedVariantId || comboId <= 0 || variantId <= 0) {
      setSubmitError('Selecciona un combo y una variante.');
      return;
    }
    if (qty === null || qty <= 0) {
      setSubmitError('La cantidad debe ser mayor a 0.');
      return;
    }

    try {
      setAddingItems(true);
      setSubmitError(null);
      setMessage(null);

      await posApi.addComboItems(comboId, {
        items: [{ variant_id: variantId, qty }],
      });

      const selectedVariant = variantsById.get(variantId);
      setMessage(
        `Variante ${selectedVariant?.product_name ?? variantId} agregada al combo #${comboId}.`,
      );
      setQtyInput('');
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
    <div className="grid min-w-0 gap-4 sm:gap-5">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <SummaryCard
          title="Combos activos"
          value={String(combos.length)}
          hint="Leídos desde backend"
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
          hint="Pantalla lista para futura edición y baja"
          icon={<PackagePlus size={18} />}
        />
      </div>

      {message ? <FeedbackMessage tone="success">{message}</FeedbackMessage> : null}

      {submitError ? <FeedbackMessage tone="error">{submitError}</FeedbackMessage> : null}

      {catalogError ? <FeedbackMessage tone="error">{catalogError}</FeedbackMessage> : null}

      {catalogAccessDenied ? (
        <AccessState description="Tu perfil actual no tiene permiso para consultar o gestionar combos." />
      ) : null}

      <div className="grid min-w-0 items-start gap-4 xl:grid-cols-[440px_minmax(0,1fr)]">
        <div className="grid min-w-0 gap-4 sm:gap-5">
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
                placeholder="Ej: 12000"
                value={comboPriceInput}
                onChange={(event) => {
                  const nextValue = normalizeNumberInput(event.target.value);
                  if (nextValue !== null) {
                    setComboPriceInput(nextValue);
                  }
                }}
              />
              <CheckboxField
                label="Activo"
                description="Solo combos activos deben aparecer en POS."
                checked={comboActive}
                onChange={(event) => setComboActive(event.target.checked)}
              />

              <div className="flex flex-wrap gap-3">
                <Button
                  disabled={creatingCombo || !comboName.trim()}
                  onClick={handleCreateCombo}
                >
                  {creatingCombo ? 'Guardando...' : 'Crear combo'}
                </Button>
                <Button variant="secondary" disabled>
                  Editar próximamente
                </Button>
              </div>
            </div>
          </Card>

          <Card>
            <p className="text-sm text-slate-400">Agregar items al combo</p>
            <h2 className="font-display text-2xl font-bold text-white">
              Composición comercial
            </h2>

            <div className="mt-5 grid gap-4">
              <Select
                label="Combo"
                value={selectedComboId}
                onChange={(event) => setSelectedComboId(event.target.value)}
              >
                <option value="">
                  {combos.length === 0 ? 'Sin combos cargados' : 'Selecciona un combo'}
                </option>
                {combos.map((combo) => (
                  <option key={combo.id} value={String(combo.id)}>
                    #{combo.id} - {combo.name}
                  </option>
                ))}
              </Select>

              <Select
                label="Variante"
                value={selectedVariantId}
                onChange={(event) => setSelectedVariantId(event.target.value)}
              >
                <option value="">
                  {variants.length === 0
                    ? 'Sin variantes cargadas'
                    : 'Selecciona una variante'}
                </option>
                {variants.map((variant) => (
                  <option key={variant.id} value={String(variant.id)}>
                    #{variant.id} - {variant.product_name} - {variant.size} - {variant.sku}
                  </option>
                ))}
              </Select>


              <Input
                type="number"
                min={1}
                label="Cantidad"
                placeholder="Ej: 2"
                value={qtyInput}
                onChange={(event) => {
                  const nextValue = normalizeNumberInput(event.target.value);
                  if (nextValue !== null) {
                    setQtyInput(nextValue);
                  }
                }}
              />

              <div className="flex flex-wrap gap-3">
                <Button
                  disabled={addingItems || combos.length === 0 || variants.length === 0}
                  onClick={handleAddComboItems}
                >
                  {addingItems ? 'Guardando...' : 'Agregar item'}
                </Button>
                <Button variant="secondary" disabled>
                  Reordenar próximamente
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
                  className="surface-subtle h-28 animate-pulse rounded-3xl"
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
            <ScrollPanel className="mt-6 grid gap-4" tabIndex={0} aria-label="Listado de combos comerciales">
              {combos.map((combo) => (
                <div
                  key={combo.id}
                  className="surface-subtle rounded-3xl p-5"
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
                              ? 'border border-emerald-400/20 bg-emerald-500/15 text-emerald-200'
                              : 'border border-white/10 bg-white/[0.04] text-[color:var(--text-secondary)]'
                          }`}
                        >
                          {combo.active ? 'Activo' : 'Inactivo'}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-[color:var(--text-faint)]">
                        ID {combo.id} - {combo.items.length} items configurados
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <p className="metric-accent font-display text-2xl font-bold">
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
                      <div className="rounded-2xl border border-dashed border-[color:var(--line)] bg-white/[0.02] px-4 py-3 text-sm text-[color:var(--text-faint)]">
                        El combo aún no tiene variantes asociadas.
                      </div>
                    ) : (
                      combo.items.map((item) => (
                        <div
                          key={item.id}
                          className="surface-subtle flex items-center justify-between rounded-2xl px-4 py-3"
                        >
                          <div>
                            <p className="text-sm font-medium text-white">
                              {item.variant.product_name}
                            </p>
                            <p className="text-xs text-[color:var(--text-faint)]">
                              {item.variant.size} - {item.variant.sku} - qty {item.qty}
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
            </ScrollPanel>
          )}
        </Card>
      </div>
    </div>
  );
}



