import '@/features/products/products-d2b.css';
import '@/features/combos/combos-d2d.css';
import { type ReactNode, useEffect, useMemo, useState } from 'react';
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

type ComboWorkspaceTab = 'COMBO' | 'COMPOSITION';
type ComboStatusFilter = 'ALL' | 'ACTIVE' | 'INACTIVE' | 'PENDING';

const comboWorkspaceTabs: Array<{ value: ComboWorkspaceTab; label: string }> = [
  { value: 'COMBO', label: 'Combo' },
  { value: 'COMPOSITION', label: 'Composicion' },
];

const comboStatusFilterOptions: Array<{ value: ComboStatusFilter; label: string }> = [
  { value: 'ALL', label: 'Todos' },
  { value: 'ACTIVE', label: 'Activos' },
  { value: 'INACTIVE', label: 'Inactivos' },
  { value: 'PENDING', label: 'Pendientes' },
];

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
  const [comboWorkspaceTab, setComboWorkspaceTab] =
    useState<ComboWorkspaceTab>('COMBO');
  const [comboStatusFilter, setComboStatusFilter] =
    useState<ComboStatusFilter>('ALL');

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

    return combos.filter((combo) => {
      const matchesSearch = normalizedSearch
        ? combo.name.toLowerCase().includes(normalizedSearch)
        : true;
      const matchesStatus =
        comboStatusFilter === 'ALL'
          ? true
          : comboStatusFilter === 'ACTIVE'
            ? combo.active
            : comboStatusFilter === 'INACTIVE'
              ? !combo.active
              : combo.active && combo.items.length === 0;

      return matchesSearch && matchesStatus;
    });
  }, [combos, comboSearch, comboStatusFilter]);

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
          ? 'Composicion actualizada correctamente.'
          : 'Combo guardado sin items.',
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
        setMessage('Combo creado correctamente.');
        setSubmitError(
          `Combo creado, pero la imagen no se pudo ${resolveComboImageMutationAction(comboImageDraft)}. ${translateComboError(
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
          ? 'Combo creado con imagen.'
          : 'Combo creado correctamente.',
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
        setMessage('Combo actualizado correctamente.');
        setSubmitError(
          `Combo actualizado, pero la imagen no se pudo ${resolveComboImageMutationAction(editComboImageDraft)}. ${translateComboError(
            imageError instanceof Error ? imageError.message : 'No se pudo actualizar la imagen.',
          )}`,
        );
        await refreshCatalog({ background: true });
        return;
      }

      setComboEditorOpen(false);
      setEditComboImageDraft(createEmptyComboImageDraft());
      setMessage(buildComboUpdateSuccessMessage(editComboImageDraft));
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

      setMessage(`Combo ${combo.active ? 'desactivado' : 'activado'} correctamente.`);
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
      detail: `${combo.items.length} items configurados`,
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
      setMessage('Combo eliminado correctamente.');
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
          ? `Cantidad actualizada para ${itemLabel}. Total: ${nextQty}.`
          : `Item ${itemLabel} agregado.`,
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
          ? 'Listo'
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
      label: 'Combos',
      value: String(combos.length),
      note: loadingCatalog
        ? 'Sincronizando'
        : inactiveCombosCount > 0
          ? `${activeCombosCount} activos y ${inactiveCombosCount} inactivos`
          : `${activeCombosCount} activos`,
      accent: comboStatusTone,
      icon: <Boxes size={16} />,
      iconTone: comboStatusTone,
      badge: {
        label: comboBadgeLabel,
        tone: loadingCatalog ? 'info' : activeCombosCount > 0 ? 'success' : 'default',
      },
    },
    {
      label: 'Items',
      value: String(variants.length),
      note: loadingCatalog
        ? 'Sincronizando'
        : variants.length > 0
          ? `${activeVariantsCount} activos`
          : 'Sin items',
      accent: variants.length > 0 ? 'info' : 'default',
      icon: <Shapes size={16} />,
      iconTone: variants.length > 0 ? 'info' : 'default',
      badge: {
        label: comboVariantBadgeLabel,
        tone: loadingCatalog ? 'info' : variants.length > 0 ? 'info' : 'default',
      },
    },
    {
      label: 'Listos',
      value: String(readyCombosCount),
      note: loadingCatalog
        ? 'Verificando'
        : activeCombosCount > 0
          ? `${readyCombosCount}/${activeCombosCount} activos`
          : 'Sin activos',
      accent: comboCoverageTone,
      icon: <PackagePlus size={16} />,
      iconTone: comboCoverageTone,
      badge: {
        label: comboReadyBadgeLabel,
        tone: comboCoverageTone,
      },
    },
  ];
  const comboWorkspaceTabLabel =
    comboWorkspaceTabs.find((tab) => tab.value === comboWorkspaceTab)?.label ?? 'Combo';
  const comboSummaryLabel = selectedCombo ? 'Combo activo' : 'Cobertura';
  const comboSummaryValue = selectedCombo
    ? selectedCombo.name
    : activeCombosCount > 0
      ? `${readyCombosCount}/${activeCombosCount} listos`
      : 'Sin combos activos';
  const comboSummaryNote = selectedCombo
    ? selectedCombo.items.length > 0
      ? `${selectedCombo.items.length} items configurados`
      : 'Sin composicion'
    : variants.length > 0
      ? `${activeVariantsCount} items activos`
      : 'Sin items base';
  function renderMobileInfoItem(label: string, value: ReactNode) {
    return (
      <div className="products-mobile-card__info-item">
        <span className="products-mobile-card__info-label">{label}</span>
        <div className="products-mobile-card__info-value">{value}</div>
      </div>
    );
  }

  function renderComboMobileCard(combo: CatalogCombo) {
    const coverageState = getComboCoverageState(combo);
    const comboBusy = togglingComboId === combo.id;

    return (
      <article className="products-mobile-card combos-mobile-card">
        <div className="products-mobile-card__header">
          <ProductMedia
            size="sm"
            label={combo.name}
            src={resolveApiAssetUrl(combo.imageUrl)}
            alt={combo.imageAlt ?? combo.name}
            kind="COMBO"
            className="products-mobile-card__media"
          />
          <div className="products-mobile-card__header-copy min-w-0">
            <p className="products-mobile-card__name">{combo.name}</p>
            <StatusBadge
              label={`${combo.items.length} items`}
              tone={combo.items.length > 0 ? 'info' : 'warning'}
              className="products-mobile-card__type"
            />
          </div>
        </div>
        <div className="products-mobile-card__info-grid">
          {renderMobileInfoItem(
            'Precio',
            <span className="products-mobile-card__price">
              {formatCurrency(Number(combo.sale_price))}
            </span>,
          )}
          {renderMobileInfoItem(
            'Estado',
            <StatusBadge
              label={combo.active ? 'Activo' : 'Inactivo'}
              tone={combo.active ? 'success' : 'default'}
            />,
          )}
          {renderMobileInfoItem(
            'POS',
            <StatusBadge label={coverageState.label} tone={coverageState.tone} />,
          )}
          {renderMobileInfoItem('Composicion', getComboCompositionSummary(combo))}
        </div>
        <div className="products-mobile-card__actions products-mobile-card__actions--grid">
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
      </article>
    );
  }

  return (
    <>
      <div className="products-page products-page--catalog combos-page grid min-w-0 gap-4 sm:gap-5">
        <ModulePageHeader
          ariaLabel="Estado operativo de combos"
          eyebrow="Catalogo comercial"
          title="Combos"
          icon={<Boxes size={18} />}
          badges={comboHeaderBadges}
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
              {refreshingCatalog ? 'Actualizando...' : 'Actualizar combos'}
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
          <AccessState description="Sin permiso para gestionar combos." />
        ) : null}

        <div className="products-workspace grid min-w-0 items-start gap-4 lg:grid-cols-[minmax(0,24rem)_minmax(0,1fr)] xl:grid-cols-[minmax(0,25rem)_minmax(0,1fr)] xl:gap-5">
          <div className="products-form-rail grid min-w-0 gap-4 sm:gap-5">
            <Card
              padding="none"
              glow={false}
              className="products-panel products-panel--form products-panel--creation-workspace combos-workspace-switcher"
              contentClassName="products-panel__body"
            >
              <CombosPanelHeader
                eyebrow="Workspace"
                title="Combo"
                meta={<StatusBadge label={comboWorkspaceTabLabel} tone="info" />}
              />
              <CombosSegmentedControl
                options={comboWorkspaceTabs}
                value={comboWorkspaceTab}
                onChange={setComboWorkspaceTab}
                ariaLabel="Seleccionar flujo de combos"
                idPrefix="combos-workspace"
              />
            </Card>

            {comboWorkspaceTab === 'COMBO' ? (
              <Card
                padding="none"
                glow={false}
                className="products-panel products-panel--form products-panel--creation-workspace combos-workspace-card"
                contentClassName="products-panel__body"
              >
                <CombosPanelHeader
                  eyebrow="Creacion"
                  title="Crear combo"
                  meta={
                    <StatusBadge
                      label={comboActive ? 'Activo' : 'Inactivo'}
                      tone={comboActive ? 'success' : 'default'}
                    />
                  }
                />
                <div
                  id="combos-workspace-combo-panel"
                  role="tabpanel"
                  aria-labelledby="combos-workspace-combo-tab"
                  className="products-creation-pane"
                >
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
                  <div className="mt-3 grid gap-4">
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
                      wrapperClassName="products-toggle-card"
                      className="products-toggle-card__label"
                      checked={comboActive}
                      onChange={(event) => setComboActive(event.target.checked)}
                    />
                  </div>
                </div>
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
                </div>
            </Card>
            ) : null}

            {comboWorkspaceTab === 'COMPOSITION' ? (
            <Card
              padding="none"
              glow={false}
              className="products-panel products-panel--form products-panel--creation-workspace combos-workspace-card"
              contentClassName="products-panel__body"
            >
              <CombosPanelHeader
                eyebrow="Composicion"
                title="Agregar items"
                meta={
                  selectedCombo ? (
                    <StatusBadge
                      label={getComboCoverageState(selectedCombo).label}
                      tone={getComboCoverageState(selectedCombo).tone}
                    />
                  ) : (
                    <StatusBadge label={`${variants.length} items`} tone="info" />
                  )
                }
              />
              <div
                id="combos-workspace-composition-panel"
                role="tabpanel"
                aria-labelledby="combos-workspace-composition-tab"
                className="products-creation-pane"
              >
                <div className="products-form-stack grid gap-4">
                <div className="products-form-group products-form-group--strong rounded-lg p-4 sm:p-5">
                  <p className="products-form-group__label">Seleccion</p>
                  <div className="mt-3 grid gap-4">
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
                          {combo.name} {!combo.active ? '(Inactivo)' : ''}
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
                {selectedCombo ? (
                  <div className="combos-composition-strip">
                    <span>{selectedCombo.name}</span>
                    <strong>{selectedCombo.items.length} items</strong>
                    <span>{formatCurrency(Number(selectedCombo.sale_price))}</span>
                  </div>
                ) : null}
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
              </div>
            </Card>
            ) : null}
          </div>

          <Card
            padding="none"
            glow={false}
            className="products-panel products-panel--list products-panel--catalog-explorer combos-explorer-panel"
            contentClassName="products-panel__body"
          >
            <CombosPanelHeader
              eyebrow="Explorador"
              title="Combos comerciales"
              meta={<StatusBadge label={getComboStatusFilterLabel(comboStatusFilter)} tone="info" />}
            />

            <CombosListToolbar
              label="Vista activa"
              searchValue={comboSearch}
              onSearchChange={setComboSearch}
              activeFilter={comboStatusFilter}
              filters={comboStatusFilterOptions}
              onFilterChange={setComboStatusFilter}
              action={
                <Button
                  variant="secondary"
                  className="combos-toolbar-action"
                  disabled={loadingCatalog || actionsLocked}
                  onClick={() => void refreshCatalog({ background: combos.length > 0 })}
                >
                  {refreshingCatalog ? 'Actualizando...' : 'Actualizar'}
                </Button>
              }
            />

            {refreshingCatalog && combos.length > 0 ? (
              <div className="products-inline-note products-inline-note--footer toolbar-shell mt-4 rounded-lg px-4 py-3 text-xs text-[color:var(--text-faint)]">
                Actualizando listado...
              </div>
            ) : null}

            {loadingCatalog ? (
              <div className="mt-4">
                <LoadingState
                  title="Cargando combos"
                  description="Sincronizando catalogo."
                  rows={4}
                />
              </div>
            ) : combos.length === 0 ? (
              <div className="mt-4">
                <EmptyState
                  title="Sin combos cargados"
                  description="Crea el primer combo."
                />
              </div>
            ) : filteredCombos.length === 0 ? (
              <div className="mt-4">
                <EmptyState
                  title="Sin resultados"
                  description="Ajusta la busqueda."
                />
              </div>
            ) : (
              <CatalogItemsTable
                ariaLabel="Listado de combos comerciales"
                caption="Tabla de combos comerciales"
                rows={filteredCombos}
                paginationLabel="combos"
                mobileCardRender={(combo) => renderComboMobileCard(combo)}
                rowKey={(combo) => combo.id}
                rowClassName={(combo) => (!combo.active ? 'opacity-80' : undefined)}
                tableMinWidthClassName="min-w-[1120px]"
                columns={[
                  {
                    key: 'combo',
                    header: 'Combo',
                    width: '360px',
                    render: (combo) => (
                      <div className="products-table-entity products-table-entity--with-media">
                        <ProductMedia
                          label={combo.name}
                          src={resolveApiAssetUrl(combo.imageUrl)}
                          alt={combo.imageAlt ?? combo.name}
                          kind="COMBO"
                          size="sm"
                          className="products-table-media"
                        />
                        <div className="min-w-0">
                          <div className="products-table-entity__title-row">
                            <p className="products-table-entity__name text-[15px] font-semibold theme-text-strong">
                              {combo.name}
                            </p>
                            <StatusBadge
                              label={`${combo.items.length} item(s)`}
                              tone={combo.items.length > 0 ? 'info' : 'default'}
                            />
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
                          {combo.items.length > 0 ? getComboCompositionSummary(combo) : 'Sin composicion'}
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
                    header: 'POS',
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
                    width: '304px',
                    render: (combo) => {
                      const comboBusy = togglingComboId === combo.id;

                      return (
                        <div className="products-table-actions">
                          <div className="products-table-actions__primary">
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
            <div className="mt-3 grid gap-4">
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
                    {compositionDraftItems.length} items en borrador
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

            <div className="mt-3 grid gap-4 md:grid-cols-[minmax(0,1fr)_140px_auto] md:items-end">
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
              description="Agrega items para completar el combo."
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
            Si tiene ventas historicas, desactivalo en lugar de eliminarlo.
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
    return { label: 'Listo', tone: 'success' };
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

function buildComboUpdateSuccessMessage(draft: ComboImageDraft) {
  if (draft.markedForRemoval && draft.imageUrl && !draft.pendingImageFile) {
    return 'Combo actualizado sin imagen.';
  }

  if (draft.pendingImageFile) {
    return 'Combo actualizado con imagen.';
  }

  return 'Combo actualizado correctamente.';
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
    return 'Sin items';
  }

  const previewItems = combo.items.slice(0, 2).map((item) => {
    const size = item.variant.size.trim();
    const parts = [item.variant.product_name, size, `qty ${item.qty}`].filter(
      Boolean,
    );

    return parts.join(' - ');
  });

  if (combo.items.length > 2) {
    return `${previewItems.join(' / ')} / +${combo.items.length - 2}`;
  }

  return previewItems.join(' / ');
}

function getComboStatusFilterLabel(filter: ComboStatusFilter) {
  return comboStatusFilterOptions.find((option) => option.value === filter)?.label ?? 'Todos';
}

type CombosSegmentOption<T extends string> = {
  value: T;
  label: string;
};

function CombosPanelHeader({
  eyebrow,
  title,
  meta,
}: {
  eyebrow: string;
  title: string;
  meta?: ReactNode;
}) {
  return (
    <div className="products-panel__header">
      <div className="products-panel__header-copy">
        <p className="products-panel__eyebrow">{eyebrow}</p>
        <div className="products-panel__title-row">
          <h2 className="font-display text-2xl font-bold theme-text-strong">{title}</h2>
          {meta ? <div className="products-panel__meta">{meta}</div> : null}
        </div>
      </div>
    </div>
  );
}

function CombosSegmentedControl<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  idPrefix,
}: {
  options: Array<CombosSegmentOption<T>> | readonly CombosSegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
  idPrefix: string;
}) {
  return (
    <div className="products-segmented-control" role="tablist" aria-label={ariaLabel}>
      {options.map((option) => {
        const active = value === option.value;
        const optionId = String(option.value).toLocaleLowerCase();

        return (
          <button
            key={option.value}
            id={`${idPrefix}-${optionId}-tab`}
            type="button"
            role="tab"
            aria-selected={active}
            aria-controls={`${idPrefix}-${optionId}-panel`}
            data-active={active || undefined}
            className="products-segmented-control__item"
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

function CombosListToolbar({
  label,
  searchValue,
  onSearchChange,
  activeFilter,
  filters,
  onFilterChange,
  action,
}: {
  label: string;
  searchValue: string;
  onSearchChange: (value: string) => void;
  activeFilter: ComboStatusFilter;
  filters: readonly { value: ComboStatusFilter; label: string }[];
  onFilterChange: (value: ComboStatusFilter) => void;
  action?: ReactNode;
}) {
  return (
    <div className="products-list-toolbar toolbar-shell mt-4 grid gap-3 rounded-lg px-4 py-3 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
      <div className="products-list-toolbar__summary">
        <p className="products-list-toolbar__label">{label}</p>
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
        <div
          className="products-list-toolbar__filters flex flex-wrap justify-end gap-2"
          role="group"
          aria-label="Filtrar combos"
        >
          {filters.map((filterOption) => (
            <button
              key={filterOption.value}
              type="button"
              aria-pressed={activeFilter === filterOption.value}
              data-active={activeFilter === filterOption.value || undefined}
              className="products-list-toolbar__filter min-w-[78px] justify-center"
              onClick={() => onFilterChange(filterOption.value)}
            >
              {filterOption.label}
            </button>
          ))}
        </div>
        {action ? <div className="combos-toolbar-action-slot">{action}</div> : null}
      </div>
    </div>
  );
}
