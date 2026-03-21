import { useEffect, useMemo, useState } from 'react';
import { BookOpenCheck, CircleDot, PackagePlus, Shapes } from 'lucide-react';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { AccessState } from '@/components/AccessState';
import { CheckboxField } from '@/components/CheckboxField';
import { FeedbackMessage } from '@/components/FeedbackMessage';
import { EmptyState } from '@/components/EmptyState';
import { Input } from '@/components/Input';
import { LoadingState } from '@/components/LoadingState';
import { Modal } from '@/components/Modal';
import { Select } from '@/components/Select';
import { ScrollPanel } from '@/components/ScrollPanel';
import { StatusBadge } from '@/components/StatusBadge';
import { Textarea } from '@/components/Textarea';
import { usePermissions } from '@/hooks/usePermissions';
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
  VariantRecipe,
} from '@/types/api';

type RecipeDraftItem = {
  ingredient_id: string;
  qtyInput: string;
  unit_code: string;
  persisted: boolean;
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
  const [productDescription, setProductDescription] = useState('');
  const [productCategory, setProductCategory] = useState('');
  const [productActive, setProductActive] = useState(true);

  const [variantProductId, setVariantProductId] = useState('');
  const [variantSize, setVariantSize] = useState('');
  const [variantSku, setVariantSku] = useState('');
  const [variantPriceInput, setVariantPriceInput] = useState('');
  const [variantActive, setVariantActive] = useState(true);

  const [productEditorOpen, setProductEditorOpen] = useState(false);
  const [variantEditorOpen, setVariantEditorOpen] = useState(false);
  const [recipeModalOpen, setRecipeModalOpen] = useState(false);

  const [selectedProduct, setSelectedProduct] = useState<CatalogProduct | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<CatalogVariant | null>(null);
  const [loadedRecipe, setLoadedRecipe] = useState<VariantRecipe | null>(null);

  const [editProductName, setEditProductName] = useState('');
  const [editProductActive, setEditProductActive] = useState(true);
  const [editVariantSize, setEditVariantSize] = useState('');
  const [editVariantSku, setEditVariantSku] = useState('');
  const [editVariantPriceInput, setEditVariantPriceInput] = useState('');
  const [editVariantActive, setEditVariantActive] = useState(true);
  const [recipeDraftItems, setRecipeDraftItems] = useState<RecipeDraftItem[]>([]);

  const ingredientsById = useMemo(
    () => new Map(ingredients.map((ingredient) => [ingredient.id, ingredient])),
    [ingredients],
  );

  const enrichedProducts = useMemo(
    () =>
      products.map((product) => ({
        ...product,
        relatedVariants:
          product.variants.length > 0
            ? product.variants
            : variants.filter((variant) => variant.product_id === product.id),
      })),
    [products, variants],
  );

  useEffect(() => {
    void refreshCatalog();
  }, []);

  async function refreshCatalog() {
    try {
      setLoadingCatalog(true);
      setCatalogError(null);
      setCatalogAccessDenied(false);

      const [productsResponse, variantsResponse, ingredientsResponse] = await Promise.all([
        posApi.getProducts(),
        posApi.getVariants(),
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
        active: productActive,
      });

      addSessionProduct(product);
      setProductName('');
      setProductDescription('');
      setProductCategory('');
      setProductActive(true);
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

    if (!variantProductId || productId <= 0) {
      setSubmitError('Selecciona un producto para la variante.');
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
    setEditProductActive(product.active);
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

  const configuredRecipesCount = Object.values(recipeStatusByVariant).filter(Boolean).length;
  const activeProductsCount = products.filter((product) => product.active).length;
  const activeVariantsCount = variants.filter((variant) => variant.active).length;
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
    ? variants.length > 0
      ? 'warning'
      : 'default'
    : configuredRecipesCount === variants.length
      ? 'success'
      : 'info';
  const productBadgeLabel = loadingCatalog
    ? 'Sincronizando'
    : products.length > 0
      ? 'Catalogo activo'
      : 'Sin catalogo';
  const variantBadgeLabel = loadingCatalog
    ? 'Sincronizando'
    : variants.length > 0
      ? 'Listas para venta'
      : 'Sin variantes';
  const recipeBadgeLabel = loadingCatalog
    ? 'Verificando'
    : variants.length === 0
      ? 'Sin variantes'
      : configuredRecipesCount === variants.length
        ? 'Cobertura completa'
        : configuredRecipesCount > 0
          ? 'Cobertura parcial'
          : 'Sin cobertura';
  return (
    <div className="grid min-w-0 gap-4 sm:gap-5">
      <section className="pos-status-bar" aria-label="Estado operativo de productos">
        <div className="pos-status-shell">
          <div className="pos-status-intro">
            <div className="pos-status-beacon" aria-hidden="true">
              <CircleDot size={18} />
            </div>
            <div className="min-w-0">
              <p className="section-kicker">Operacion de catalogo</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <h1 className="font-display text-lg font-bold text-white sm:text-[1.35rem]">
                  Control de productos
                </h1>
                <StatusBadge label={catalogStatusLabel} tone={catalogStatusTone} />
              </div>
              <p className="mt-2 max-w-2xl text-sm text-[color:var(--text-secondary)]">
                Resume el estado del catalogo, las variantes listas y la cobertura de
                recetas sin quitar protagonismo al trabajo administrativo.
              </p>
            </div>
          </div>

          <div className="pos-status-grid">
            <div className="pos-status-chip">
              <span className="pos-status-chip__icon" aria-hidden="true" data-tone={products.length > 0 ? 'success' : 'default'}>
                <PackagePlus size={16} />
              </span>
              <div className="min-w-0">
                <p className="pos-status-chip__label">Productos</p>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <p className="pos-status-chip__value">{String(products.length)}</p>
                  <StatusBadge
                    label={productBadgeLabel}
                    tone={loadingCatalog ? 'info' : products.length > 0 ? 'success' : 'default'}
                  />
                </div>
                <p className="pos-status-chip__meta">
                  {catalogAccessDenied
                    ? 'Sin permisos para consultar el catalogo'
                    : loadingCatalog
                      ? 'Sincronizando productos desde backend'
                      : `${activeProductsCount} activos en el catalogo comercial`}
                </p>
              </div>
            </div>

            <div className="pos-status-chip">
              <span className="pos-status-chip__icon" aria-hidden="true" data-tone={variants.length > 0 ? 'info' : 'default'}>
                <Shapes size={16} />
              </span>
              <div className="min-w-0">
                <p className="pos-status-chip__label">Variantes</p>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <p className="pos-status-chip__value">{String(variants.length)}</p>
                  <StatusBadge
                    label={variantBadgeLabel}
                    tone={loadingCatalog ? 'info' : variants.length > 0 ? 'info' : 'default'}
                  />
                </div>
                <p className="pos-status-chip__meta">
                  {catalogAccessDenied
                    ? 'Sin visibilidad de variantes operativas'
                    : loadingCatalog
                      ? 'Preparando datos para POS y combos'
                      : `${activeVariantsCount} activas para POS, combos y recetas`}
                </p>
              </div>
            </div>

            <div className="pos-status-chip">
              <span className="pos-status-chip__icon" aria-hidden="true" data-tone={recipeCoverageTone}>
                <BookOpenCheck size={16} />
              </span>
              <div className="min-w-0">
                <p className="pos-status-chip__label">Recetas configuradas</p>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <p className="pos-status-chip__value">{String(configuredRecipesCount)}</p>
                  <StatusBadge
                    label={recipeBadgeLabel}
                    tone={recipeCoverageTone}
                  />
                </div>
                <p className="pos-status-chip__meta">
                  {catalogAccessDenied
                    ? 'El estado de recetas requiere permisos administrativos'
                    : loadingCatalog
                      ? 'Verificando cobertura operativa de recetas'
                      : variants.length > 0
                        ? `Cobertura actual: ${configuredRecipesCount}/${variants.length} variantes con receta`
                        : 'Agrega variantes para medir cobertura'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {message ? <FeedbackMessage tone="success">{message}</FeedbackMessage> : null}

      {submitError ? <FeedbackMessage tone="error">{submitError}</FeedbackMessage> : null}

      {catalogError ? <FeedbackMessage tone="error">{catalogError}</FeedbackMessage> : null}

      {catalogAccessDenied ? (
        <AccessState description="Tu perfil actual no puede consultar productos, variantes ni recetas administrativas." />
      ) : null}

      <div className="grid min-w-0 items-start gap-4 xl:grid-cols-[440px_minmax(0,1fr)]">
        <div className="grid min-w-0 gap-4 sm:gap-5">
          <Card>
            <p className="text-sm text-slate-400">Gestión de productos</p>
            <h2 className="font-display text-2xl font-bold text-white">Crear producto</h2>
            <div className="mt-5 grid gap-4">
              <Input
                label="Nombre"
                value={productName}
                onChange={(event) => setProductName(event.target.value)}
                placeholder="Latte avellana"
              />

              <Textarea
                label="Descripción"
                value={productDescription}
                onChange={(event) => setProductDescription(event.target.value)}
                placeholder="Campo visual preparado para la siguiente fase de backend."
                hint="Aún no se envía al backend. Por ahora solo se persisten nombre y estado."
              />


              <Input
                label="Categoría"
                value={productCategory}
                onChange={(event) => setProductCategory(event.target.value)}
                placeholder="Ej: Bebidas"
                hint="Preparado visualmente para una futura fase de catalogación."
              />

              <CheckboxField
                label="Activo"
                description="Se envia al backend en el alta actual."
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
            <p className="text-sm text-slate-400">Gestión de variantes</p>
            <h2 className="font-display text-2xl font-bold text-white">Crear variante</h2>
            <div className="mt-5 grid gap-4">
              <Select
                label="Producto"
                value={variantProductId}
                onChange={(event) => setVariantProductId(event.target.value)}
              >
                <option value="">
                  {products.length === 0 ? 'Sin productos cargados' : 'Selecciona un producto'}
                </option>
                {products.map((product) => (
                  <option key={product.id} value={String(product.id)}>
                    #{product.id} / {product.name}
                  </option>
                ))}
              </Select>


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
                  disabled={!canManageCatalog || creatingVariant || products.length === 0}
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
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm text-slate-400">Listado real</p>
                <h2 className="font-display text-2xl font-bold text-white">Productos</h2>
              </div>
              <Button variant="secondary" onClick={() => void refreshCatalog()}>
                Refrescar
              </Button>
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
                  title="Sin productos cargados"
                  description="Usa el formulario de la izquierda para crear el primer producto del catálogo."
                />
              </div>
            ) : (
              <ScrollPanel className="mt-6 grid gap-4" tabIndex={0} aria-label="Listado de productos">
                {enrichedProducts.map((product) => (
                  <div
                    key={product.id}
                    className="data-list-card rounded-3xl p-5"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <div className="flex items-center gap-3">
                          <p className="font-display text-xl font-bold text-white">{product.name}</p>
                          <StatusBadge
                            label={product.active ? 'Activo' : 'Inactivo'}
                            tone={product.active ? 'success' : 'default'}
                          />
                        </div>
                        <p className="mt-2 text-sm text-[color:var(--text-faint)]">
                          ID {product.id} · {product.relatedVariants.length} variantes asociadas
                        </p>
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
                            className="soft-pill rounded-full px-3 py-1 text-xs"
                          >
                            #{variant.id} · {variant.size} · {variant.sku}
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
            <p className="text-sm text-slate-400">Listado real</p>
            <h2 className="font-display text-2xl font-bold text-white">Variantes</h2>

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
                          <th scope="col" className="sticky top-0 z-10 bg-[rgba(255,255,255,0.04)] px-3 py-3 text-left text-[11px] font-medium uppercase tracking-[0.18em] text-[color:var(--text-faint)] backdrop-blur-sm">
                            ID
                          </th>
                          <th scope="col" className="sticky top-0 z-10 bg-[rgba(255,255,255,0.04)] px-3 py-3 text-left text-[11px] font-medium uppercase tracking-[0.18em] text-[color:var(--text-faint)] backdrop-blur-sm">
                            Producto
                          </th>
                          <th scope="col" className="sticky top-0 z-10 bg-[rgba(255,255,255,0.04)] px-3 py-3 text-left text-[11px] font-medium uppercase tracking-[0.18em] text-[color:var(--text-faint)] backdrop-blur-sm">
                            Tamaño
                          </th>
                          <th scope="col" className="sticky top-0 z-10 bg-[rgba(255,255,255,0.04)] px-2.5 py-3 text-left text-[11px] font-medium uppercase tracking-[0.18em] text-[color:var(--text-faint)] backdrop-blur-sm">
                            SKU
                          </th>
                          <th scope="col" className="sticky top-0 z-10 bg-[rgba(255,255,255,0.04)] pl-2.5 pr-3 py-3 text-right text-[11px] font-medium uppercase tracking-[0.18em] text-[color:var(--text-faint)] backdrop-blur-sm">
                            Precio
                          </th>
                          <th scope="col" className="sticky top-0 z-10 bg-[rgba(255,255,255,0.04)] px-3 py-3 text-left text-[11px] font-medium uppercase tracking-[0.18em] text-[color:var(--text-faint)] backdrop-blur-sm">
                            Estado
                          </th>
                          <th scope="col" className="sticky top-0 z-10 bg-[rgba(255,255,255,0.04)] pl-3 pr-5 py-3 text-left text-[11px] font-medium uppercase tracking-[0.18em] text-[color:var(--text-faint)] backdrop-blur-sm">
                            Receta
                          </th>
                          <th scope="col" className="sticky top-0 z-10 bg-[rgba(255,255,255,0.04)] pl-5 pr-5 py-3 text-left text-[11px] font-medium uppercase tracking-[0.18em] text-[color:var(--text-faint)] backdrop-blur-sm">
                            Acciones
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {variants.map((variant, index) => {
                          const hasRecipe = recipeStatusByVariant[variant.id] ?? false;

                          return (
                            <tr
                              key={variant.id}
                              className={[
                                'bg-white/[0.03] text-[color:var(--text-secondary)] transition hover:bg-white/[0.05]',
                                index > 0 ? 'border-t border-white/8' : '',
                              ].join(' ')}
                            >
                              <td className="px-3 py-3.5 align-middle whitespace-nowrap text-xs text-slate-400">#{variant.id}</td>
                              <td className="px-3 py-3.5 align-middle">
                                <div className="min-w-0">
                                  <p className="truncate text-[15px] font-semibold tracking-[-0.01em] text-white">{variant.product_name}</p>
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
                                      className="min-h-9 rounded-xl border-indigo-300/24 bg-indigo-500/10 px-3 py-2 text-xs font-semibold text-indigo-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] hover:border-indigo-300/38 hover:bg-indigo-500/16"
                                      aria-haspopup="dialog"
                                      aria-controls="variant-editor-dialog"
                                      onClick={() => openVariantEditor(variant)}
                                    >
                                      Editar variante
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      className={variant.active
                                        ? 'min-h-9 rounded-xl border border-rose-400/20 bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-100 hover:border-rose-300/34 hover:bg-rose-500/16'
                                        : 'min-h-9 rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-100 hover:border-emerald-300/34 hover:bg-emerald-500/16'}
                                      onClick={() => void handleToggleVariantStatus(variant)}
                                    >
                                      {variant.active ? 'Desactivar' : 'Activar'}
                                    </Button>
                                    <Button
                                      variant="secondary"
                                      className="min-h-9 rounded-xl border-violet-300/24 bg-violet-500/12 px-3 py-2 text-xs font-semibold text-violet-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] hover:border-violet-300/40 hover:bg-violet-500/18"
                                      aria-haspopup="dialog"
                                      aria-controls="recipe-manager-dialog"
                                      onClick={() => void openRecipeManager(variant)}
                                    >
                                      Gestionar receta
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

            {variants.length > 0 ? (
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
        subtitle="Actualiza el nombre visible y el estado comercial del producto."
      >
        <div className="grid min-w-0 gap-4 sm:gap-5">
          <Input
            label="Nombre"
            value={editProductName}
            onChange={(event) => setEditProductName(event.target.value)}
            placeholder="Nombre del producto"
          />
          <CheckboxField
            label="Activo"
            description="Si lo desactivas, dejará de mostrarse en los listados operativos."
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
        id="recipe-manager-dialog"
        open={recipeModalOpen}
        onClose={() => setRecipeModalOpen(false)}
        title="Gestionar receta"
        subtitle={
          selectedVariant
            ? `${selectedVariant.product_name} · ${selectedVariant.size} · ${selectedVariant.sku}`
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
              <p className="text-sm text-slate-400">
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
  if (message === 'Variant sku already exists') return 'Ya existe una variante con ese SKU.';
  if (message === 'Product not found') return 'El producto seleccionado ya no existe.';
  if (message === 'Variant not found') return 'La variante seleccionada ya no existe.';
  if (message.includes('historical sales')) {
    return 'No se puede eliminar porque ya tiene ventas históricas. Desactívalo en su lugar.';
  }
  if (message.includes('assigned to one or more combos')) {
    return 'No se puede eliminar porque la variante está asociada a combos. Quita esas relaciones primero.';
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

  return message;
}


