import { useEffect, useMemo, useState } from 'react';
import { Boxes, PackagePlus, Shapes } from 'lucide-react';
import { AccessState } from '@/components/AccessState';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { CheckboxField } from '@/components/CheckboxField';
import { EmptyState } from '@/components/EmptyState';
import { FeedbackMessage } from '@/components/FeedbackMessage';
import { Input } from '@/components/Input';
import { LoadingState } from '@/components/LoadingState';
import {
  ModuleStatusCard,
  ModuleStatusHeader,
} from '@/components/ModuleStatusHeader';
import { Modal } from '@/components/Modal';
import { ScrollPanel } from '@/components/ScrollPanel';
import { Select } from '@/components/Select';
import { posApi } from '@/services/api/posApi';
import { useAppStore } from '@/store/appStore';
import type { CatalogCombo, CatalogVariant } from '@/types/api';
import { isAccessDeniedError, translateProtectedError } from '@/utils/apiError';
import {
  formatVariantDisplayName,
  formatVariantOptionLabel,
  formatVariantSubtitle,
} from '@/utils/catalog';
import { formatCurrency } from '@/utils/format';
import { normalizeNumberInput, parseNumberInput } from '@/utils/numberInput';

type DeleteConfirmationTarget = {
  id: number;
  name: string;
  detail: string;
};

type ComboCompositionDraftItem = {
  variant_id: number;
  qtyInput: string;
  variant: CatalogVariant;
};

function normalizeComboQty(value: number) {
  return Number(value.toFixed(3));
}

function formatComboQtyInput(value: number) {
  return String(normalizeComboQty(value));
}

function buildCompositionDraftItem(
  item: CatalogCombo['items'][number],
): ComboCompositionDraftItem {
  return {
    variant_id: item.variant_id,
    qtyInput: formatComboQtyInput(Number(item.qty)),
    variant: item.variant,
  };
}

export function CombosPage() {
  const addSessionCombo = useAppStore((state) => state.addSessionCombo);

  const [combos, setCombos] = useState<CatalogCombo[]>([]);
  const [variants, setVariants] = useState<CatalogVariant[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [refreshingCatalog, setRefreshingCatalog] = useState(false);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [catalogAccessDenied, setCatalogAccessDenied] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [creatingCombo, setCreatingCombo] = useState(false);
  const [addingItems, setAddingItems] = useState(false);
  const [savingCombo, setSavingCombo] = useState(false);
  const [togglingComboId, setTogglingComboId] = useState<number | null>(null);
  const [deletingCombo, setDeletingCombo] = useState(false);

  const [comboName, setComboName] = useState('');
  const [comboPriceInput, setComboPriceInput] = useState('');
  const [comboActive, setComboActive] = useState(true);
  const [selectedComboId, setSelectedComboId] = useState('');
  const [selectedVariantId, setSelectedVariantId] = useState('');
  const [qtyInput, setQtyInput] = useState('');
  const [comboSearch, setComboSearch] = useState('');

  const [comboEditorOpen, setComboEditorOpen] = useState(false);
  const [editingComboTarget, setEditingComboTarget] = useState<CatalogCombo | null>(
    null,
  );
  const [editComboName, setEditComboName] = useState('');
  const [editComboPriceInput, setEditComboPriceInput] = useState('');
  const [editComboActive, setEditComboActive] = useState(true);
  const [compositionEditorOpen, setCompositionEditorOpen] = useState(false);
  const [editingCompositionCombo, setEditingCompositionCombo] =
    useState<CatalogCombo | null>(null);
  const [compositionDraftItems, setCompositionDraftItems] = useState<
    ComboCompositionDraftItem[]
  >([]);
  const [compositionVariantId, setCompositionVariantId] = useState('');
  const [compositionQtyInput, setCompositionQtyInput] = useState('');
  const [savingComposition, setSavingComposition] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DeleteConfirmationTarget | null>(
    null,
  );

  const variantsById = useMemo(
    () => new Map(variants.map((variant) => [variant.id, variant])),
    [variants],
  );

  const filteredCombos = useMemo(() => {
    const normalizedSearch = comboSearch.trim().toLowerCase();

    if (!normalizedSearch) {
      return combos;
    }

    return combos.filter((combo) =>
      combo.name.toLowerCase().includes(normalizedSearch),
    );
  }, [combos, comboSearch]);

  const compositionAvailableVariants = useMemo(() => {
    const selectedVariantIds = new Set(
      compositionDraftItems.map((item) => item.variant_id),
    );

    return variants.filter((variant) => !selectedVariantIds.has(variant.id));
  }, [compositionDraftItems, variants]);

  const actionsLocked =
    catalogAccessDenied ||
    refreshingCatalog ||
    creatingCombo ||
    addingItems ||
    savingCombo ||
    savingComposition ||
    deletingCombo ||
    togglingComboId !== null;

  useEffect(() => {
    void refreshCatalog();
  }, []);

  async function refreshCatalog(options?: { background?: boolean }) {
    const background = options?.background ?? false;

    try {
      if (background) {
        setRefreshingCatalog(true);
      } else {
        setLoadingCatalog(true);
      }

      setCatalogError(null);
      setCatalogAccessDenied(false);

      const [combosResponse, variantsResponse] = await Promise.all([
        posApi.getCombos({ status: 'ALL' }),
        posApi.getVariants(),
      ]);

      setCombos(combosResponse);
      setVariants(variantsResponse);

      if (
        selectedComboId &&
        !combosResponse.some((combo) => String(combo.id) === selectedComboId)
      ) {
        setSelectedComboId('');
      }

      if (editingComboTarget) {
        const refreshedTarget = combosResponse.find(
          (combo) => combo.id === editingComboTarget.id,
        );

        if (!refreshedTarget) {
          setEditingComboTarget(null);
          setComboEditorOpen(false);
        }
      }

      if (editingCompositionCombo) {
        const refreshedCompositionTarget = combosResponse.find(
          (combo) => combo.id === editingCompositionCombo.id,
        );

        if (!refreshedCompositionTarget) {
          setEditingCompositionCombo(null);
          setCompositionDraftItems([]);
          setCompositionEditorOpen(false);
        }
      }
    } catch (error) {
      setCatalogAccessDenied(isAccessDeniedError(error));
      setCatalogError(
        error instanceof Error
          ? translateProtectedError(
              error,
              'No fue posible cargar combos y variantes',
            )
          : 'No fue posible cargar combos y variantes',
      );
    } finally {
      setLoadingCatalog(false);
      setRefreshingCatalog(false);
    }
  }

  function openComboEditor(combo: CatalogCombo) {
    setEditingComboTarget(combo);
    setEditComboName(combo.name);
    setEditComboPriceInput(String(Number(combo.sale_price)));
    setEditComboActive(combo.active);
    setComboEditorOpen(true);
    setSubmitError(null);
  }

  function openCompositionEditor(combo: CatalogCombo) {
    setEditingCompositionCombo(combo);
    setCompositionDraftItems(combo.items.map(buildCompositionDraftItem));
    setCompositionVariantId('');
    setCompositionQtyInput('');
    setCompositionEditorOpen(true);
    setSubmitError(null);
  }

  function handleCompositionQtyChange(variantId: number, nextValue: string) {
    const normalizedValue = normalizeNumberInput(nextValue, {
      allowDecimal: true,
    });

    if (normalizedValue === null) {
      return;
    }

    setCompositionDraftItems((current) =>
      current.map((item) =>
        item.variant_id === variantId
          ? { ...item, qtyInput: normalizedValue }
          : item,
      ),
    );
  }

  function handleRemoveCompositionItem(variantId: number) {
    setCompositionDraftItems((current) =>
      current.filter((item) => item.variant_id !== variantId),
    );
    setSubmitError(null);
  }

  function handleAddCompositionItem() {
    const variantId = Number(compositionVariantId);
    const qty = parseNumberInput(compositionQtyInput);

    if (!compositionVariantId || variantId <= 0) {
      setSubmitError('Selecciona un item operativo para agregar a la composicion.');
      return;
    }
    if (qty === null || qty <= 0) {
      setSubmitError('La cantidad del nuevo item debe ser mayor a 0.');
      return;
    }

    const selectedVariant = variantsById.get(variantId);
    if (!selectedVariant) {
      setSubmitError('El item seleccionado ya no esta disponible para composicion.');
      return;
    }

    setCompositionDraftItems((current) => {
      const existingItem = current.find((item) => item.variant_id === variantId);

      if (existingItem) {
        const existingQty = parseNumberInput(existingItem.qtyInput) ?? 0;
        return current.map((item) =>
          item.variant_id === variantId
            ? {
                ...item,
                qtyInput: formatComboQtyInput(existingQty + qty),
              }
            : item,
        );
      }

      return [
        ...current,
        {
          variant_id: variantId,
          qtyInput: formatComboQtyInput(qty),
          variant: selectedVariant,
        },
      ];
    });

    setCompositionVariantId('');
    setCompositionQtyInput('');
    setSubmitError(null);
  }

  async function handleSaveComposition() {
    if (!editingCompositionCombo) return;

    const itemsPayload: Array<{ variant_id: number; qty: number }> = [];

    for (const item of compositionDraftItems) {
      const qty = parseNumberInput(item.qtyInput);

      if (qty === null || qty <= 0) {
        setSubmitError(
          `La cantidad para ${formatVariantDisplayName(item.variant)} debe ser mayor a 0.`,
        );
        return;
      }

      itemsPayload.push({
        variant_id: item.variant_id,
        qty: normalizeComboQty(qty),
      });
    }

    try {
      setSavingComposition(true);
      setSubmitError(null);
      setMessage(null);

      await posApi.updateComboItems(editingCompositionCombo.id, {
        items: itemsPayload,
      });

      setCompositionEditorOpen(false);
      setMessage(
        itemsPayload.length > 0
          ? `Composicion del combo #${editingCompositionCombo.id} actualizada correctamente.`
          : `El combo #${editingCompositionCombo.id} quedo sin items configurados.`,
      );
      await refreshCatalog({ background: true });
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : 'No se pudo guardar la composicion del combo.',
      );
    } finally {
      setSavingComposition(false);
    }
  }

  async function handleCreateCombo() {
    if (!comboName.trim()) {
      setSubmitError('El nombre del combo es obligatorio.');
      return;
    }

    const comboPrice = parseNumberInput(comboPriceInput);
    if (comboPrice === null || comboPrice < 0) {
      setSubmitError('Ingresa un precio de venta valido.');
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
      setSelectedComboId(String(combo.id));
      setMessage(`Combo #${combo.id} creado correctamente.`);
      await refreshCatalog({ background: true });
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : 'No se pudo crear el combo',
      );
    } finally {
      setCreatingCombo(false);
    }
  }

  async function handleSaveCombo() {
    if (!editingComboTarget) return;

    if (!editComboName.trim()) {
      setSubmitError('El nombre del combo es obligatorio.');
      return;
    }

    const comboPrice = parseNumberInput(editComboPriceInput);
    if (comboPrice === null || comboPrice < 0) {
      setSubmitError('Ingresa un precio de venta valido.');
      return;
    }

    try {
      setSavingCombo(true);
      setSubmitError(null);
      setMessage(null);

      await posApi.updateCombo(editingComboTarget.id, {
        name: editComboName.trim(),
        sale_price: comboPrice,
        active: editComboActive,
      });

      setComboEditorOpen(false);
      setMessage(`Combo #${editingComboTarget.id} actualizado correctamente.`);
      await refreshCatalog({ background: true });
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : 'No se pudo actualizar el combo',
      );
    } finally {
      setSavingCombo(false);
    }
  }

  async function handleToggleComboStatus(combo: CatalogCombo) {
    try {
      setTogglingComboId(combo.id);
      setSubmitError(null);
      setMessage(null);

      await posApi.updateComboStatus(combo.id, {
        active: !combo.active,
      });

      setMessage(
        `Combo #${combo.id} ${combo.active ? 'desactivado' : 'activado'} correctamente.`,
      );
      await refreshCatalog({ background: true });
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : 'No se pudo cambiar el estado del combo seleccionado.',
      );
    } finally {
      setTogglingComboId(null);
    }
  }

  function requestComboDelete(combo: CatalogCombo) {
    setDeleteTarget({
      id: combo.id,
      name: combo.name,
      detail: `Combo #${combo.id} - ${combo.items.length} items configurados`,
    });
    setSubmitError(null);
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) return;

    try {
      setDeletingCombo(true);
      setSubmitError(null);
      setMessage(null);

      await posApi.deleteCombo(deleteTarget.id);

      if (editingComboTarget?.id === deleteTarget.id) {
        setEditingComboTarget(null);
        setComboEditorOpen(false);
      }

      if (selectedComboId === String(deleteTarget.id)) {
        setSelectedComboId('');
      }

      setDeleteTarget(null);
      setMessage(`Combo #${deleteTarget.id} eliminado correctamente.`);
      await refreshCatalog({ background: true });
    } catch (error) {
      setDeleteTarget(null);
      setSubmitError(
        error instanceof Error
          ? error.message
          : 'No se pudo eliminar el combo seleccionado.',
      );
    } finally {
      setDeletingCombo(false);
    }
  }

  async function handleAddComboItems() {
    const comboId = Number(selectedComboId);
    const variantId = Number(selectedVariantId);
    const qty = parseNumberInput(qtyInput);

    if (!selectedComboId || !selectedVariantId || comboId <= 0 || variantId <= 0) {
      setSubmitError('Selecciona un combo y un item operativo.');
      return;
    }
    if (qty === null || qty <= 0) {
      setSubmitError('La cantidad debe ser mayor a 0.');
      return;
    }

    const combo = combos.find((currentCombo) => currentCombo.id === comboId);
    if (!combo) {
      setSubmitError('El combo seleccionado ya no esta disponible.');
      return;
    }

    const nextItems = new Map<number, number>();
    for (const item of combo.items) {
      nextItems.set(item.variant_id, Number(item.qty));
    }

    const previousQty = nextItems.get(variantId) ?? 0;
    const nextQty = normalizeComboQty(previousQty + qty);
    nextItems.set(variantId, nextQty);

    try {
      setAddingItems(true);
      setSubmitError(null);
      setMessage(null);

      await posApi.addComboItems(comboId, {
        items: Array.from(nextItems.entries()).map(([itemVariantId, itemQty]) => ({
          variant_id: itemVariantId,
          qty: itemQty,
        })),
      });

      const selectedVariant = variantsById.get(variantId);
      const itemLabel = selectedVariant
        ? formatVariantDisplayName(selectedVariant)
        : `item ${variantId}`;

      setMessage(
        previousQty > 0
          ? `Cantidad actualizada para ${itemLabel} en el combo #${comboId}. Total configurado: ${nextQty}.`
          : `Item ${itemLabel} agregado al combo #${comboId}.`,
      );
      setQtyInput('');
      await refreshCatalog({ background: true });
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

  const activeCombosCount = combos.filter((combo) => combo.active).length;
  const activeVariantsCount = variants.filter((variant) => variant.active).length;
  const readyCombosCount = combos.filter(
    (combo) => combo.active && combo.items.length > 0,
  ).length;
  const comboStatusTone = catalogAccessDenied
    ? 'danger'
    : catalogError
      ? 'warning'
      : loadingCatalog
        ? 'info'
        : 'success';
  const comboStatusLabel = catalogAccessDenied
    ? 'Acceso restringido'
    : catalogError
      ? 'Revision requerida'
      : loadingCatalog
        ? 'Sincronizando'
        : combos.length > 0
          ? 'Modulo operativo'
          : 'Sin combos';
  const comboCoverageTone = loadingCatalog
    ? 'info'
    : readyCombosCount > 0
      ? 'success'
      : activeCombosCount > 0
        ? 'warning'
        : 'default';
  const comboBadgeLabel = loadingCatalog
    ? 'Sincronizando'
    : activeCombosCount > 0
      ? 'Operativos'
      : combos.length > 0
        ? 'Pendientes'
        : 'Sin combos';
  const comboVariantBadgeLabel = loadingCatalog
    ? 'Sincronizando'
    : variants.length > 0
      ? 'Base para combos'
      : 'Sin items';
  const comboReadyBadgeLabel = loadingCatalog
    ? 'Verificando'
    : activeCombosCount === 0
      ? 'Sin activos'
      : readyCombosCount === activeCombosCount
        ? 'POS listo'
        : readyCombosCount > 0
          ? 'Cobertura parcial'
          : 'Pendiente';

  return (
    <>
      <div className="grid min-w-0 gap-4 sm:gap-5">
        <ModuleStatusHeader
          ariaLabel="Estado operativo de combos"
          eyebrow="Operacion comercial"
          title="Combos"
          statusLabel={comboStatusLabel}
          statusTone={comboStatusTone}
          description="Combos activos, base operativa y cobertura comercial."
          helpText="Resume la base de combos, los items operativos disponibles y cuantos combos ya estan listos para vender."
          icon={<Boxes size={18} />}
        >
          <ModuleStatusCard
            label="Combos activos"
            value={String(activeCombosCount)}
            icon={<Boxes size={16} />}
            iconTone={activeCombosCount > 0 ? 'success' : 'default'}
            badgeLabel={comboBadgeLabel}
            badgeTone={loadingCatalog ? 'info' : activeCombosCount > 0 ? 'success' : 'default'}
            meta={
              loadingCatalog
                ? 'Leyendo combos'
                : combos.length > 0
                  ? `${activeCombosCount}/${combos.length} activos`
                  : 'Sin base comercial'
            }
          />
          <ModuleStatusCard
            label="Items operativos"
            value={String(variants.length)}
            icon={<Shapes size={16} />}
            iconTone={variants.length > 0 ? 'info' : 'default'}
            badgeLabel={comboVariantBadgeLabel}
            badgeTone={loadingCatalog ? 'info' : variants.length > 0 ? 'info' : 'default'}
            meta={loadingCatalog ? 'Preparando catalogo' : `${activeVariantsCount} activos`}
          />
          <ModuleStatusCard
            label="Listos para vender"
            value={String(readyCombosCount)}
            icon={<PackagePlus size={16} />}
            iconTone={comboCoverageTone}
            badgeLabel={comboReadyBadgeLabel}
            badgeTone={comboCoverageTone}
            meta={
              loadingCatalog
                ? 'Validando composicion'
                : activeCombosCount > 0
                  ? `${readyCombosCount}/${activeCombosCount} con items`
                  : 'Activa combos para medir cobertura'
            }
          />
        </ModuleStatusHeader>

        {message ? <FeedbackMessage tone="success">{message}</FeedbackMessage> : null}

        {submitError ? <FeedbackMessage tone="error">{submitError}</FeedbackMessage> : null}

        {catalogError ? <FeedbackMessage tone="error">{catalogError}</FeedbackMessage> : null}

        {catalogAccessDenied ? (
          <AccessState description="Tu perfil actual no tiene permiso para consultar o gestionar combos." />
        ) : null}

        <div className="grid min-w-0 items-start gap-4 xl:grid-cols-[440px_minmax(0,1fr)]">
          <div className="grid min-w-0 gap-4 sm:gap-5">
            <Card>
              <p className="text-sm theme-text-muted">Crear combo</p>
              <h2 className="font-display text-2xl font-bold theme-text-strong">
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
                    disabled={creatingCombo || refreshingCatalog || !comboName.trim()}
                    onClick={handleCreateCombo}
                  >
                    {creatingCombo ? 'Guardando...' : 'Crear combo'}
                  </Button>
                </div>
              </div>
            </Card>

            <Card>
              <p className="text-sm theme-text-muted">Agregar items al combo</p>
              <h2 className="font-display text-2xl font-bold theme-text-strong">
                Composicion comercial
              </h2>

              <div className="mt-5 grid gap-4">
                <Select
                  label="Combo"
                  value={selectedComboId}
                  onChange={(event) => setSelectedComboId(event.target.value)}
                  hint="La carga suma cantidades al combo actual sin borrar los items ya configurados. Para quitar o ajustar cantidades con detalle usa la accion Composicion del listado."
                >
                  <option value="">
                    {combos.length === 0 ? 'Sin combos cargados' : 'Selecciona un combo'}
                  </option>
                  {combos.map((combo) => (
                    <option key={combo.id} value={String(combo.id)}>
                      #{combo.id} - {combo.name} {!combo.active ? '(Inactivo)' : ''}
                    </option>
                  ))}
                </Select>

                <Select
                  label="Item operativo"
                  value={selectedVariantId}
                  onChange={(event) => setSelectedVariantId(event.target.value)}
                >
                  <option value="">
                    {variants.length === 0
                      ? 'Sin items cargados'
                      : 'Selecciona un item'}
                  </option>
                  {variants.map((variant) => (
                    <option key={variant.id} value={String(variant.id)}>
                      {formatVariantOptionLabel(variant)}
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
                    disabled={addingItems || actionsLocked || combos.length === 0 || variants.length === 0}
                    onClick={handleAddComboItems}
                  >
                    {addingItems ? 'Guardando...' : 'Agregar item'}
                  </Button>
                </div>
              </div>
            </Card>
          </div>

          <Card>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-sm theme-text-muted">Listado real</p>
                <h2 className="font-display text-2xl font-bold theme-text-strong">
                  Combos comerciales
                </h2>
                <p className="mt-2 text-sm text-[color:var(--text-faint)]">
                  {comboSearch.trim()
                    ? `${filteredCombos.length} resultado(s) para "${comboSearch.trim()}".`
                    : `${combos.length} combo(s) disponibles para gestionar.`}
                </p>
              </div>
              <div className="flex w-full flex-col gap-3 lg:w-auto lg:min-w-[320px]">
                <Input
                  label="Buscar por nombre"
                  value={comboSearch}
                  onChange={(event) => setComboSearch(event.target.value)}
                  placeholder="Buscar combo por nombre"
                  hint="Filtra el listado por nombre sin afectar POS ni catalogo."
                />
                <div className="flex justify-end">
                  <Button
                    variant="secondary"
                    disabled={loadingCatalog || actionsLocked}
                    onClick={() => void refreshCatalog({ background: combos.length > 0 })}
                  >
                    {refreshingCatalog ? 'Actualizando...' : 'Refrescar'}
                  </Button>
                </div>
              </div>
            </div>

            {refreshingCatalog && combos.length > 0 ? (
              <p className="mt-4 text-sm text-[color:var(--text-faint)]">
                Actualizando listado y estado operativo...
              </p>
            ) : null}

            {loadingCatalog ? (
              <div className="mt-6">
                <LoadingState
                  title="Cargando combos"
                  description="Estamos leyendo la base comercial y los items operativos disponibles."
                  rows={4}
                />
              </div>
            ) : combos.length === 0 ? (
              <div className="mt-6">
                <EmptyState
                  title="Sin combos cargados"
                  description="Crea el primer combo y usa items operativos existentes para definir su contenido."
                />
              </div>
            ) : filteredCombos.length === 0 ? (
              <div className="mt-6">
                <EmptyState
                  title="Sin resultados"
                  description="No encontramos combos que coincidan con el nombre buscado."
                />
              </div>
            ) : (
              <ScrollPanel
                className="mt-6 grid gap-4"
                tabIndex={0}
                aria-label="Listado de combos comerciales"
              >
                {filteredCombos.map((combo) => {
                  const comboBusy = togglingComboId === combo.id;

                  return (
                    <div
                      key={combo.id}
                      className="data-list-card rounded-3xl p-5"
                    >
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-3">
                            <p className="font-display text-xl font-bold theme-text-strong">
                              {combo.name}
                            </p>
                            <span
                              className="app-status-chip rounded-full px-3 py-1 text-xs"
                              data-tone={combo.active ? 'success' : 'default'}
                            >
                              {combo.active ? 'Activo' : 'Inactivo'}
                            </span>
                          </div>
                          <p className="mt-2 text-sm text-[color:var(--text-faint)]">
                            ID {combo.id} - {combo.items.length} items configurados
                          </p>
                        </div>
                        <div className="flex flex-col items-start gap-4 lg:items-end">
                          <p className="metric-accent font-display text-2xl font-bold">
                            {formatCurrency(Number(combo.sale_price))}
                          </p>
                          <div className="flex flex-wrap gap-2">
                            <Button
                              variant="secondary"
                              aria-haspopup="dialog"
                              aria-controls="combo-composition-dialog"
                              disabled={actionsLocked}
                              onClick={() => openCompositionEditor(combo)}
                            >
                              Composicion
                            </Button>
                            <Button
                              variant="secondary"
                              aria-haspopup="dialog"
                              aria-controls="combo-editor-dialog"
                              disabled={actionsLocked}
                              onClick={() => openComboEditor(combo)}
                            >
                              Editar
                            </Button>
                            <Button
                              variant="ghost"
                              className={combo.active ? 'action-soft-danger' : 'action-soft-success'}
                              disabled={actionsLocked}
                              onClick={() => void handleToggleComboStatus(combo)}
                            >
                              {comboBusy
                                ? combo.active
                                  ? 'Desactivando...'
                                  : 'Activando...'
                                : combo.active
                                  ? 'Desactivar'
                                  : 'Activar'}
                            </Button>
                            <Button
                              variant="ghost"
                              className="action-soft-danger"
                              disabled={actionsLocked}
                              onClick={() => requestComboDelete(combo)}
                            >
                              Eliminar
                            </Button>
                          </div>
                        </div>
                      </div>

                      <div className="mt-5 grid gap-3">
                        {combo.items.length === 0 ? (
                          <div className="toolbar-shell rounded-2xl border-dashed px-4 py-3 text-sm text-[color:var(--text-faint)]">
                            El combo aun no tiene items asociados.
                          </div>
                        ) : (
                          combo.items.map((item) => (
                            <div
                              key={item.id}
                              className="data-list-card flex items-center justify-between rounded-2xl px-4 py-3"
                            >
                              <div>
                                <p className="text-sm font-medium theme-text-strong">
                                  {formatVariantDisplayName(item.variant)}
                                </p>
                                <p className="text-xs text-[color:var(--text-faint)]">
                                  {[formatVariantSubtitle(item.variant), `qty ${item.qty}`]
                                    .filter(Boolean)
                                    .join(' - ')}
                                </p>
                              </div>
                              <p className="text-sm font-semibold theme-text-secondary">
                                {formatCurrency(Number(item.variant.sale_price))}
                              </p>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  );
                })}
              </ScrollPanel>
            )}
          </Card>
        </div>
      </div>

      <Modal
        id="combo-editor-dialog"
        open={comboEditorOpen}
        onClose={() => {
          if (!savingCombo) {
            setComboEditorOpen(false);
          }
        }}
        title="Editar combo"
        subtitle="Actualiza el nombre comercial, el precio de venta y el estado operativo del combo."
      >
        <div className="grid min-w-0 gap-4 sm:gap-5">
          {submitError ? <FeedbackMessage tone="error">{submitError}</FeedbackMessage> : null}
          <Input
            label="Nombre"
            value={editComboName}
            onChange={(event) => setEditComboName(event.target.value)}
            placeholder="Nombre del combo"
          />
          <Input
            type="number"
            min={0}
            label="Precio de venta"
            placeholder="Ej: 12000"
            value={editComboPriceInput}
            onChange={(event) => {
              const nextValue = normalizeNumberInput(event.target.value);
              if (nextValue !== null) {
                setEditComboPriceInput(nextValue);
              }
            }}
          />
          <CheckboxField
            label="Activo"
            description="Define si el combo debe seguir disponible para venta desde POS."
            checked={editComboActive}
            onChange={(event) => setEditComboActive(event.target.checked)}
          />
          <div className="flex justify-end gap-3">
            <Button
              variant="ghost"
              disabled={savingCombo}
              onClick={() => setComboEditorOpen(false)}
            >
              Cancelar
            </Button>
            <Button disabled={savingCombo || !editingComboTarget} onClick={handleSaveCombo}>
              {savingCombo ? 'Guardando...' : 'Guardar cambios'}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        id="combo-composition-dialog"
        open={compositionEditorOpen}
        onClose={() => {
          if (!savingComposition) {
            setCompositionEditorOpen(false);
          }
        }}
        title="Editar composicion"
        subtitle="Revisa la composicion actual del combo, ajusta cantidades, quita items puntuales y agrega nuevos antes de guardar."
      >
        <div className="grid min-w-0 gap-4 sm:gap-5">
          {submitError ? <FeedbackMessage tone="error">{submitError}</FeedbackMessage> : null}

          {editingCompositionCombo ? (
            <div className="rounded-3xl border border-[color:var(--border-soft)] bg-[color:var(--surface-subtle)] px-4 py-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold theme-text-strong">
                    {editingCompositionCombo.name}
                  </p>
                  <p className="mt-1 text-sm text-[color:var(--text-faint)]">
                    Combo #{editingCompositionCombo.id} - {compositionDraftItems.length} item(s) en borrador
                  </p>
                </div>
                <p className="text-sm font-semibold theme-text-secondary">
                  {formatCurrency(Number(editingCompositionCombo.sale_price))}
                </p>
              </div>
            </div>
          ) : null}

          <div className="grid gap-4 rounded-3xl border border-[color:var(--border-soft)] bg-[color:var(--surface-subtle)] px-4 py-4">
            <div>
              <p className="text-sm font-semibold theme-text-strong">
                Agregar item a la composicion
              </p>
              <p className="mt-1 text-sm text-[color:var(--text-faint)]">
                Si agregas un item ya existente, su cantidad se suma en el borrador antes de guardar.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_140px_auto] md:items-end">
              <Select
                label="Item operativo"
                value={compositionVariantId}
                onChange={(event) => setCompositionVariantId(event.target.value)}
              >
                <option value="">
                  {compositionAvailableVariants.length === 0
                    ? 'Sin items disponibles'
                    : 'Selecciona un item'}
                </option>
                {compositionAvailableVariants.map((variant) => (
                  <option key={variant.id} value={String(variant.id)}>
                    {formatVariantOptionLabel(variant)}
                  </option>
                ))}
              </Select>

              <Input
                type="number"
                min={0.001}
                step="0.001"
                label="Cantidad"
                placeholder="Ej: 1"
                value={compositionQtyInput}
                onChange={(event) => {
                  const nextValue = normalizeNumberInput(event.target.value, {
                    allowDecimal: true,
                  });
                  if (nextValue !== null) {
                    setCompositionQtyInput(nextValue);
                  }
                }}
              />

              <Button
                disabled={
                  savingComposition ||
                  compositionAvailableVariants.length === 0
                }
                onClick={handleAddCompositionItem}
              >
                Agregar
              </Button>
            </div>
          </div>

          {compositionDraftItems.length === 0 ? (
            <EmptyState
              title="Sin items en composicion"
              description="Este combo no tiene items en el borrador. Puedes guardar vacio o agregar nuevos items antes de cerrar."
            />
          ) : (
            <div className="grid gap-3">
              {compositionDraftItems.map((item) => (
                <div
                  key={item.variant_id}
                  className="data-list-card rounded-3xl px-4 py-4"
                >
                  <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_140px_auto] lg:items-end">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold theme-text-strong">
                          {formatVariantDisplayName(item.variant)}
                        </p>
                        <span
                          className="app-status-chip rounded-full px-3 py-1 text-xs"
                          data-tone={item.variant.active ? 'success' : 'default'}
                        >
                          {item.variant.active ? 'Activo' : 'Inactivo'}
                        </span>
                      </div>
                      <p className="mt-2 text-xs text-[color:var(--text-faint)]">
                        {[formatVariantSubtitle(item.variant)]
                          .filter(Boolean)
                          .join(' - ')}
                      </p>
                    </div>

                    <Input
                      type="number"
                      min={0.001}
                      step="0.001"
                      label="Cantidad"
                      value={item.qtyInput}
                      onChange={(event) =>
                        handleCompositionQtyChange(item.variant_id, event.target.value)
                      }
                    />

                    <Button
                      variant="ghost"
                      className="action-soft-danger"
                      disabled={savingComposition}
                      onClick={() => handleRemoveCompositionItem(item.variant_id)}
                    >
                      Quitar
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end gap-3">
            <Button
              variant="ghost"
              disabled={savingComposition}
              onClick={() => setCompositionEditorOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              disabled={savingComposition || !editingCompositionCombo}
              onClick={handleSaveComposition}
            >
              {savingComposition ? 'Guardando...' : 'Guardar composicion'}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        id="combo-delete-dialog"
        open={deleteTarget !== null}
        onClose={() => {
          if (!deletingCombo) {
            setDeleteTarget(null);
          }
        }}
        title="Eliminar combo"
        subtitle="Esta accion solo debe usarse cuando el combo ya no deba existir en la base comercial."
      >
        <div className="grid min-w-0 gap-4 sm:gap-5">
          <div className="rounded-3xl border border-[color:var(--border-soft)] bg-[color:var(--surface-subtle)] px-4 py-4">
            <p className="text-sm font-semibold theme-text-strong">
              {deleteTarget?.name ?? 'Combo seleccionado'}
            </p>
            {deleteTarget ? (
              <p className="mt-2 text-sm text-[color:var(--text-faint)]">
                {deleteTarget.detail}
              </p>
            ) : null}
          </div>
          <p className="text-sm text-[color:var(--text-secondary)]">
            Deseas continuar con la eliminacion? Si el combo tiene ventas historicas,
            el sistema bloqueara la operacion y te pedira desactivarlo en lugar de
            eliminarlo.
          </p>
          <div className="flex justify-end gap-3">
            <Button
              variant="ghost"
              disabled={deletingCombo}
              onClick={() => setDeleteTarget(null)}
            >
              Cancelar
            </Button>
            <Button
              disabled={deletingCombo || !deleteTarget}
              className="action-soft-danger"
              onClick={() => void handleConfirmDelete()}
            >
              {deletingCombo ? 'Eliminando...' : 'Eliminar'}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
