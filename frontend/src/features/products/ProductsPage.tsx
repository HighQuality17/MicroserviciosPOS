import { useEffect, useMemo, useState } from 'react';
import { BookOpenCheck, PackagePlus, Shapes } from 'lucide-react';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { AccessState } from '@/components/AccessState';
import { CheckboxField } from '@/components/CheckboxField';
import { FeedbackMessage } from '@/components/FeedbackMessage';
import { EmptyState } from '@/components/EmptyState';
import { Input } from '@/components/Input';
import { LoadingState } from '@/components/LoadingState';
import { Modal } from '@/components/Modal';
import { ModuleStatusCard, ModuleStatusHeader } from '@/components/ModuleStatusHeader';
import { Select } from '@/components/Select';
import { ScrollPanel } from '@/components/ScrollPanel';
import { StatusBadge } from '@/components/StatusBadge';
import { usePermissions } from '@/hooks/usePermissions';
import {
  ProductCatalogFieldsSection,
  type ProductCatalogDraft,
  productTypeLabels,
} from './ProductCatalogFieldsSection';
import {
  ProductFiscalFieldsSection,
  type ProductFiscalDraft,
  taxCategoryLabels,
  vatTypeLabels,
} from './ProductFiscalFieldsSection';
import { posApi } from '@/services/api/posApi';
import { useAppStore } from '@/store/appStore';
import { formatCurrency } from '@/utils/format';
import { isAccessDeniedError, translateProtectedError } from '@/utils/apiError';
import { normalizeNumberInput, parseNumberInput } from '@/utils/numberInput';
import type {
  CatalogProduct,
  CatalogVariant,
  Ingredient,
  IngredientDimension,
  ProductType,
  TaxCategory,
  VariantRecipe,
  VatType,
} from '@/types/api';

type RecipeDraftItem = {
  ingredient_id: string;
  qtyInput: string;
  unit_code: string;
  persisted: boolean;
};

type ProductListFilter = 'ALL' | 'ACTIVE' | 'INACTIVE';
type VariantListFilter = 'ALL' | 'ACTIVE' | 'INACTIVE';

type DeleteConfirmationTarget = {
  kind: 'PRODUCT' | 'VARIANT';
  id: number;
  label: string;
  detail: string;
};

const unitsByDimension: Record<IngredientDimension, string[]> = {
  WEIGHT: ['g', 'kg'],
  VOLUME: ['ml', 'L'],
  COUNT: ['unit'],
};

export function ProductsPage() {
  const { can } = usePermissions();
  const canManageCatalog = can('canManageCatalog');
  const addSessionProduct = useAppStore((state) => state.addSessionProduct);
  const addSessionVariant = useAppStore((state) => state.addSessionVariant);

  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [variants, setVariants] = useState<CatalogVariant[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [recipeStatusByVariant, setRecipeStatusByVariant] = useState<Record<number, boolean>>({});
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [catalogAccessDenied, setCatalogAccessDenied] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [creatingProduct, setCreatingProduct] = useState(false);
  const [creatingVariant, setCreatingVariant] = useState(false);
  const [editingProduct, setEditingProduct] = useState(false);
  const [editingVariant, setEditingVariant] = useState(false);
  const [savingRecipe, setSavingRecipe] = useState(false);
  const [loadingRecipe, setLoadingRecipe] = useState(false);

  const [productName, setProductName] = useState('');
  const [productCatalogDraft, setProductCatalogDraft] = useState<ProductCatalogDraft>(
    createEmptyProductCatalogDraft(),
  );
  const [productFiscalDraft, setProductFiscalDraft] = useState<ProductFiscalDraft>(
    createEmptyProductFiscalDraft(),
  );
  const [productActive, setProductActive] = useState(true);
  const [productFiscalSectionOpen, setProductFiscalSectionOpen] = useState(false);
  const [productListFilter, setProductListFilter] = useState<ProductListFilter>('ALL');
  const [variantListFilter, setVariantListFilter] = useState<VariantListFilter>('ALL');

  const [variantProductId, setVariantProductId] = useState('');
  const [variantSize, setVariantSize] = useState('');
  const [variantSku, setVariantSku] = useState('');
  const [variantPriceInput, setVariantPriceInput] = useState('');
  const [variantActive, setVariantActive] = useState(true);

  const [productEditorOpen, setProductEditorOpen] = useState(false);
  const [variantEditorOpen, setVariantEditorOpen] = useState(false);
  const [recipeModalOpen, setRecipeModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DeleteConfirmationTarget | null>(null);
  const [deletingRecord, setDeletingRecord] = useState(false);

  const [selectedProduct, setSelectedProduct] = useState<CatalogProduct | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<CatalogVariant | null>(null);
  const [loadedRecipe, setLoadedRecipe] = useState<VariantRecipe | null>(null);

  const [editProductName, setEditProductName] = useState('');
  const [editProductCatalogDraft, setEditProductCatalogDraft] = useState<ProductCatalogDraft>(
    createEmptyProductCatalogDraft(),
  );
  const [editProductFiscalDraft, setEditProductFiscalDraft] = useState<ProductFiscalDraft>(
    createEmptyProductFiscalDraft(),
  );
  const [editProductActive, setEditProductActive] = useState(true);
  const [editProductFiscalSectionOpen, setEditProductFiscalSectionOpen] = useState(false);
  const [editVariantSize, setEditVariantSize] = useState('');
  const [editVariantSku, setEditVariantSku] = useState('');
  const [editVariantPriceInput, setEditVariantPriceInput] = useState('');
  const [editVariantActive, setEditVariantActive] = useState(true);
  const [recipeDraftItems, setRecipeDraftItems] = useState<RecipeDraftItem[]>([]);

  const ingredientsById = useMemo(
    () => new Map(ingredients.map((ingredient) => [ingredient.id, ingredient])),
    [ingredients],
  );

  const activeProducts = useMemo(
    () => products.filter((product) => product.active),
    [products],
  );

  const variantReadyProducts = useMemo(
    () => activeProducts.filter((product) => product.productType === 'VARIANT'),
    [activeProducts],
  );

  const visibleProducts = useMemo(() => {
    if (productListFilter === 'ACTIVE') return activeProducts;
    if (productListFilter === 'INACTIVE') {
      return products.filter((product) => !product.active);
    }
    return products;
  }, [activeProducts, productListFilter, products]);

  const visibleVariants = useMemo(() => {
    if (variantListFilter === 'ACTIVE') {
      return variants.filter((variant) => variant.active);
    }
    if (variantListFilter === 'INACTIVE') {
      return variants.filter((variant) => !variant.active);
    }
    return variants;
  }, [variantListFilter, variants]);

  const enrichedProducts = useMemo(
    () =>
      visibleProducts.map((product) => ({
        ...product,
        relatedVariants:
          product.variants.length > 0
            ? product.variants
            : variants.filter((variant) => variant.product_id === product.id),
      })),
    [variants, visibleProducts],
  );

  useEffect(() => {
    void refreshCatalog();
  }, []);

  useEffect(() => {
    if (!variantProductId) return;

    const currentProductStillAvailable = variantReadyProducts.some(
      (product) => String(product.id) === variantProductId,
    );

    if (!currentProductStillAvailable) {
      setVariantProductId('');
    }
  }, [variantProductId, variantReadyProducts]);

  async function refreshCatalog() {
    try {
      setLoadingCatalog(true);
      setCatalogError(null);
      setCatalogAccessDenied(false);

      const [productsResponse, variantsResponse, ingredientsResponse] = await Promise.all([
        posApi.getProducts(),
        posApi.getVariants({ status: 'ALL' }),
        posApi.getIngredients(),
      ]);

      setProducts(productsResponse);
      setVariants(variantsResponse);
      setIngredients(ingredientsResponse);
      await loadRecipeStatuses(variantsResponse);
    } catch (error) {
      setCatalogAccessDenied(isAccessDeniedError(error));
      setCatalogError(
        error instanceof Error
          ? translateCatalogError(
              translateProtectedError(
                error,
                'No fue posible cargar productos, variantes y recetas.',
              ),
            )
          : 'No fue posible cargar productos, variantes y recetas.',
      );
    } finally {
      setLoadingCatalog(false);
    }
  }

  async function loadRecipeStatuses(currentVariants: CatalogVariant[]) {
    const responses = await Promise.all(
      currentVariants.map(async (variant) => {
        try {
          const recipe = await posApi.getVariantRecipe(variant.id);
          return [variant.id, recipe.has_recipe] as const;
        } catch {
          return [variant.id, false] as const;
        }
      }),
    );

    setRecipeStatusByVariant(Object.fromEntries(responses));
  }

  async function handleCreateProduct() {
    if (!productName.trim()) {
      setSubmitError('El nombre del producto es obligatorio.');
      return;
    }

    try {
      setCreatingProduct(true);
      setSubmitError(null);
      setMessage(null);

      const product = await posApi.createProduct({
        name: productName.trim(),
        ...serializeProductCatalogDraft(productCatalogDraft),
        ...serializeProductFiscalDraft(productFiscalDraft),
        active: productActive,
      });

      addSessionProduct(product);
      setProductName('');
      setProductCatalogDraft(createEmptyProductCatalogDraft());
      setProductFiscalDraft(createEmptyProductFiscalDraft());
      setProductActive(true);
      setProductFiscalSectionOpen(false);
      setMessage(`Producto #${product.id} creado correctamente.`);
      await refreshCatalog();
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? translateCatalogError(error.message)
          : 'No se pudo crear el producto.',
      );
    } finally {
      setCreatingProduct(false);
    }
  }

  async function handleCreateVariant() {
    const productId = Number(variantProductId);
    const variantPrice = parseNumberInput(variantPriceInput);
    const selectedProductForVariant = variantReadyProducts.find(
      (product) => product.id === productId,
    );

    if (!variantProductId || productId <= 0) {
      setSubmitError('Selecciona un producto para la variante.');
      return;
    }
    if (!selectedProductForVariant) {
      setSubmitError(
        'Selecciona un producto activo configurado para trabajar con variantes.',
      );
      return;
    }
    if (!variantSize.trim() || !variantSku.trim()) {
      setSubmitError('Tamaño y SKU son obligatorios.');
      return;
    }
    if (variantPrice === null || variantPrice < 0) {
      setSubmitError('El precio debe ser mayor o igual a 0.');
      return;
    }

    try {
      setCreatingVariant(true);
      setSubmitError(null);
      setMessage(null);

      const variant = await posApi.createVariant({
        product_id: productId,
        size: variantSize.trim(),
        sku: variantSku.trim(),
        sale_price: variantPrice,
        active: variantActive,
      });

      addSessionVariant(variant);
      setVariantProductId('');
      setVariantSize('');
      setVariantSku('');
      setVariantPriceInput('');
      setVariantActive(true);
      setMessage(`Variante #${variant.id} creada correctamente.`);
      await refreshCatalog();
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? translateCatalogError(error.message)
          : 'No se pudo crear la variante.',
      );
    } finally {
      setCreatingVariant(false);
    }
  }

  function openProductEditor(product: CatalogProduct) {
    setSelectedProduct(product);
    setEditProductName(product.name);
    setEditProductCatalogDraft(getProductCatalogDraft(product));
    setEditProductFiscalDraft(getProductFiscalDraft(product));
    setEditProductActive(product.active);
    setEditProductFiscalSectionOpen(hasConfiguredFiscalData(product));
    setProductEditorOpen(true);
    setSubmitError(null);
  }

  async function handleSaveProduct() {
    if (!selectedProduct) return;
    if (!editProductName.trim()) {
      setSubmitError('El nombre del producto es obligatorio.');
      return;
    }

    try {
      setEditingProduct(true);
      setSubmitError(null);
      await posApi.updateProduct(selectedProduct.id, {
        name: editProductName.trim(),
        ...serializeProductCatalogDraft(editProductCatalogDraft),
        ...serializeProductFiscalDraft(editProductFiscalDraft),
        active: editProductActive,
      });
      setProductEditorOpen(false);
      setMessage(`Producto #${selectedProduct.id} actualizado correctamente.`);
      await refreshCatalog();
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? translateCatalogError(error.message)
          : 'No se pudo actualizar el producto.',
      );
    } finally {
      setEditingProduct(false);
    }
  }

  async function handleToggleProductStatus(product: CatalogProduct) {
    try {
      setSubmitError(null);
      setMessage(null);
      await posApi.updateProductStatus(product.id, { active: !product.active });
      setMessage(
        `Producto #${product.id} ${product.active ? 'desactivado' : 'activado'} correctamente.`,
      );
      await refreshCatalog();
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? translateCatalogError(error.message)
          : 'No se pudo cambiar el estado del producto.',
      );
    }
  }

  function openVariantEditor(variant: CatalogVariant) {
    setSelectedVariant(variant);
    setEditVariantSize(variant.size);
    setEditVariantSku(variant.sku);
    setEditVariantPriceInput(String(Number(variant.sale_price)));
    setEditVariantActive(variant.active);
    setVariantEditorOpen(true);
    setSubmitError(null);
  }

  async function handleSaveVariant() {
    if (!selectedVariant) return;
    const salePrice = parseNumberInput(editVariantPriceInput);

    if (!editVariantSize.trim() || !editVariantSku.trim()) {
      setSubmitError('Tamaño y SKU son obligatorios.');
      return;
    }
    if (salePrice === null || salePrice < 0) {
      setSubmitError('El precio de venta debe ser válido.');
      return;
    }

    try {
      setEditingVariant(true);
      setSubmitError(null);
      await posApi.updateVariant(selectedVariant.id, {
        size: editVariantSize.trim(),
        sku: editVariantSku.trim(),
        sale_price: salePrice,
        active: editVariantActive,
      });
      setVariantEditorOpen(false);
      setMessage(`Variante #${selectedVariant.id} actualizada correctamente.`);
      await refreshCatalog();
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? translateCatalogError(error.message)
          : 'No se pudo actualizar la variante.',
      );
    } finally {
      setEditingVariant(false);
    }
  }

  async function handleToggleVariantStatus(variant: CatalogVariant) {
    try {
      setSubmitError(null);
      setMessage(null);
      await posApi.updateVariantStatus(variant.id, { active: !variant.active });
      setMessage(
        `Variante #${variant.id} ${variant.active ? 'desactivada' : 'activada'} correctamente.`,
      );
      await refreshCatalog();
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? translateCatalogError(error.message)
          : 'No se pudo cambiar el estado de la variante.',
      );
    }
  }

  function requestProductDelete(product: CatalogProduct) {
    setDeleteTarget({
      kind: 'PRODUCT',
      id: product.id,
      label: product.name,
      detail: `Producto #${product.id}`,
    });
    setSubmitError(null);
  }

  function requestVariantDelete(variant: CatalogVariant) {
    setDeleteTarget({
      kind: 'VARIANT',
      id: variant.id,
      label: `${variant.product_name} | ${variant.size}`,
      detail: `Variante #${variant.id} | ${variant.sku}`,
    });
    setSubmitError(null);
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) return;

    try {
      setDeletingRecord(true);
      setSubmitError(null);
      setMessage(null);

      if (deleteTarget.kind === 'PRODUCT') {
        await posApi.deleteProduct(deleteTarget.id);
        if (selectedProduct?.id === deleteTarget.id) {
          setProductEditorOpen(false);
          setSelectedProduct(null);
        }
        setMessage(`Producto #${deleteTarget.id} eliminado correctamente.`);
      } else {
        await posApi.deleteVariant(deleteTarget.id);
        if (selectedVariant?.id === deleteTarget.id) {
          setVariantEditorOpen(false);
          setRecipeModalOpen(false);
          setSelectedVariant(null);
          setLoadedRecipe(null);
        }
        setMessage(`Variante #${deleteTarget.id} eliminada correctamente.`);
      }

      setDeleteTarget(null);
      await refreshCatalog();
    } catch (error) {
      setDeleteTarget(null);
      setSubmitError(
        error instanceof Error
          ? translateCatalogError(error.message)
          : 'No se pudo eliminar el registro seleccionado.',
      );
    } finally {
      setDeletingRecord(false);
    }
  }

  async function openRecipeManager(variant: CatalogVariant) {
    try {
      setLoadingRecipe(true);
      setSubmitError(null);
      setSelectedVariant(variant);
      setRecipeModalOpen(true);
      const recipe = await posApi.getVariantRecipe(variant.id);
      setLoadedRecipe(recipe);
      setRecipeDraftItems(
        recipe.items.length > 0
          ? recipe.items.map((item) => ({
              ingredient_id: String(item.ingredient_id),
              qtyInput: String(item.qty_base_required),
              unit_code: item.default_unit_code,
              persisted: true,
            }))
          : [createEmptyRecipeDraft()],
      );
    } catch (error) {
      setRecipeModalOpen(false);
      setSubmitError(
        error instanceof Error
          ? translateCatalogError(error.message)
          : 'No se pudo cargar la receta de la variante.',
      );
    } finally {
      setLoadingRecipe(false);
    }
  }

  function handleRecipeDraftChange(
    index: number,
    field: keyof RecipeDraftItem,
    value: string | boolean,
  ) {
    setRecipeDraftItems((current) =>
      current.map((item, itemIndex) => {
        if (itemIndex !== index) return item;

        const nextItem = { ...item, [field]: value } as RecipeDraftItem;
        if (field === 'ingredient_id') {
          const ingredient = ingredientsById.get(Number(value));
          nextItem.unit_code = ingredient ? unitsByDimension[ingredient.dimension][0] : 'g';
        }
        return nextItem;
      }),
    );
  }

  function handleAddRecipeRow() {
    setRecipeDraftItems((current) => [...current, createEmptyRecipeDraft()]);
  }

  async function handleDeleteRecipeRow(index: number) {
    if (!selectedVariant) return;
    const row = recipeDraftItems[index];
    const ingredientId = Number(row.ingredient_id);

    if (!row.persisted || Number.isNaN(ingredientId)) {
      setRecipeDraftItems((current) => current.filter((_, itemIndex) => itemIndex !== index));
      return;
    }

    try {
      setSavingRecipe(true);
      setSubmitError(null);
      const recipe = await posApi.deleteRecipeItem(selectedVariant.id, ingredientId);
      setLoadedRecipe(recipe);
      setRecipeDraftItems(
        recipe.items.length > 0
          ? recipe.items.map((item) => ({
              ingredient_id: String(item.ingredient_id),
              qtyInput: String(item.qty_base_required),
              unit_code: item.default_unit_code,
              persisted: true,
            }))
          : [createEmptyRecipeDraft()],
      );
      setRecipeStatusByVariant((current) => ({
        ...current,
        [selectedVariant.id]: recipe.has_recipe,
      }));
      setMessage(`Ingrediente eliminado de la receta de la variante #${selectedVariant.id}.`);
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? translateCatalogError(error.message)
          : 'No se pudo eliminar el ingrediente de la receta.',
      );
    } finally {
      setSavingRecipe(false);
    }
  }

  async function handleSaveRecipe() {
    if (!selectedVariant) return;

    const validRows = recipeDraftItems.filter(
      (item) => item.ingredient_id && item.qtyInput.trim() && item.unit_code,
    );

    if (validRows.length === 0) {
      setSubmitError('Agrega al menos un ingrediente con cantidad para guardar la receta.');
      return;
    }

    const ingredientIds = validRows.map((item) => Number(item.ingredient_id));
    if (new Set(ingredientIds).size !== ingredientIds.length) {
      setSubmitError('No repitas ingredientes dentro de la misma receta.');
      return;
    }

    const payloadItems = [];
    for (const row of validRows) {
      const qty = parseNumberInput(row.qtyInput);
      if (qty === null || qty <= 0) {
        setSubmitError('Todas las cantidades de la receta deben ser mayores a 0.');
        return;
      }
      payloadItems.push({
        ingredient_id: Number(row.ingredient_id),
        qty,
        unit_code: row.unit_code,
      });
    }

    try {
      setSavingRecipe(true);
      setSubmitError(null);
      const recipe = await posApi.updateVariantRecipe(selectedVariant.id, {
        items: payloadItems,
      });
      setLoadedRecipe(recipe);
      setRecipeDraftItems(
        recipe.items.map((item) => ({
          ingredient_id: String(item.ingredient_id),
          qtyInput: String(item.qty_base_required),
          unit_code: item.default_unit_code,
          persisted: true,
        })),
      );
      setRecipeStatusByVariant((current) => ({
        ...current,
        [selectedVariant.id]: recipe.has_recipe,
      }));
      setMessage(`Receta de la variante #${selectedVariant.id} guardada correctamente.`);
      setRecipeModalOpen(false);
      await refreshCatalog();
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? translateCatalogError(error.message)
          : 'No se pudo guardar la receta.',
      );
    } finally {
      setSavingRecipe(false);
    }
  }

  const activeProductsCount = activeProducts.length;
  const inactiveProductsCount = products.length - activeProductsCount;
  const activeVariants = variants.filter((variant) => variant.active);
  const activeVariantsCount = activeVariants.length;
  const inactiveVariantsCount = variants.length - activeVariantsCount;
  const configuredRecipesCount = activeVariants.filter(
    (variant) => recipeStatusByVariant[variant.id],
  ).length;
  const catalogStatusTone = catalogAccessDenied
    ? 'danger'
    : catalogError
      ? 'warning'
      : loadingCatalog
        ? 'info'
        : 'success';
  const catalogStatusLabel = catalogAccessDenied
    ? 'Acceso restringido'
    : catalogError
      ? 'Revision requerida'
      : loadingCatalog
        ? 'Sincronizando'
        : 'Catalogo operativo';
  const recipeCoverageTone = configuredRecipesCount === 0
    ? activeVariantsCount > 0
      ? 'warning'
      : 'default'
    : configuredRecipesCount === activeVariantsCount
      ? 'success'
      : 'info';
  const productBadgeLabel = loadingCatalog
    ? 'Sincronizando'
    : products.length === 0
      ? 'Sin catalogo'
      : inactiveProductsCount > 0
        ? 'Mixto'
        : 'Catalogo activo';
  const variantBadgeLabel = loadingCatalog
    ? 'Sincronizando'
    : variants.length > 0
      ? inactiveVariantsCount > 0
        ? 'Mixto'
        : 'Solo activas'
      : 'Sin variantes';
  const recipeBadgeLabel = loadingCatalog
    ? 'Verificando'
    : activeVariantsCount === 0
      ? 'Sin variantes'
      : configuredRecipesCount === activeVariantsCount
        ? 'Cobertura completa'
        : configuredRecipesCount > 0
          ? 'Cobertura parcial'
          : 'Sin cobertura';
  const visibleProductsLabel = productListFilter === 'ALL'
    ? `${products.length} productos en total`
    : productListFilter === 'ACTIVE'
      ? `${activeProductsCount} activos visibles`
      : `${inactiveProductsCount} inactivos visibles`;
  const visibleVariantsLabel = variantListFilter === 'ALL'
    ? `${variants.length} variantes en total`
    : variantListFilter === 'ACTIVE'
      ? `${activeVariantsCount} activas visibles`
      : `${inactiveVariantsCount} inactivas visibles`;
  return (
    <div className="grid min-w-0 gap-4 sm:gap-5">
      <ModuleStatusHeader
        ariaLabel="Estado operativo de productos"
        eyebrow="Operacion de catalogo"
        title="Productos"
        statusLabel={catalogStatusLabel}
        statusTone={catalogStatusTone}
        description="Catalogo, variantes y cobertura de recetas."
        helpText="Resume el estado del catalogo comercial, las variantes disponibles y la cobertura real de recetas."
        icon={<PackagePlus size={18} />}
      >
        <ModuleStatusCard
          label="Productos"
          value={String(products.length)}
          icon={<PackagePlus size={16} />}
          iconTone={products.length > 0 ? 'success' : 'default'}
          badgeLabel={productBadgeLabel}
          badgeTone={loadingCatalog ? 'info' : products.length > 0 ? 'success' : 'default'}
          meta={
            catalogAccessDenied
              ? 'Sin acceso al catalogo'
              : loadingCatalog
                ? 'Sincronizando catalogo'
                : inactiveProductsCount > 0
                  ? `${activeProductsCount} activos | ${inactiveProductsCount} inactivos`
                  : `${activeProductsCount} activos`
          }
        />
        <ModuleStatusCard
          label="Variantes"
          value={String(variants.length)}
          icon={<Shapes size={16} />}
          iconTone={variants.length > 0 ? 'info' : 'default'}
          badgeLabel={variantBadgeLabel}
          badgeTone={loadingCatalog ? 'info' : variants.length > 0 ? 'info' : 'default'}
          meta={
            catalogAccessDenied
              ? 'Sin acceso a variantes'
              : loadingCatalog
                ? 'Preparando datos'
                : inactiveVariantsCount > 0
                  ? `${activeVariantsCount} activas | ${inactiveVariantsCount} inactivas`
                  : `${activeVariantsCount} activas`
          }
        />
        <ModuleStatusCard
          label="Recetas configuradas"
          value={String(configuredRecipesCount)}
          icon={<BookOpenCheck size={16} />}
          iconTone={recipeCoverageTone}
          badgeLabel={recipeBadgeLabel}
          badgeTone={recipeCoverageTone}
          meta={
            catalogAccessDenied
              ? 'Requiere acceso admin'
              : loadingCatalog
                ? 'Verificando cobertura'
                : activeVariantsCount > 0
                  ? `${configuredRecipesCount}/${activeVariantsCount} activas con receta`
                  : 'Crea variantes para medir cobertura'
          }
        />
      </ModuleStatusHeader>

      {message ? <FeedbackMessage tone="success">{message}</FeedbackMessage> : null}

      {submitError ? <FeedbackMessage tone="error">{submitError}</FeedbackMessage> : null}

      {catalogError ? <FeedbackMessage tone="error">{catalogError}</FeedbackMessage> : null}

      {catalogAccessDenied ? (
        <AccessState description="Tu perfil actual no puede consultar productos, variantes ni recetas administrativas." />
      ) : null}

      <div className="grid min-w-0 items-start gap-4 xl:grid-cols-[minmax(0,520px)_minmax(0,1fr)]">
        <div className="grid min-w-0 gap-4 sm:gap-5">
          <Card>
            <p className="text-sm theme-text-muted">Gestión de productos</p>
            <h2 className="font-display text-2xl font-bold theme-text-strong">Crear producto</h2>
            <div className="mt-5 grid gap-4">
              <Input
                label="Nombre"
                value={productName}
                onChange={(event) => setProductName(event.target.value)}
                placeholder="Latte avellana"
              />
              <ProductCatalogFieldsSection
                draft={productCatalogDraft}
                onInternalCodeChange={(value) =>
                  setProductCatalogDraft((current) => ({
                    ...current,
                    internalCode: value,
                  }))
                }
                onBarcodeChange={(value) =>
                  setProductCatalogDraft((current) => ({
                    ...current,
                    barcode: value,
                  }))
                }
                onSupplierReferenceChange={(value) =>
                  setProductCatalogDraft((current) => ({
                    ...current,
                    supplierReference: value,
                  }))
                }
                onDescriptionChange={(value) =>
                  setProductCatalogDraft((current) => ({
                    ...current,
                    description: value,
                  }))
                }
                onBrandChange={(value) =>
                  setProductCatalogDraft((current) => ({
                    ...current,
                    brand: value,
                  }))
                }
                onProductTypeChange={(value) =>
                  setProductCatalogDraft((current) => ({
                    ...current,
                    productType: value,
                  }))
                }
              />

              <ProductFiscalFieldsSection
                open={productFiscalSectionOpen}
                onOpenChange={(nextOpen) => setProductFiscalSectionOpen(nextOpen)}
                draft={productFiscalDraft}
                onUnspscCodeChange={(value) =>
                  setProductFiscalDraft((current) => ({
                    ...current,
                    unspscCode: value,
                  }))
                }
                onVatTypeChange={(value) =>
                  setProductFiscalDraft((current) => ({
                    ...current,
                    vatType: value,
                  }))
                }
                onTaxCategoryChange={(value) =>
                  setProductFiscalDraft((current) => ({
                    ...current,
                    taxCategory: value,
                  }))
                }
                onUnitMeasureChange={(value) =>
                  setProductFiscalDraft((current) => ({
                    ...current,
                    unitMeasure: value,
                  }))
                }
                onIsServiceChange={(value) =>
                  setProductFiscalDraft((current) => ({
                    ...current,
                    isService: value,
                  }))
                }
                onApplyIncChange={(value) =>
                  setProductFiscalDraft((current) => ({
                    ...current,
                    applyInc: value,
                  }))
                }
              />
              <CheckboxField
                label="Activo"
                description="Define si el producto estara disponible en el catalogo operativo."
                checked={productActive}
                onChange={(event) => setProductActive(event.target.checked)}
              />


              <div className="flex gap-3">
                <Button
                  disabled={!canManageCatalog || creatingProduct || !productName.trim()}
                  onClick={handleCreateProduct}
                >
                  {creatingProduct ? 'Guardando...' : 'Crear producto'}
                </Button>
                {!canManageCatalog ? (
                  <Button variant="secondary" disabled>
                    Solo lectura
                  </Button>
                ) : null}
              </div>
            </div>
          </Card>

          <Card>
            <p className="text-sm theme-text-muted">Gestión de variantes</p>
            <h2 className="font-display text-2xl font-bold theme-text-strong">Crear variante</h2>
            <div className="mt-5 grid gap-4">
              <Select
                label="Producto"
                value={variantProductId}
                onChange={(event) => setVariantProductId(event.target.value)}
              >
                <option value="">
                  {variantReadyProducts.length === 0
                    ? 'No hay productos tipo variante activos'
                    : 'Selecciona un producto'}
                </option>
                {variantReadyProducts.map((product) => (
                  <option key={product.id} value={String(product.id)}>
                    #{product.id} / {product.name}
                  </option>
                ))}
              </Select>
              <p className="text-xs text-[color:var(--text-faint)]">
                Solo se listan productos activos configurados como tipo variante.
              </p>


              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label="Tamaño"
                  value={variantSize}
                  onChange={(event) => setVariantSize(event.target.value)}
                  placeholder="Ej: 12oz"
                />
                <Input
                  label="SKU"
                  value={variantSku}
                  onChange={(event) => setVariantSku(event.target.value)}
                  placeholder="Ej: CAF-AM-12"
                />
              </div>

              <Input
                type="number"
                min={0}
                label="Precio de venta"
                placeholder="Ej: 12000"
                value={variantPriceInput}
                onChange={(event) => {
                  const nextValue = normalizeNumberInput(event.target.value);
                  if (nextValue !== null) setVariantPriceInput(nextValue);
                }}
              />

              <CheckboxField
                label="Activa"
                description="Las variantes inactivas no se muestran en POS."
                checked={variantActive}
                onChange={(event) => setVariantActive(event.target.checked)}
              />

              <div className="flex gap-3">
                <Button
                  disabled={!canManageCatalog || creatingVariant || variantReadyProducts.length === 0}
                  onClick={handleCreateVariant}
                >
                  {creatingVariant ? 'Guardando...' : 'Crear variante'}
                </Button>
                {!canManageCatalog ? (
                  <Button variant="secondary" disabled>
                    Solo lectura
                  </Button>
                ) : null}
              </div>
            </div>
          </Card>
        </div>

        <div className="grid min-w-0 gap-4 sm:gap-5">
          <Card>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm theme-text-muted">Vista operativa</p>
                <h2 className="font-display text-2xl font-bold theme-text-strong">Productos</h2>
              </div>
              <Button variant="secondary" onClick={() => void refreshCatalog()}>
                Refrescar
              </Button>
            </div>

            <div className="toolbar-shell mt-5 flex flex-col gap-3 rounded-2xl px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap gap-2">
                {([
                  { value: 'ALL', label: 'Todos' },
                  { value: 'ACTIVE', label: 'Activos' },
                  { value: 'INACTIVE', label: 'Inactivos' },
                ] as const).map((filterOption) => (
                  <Button
                    key={filterOption.value}
                    variant={productListFilter === filterOption.value ? 'secondary' : 'ghost'}
                    className="min-w-[104px]"
                    onClick={() => setProductListFilter(filterOption.value)}
                  >
                    {filterOption.label}
                  </Button>
                ))}
              </div>
              <p className="text-xs text-[color:var(--text-faint)]">{visibleProductsLabel}</p>
            </div>

            {loadingCatalog ? (
              <div className="mt-6">
                <LoadingState
                  title="Cargando productos"
                  description="Estamos preparando el catálogo y sus variantes activas."
                  rows={4}
                />
              </div>
            ) : enrichedProducts.length === 0 ? (
              <div className="mt-6">
                <EmptyState
                  title={
                    productListFilter === 'INACTIVE'
                      ? 'Sin productos inactivos'
                      : productListFilter === 'ACTIVE'
                        ? 'Sin productos activos'
                        : 'Sin productos cargados'
                  }
                  description={
                    productListFilter === 'INACTIVE'
                      ? 'Cuando desactives productos, podras revisarlos y reactivarlos desde aqui.'
                      : productListFilter === 'ACTIVE'
                        ? 'Activa un producto existente o crea uno nuevo para verlo en este listado.'
                        : 'Usa el formulario de la izquierda para crear el primer producto del catalogo.'
                  }
                />
              </div>
            ) : (
              <ScrollPanel className="mt-6 grid gap-4" tabIndex={0} aria-label="Listado de productos">
                {enrichedProducts.map((product) => (
                  <div
                    key={product.id}
                    className={[
                      'data-list-card rounded-3xl p-5',
                      product.active ? '' : 'border border-dashed theme-border-soft opacity-90',
                    ].join(' ')}
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-3">
                          <p className="font-display text-xl font-bold theme-text-strong">{product.name}</p>
                          <StatusBadge
                            label={product.active ? 'Activo' : 'Inactivo'}
                            tone={product.active ? 'success' : 'default'}
                          />
                          <StatusBadge
                            label={productTypeLabels[product.productType]}
                            tone={product.productType === 'VARIANT' ? 'info' : 'default'}
                          />
                        </div>
                        <p className="mt-2 text-sm text-[color:var(--text-faint)]">
                          ID {product.id} | {product.relatedVariants.length} variantes asociadas
                        </p>
                        {product.description ? (
                          <p className="mt-3 max-w-3xl text-sm leading-6 theme-text-secondary">
                            {summarizeProductDescription(product.description)}
                          </p>
                        ) : null}
                        <div className="mt-3 flex flex-wrap gap-2">
                          {product.internalCode ? (
                            <span className="soft-pill rounded-full px-3 py-1 text-xs">
                              Interno {product.internalCode}
                            </span>
                          ) : null}
                          {product.barcode ? (
                            <span className="soft-pill rounded-full px-3 py-1 text-xs">
                              Barras {product.barcode}
                            </span>
                          ) : null}
                          {product.brand ? (
                            <span className="soft-pill rounded-full px-3 py-1 text-xs">
                              Marca {product.brand}
                            </span>
                          ) : null}
                          {product.supplierReference ? (
                            <span className="soft-pill rounded-full px-3 py-1 text-xs">
                              Ref. proveedor {product.supplierReference}
                            </span>
                          ) : null}
                          {product.unspscCode ? (
                            <span className="soft-pill rounded-full px-3 py-1 text-xs">
                              UNSPSC {product.unspscCode}
                            </span>
                          ) : null}
                          {product.vatType ? (
                            <StatusBadge
                              label={`IVA ${vatTypeLabels[product.vatType]}`}
                              tone="info"
                            />
                          ) : null}
                          {product.taxCategory ? (
                            <StatusBadge
                              label={taxCategoryLabels[product.taxCategory]}
                              tone="default"
                            />
                          ) : null}
                          {product.unitMeasure ? (
                            <span className="soft-pill rounded-full px-3 py-1 text-xs">
                              UM {product.unitMeasure}
                            </span>
                          ) : null}
                          {product.isService ? (
                            <StatusBadge label="Servicio" tone="info" />
                          ) : null}
                          {product.applyInc ? (
                            <StatusBadge label="Aplica INC" tone="warning" />
                          ) : null}
                          {!hasConfiguredFiscalData(product) ? (
                            <span className="text-xs text-[color:var(--text-faint)]">
                              Datos fiscales opcionales sin configurar.
                            </span>
                          ) : null}
                        </div>
                        {!product.active ? (
                          <p className="mt-3 text-sm text-[color:var(--text-faint)]">
                            Producto inactivo. Sigue visible aqui para revisarlo o reactivarlo cuando lo necesites.
                          </p>
                        ) : null}
                      </div>
                      {canManageCatalog ? (
                        <div className="flex flex-wrap gap-2">
                          <Button variant="ghost" aria-haspopup="dialog" aria-controls="product-editor-dialog" onClick={() => openProductEditor(product)}>
                            Editar
                          </Button>
                          <Button
                            variant="ghost"
                            onClick={() => void handleToggleProductStatus(product)}
                          >
                            {product.active ? 'Desactivar' : 'Activar'}
                          </Button>
                          <Button
                            variant="ghost"
                            className="action-soft-danger"
                            onClick={() => requestProductDelete(product)}
                          >
                            Eliminar
                          </Button>
                        </div>
                      ) : null}
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {product.relatedVariants.length === 0 ? (
                        <span className="text-sm text-[color:var(--text-faint)]">Sin variantes asociadas aún.</span>
                      ) : (
                        product.relatedVariants.map((variant) => (
                          <span
                            key={variant.id}
                            className={[
                              'soft-pill rounded-full px-3 py-1 text-xs',
                              variant.active ? '' : 'opacity-70',
                            ].join(' ')}
                          >
                            #{variant.id} | {variant.size} | {variant.sku}
                            {!variant.active ? ' | Inactiva' : ''}
                          </span>
                        ))
                      )}
                    </div>
                  </div>
                ))}
              </ScrollPanel>
            )}
          </Card>

          <Card>
            <p className="text-sm theme-text-muted">Listado real</p>
            <h2 className="font-display text-2xl font-bold theme-text-strong">Variantes</h2>
            <div className="mt-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <p className="text-sm text-[color:var(--text-faint)]">{visibleVariantsLabel}</p>
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    { value: 'ALL', label: 'Todas' },
                    { value: 'ACTIVE', label: 'Activas' },
                    { value: 'INACTIVE', label: 'Inactivas' },
                  ] as const
                ).map((filterOption) => (
                  <Button
                    key={filterOption.value}
                    variant={variantListFilter === filterOption.value ? 'primary' : 'ghost'}
                    className="min-h-9 rounded-xl px-3 py-2 text-xs"
                    onClick={() => setVariantListFilter(filterOption.value)}
                  >
                    {filterOption.label}
                  </Button>
                ))}
              </div>
            </div>

            {loadingCatalog ? (
              <div className="mt-6 grid gap-3">
                {Array.from({ length: 5 }).map((_, index) => (
                  <div
                    key={index}
                    className="data-list-card h-20 animate-pulse rounded-3xl"
                  />
                ))}
              </div>
            ) : variants.length === 0 ? (
              <div className="mt-6">
                <EmptyState
                  title="Sin variantes cargadas"
                  description="Crea la primera variante para alimentar el POS y los combos."
                />
              </div>
            ) : visibleVariants.length === 0 ? (
              <div className="mt-6">
                <EmptyState
                  title="No hay variantes para este filtro"
                  description={
                    variantListFilter === 'ACTIVE'
                      ? 'No hay variantes activas para mostrar en este momento.'
                      : 'No hay variantes inactivas para revisar en este momento.'
                  }
                />
              </div>
            ) : (
              <div className="mt-6 overflow-x-auto overscroll-x-contain touch-pan-x pb-1">
                <div className="min-w-[1320px] overflow-hidden rounded-3xl table-shell">
                  <ScrollPanel
                    className="sm:pr-0"
                    maxHeightClassName="max-h-[34rem]"
                    tabIndex={0}
                    aria-label="Listado de variantes"
                  >
                    <table className="w-full table-fixed border-separate border-spacing-0 text-sm text-[color:var(--text-secondary)]">
                      <caption className="sr-only">Tabla de variantes del catálogo</caption>
                      <colgroup>
                        <col style={{ width: '64px' }} />
                        <col />
                        <col style={{ width: '84px' }} />
                        <col style={{ width: '102px' }} />
                        <col style={{ width: '92px' }} />
                        <col style={{ width: '108px' }} />
                        <col style={{ width: '136px' }} />
                        <col style={{ width: '408px' }} />
                      </colgroup>
                      <thead className="table-head">
                        <tr>
                          <th scope="col" className="table-head-cell px-3 py-3 text-left text-[11px] font-medium uppercase tracking-[0.18em] text-[color:var(--text-faint)] backdrop-blur-sm">
                            ID
                          </th>
                          <th scope="col" className="table-head-cell px-3 py-3 text-left text-[11px] font-medium uppercase tracking-[0.18em] text-[color:var(--text-faint)] backdrop-blur-sm">
                            Producto
                          </th>
                          <th scope="col" className="table-head-cell px-3 py-3 text-left text-[11px] font-medium uppercase tracking-[0.18em] text-[color:var(--text-faint)] backdrop-blur-sm">
                            Tamaño
                          </th>
                          <th scope="col" className="table-head-cell px-2.5 py-3 text-left text-[11px] font-medium uppercase tracking-[0.18em] text-[color:var(--text-faint)] backdrop-blur-sm">
                            SKU
                          </th>
                          <th scope="col" className="table-head-cell pl-2.5 pr-3 py-3 text-right text-[11px] font-medium uppercase tracking-[0.18em] text-[color:var(--text-faint)] backdrop-blur-sm">
                            Precio
                          </th>
                          <th scope="col" className="table-head-cell px-3 py-3 text-left text-[11px] font-medium uppercase tracking-[0.18em] text-[color:var(--text-faint)] backdrop-blur-sm">
                            Estado
                          </th>
                          <th scope="col" className="table-head-cell pl-3 pr-5 py-3 text-left text-[11px] font-medium uppercase tracking-[0.18em] text-[color:var(--text-faint)] backdrop-blur-sm">
                            Receta
                          </th>
                          <th scope="col" className="table-head-cell pl-5 pr-5 py-3 text-left text-[11px] font-medium uppercase tracking-[0.18em] text-[color:var(--text-faint)] backdrop-blur-sm">
                            Acciones
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {visibleVariants.map((variant, index) => {
                          const hasRecipe = recipeStatusByVariant[variant.id] ?? false;

                          return (
                            <tr
                              key={variant.id}
                              className={[
                                'table-row table-row-interactive text-[color:var(--text-secondary)]',
                                !variant.active ? 'opacity-80' : '',
                                index > 0 ? 'border-t theme-border-soft' : '',
                              ].join(' ')}
                            >
                              <td className="px-3 py-3.5 align-middle whitespace-nowrap text-xs theme-text-muted">#{variant.id}</td>
                              <td className="px-3 py-3.5 align-middle">
                                <div className="min-w-0">
                                  <p className="truncate text-[15px] font-semibold tracking-[-0.01em] theme-text-strong">{variant.product_name}</p>
                                  {!variant.active ? (
                                    <p className="mt-1 text-xs text-[color:var(--text-faint)]">
                                      Variante inactiva. Sigue disponible aquí para revisión o reactivación.
                                    </p>
                                  ) : null}
                                </div>
                              </td>
                              <td className="px-3 py-3.5 align-middle whitespace-nowrap text-sm">{variant.size}</td>
                              <td className="px-2.5 py-3.5 align-middle">
                                <span className="block truncate whitespace-nowrap font-mono text-[12px] text-[color:var(--text-secondary)]">{variant.sku}</span>
                              </td>
                              <td className="pl-2.5 pr-3 py-3.5 align-middle whitespace-nowrap text-right">
                                <span className="metric-accent text-[15px] font-semibold">{formatCurrency(Number(variant.sale_price))}</span>
                              </td>
                              <td className="px-3 py-3.5 align-middle">
                                <StatusBadge
                                  label={variant.active ? 'Activa' : 'Inactiva'}
                                  tone={variant.active ? 'success' : 'default'}
                                  className="min-w-[92px] justify-center"
                                />
                              </td>
                              <td className="pl-3 pr-5 py-3.5 align-middle">
                                <StatusBadge
                                  label={hasRecipe ? 'Con receta' : 'Sin receta'}
                                  tone={hasRecipe ? 'info' : 'warning'}
                                  className={hasRecipe
                                    ? 'min-w-[112px] justify-center shadow-[0_10px_24px_rgba(124,58,237,0.12)]'
                                    : 'min-w-[112px] justify-center shadow-[0_10px_24px_rgba(245,158,11,0.08)]'}
                                />
                              </td>
                              <td className="pl-5 pr-5 py-3.5 align-middle">
                                {canManageCatalog ? (
                                  <div className="flex flex-nowrap items-center gap-3 whitespace-nowrap">
                                    <Button
                                      variant="secondary"
                                      className="action-soft-brand"
                                      aria-haspopup="dialog"
                                      aria-controls="variant-editor-dialog"
                                      onClick={() => openVariantEditor(variant)}
                                    >
                                      Editar variante
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      className={variant.active
                                        ? 'action-soft-danger'
                                        : 'action-soft-success'}
                                      onClick={() => void handleToggleVariantStatus(variant)}
                                    >
                                      {variant.active ? 'Desactivar' : 'Activar'}
                                    </Button>
                                    <Button
                                      variant="secondary"
                                      className="action-soft-brand"
                                      aria-haspopup="dialog"
                                      aria-controls="recipe-manager-dialog"
                                      onClick={() => void openRecipeManager(variant)}
                                    >
                                      Gestionar receta
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      className="action-soft-danger"
                                      onClick={() => requestVariantDelete(variant)}
                                    >
                                      Eliminar
                                    </Button>
                                  </div>
                                ) : (
                                  <span className="text-xs text-[color:var(--text-faint)]">Sin acciones disponibles</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </ScrollPanel>
                </div>
              </div>
            )}

            {activeVariantsCount > 0 ? (
              <div className="toolbar-shell mt-4 rounded-2xl px-4 py-3 text-xs text-[color:var(--text-faint)]">
                Las variantes activas sin receta seguirán detectándose aquí para que administración complete la configuración antes de vender.
              </div>
            ) : null}
          </Card>
        </div>
      </div>

      <Modal
        id="product-editor-dialog"
        open={productEditorOpen}
        onClose={() => setProductEditorOpen(false)}
        title="Editar producto"
        subtitle="Actualiza la ficha comercial, el estado y la preparacion fiscal opcional del producto."
      >
        <div className="grid min-w-0 gap-4 sm:gap-5">
          <Input
            label="Nombre"
            value={editProductName}
            onChange={(event) => setEditProductName(event.target.value)}
            placeholder="Nombre del producto"
          />
          <ProductCatalogFieldsSection
            draft={editProductCatalogDraft}
            onInternalCodeChange={(value) =>
              setEditProductCatalogDraft((current) => ({
                ...current,
                internalCode: value,
              }))
            }
            onBarcodeChange={(value) =>
              setEditProductCatalogDraft((current) => ({
                ...current,
                barcode: value,
              }))
            }
            onSupplierReferenceChange={(value) =>
              setEditProductCatalogDraft((current) => ({
                ...current,
                supplierReference: value,
              }))
            }
            onDescriptionChange={(value) =>
              setEditProductCatalogDraft((current) => ({
                ...current,
                description: value,
              }))
            }
            onBrandChange={(value) =>
              setEditProductCatalogDraft((current) => ({
                ...current,
                brand: value,
              }))
            }
            onProductTypeChange={(value) =>
              setEditProductCatalogDraft((current) => ({
                ...current,
                productType: value,
              }))
            }
          />
          <ProductFiscalFieldsSection
            open={editProductFiscalSectionOpen}
            onOpenChange={(nextOpen) => setEditProductFiscalSectionOpen(nextOpen)}
            draft={editProductFiscalDraft}
            onUnspscCodeChange={(value) =>
              setEditProductFiscalDraft((current) => ({
                ...current,
                unspscCode: value,
              }))
            }
            onVatTypeChange={(value) =>
              setEditProductFiscalDraft((current) => ({
                ...current,
                vatType: value,
              }))
            }
            onTaxCategoryChange={(value) =>
              setEditProductFiscalDraft((current) => ({
                ...current,
                taxCategory: value,
              }))
            }
            onUnitMeasureChange={(value) =>
              setEditProductFiscalDraft((current) => ({
                ...current,
                unitMeasure: value,
              }))
            }
            onIsServiceChange={(value) =>
              setEditProductFiscalDraft((current) => ({
                ...current,
                isService: value,
              }))
            }
            onApplyIncChange={(value) =>
              setEditProductFiscalDraft((current) => ({
                ...current,
                applyInc: value,
              }))
            }
          />
          <CheckboxField
            label="Activo"
            description="Define si el producto estara disponible en el catalogo operativo."
            checked={editProductActive}
            onChange={(event) => setEditProductActive(event.target.checked)}
          />
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setProductEditorOpen(false)}>
              Cancelar
            </Button>
            <Button disabled={editingProduct} onClick={handleSaveProduct}>
              {editingProduct ? 'Guardando...' : 'Guardar cambios'}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        id="variant-editor-dialog"
        open={variantEditorOpen}
        onClose={() => setVariantEditorOpen(false)}
        title="Editar variante"
        subtitle="Ajusta tamaño, SKU, precio y estado de la variante seleccionada."
      >
        <div className="grid min-w-0 gap-4 sm:gap-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Tamaño"
              value={editVariantSize}
              onChange={(event) => setEditVariantSize(event.target.value)}
              placeholder="Ej: 16oz"
            />
            <Input
              label="SKU"
              value={editVariantSku}
              onChange={(event) => setEditVariantSku(event.target.value)}
              placeholder="Ej: LAT-AV-16"
            />
          </div>
          <Input
            type="number"
            min={0}
            label="Precio de venta"
            value={editVariantPriceInput}
            onChange={(event) => {
              const nextValue = normalizeNumberInput(event.target.value);
              if (nextValue !== null) setEditVariantPriceInput(nextValue);
            }}
            placeholder="Ej: 15000"
          />
          <CheckboxField
            label="Activa"
            description="Las variantes inactivas no se muestran en POS."
            checked={editVariantActive}
            onChange={(event) => setEditVariantActive(event.target.checked)}
          />
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setVariantEditorOpen(false)}>
              Cancelar
            </Button>
            <Button disabled={editingVariant} onClick={handleSaveVariant}>
              {editingVariant ? 'Guardando...' : 'Guardar cambios'}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        id="catalog-delete-dialog"
        open={deleteTarget !== null}
        onClose={() => {
          if (!deletingRecord) {
            setDeleteTarget(null);
          }
        }}
        title={deleteTarget?.kind === 'PRODUCT' ? 'Eliminar producto' : 'Eliminar variante'}
        subtitle="Esta acción solo debe usarse cuando el registro ya no deba existir en el catálogo."
      >
        <div className="grid min-w-0 gap-4 sm:gap-5">
          <div className="rounded-3xl border border-[color:var(--border-soft)] bg-[color:var(--surface-subtle)] px-4 py-4">
            <p className="text-sm font-semibold theme-text-strong">
              {deleteTarget?.label ?? 'Registro seleccionado'}
            </p>
            {deleteTarget ? (
              <p className="mt-2 text-sm text-[color:var(--text-faint)]">
                {deleteTarget.detail}
              </p>
            ) : null}
          </div>
          <p className="text-sm text-[color:var(--text-secondary)]">
            ¿Deseas continuar con la eliminación? Si el registro tiene ventas históricas o relaciones activas, el sistema bloqueará la operación y te pedirá desactivarlo o limpiar dependencias primero.
          </p>
          <div className="flex justify-end gap-3">
            <Button
              variant="ghost"
              disabled={deletingRecord}
              onClick={() => setDeleteTarget(null)}
            >
              Cancelar
            </Button>
            <Button
              disabled={deletingRecord || !deleteTarget}
              className="action-soft-danger"
              onClick={() => void handleConfirmDelete()}
            >
              {deletingRecord ? 'Eliminando...' : 'Eliminar'}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        id="recipe-manager-dialog"
        open={recipeModalOpen}
        onClose={() => setRecipeModalOpen(false)}
        title="Gestionar receta"
        subtitle={
          selectedVariant
            ? `${selectedVariant.product_name} | ${selectedVariant.size} | ${selectedVariant.sku}`
            : 'Configura los ingredientes de la variante'
        }
      >
        {loadingRecipe ? (
          <LoadingState
            title="Cargando receta"
            description="Estamos leyendo la configuración actual de ingredientes."
            rows={3}
          />
        ) : (
          <div className="grid min-w-0 gap-4 sm:gap-5">
            <div className="flex flex-wrap items-center gap-3">
              <StatusBadge
                label={loadedRecipe?.has_recipe ? 'Con receta' : 'Sin receta'}
                tone={loadedRecipe?.has_recipe ? 'info' : 'warning'}
              />
              <p className="text-sm theme-text-muted">
                Todas las cantidades se guardan en unidad base según el ingrediente.
              </p>
            </div>

            <ScrollPanel maxHeightClassName="max-h-[24rem]" className="grid gap-3" tabIndex={0} aria-label="Ingredientes configurados para la receta">
              {recipeDraftItems.map((item, index) => {
                const ingredient = ingredientsById.get(Number(item.ingredient_id));
                const availableUnits = ingredient
                  ? unitsByDimension[ingredient.dimension]
                  : ['g', 'kg', 'ml', 'L', 'unit'];

                return (
                  <div
                    key={`${item.ingredient_id}-${index}`}
                    className="data-list-card rounded-3xl p-4"
                  >
                    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_120px_110px_auto] lg:items-end">
                      <Select
                        label="Ingrediente"
                        value={item.ingredient_id}
                        onChange={(event) =>
                          handleRecipeDraftChange(index, 'ingredient_id', event.target.value)
                        }
                      >
                        <option value="">Selecciona un ingrediente</option>
                        {ingredients.map((ingredientOption) => (
                          <option key={ingredientOption.id} value={ingredientOption.id}>
                            #{ingredientOption.id} / {ingredientOption.name}
                          </option>
                        ))}
                      </Select>
                      <Input
                        type="number"
                        min={0}
                        label="Cantidad"
                        placeholder="Ej: 18"
                        value={item.qtyInput}
                        onChange={(event) => {
                          const nextValue = normalizeNumberInput(event.target.value, {
                            allowDecimal: true,
                          });
                          if (nextValue !== null) {
                            handleRecipeDraftChange(index, 'qtyInput', nextValue);
                          }
                        }}
                      />
                      <Select
                        label="Unidad"
                        value={item.unit_code}
                        onChange={(event) =>
                          handleRecipeDraftChange(index, 'unit_code', event.target.value)
                        }
                      >
                        {availableUnits.map((unit) => (
                          <option key={unit} value={unit}>
                            {unit}
                          </option>
                        ))}
                      </Select>
                      <Button
                        variant="ghost"
                        disabled={savingRecipe}
                        onClick={() => void handleDeleteRecipeRow(index)}
                      >
                        {item.persisted ? 'Eliminar' : 'Quitar'}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </ScrollPanel>

            <div className="flex flex-wrap justify-between gap-3">
              <Button variant="secondary" onClick={handleAddRecipeRow}>
                Agregar ingrediente
              </Button>
              <div className="flex gap-3">
                <Button variant="ghost" onClick={() => setRecipeModalOpen(false)}>
                  Cancelar
                </Button>
                <Button disabled={savingRecipe} onClick={() => void handleSaveRecipe()}>
                  {savingRecipe ? 'Guardando...' : 'Guardar receta'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function createEmptyProductCatalogDraft(): ProductCatalogDraft {
  return {
    internalCode: '',
    barcode: '',
    supplierReference: '',
    description: '',
    brand: '',
    productType: 'SIMPLE',
  };
}

function getProductCatalogDraft(product: {
  internalCode: string | null;
  barcode: string | null;
  supplierReference: string | null;
  description: string | null;
  brand: string | null;
  productType: ProductType;
}): ProductCatalogDraft {
  return {
    internalCode: product.internalCode ?? '',
    barcode: product.barcode ?? '',
    supplierReference: product.supplierReference ?? '',
    description: product.description ?? '',
    brand: product.brand ?? '',
    productType: product.productType,
  };
}

function serializeProductCatalogDraft(draft: ProductCatalogDraft) {
  return {
    internalCode: draft.internalCode.trim() || null,
    barcode: draft.barcode.trim() || null,
    supplierReference: draft.supplierReference.trim() || null,
    description: draft.description.trim() || null,
    brand: draft.brand.trim() || null,
    productType: draft.productType,
  };
}

function summarizeProductDescription(description: string) {
  const normalized = description.trim().replace(/\s+/g, ' ');
  return normalized.length > 180
    ? `${normalized.slice(0, 177).trimEnd()}...`
    : normalized;
}

function createEmptyProductFiscalDraft(): ProductFiscalDraft {
  return {
    unspscCode: '',
    vatType: '',
    taxCategory: '',
    unitMeasure: '',
    isService: false,
    applyInc: false,
  };
}

function getProductFiscalDraft(product: {
  unspscCode: string | null;
  vatType: VatType | null;
  taxCategory: TaxCategory | null;
  unitMeasure: string | null;
  isService: boolean;
  applyInc: boolean;
}): ProductFiscalDraft {
  return {
    unspscCode: product.unspscCode ?? '',
    vatType: product.vatType ?? '',
    taxCategory: product.taxCategory ?? '',
    unitMeasure: product.unitMeasure ?? '',
    isService: product.isService,
    applyInc: product.applyInc,
  };
}

function serializeProductFiscalDraft(draft: ProductFiscalDraft) {
  return {
    unspscCode: draft.unspscCode.trim() || null,
    vatType: draft.vatType || null,
    taxCategory: draft.taxCategory || null,
    unitMeasure: draft.unitMeasure.trim() || null,
    isService: draft.isService,
    applyInc: draft.applyInc,
  };
}

function hasConfiguredFiscalData(product: {
  unspscCode: string | null;
  vatType: VatType | null;
  taxCategory: TaxCategory | null;
  unitMeasure: string | null;
  isService: boolean;
  applyInc: boolean;
}) {
  return Boolean(
    product.unspscCode ||
      product.vatType ||
      product.taxCategory ||
      product.unitMeasure ||
      product.isService ||
      product.applyInc,
  );
}
function createEmptyRecipeDraft(): RecipeDraftItem {
  return {
    ingredient_id: '',
    qtyInput: '',
    unit_code: 'g',
    persisted: false,
  };
}

function translateCatalogError(message: string) {
  if (message === 'Product name already exists') return 'Ya existe un producto con ese nombre.';
  if (message === 'Product internal code already exists') return 'Ya existe un producto con ese codigo interno.';
  if (message === 'Product barcode already exists') return 'Ya existe un producto con ese codigo de barras.';
  if (message === 'Variant sku already exists') return 'Ya existe una variante con ese SKU.';
  if (message === 'Product not found') return 'El producto seleccionado ya no existe.';
  if (message === 'Variant not found') return 'La variante seleccionada ya no existe.';
  if (message === 'Product type does not support variants') {
    return 'Solo los productos configurados como tipo variante pueden recibir variantes.';
  }
  if (message.includes('historical sales')) {
    return 'No se puede eliminar porque ya tiene ventas históricas. Desactívalo en su lugar.';
  }
  if (
    message.includes('assigned to one or more combos') ||
    message.includes('assigned to combos')
  ) {
    return 'No se puede eliminar porque hay relaciones activas con combos. Quita esas relaciones primero.';
  }
  if (message.includes('variants configured')) {
    return 'No se puede eliminar el producto mientras tenga variantes configuradas.';
  }
  if (message.includes('dimension mismatch')) {
    return 'La unidad seleccionada no corresponde con la dimensión del ingrediente.';
  }
  if (message.includes('unit_code') && message.includes('invalid')) {
    return 'La unidad seleccionada no es válida para la receta.';
  }
  if (message.includes('qty must be > 0')) {
    return 'Todas las cantidades de la receta deben ser mayores a 0.';
  }
  if (message === 'unspscCode must be an 8-digit UNSPSC code') {
    return 'El codigo UNSPSC debe tener exactamente 8 digitos.';
  }

  return message;
}
