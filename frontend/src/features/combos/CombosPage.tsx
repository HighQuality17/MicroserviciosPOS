import '@/features/products/products-d2b.css';
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
import { Modal } from '@/components/Modal';
import { ModulePageHeader } from '@/components/ModulePageHeader';
import type {
  ModulePageHeaderBadge,
  ModulePageHeaderCard,
} from '@/components/ModulePageHeader';
import { ProductMedia } from '@/components/ProductMedia';
import { SearchField } from '@/components/SearchField';
import { Select } from '@/components/Select';
import { StatusBadge } from '@/components/StatusBadge';
import { CatalogItemsTable } from '@/features/products/CatalogItemsTable';
import { ProductImageField } from '@/features/products/ProductImageField';
import {
  createEmptyCatalogImageDraft as createEmptyComboImageDraft,
  getCatalogEntityImageDraft,
  removeCatalogImage as removeComboImage,
  resolveCatalogImageMutationAction as resolveComboImageMutationAction,
  restoreCatalogImage as restoreComboImage,
  selectCatalogImage as selectComboImage,
  type CatalogImageDraft as ComboImageDraft,
} from '@/features/shared/catalogImageDraft';
import { resolveApiAssetUrl } from '@/services/api/assets';
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

type CombosToolbarBadge = {
  label: string;
  tone?: 'default' | 'success' | 'warning' | 'danger' | 'info';
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
  const [comboImageDraft, setComboImageDraft] = useState<ComboImageDraft>(
    createEmptyComboImageDraft(),
  );
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
  const [editComboImageDraft, setEditComboImageDraft] = useState<ComboImageDraft>(
    createEmptyComboImageDraft(),
  );
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

  function resetCreateComboForm() {
    setComboName('');
    setComboPriceInput('');
    setComboImageDraft(createEmptyComboImageDraft());
    setComboActive(true);
  }

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
    setEditComboImageDraft(getComboImageDraft(combo));
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
          ? translateComboError(error.message)
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
    if (comboImageDraft.error) {
      setSubmitError(comboImageDraft.error);
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

      const createdCombo = await posApi.createCombo({
        name: comboName.trim(),
        sale_price: comboPrice,
        active: comboActive,
      });

      let persistedCombo = createdCombo;

      try {
        const imageCombo = await persistComboImageDraft(createdCombo.id, comboImageDraft);

        if (imageCombo) {
          persistedCombo = imageCombo;
        }
      } catch (imageError) {
        addSessionCombo(createdCombo);
        resetCreateComboForm();
        setSelectedComboId(String(createdCombo.id));
        setMessage(`Combo #${createdCombo.id} creado correctamente.`);
        setSubmitError(
          `Combo #${createdCombo.id} creado, pero imagen no pudo ${resolveComboImageMutationAction(comboImageDraft)}. Abre editar para reintentar. ${translateComboError(
            imageError instanceof Error ? imageError.message : 'No se pudo guardar la imagen.',
          )}`,
        );
        await refreshCatalog({ background: true });
        return;
      }

      addSessionCombo(persistedCombo);
      resetCreateComboForm();
      setSelectedComboId(String(persistedCombo.id));
      setMessage(
        comboImageDraft.pendingImageFile
          ? `Combo #${persistedCombo.id} creado con imagen.`
          : `Combo #${persistedCombo.id} creado correctamente.`,
      );
      await refreshCatalog({ background: true });
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? translateComboError(error.message)
          : 'No se pudo crear el combo',
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
    if (editComboImageDraft.error) {
      setSubmitError(editComboImageDraft.error);
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

      const updatedCombo = await posApi.updateCombo(editingComboTarget.id, {
        name: editComboName.trim(),
        sale_price: comboPrice,
        active: editComboActive,
      });

      let persistedCombo = updatedCombo;

      try {
        const imageCombo = await persistComboImageDraft(
          editingComboTarget.id,
          editComboImageDraft,
        );

        if (imageCombo) {
          persistedCombo = imageCombo;
        }
      } catch (imageError) {
        setEditingComboTarget((current) =>
          current
            ? {
                ...current,
                name: editComboName.trim(),
                sale_price: comboPrice,
                active: editComboActive,
              }
            : current,
        );
        setMessage(`Combo #${editingComboTarget.id} actualizado correctamente.`);
        setSubmitError(
          `Combo #${editingComboTarget.id} actualizado, pero imagen no pudo ${resolveComboImageMutationAction(editComboImageDraft)}. ${translateComboError(
            imageError instanceof Error ? imageError.message : 'No se pudo actualizar la imagen.',
          )}`,
        );
        await refreshCatalog({ background: true });
        return;
      }

      setComboEditorOpen(false);
      setEditComboImageDraft(createEmptyComboImageDraft());
      setMessage(buildComboUpdateSuccessMessage(editingComboTarget.id, editComboImageDraft));
      addSessionCombo(persistedCombo);
      await refreshCatalog({ background: true });
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? translateComboError(error.message)
          : 'No se pudo actualizar el combo',
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
          ? translateComboError(error.message)
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
          ? translateComboError(error.message)
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
          ? translateComboError(error.message)
          : 'No se pudieron agregar items al combo',
      );
    } finally {
      setAddingItems(false);
    }
  }

  const activeCombosCount = combos.filter((combo) => combo.active).length;
  const inactiveCombosCount = combos.length - activeCombosCount;
  const activeVariantsCount = variants.filter((variant) => variant.active).length;
  const readyCombosCount = combos.filter(
    (combo) => combo.active && combo.items.length > 0,
  ).length;
  const selectedCombo =
    combos.find((combo) => String(combo.id) === selectedComboId) ?? null;
  const selectedVariant =
    variants.find((variant) => String(variant.id) === selectedVariantId) ?? null;
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
  const comboHeaderBadges: ModulePageHeaderBadge[] = [
    {
      label: comboStatusLabel,
      tone: comboStatusTone,
    },
    {
      label: comboReadyBadgeLabel,
      tone: comboCoverageTone,
    },
  ];
  const comboHeaderCards: ModulePageHeaderCard[] = [
    {
      label: 'Combos totales',
      value: String(combos.length),
      note: loadingCatalog
        ? 'Sincronizando base comercial.'
        : inactiveCombosCount > 0
          ? `${activeCombosCount} activos y ${inactiveCombosCount} inactivos`
          : `${activeCombosCount} activos en gestion`,
      accent: comboStatusTone,
      icon: <Boxes size={16} />,
      iconTone: comboStatusTone,
      badge: {
        label: comboBadgeLabel,
        tone: loadingCatalog ? 'info' : activeCombosCount > 0 ? 'success' : 'default',
      },
    },
    {
      label: 'Items operativos',
      value: String(variants.length),
      note: loadingCatalog
        ? 'Preparando base para composicion.'
        : variants.length > 0
          ? `${activeVariantsCount} activos disponibles para combinar`
          : 'Sin items cargados para combos',
      accent: variants.length > 0 ? 'info' : 'default',
      icon: <Shapes size={16} />,
      iconTone: variants.length > 0 ? 'info' : 'default',
      badge: {
        label: comboVariantBadgeLabel,
        tone: loadingCatalog ? 'info' : variants.length > 0 ? 'info' : 'default',
      },
    },
    {
      label: 'Listos para vender',
      value: String(readyCombosCount),
      note: loadingCatalog
        ? 'Validando cobertura comercial.'
        : activeCombosCount > 0
          ? `${readyCombosCount}/${activeCombosCount} activos con composicion`
          : 'Activa combos para medir cobertura',
      accent: comboCoverageTone,
      icon: <PackagePlus size={16} />,
      iconTone: comboCoverageTone,
      badge: {
        label: comboReadyBadgeLabel,
        tone: comboCoverageTone,
      },
    },
  ];
  const comboToolbarBadges: CombosToolbarBadge[] = [
    {
      label: `${activeCombosCount} activos`,
      tone: activeCombosCount > 0 ? 'success' : 'default',
    },
    {
      label: `${variants.length} items base`,
      tone: variants.length > 0 ? 'info' : 'default',
    },
    {
      label: `${readyCombosCount} listos POS`,
      tone: comboCoverageTone,
    },
  ];
  const comboSummaryLabel = selectedCombo ? `Combo #${selectedCombo.id}` : 'Cobertura comercial';
  const comboSummaryValue = selectedCombo
    ? selectedCombo.name
    : activeCombosCount > 0
      ? `${readyCombosCount}/${activeCombosCount} listos`
      : 'Sin combos activos';
  const comboSummaryNote = selectedCombo
    ? selectedCombo.items.length > 0
      ? `${selectedCombo.items.length} item(s) configurados para operacion y ajuste desde listado.`
      : 'Combo creado sin composicion. Agrega items para dejarlo listo en POS.'
    : variants.length > 0
      ? `${activeVariantsCount} items activos sostienen la base para nuevas composiciones.`
      : 'Carga items operativos antes de completar cobertura comercial.';
  const compositionInlineNote =
    selectedCombo && selectedVariant
      ? `La carga se suma sobre ${selectedCombo.name} usando ${formatVariantDisplayName(selectedVariant)}.`
      : 'La carga suma cantidades al combo actual sin borrar items existentes. Usa "Composicion" para ajuste fino.';
  const comboListCountLabel = comboSearch.trim()
    ? `${filteredCombos.length} resultado(s) filtrados`
    : `${combos.length} combo(s) en gestion`;

  return (
    <>
      <div className="products-page combos-page grid min-w-0 gap-5 sm:gap-6">
        <ModulePageHeader
          ariaLabel="Estado operativo de combos"
          eyebrow="Operacion comercial"
          title="Combos"
          icon={<Boxes size={18} />}
          helpText="Resume la base de combos, los items operativos disponibles y cuantos combos ya estan listos para vender."
          badges={comboHeaderBadges}
          description="Base comercial, cobertura de composicion y control operativo con mismo lenguaje admin de Productos e Ingredientes."
          summary={{
            label: comboSummaryLabel,
            value: comboSummaryValue,
            note: comboSummaryNote,
          }}
          asideAction={
            <Button
              variant="secondary"
              disabled={loadingCatalog || actionsLocked}
              onClick={() => void refreshCatalog({ background: combos.length > 0 })}
            >
              {refreshingCatalog ? 'Actualizando...' : 'Actualizar catalogo'}
            </Button>
          }
          cards={comboHeaderCards}
        />

        {message ? (
          <FeedbackMessage tone="success" className="products-feedback">
            {message}
          </FeedbackMessage>
        ) : null}

        {submitError ? (
          <FeedbackMessage tone="error" className="products-feedback">
            {submitError}
          </FeedbackMessage>
        ) : null}

        {catalogError ? (
          <FeedbackMessage tone="error" className="products-feedback">
            {catalogError}
          </FeedbackMessage>
        ) : null}

        {catalogAccessDenied ? (
          <AccessState description="Tu perfil actual no tiene permiso para consultar o gestionar combos." />
        ) : null}

        <div className="products-workspace grid min-w-0 items-start gap-4 xl:grid-cols-[minmax(0,25rem)_minmax(0,1fr)] xl:gap-5">
          <div className="products-form-rail grid min-w-0 gap-4 sm:gap-5">
            <Card
              padding="none"
              glow={false}
              className="products-panel products-panel--form"
              contentClassName="products-panel__body"
            >
              <div className="products-panel__intro">
                <div className="products-panel__header-copy">
                  <p className="text-sm theme-text-muted">Administracion base</p>
                  <h2 className="font-display text-2xl font-bold theme-text-strong">
                    Crear combo
                  </h2>
                  <p className="products-panel__description">
                    Registra nombre, precio y estado con mismo criterio sobrio del catalogo principal.
                  </p>
                </div>
              </div>
              <div className="products-panel__highlights">
                <div className="products-panel__spotlight products-panel__spotlight--variant">
                  <p className="products-panel__spotlight-label">Combos activos</p>
                  <p className="products-panel__spotlight-value">{activeCombosCount}</p>
                  <p className="products-panel__spotlight-note">
                    {combos.length > 0
                      ? `${inactiveCombosCount} en revision o pendientes de reactivacion.`
                      : 'Aun no existe base comercial para combos.'}
                  </p>
                </div>
                <div className="products-panel__spotlight">
                  <p className="products-panel__spotlight-label">Alta inicial</p>
                  <p className="products-panel__spotlight-value">
                    {comboActive ? 'Activa' : 'Inactiva'}
                  </p>
                  <p className="products-panel__spotlight-note">
                    {comboName.trim()
                      ? comboName
                      : 'Define nombre comercial y estado inicial antes de guardar.'}
                  </p>
                </div>
              </div>
              <div className="products-form-stack grid gap-4">
                <Input
                  label="Nombre"
                  wrapperClassName="products-field"
                  labelClassName="products-field__label"
                  className="products-field__control"
                  value={comboName}
                  onChange={(event) => setComboName(event.target.value)}
                  placeholder="Combo desayuno"
                />
                <ProductImageField
                  label="Imagen del combo"
                  productName={comboName}
                  mediaKind="COMBO"
                  imageUrl={comboImageDraft.imageUrl}
                  imageAlt={comboImageDraft.imageAlt}
                  pendingImageFile={comboImageDraft.pendingImageFile}
                  markedForRemoval={comboImageDraft.markedForRemoval}
                  error={comboImageDraft.error}
                  disabled={creatingCombo || refreshingCatalog}
                  onSelectImage={(file) =>
                    setComboImageDraft((current) => selectComboImage(current, file))
                  }
                  onRemoveImage={() =>
                    setComboImageDraft((current) => removeComboImage(current))
                  }
                  onRestoreImage={() =>
                    setComboImageDraft((current) => restoreComboImage(current))
                  }
                />
                <div className="products-form-group products-form-group--strong rounded-lg p-4 sm:p-5">
                  <p className="products-form-group__label">Definicion comercial</p>
                  <p className="products-form-group__description">
                    Mantiene precio de venta y disponibilidad con mismo orden operativo del sistema.
                  </p>
                  <div className="mt-4 grid gap-4">
                    <Input
                      type="number"
                      min={0}
                      label="Precio de venta"
                      wrapperClassName="products-field"
                      labelClassName="products-field__label"
                      className="products-field__control"
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
                      wrapperClassName="products-toggle-card"
                      className="products-toggle-card__label"
                      checked={comboActive}
                      onChange={(event) => setComboActive(event.target.checked)}
                    />
                  </div>
                </div>
                <p className="products-inline-note">
                  Nuevo combo queda listo para composicion y control de estado sin alterar flujo comercial actual.
                </p>
                <div className="products-panel__actions flex gap-3">
                  <Button
                    className="products-panel__cta"
                    disabled={creatingCombo || refreshingCatalog || !comboName.trim()}
                    onClick={handleCreateCombo}
                  >
                    {creatingCombo ? 'Guardando...' : 'Crear combo'}
                  </Button>
                </div>
              </div>
            </Card>

            <Card
              padding="none"
              glow={false}
              className="products-panel products-panel--form"
              contentClassName="products-panel__body"
            >
              <div className="products-panel__intro">
                <div className="products-panel__header-copy">
                  <p className="text-sm theme-text-muted">Composicion operativa</p>
                  <h2 className="font-display text-2xl font-bold theme-text-strong">
                    Agregar items
                  </h2>
                  <p className="products-panel__description">
                    Carga incremental para sostener cobertura POS sin salir del flujo administrativo.
                  </p>
                </div>
              </div>
              <div className="products-panel__highlights">
                <div className="products-panel__spotlight products-panel__spotlight--variant">
                  <p className="products-panel__spotlight-label">Combo objetivo</p>
                  <p className="products-panel__spotlight-value">
                    {selectedCombo ? `#${selectedCombo.id}` : '--'}
                  </p>
                  <p className="products-panel__spotlight-note">
                    {selectedCombo
                      ? selectedCombo.name
                      : 'Selecciona combo para sumar items sin borrar composicion actual.'}
                  </p>
                </div>
                <div className="products-panel__spotlight">
                  <p className="products-panel__spotlight-label">Item base</p>
                  <p className="products-panel__spotlight-value">
                    {selectedVariant ? 'Listo' : '--'}
                  </p>
                  <p className="products-panel__spotlight-note">
                    {selectedVariant
                      ? formatVariantDisplayName(selectedVariant)
                      : 'Selecciona item operativo y cantidad antes de guardar.'}
                  </p>
                </div>
              </div>
              <div className="products-form-stack grid gap-4">
                <div className="products-form-group products-form-group--strong rounded-lg p-4 sm:p-5">
                  <p className="products-form-group__label">Carga incremental</p>
                  <p className="products-form-group__description">
                    Esta operacion suma cantidades al combo actual. Para quitar o corregir detalle usa la accion de composicion del listado.
                  </p>
                  <div className="mt-4 grid gap-4">
                    <Select
                      label="Combo"
                      wrapperClassName="products-field"
                      labelClassName="products-field__label"
                      className="products-field__control"
                      value={selectedComboId}
                      onChange={(event) => setSelectedComboId(event.target.value)}
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
                      wrapperClassName="products-field"
                      labelClassName="products-field__label"
                      className="products-field__control"
                      value={selectedVariantId}
                      onChange={(event) => setSelectedVariantId(event.target.value)}
                    >
                      <option value="">
                        {variants.length === 0 ? 'Sin items cargados' : 'Selecciona un item'}
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
                      wrapperClassName="products-field"
                      labelClassName="products-field__label"
                      className="products-field__control"
                      placeholder="Ej: 2"
                      value={qtyInput}
                      onChange={(event) => {
                        const nextValue = normalizeNumberInput(event.target.value);
                        if (nextValue !== null) {
                          setQtyInput(nextValue);
                        }
                      }}
                    />
                  </div>
                </div>
                <p className="products-inline-note">{compositionInlineNote}</p>
                <div className="products-panel__actions flex gap-3">
                  <Button
                    className="products-panel__cta"
                    disabled={addingItems || actionsLocked || combos.length === 0 || variants.length === 0}
                    onClick={handleAddComboItems}
                  >
                    {addingItems ? 'Guardando...' : 'Agregar item'}
                  </Button>
                </div>
              </div>
            </Card>
          </div>

          <Card
            padding="none"
            glow={false}
            className="products-panel products-panel--list"
            contentClassName="products-panel__body"
          >
            <div className="products-panel__header">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="products-panel__header-copy">
                  <p className="text-sm theme-text-muted">Listado real</p>
                  <h2 className="font-display text-2xl font-bold theme-text-strong">
                    Combos comerciales
                  </h2>
                  <p className="products-panel__description">
                    Vista administrativa de precio, cobertura y acciones por fila con la misma tabla enterprise del sistema.
                  </p>
                </div>
                <Button
                  variant="secondary"
                  className="products-panel__secondary"
                  disabled={loadingCatalog || actionsLocked}
                  onClick={() => void refreshCatalog({ background: combos.length > 0 })}
                >
                  {refreshingCatalog ? 'Actualizando...' : 'Refrescar'}
                </Button>
              </div>
            </div>

            <CombosListToolbar
              label="Vista activa"
              value={comboListCountLabel}
              badges={comboToolbarBadges}
              searchValue={comboSearch}
              onSearchChange={setComboSearch}
            />

            {refreshingCatalog && combos.length > 0 ? (
              <div className="products-inline-note products-inline-note--footer toolbar-shell mt-4 rounded-lg px-4 py-3 text-xs text-[color:var(--text-faint)]">
                Actualizando listado y cobertura operativa...
              </div>
            ) : null}

            {loadingCatalog ? (
              <div className="mt-4">
                <LoadingState
                  title="Cargando combos"
                  description="Estamos leyendo la base comercial y los items operativos disponibles."
                  rows={4}
                />
              </div>
            ) : combos.length === 0 ? (
              <div className="mt-4">
                <EmptyState
                  title="Sin combos cargados"
                  description="Crea el primer combo y usa items operativos existentes para definir su contenido."
                />
              </div>
            ) : filteredCombos.length === 0 ? (
              <div className="mt-4">
                <EmptyState
                  title="Sin resultados"
                  description="No encontramos combos que coincidan con el nombre buscado."
                />
              </div>
            ) : (
              <CatalogItemsTable
                ariaLabel="Listado de combos comerciales"
                caption="Tabla de combos comerciales"
                rows={filteredCombos}
                rowKey={(combo) => combo.id}
                rowClassName={(combo) => (!combo.active ? 'opacity-80' : undefined)}
                tableMinWidthClassName="min-w-[1260px]"
                columns={[
                  {
                    key: 'id',
                    header: 'ID',
                    width: '72px',
                    cellClassName: 'whitespace-nowrap text-xs theme-text-muted',
                    render: (combo) => `#${combo.id}`,
                  },
                  {
                    key: 'combo',
                    header: 'Combo',
                    width: '360px',
                    render: (combo) => (
                      <div className="products-table-entity flex items-start gap-3">
                        <ProductMedia
                          label={combo.name}
                          src={resolveApiAssetUrl(combo.imageUrl)}
                          alt={combo.imageAlt ?? `Imagen de ${combo.name}`}
                          kind="COMBO"
                          size="sm"
                          className="shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="truncate text-[15px] font-semibold theme-text-strong">
                              {combo.name}
                            </p>
                            <StatusBadge
                              label={`${combo.items.length} item(s)`}
                              tone={combo.items.length > 0 ? 'info' : 'default'}
                            />
                          </div>
                          <p className="products-table-entity__summary">
                            {combo.active
                              ? 'Combo habilitado para gestion y venta agrupada.'
                              : 'Combo desactivado, disponible para revision administrativa.'}
                          </p>
                          <div className="products-table-meta">
                            <span className="products-table-meta__item">
                              <span className="text-[color:var(--text-faint)]">Precio</span>
                              <span className="font-medium theme-text-strong">
                                {formatCurrency(Number(combo.sale_price))}
                              </span>
                            </span>
                            <span className="products-table-meta__item">
                              <span className="text-[color:var(--text-faint)]">Cobertura</span>
                              <span className="font-medium theme-text-strong">
                                {getComboCoverageState(combo).label}
                              </span>
                            </span>
                          </div>
                        </div>
                      </div>
                    ),
                  },
                  {
                    key: 'composition',
                    header: 'Composicion',
                    width: '264px',
                    render: (combo) => (
                      <div className="products-table-stack">
                        <p className="products-table-stack__title">
                          {combo.items.length > 0
                            ? `${combo.items.length} items configurados`
                            : 'Sin composicion cargada'}
                        </p>
                        <p className="products-table-stack__detail">
                          {getComboCompositionSummary(combo)}
                        </p>
                      </div>
                    ),
                  },
                  {
                    key: 'price',
                    header: 'Precio',
                    width: '116px',
                    align: 'right',
                    cellClassName: 'whitespace-nowrap',
                    render: (combo) => (
                      <span className="products-table-price">
                        {formatCurrency(Number(combo.sale_price))}
                      </span>
                    ),
                  },
                  {
                    key: 'status',
                    header: 'Estado',
                    width: '124px',
                    render: (combo) => (
                      <StatusBadge
                        label={combo.active ? 'Activo' : 'Inactivo'}
                        tone={combo.active ? 'success' : 'default'}
                        className="min-w-[104px] justify-center"
                      />
                    ),
                  },
                  {
                    key: 'coverage',
                    header: 'Cobertura',
                    width: '132px',
                    render: (combo) => {
                      const coverageState = getComboCoverageState(combo);

                      return (
                        <StatusBadge
                          label={coverageState.label}
                          tone={coverageState.tone}
                          className="min-w-[112px] justify-center"
                        />
                      );
                    },
                  },
                  {
                    key: 'actions',
                    header: 'Acciones',
                    width: '328px',
                    render: (combo) => {
                      const comboBusy = togglingComboId === combo.id;

                      return (
                        <div className="products-table-actions">
                          <div className="products-table-actions__primary">
                            <Button
                              variant="secondary"
                              className="action-soft-brand products-action-operation"
                              aria-haspopup="dialog"
                              aria-controls="combo-composition-dialog"
                              disabled={actionsLocked}
                              onClick={() => openCompositionEditor(combo)}
                            >
                              Composicion
                            </Button>
                            <Button
                              variant="secondary"
                              className="action-soft-brand products-action-edit"
                              aria-haspopup="dialog"
                              aria-controls="combo-editor-dialog"
                              disabled={actionsLocked}
                              onClick={() => openComboEditor(combo)}
                            >
                              Editar
                            </Button>
                          </div>
                          <div className="products-table-actions__secondary">
                            <Button
                              variant="ghost"
                              className={combo.active ? 'products-action-toggle' : 'action-soft-success'}
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
                              className="action-soft-danger products-action-delete"
                              disabled={actionsLocked}
                              onClick={() => requestComboDelete(combo)}
                            >
                              Eliminar
                            </Button>
                          </div>
                        </div>
                      );
                    },
                  },
                ]}
              />
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
        <div className="products-form-stack grid min-w-0 gap-4 sm:gap-5">
          {submitError ? (
            <FeedbackMessage tone="error" className="products-feedback">
              {submitError}
            </FeedbackMessage>
          ) : null}
          <Input
            label="Nombre"
            wrapperClassName="products-field"
            labelClassName="products-field__label"
            className="products-field__control"
            value={editComboName}
            onChange={(event) => setEditComboName(event.target.value)}
            placeholder="Nombre del combo"
          />
          <ProductImageField
            label="Imagen del combo"
            productName={editComboName || editingComboTarget?.name}
            mediaKind="COMBO"
            imageUrl={editComboImageDraft.imageUrl}
            imageAlt={editComboImageDraft.imageAlt}
            pendingImageFile={editComboImageDraft.pendingImageFile}
            markedForRemoval={editComboImageDraft.markedForRemoval}
            error={editComboImageDraft.error}
            disabled={savingCombo}
            onSelectImage={(file) =>
              setEditComboImageDraft((current) => selectComboImage(current, file))
            }
            onRemoveImage={() =>
              setEditComboImageDraft((current) => removeComboImage(current))
            }
            onRestoreImage={() =>
              setEditComboImageDraft((current) => restoreComboImage(current))
            }
          />
          <div className="products-form-group products-form-group--strong rounded-lg p-4 sm:p-5">
            <p className="products-form-group__label">Ajuste comercial</p>
            <p className="products-form-group__description">
              Conserva precio y disponibilidad con misma jerarquia administrativa del listado.
            </p>
            <div className="mt-4 grid gap-4">
              <Input
                type="number"
                min={0}
                label="Precio de venta"
                wrapperClassName="products-field"
                labelClassName="products-field__label"
                className="products-field__control"
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
                wrapperClassName="products-toggle-card"
                className="products-toggle-card__label"
                checked={editComboActive}
                onChange={(event) => setEditComboActive(event.target.checked)}
              />
            </div>
          </div>
          <div className="products-panel__actions modal-action-row">
            <Button
              variant="secondary"
              className="products-panel__secondary sm:flex-none sm:min-w-[9rem]"
              disabled={savingCombo}
              onClick={() => setComboEditorOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              className="products-panel__cta sm:flex-none sm:min-w-[12rem]"
              disabled={savingCombo || !editingComboTarget}
              onClick={handleSaveCombo}
            >
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
        <div className="products-form-stack grid min-w-0 gap-4 sm:gap-5">
          {submitError ? (
            <FeedbackMessage tone="error" className="products-feedback">
              {submitError}
            </FeedbackMessage>
          ) : null}

          {editingCompositionCombo ? (
            <div className="products-form-group products-form-group--strong rounded-lg p-4 sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="products-form-group__label">Combo en edicion</p>
                  <p className="mt-2 text-base font-semibold theme-text-strong">
                    {editingCompositionCombo.name}
                  </p>
                  <p className="products-form-group__description mt-1">
                    Combo #{editingCompositionCombo.id} - {compositionDraftItems.length} item(s) en borrador
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge
                    label={editingCompositionCombo.active ? 'Activo' : 'Inactivo'}
                    tone={editingCompositionCombo.active ? 'success' : 'default'}
                  />
                  <span className="products-table-price">
                    {formatCurrency(Number(editingCompositionCombo.sale_price))}
                  </span>
                </div>
              </div>
            </div>
          ) : null}

          <div className="products-form-group products-form-group--strong rounded-lg p-4 sm:p-5">
            <p className="products-form-group__label">Agregar item</p>
            <p className="products-form-group__description">
                Si agregas un item ya existente, su cantidad se suma en el borrador antes de guardar.
            </p>

            <div className="mt-4 grid gap-4 md:grid-cols-[minmax(0,1fr)_140px_auto] md:items-end">
              <Select
                label="Item operativo"
                wrapperClassName="products-field"
                labelClassName="products-field__label"
                className="products-field__control"
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
                wrapperClassName="products-field"
                labelClassName="products-field__label"
                className="products-field__control"
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
                className="products-panel__cta md:min-w-[9rem] md:flex-none"
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
                  className="products-form-group rounded-lg p-4"
                >
                  <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_140px_auto] lg:items-end">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold theme-text-strong">
                          {formatVariantDisplayName(item.variant)}
                        </p>
                        <StatusBadge
                          label={item.variant.active ? 'Activo' : 'Inactivo'}
                          tone={item.variant.active ? 'success' : 'default'}
                        />
                      </div>
                      <p className="products-table-stack__detail mt-2">
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
                      wrapperClassName="products-field"
                      labelClassName="products-field__label"
                      className="products-field__control"
                      value={item.qtyInput}
                      onChange={(event) =>
                        handleCompositionQtyChange(item.variant_id, event.target.value)
                      }
                    />

                    <Button
                      variant="ghost"
                      className="action-soft-danger products-action-delete"
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

          <div className="products-panel__actions modal-action-row">
            <Button
              variant="secondary"
              className="products-panel__secondary sm:flex-none sm:min-w-[9rem]"
              disabled={savingComposition}
              onClick={() => setCompositionEditorOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              className="products-panel__cta sm:flex-none sm:min-w-[12rem]"
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
        <div className="products-form-stack grid min-w-0 gap-4 sm:gap-5">
          <div className="products-delete-summary rounded-lg p-4">
            <p className="text-sm font-semibold theme-text-strong">
              {deleteTarget?.name ?? 'Combo seleccionado'}
            </p>
            {deleteTarget ? (
              <p className="mt-2 text-sm text-[color:var(--text-faint)]">
                {deleteTarget.detail}
              </p>
            ) : null}
          </div>
          <div className="products-inline-note products-inline-note--footer">
            Deseas continuar con la eliminacion? Si el combo tiene ventas historicas,
            el sistema bloqueara la operacion y te pedira desactivarlo en lugar de
            eliminarlo.
          </div>
          <div className="products-panel__actions modal-action-row">
            <Button
              variant="secondary"
              className="products-panel__secondary sm:flex-none sm:min-w-[9rem]"
              disabled={deletingCombo}
              onClick={() => setDeleteTarget(null)}
            >
              Cancelar
            </Button>
            <Button
              disabled={deletingCombo || !deleteTarget}
              className="products-panel__cta action-soft-danger products-action-delete sm:flex-none sm:min-w-[12rem]"
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

function getComboCoverageState(combo: CatalogCombo): {
  label: string;
  tone: 'default' | 'success' | 'warning' | 'danger' | 'info';
} {
  if (!combo.active) {
    return combo.items.length > 0
      ? { label: 'Base creada', tone: 'default' }
      : { label: 'Sin items', tone: 'default' };
  }

  if (combo.items.length > 0) {
    return { label: 'Listo POS', tone: 'success' };
  }

  return { label: 'Pendiente', tone: 'warning' };
}

function getComboImageDraft(combo: CatalogCombo): ComboImageDraft {
  return getCatalogEntityImageDraft(combo, combo.name);
}

async function persistComboImageDraft(comboId: number, draft: ComboImageDraft) {
  if (draft.pendingImageFile) {
    return posApi.uploadComboImage(comboId, draft.pendingImageFile);
  }

  if (draft.markedForRemoval && draft.imageUrl) {
    return posApi.deleteComboImage(comboId);
  }

  return null;
}

function buildComboUpdateSuccessMessage(comboId: number, draft: ComboImageDraft) {
  if (draft.markedForRemoval && draft.imageUrl && !draft.pendingImageFile) {
    return `Combo #${comboId} actualizado sin imagen.`;
  }

  if (draft.pendingImageFile) {
    return `Combo #${comboId} actualizado con imagen.`;
  }

  return `Combo #${comboId} actualizado correctamente.`;
}

function translateComboError(message: string) {
  if (message === 'Combo name already exists') {
    return 'Ya existe un combo con ese nombre.';
  }
  if (message === 'Combo not found') {
    return 'El combo seleccionado ya no existe.';
  }
  if (message === 'Combo image file is required') {
    return 'Selecciona una imagen valida antes de guardar.';
  }
  if (message === 'Combo image must be WebP, PNG, JPG or JPEG') {
    return 'Usa una imagen WebP, PNG, JPG o JPEG.';
  }
  if (message === 'Combo image must be 3 MB or smaller') {
    return 'La imagen no puede superar 3 MB.';
  }
  if (message === 'Combo image upload is invalid') {
    return 'La imagen seleccionada no es valida. Prueba con otro archivo.';
  }
  if (message === 'Combo image could not be stored') {
    return 'No se pudo guardar la imagen en servidor. Intenta de nuevo.';
  }
  if (message.includes('historical sales')) {
    return 'No se puede eliminar porque ya tiene ventas historicas. Desactivalo en su lugar.';
  }
  if (message.includes('Duplicate variant items')) {
    return 'No se permiten items duplicados dentro de la composicion del combo.';
  }
  if (message.includes('invalid/inactive')) {
    return 'Uno de los items seleccionados ya no esta disponible para composicion.';
  }

  return message;
}

function getComboCompositionSummary(combo: CatalogCombo) {
  if (combo.items.length === 0) {
    return 'Usa la accion de composicion para cargar items y cantidades.';
  }

  const previewItems = combo.items.slice(0, 2).map((item) => {
    const subtitle = formatVariantSubtitle(item.variant);
    const parts = [formatVariantDisplayName(item.variant), subtitle, `qty ${item.qty}`].filter(
      Boolean,
    );

    return parts.join(' - ');
  });

  if (combo.items.length > 2) {
    return `${previewItems.join(' / ')} / +${combo.items.length - 2} item(s)`;
  }

  return previewItems.join(' / ');
}

function CombosListToolbar({
  label,
  value,
  badges = [],
  searchValue,
  onSearchChange,
}: {
  label: string;
  value: string;
  badges?: CombosToolbarBadge[];
  searchValue: string;
  onSearchChange: (value: string) => void;
}) {
  return (
    <div className="products-list-toolbar toolbar-shell mt-4 grid gap-3 rounded-lg px-4 py-3 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
      <div className="products-list-toolbar__summary">
        <p className="products-list-toolbar__label">{label}</p>
        <p className="products-list-toolbar__count">{value}</p>
      </div>
      <div className="products-list-toolbar__controls flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-end xl:w-auto">
        <SearchField
          value={searchValue}
          onChange={(event) => onSearchChange(event.target.value)}
          onClear={() => onSearchChange('')}
          placeholder="Buscar por nombre de combo"
          aria-label="Buscar combo por nombre"
          fieldClassName="products-list-toolbar__search-field"
          className="min-h-10"
          wrapperClassName="products-list-toolbar__search w-full sm:max-w-[280px] xl:max-w-[320px]"
        />
        {badges.length > 0 ? (
          <div className="products-list-toolbar__filters flex flex-wrap justify-end gap-2">
            {badges.map((badge) => (
              <StatusBadge
                key={`${badge.label}-${badge.tone ?? 'default'}`}
                label={badge.label}
                tone={badge.tone ?? 'default'}
              />
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
