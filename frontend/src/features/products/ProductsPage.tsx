import '@/features/products/products-d2b.css';
import clsx from 'clsx';
import { useEffect, useMemo, useState } from 'react';
import { Boxes, CircleDot, Layers3, Package2, PackageSearch } from 'lucide-react';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { AccessState } from '@/components/AccessState';
import { CheckboxField } from '@/components/CheckboxField';
import { FeedbackMessage } from '@/components/FeedbackMessage';
import { EmptyState } from '@/components/EmptyState';
import { FilterChip } from '@/components/FilterChip';
import { Input } from '@/components/Input';
import { LoadingState } from '@/components/LoadingState';
import { Modal } from '@/components/Modal';
import type {
  ModulePageHeaderBadge,
  ModulePageHeaderCard,
} from '@/components/ModulePageHeader';
import { ModuleInfoTooltip } from '@/components/ModuleStatusHeader';
import { SearchField } from '@/components/SearchField';
import { Select } from '@/components/Select';
import { ScrollPanel } from '@/components/ScrollPanel';
import { StatusBadge } from '@/components/StatusBadge';
import {
  createEmptyCatalogImageDraft as createEmptyProductImageDraft,
  getCatalogEntityImageDraft,
  removeCatalogImage as removeProductImage,
  resolveCatalogImageMutationAction as resolveProductImageMutationAction,
  restoreCatalogImage as restoreProductImage,
  selectCatalogImage as selectProductImage,
  type CatalogImageDraft as ProductImageDraft,
} from '@/features/shared/catalogImageDraft';
import { useBusinessModules } from '@/hooks/useBusinessModules';
import { usePermissions } from '@/hooks/usePermissions';
import { posApi } from '@/services/api/posApi';
import { useAppStore } from '@/store/appStore';
import { isAccessDeniedError, translateProtectedError } from '@/utils/apiError';
import {
  formatVariantDisplayName,
  formatVariantSubtitle,
} from '@/utils/catalog';
import { formatCurrency } from '@/utils/format';
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
import { CatalogItemsTable } from './CatalogItemsTable';
import {
  ProductCatalogFieldsSection,
  type ProductCatalogDraft,
} from './ProductCatalogFieldsSection';
import {
  ProductFiscalFieldsSection,
  type ProductFiscalDraft,
} from './ProductFiscalFieldsSection';
import { ProductImageField } from './ProductImageField';


type RecipeDraftItem = {
  ingredient_id: string;
  qtyInput: string;
  unit_code: string;
  persisted: boolean;
};

type StatusOnlyFilter = 'ACTIVE' | 'INACTIVE';

type DeleteConfirmationTarget = {
  kind: 'PRODUCT' | 'VARIANT';
  id: number;
  label: string;
  detail: string;
};

type EnrichedCatalogProduct = CatalogProduct & {
  operationalVariant: CatalogVariant | null;
  relatedVariants: CatalogVariant[];
};

const unitsByDimension: Record<IngredientDimension, string[]> = {
  WEIGHT: ['g', 'kg'],
  VOLUME: ['ml', 'L'],
  COUNT: ['unit'],
};

const productStatusFilterOptions = [
  { value: 'ACTIVE', label: 'Activos' },
  { value: 'INACTIVE', label: 'Inactivos' },
] as const;

const variantStatusFilterOptions = [
  { value: 'ACTIVE', label: 'Activas' },
  { value: 'INACTIVE', label: 'Inactivas' },
] as const;

export function ProductsPage() {
  const { can } = usePermissions();
  const { isModuleEnabled } = useBusinessModules();
  const canManageCatalog = can('canManageCatalog');
  const showIngredientsModule = isModuleEnabled('ingredients');
  const showRecipeModule = showIngredientsModule && isModuleEnabled('recipes');
  const showFiscalFields = isModuleEnabled('fiscalFields');
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
  const [productImageDraft, setProductImageDraft] = useState<ProductImageDraft>(
    createEmptyProductImageDraft(),
  );
  const [productActive, setProductActive] = useState(true);
  const [productFiscalSectionOpen, setProductFiscalSectionOpen] = useState(false);
  const [productListFilter, setProductListFilter] = useState<StatusOnlyFilter>('ACTIVE');
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [variantListFilter, setVariantListFilter] = useState<StatusOnlyFilter>('ACTIVE');
  const [variantSearchTerm, setVariantSearchTerm] = useState('');
  const [simpleProductListFilter, setSimpleProductListFilter] = useState<StatusOnlyFilter>('ACTIVE');
  const [simpleProductSearchTerm, setSimpleProductSearchTerm] = useState('');

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
  const [editProductImageDraft, setEditProductImageDraft] = useState<ProductImageDraft>(
    createEmptyProductImageDraft(),
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

  const realVariants = useMemo(
    () => variants.filter((variant) => !variant.is_operational),
    [variants],
  );

  const simpleOperationalVariants = useMemo(
    () => variants.filter((variant) => variant.is_operational),
    [variants],
  );

  const variantReadyProducts = useMemo(
    () => activeProducts.filter((product) => product.productType === 'VARIANT'),
    [activeProducts],
  );

  const allEnrichedProducts = useMemo<EnrichedCatalogProduct[]>(
    () =>
      products.map((product) => {
        const productVariants =
          product.variants.length > 0
            ? product.variants
            : variants.filter((variant) => variant.product_id === product.id);

        return {
          ...product,
          operationalVariant: productVariants.find((variant) => variant.is_operational) ?? null,
          relatedVariants: productVariants.filter((variant) => !variant.is_operational),
        };
      }),
    [products, variants],
  );

  const visibleProducts = useMemo(() => {
    if (productListFilter === 'ACTIVE') {
      return allEnrichedProducts.filter((product) => product.active);
    }

    return allEnrichedProducts.filter((product) => !product.active);
  }, [allEnrichedProducts, productListFilter]);

  const visibleRealVariants = useMemo(
    () =>
      realVariants.filter((variant) =>
        variantListFilter === 'ACTIVE' ? variant.active : !variant.active,
      ),
    [realVariants, variantListFilter],
  );

  const simpleProducts = useMemo(
    () => allEnrichedProducts.filter((product) => product.productType === 'SIMPLE'),
    [allEnrichedProducts],
  );

  const visibleSimpleProducts = useMemo(
    () =>
      simpleProducts.filter((product) =>
        simpleProductListFilter === 'ACTIVE' ? product.active : !product.active,
      ),
    [simpleProductListFilter, simpleProducts],
  );

  const filteredProducts = useMemo(
    () => visibleProducts.filter((product) => matchesProductSearch(product, productSearchTerm)),
    [productSearchTerm, visibleProducts],
  );

  const filteredRealVariants = useMemo(
    () =>
      visibleRealVariants.filter((variant) => matchesVariantSearch(variant, variantSearchTerm)),
    [variantSearchTerm, visibleRealVariants],
  );

  const filteredSimpleProducts = useMemo(
    () =>
      visibleSimpleProducts.filter((product) =>
        matchesSimpleProductSearch(product, simpleProductSearchTerm),
      ),
    [simpleProductSearchTerm, visibleSimpleProducts],
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

  useEffect(() => {
    if (!showRecipeModule) {
      setRecipeModalOpen(false);
      setLoadedRecipe(null);
      setRecipeDraftItems([]);
    }
  }, [showRecipeModule]);

  useEffect(() => {
    if (!showFiscalFields) {
      setProductFiscalSectionOpen(false);
      setEditProductFiscalSectionOpen(false);
      setProductFiscalDraft(createEmptyProductFiscalDraft());
    }
  }, [showFiscalFields]);

  function blockRecipeFlow() {
    setRecipeModalOpen(false);
    setLoadedRecipe(null);
    setRecipeDraftItems([]);
    setSubmitError('El modulo de recetas esta desactivado para este negocio.');
  }

  function blockFiscalFieldsFlow() {
    setProductFiscalSectionOpen(false);
    setEditProductFiscalSectionOpen(false);
    setSubmitError('El modulo de campos fiscales esta desactivado para este negocio.');
  }

  function handleProductFiscalSectionOpenChange(nextOpen: boolean) {
    if (nextOpen && !showFiscalFields) {
      blockFiscalFieldsFlow();
      return;
    }

    setProductFiscalSectionOpen(nextOpen);
  }

  function handleEditProductFiscalSectionOpenChange(nextOpen: boolean) {
    if (nextOpen && !showFiscalFields) {
      blockFiscalFieldsFlow();
      return;
    }

    setEditProductFiscalSectionOpen(nextOpen);
  }

  function resetCreateProductForm() {
    setProductName('');
    setProductCatalogDraft(createEmptyProductCatalogDraft());
    setProductFiscalDraft(createEmptyProductFiscalDraft());
    setProductImageDraft(createEmptyProductImageDraft());
    setProductActive(true);
    setProductFiscalSectionOpen(false);
  }

  async function refreshCatalog() {
    try {
      setLoadingCatalog(true);
      setCatalogError(null);
      setCatalogAccessDenied(false);

      const [productsResponse, variantsResponse, ingredientsResponse] = await Promise.all([
        posApi.getProducts(),
        posApi.getVariants({ status: 'ALL' }),
        showRecipeModule ? posApi.getIngredients() : Promise.resolve<Ingredient[]>([]),
      ]);

      setProducts(productsResponse);
      setVariants(variantsResponse);
      setIngredients(ingredientsResponse);
      if (showRecipeModule) {
        await loadRecipeStatuses(variantsResponse);
      } else {
        setRecipeStatusByVariant({});
      }
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
    if (productImageDraft.error) {
      setSubmitError(productImageDraft.error);
      return;
    }

    try {
      setCreatingProduct(true);
      setSubmitError(null);
      setMessage(null);

      const createdProduct = await posApi.createProduct({
        name: productName.trim(),
        ...serializeProductCatalogDraft(productCatalogDraft),
        ...serializeProductFiscalDraft(
          showFiscalFields ? productFiscalDraft : createEmptyProductFiscalDraft(),
        ),
        active: productActive,
      });

      let persistedProduct = createdProduct;

      try {
        const imageProduct = await persistProductImageDraft(
          createdProduct.id,
          productImageDraft,
        );

        if (imageProduct) {
          persistedProduct = imageProduct;
        }
      } catch (imageError) {
        addSessionProduct(createdProduct);
        resetCreateProductForm();
        setMessage(`Producto #${createdProduct.id} creado correctamente.`);
        setSubmitError(
          `Producto #${createdProduct.id} creado, pero imagen no pudo ${resolveProductImageMutationAction(productImageDraft)}. Abre editar para reintentar. ${translateCatalogError(
            imageError instanceof Error ? imageError.message : 'No se pudo guardar la imagen.',
          )}`,
        );
        await refreshCatalog();
        return;
      }

      addSessionProduct(persistedProduct);
      resetCreateProductForm();
      setMessage(
        productImageDraft.pendingImageFile
          ? `Producto #${persistedProduct.id} creado con imagen.`
          : `Producto #${persistedProduct.id} creado correctamente.`,
      );
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
    setEditProductImageDraft(getProductImageDraft(product));
    setEditProductActive(product.active);
    setEditProductFiscalSectionOpen(showFiscalFields && hasConfiguredFiscalData(product));
    setProductEditorOpen(true);
    setSubmitError(null);
  }

  async function handleSaveProduct() {
    if (!selectedProduct) return;
    if (!editProductName.trim()) {
      setSubmitError('El nombre del producto es obligatorio.');
      return;
    }
    if (editProductImageDraft.error) {
      setSubmitError(editProductImageDraft.error);
      return;
    }

    try {
      setEditingProduct(true);
      setSubmitError(null);
      setMessage(null);

      const updatedProduct = await posApi.updateProduct(selectedProduct.id, {
        name: editProductName.trim(),
        ...serializeProductCatalogDraft(editProductCatalogDraft),
        ...serializeProductFiscalDraft(
          showFiscalFields ? editProductFiscalDraft : getProductFiscalDraft(selectedProduct),
        ),
        active: editProductActive,
      });

      let persistedProduct = updatedProduct;

      try {
        const imageProduct = await persistProductImageDraft(
          selectedProduct.id,
          editProductImageDraft,
        );

        if (imageProduct) {
          persistedProduct = imageProduct;
        }
      } catch (imageError) {
        setSelectedProduct(updatedProduct);
        setMessage(`Producto #${selectedProduct.id} actualizado correctamente.`);
        setSubmitError(
          `Producto #${selectedProduct.id} actualizado, pero imagen no pudo ${resolveProductImageMutationAction(editProductImageDraft)}. ${translateCatalogError(
            imageError instanceof Error ? imageError.message : 'No se pudo actualizar la imagen.',
          )}`,
        );
        await refreshCatalog();
        return;
      }

      setSelectedProduct(persistedProduct);
      setProductEditorOpen(false);
      setEditProductImageDraft(createEmptyProductImageDraft());
      setMessage(buildProductUpdateSuccessMessage(selectedProduct.id, editProductImageDraft));
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

    if ((!selectedVariant.is_operational && !editVariantSize.trim()) || !editVariantSku.trim()) {
      setSubmitError(
        selectedVariant.is_operational
          ? 'SKU obligatorio para la operacion simple.'
          : 'Tamano y SKU son obligatorios.',
      );
      return;
    }
    if (salePrice === null || salePrice < 0) {
      setSubmitError('El precio de venta debe ser valido.');
      return;
    }

    try {
      setEditingVariant(true);
      setSubmitError(null);
      await posApi.updateVariant(selectedVariant.id, {
        ...(selectedVariant.is_operational ? {} : { size: editVariantSize.trim() }),
        sku: editVariantSku.trim(),
        sale_price: salePrice,
        active: editVariantActive,
      });
      setVariantEditorOpen(false);
      setMessage(
        selectedVariant.is_operational
          ? `Operacion simple #${selectedVariant.id} actualizada correctamente.`
          : `Variante #${selectedVariant.id} actualizada correctamente.`,
      );
      await refreshCatalog();
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? translateCatalogError(error.message)
          : 'No se pudo actualizar la configuracion seleccionada.',
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
        variant.is_operational
          ? `Operacion simple #${variant.id} ${variant.active ? 'desactivada' : 'activada'} correctamente.`
          : `Variante #${variant.id} ${variant.active ? 'desactivada' : 'activada'} correctamente.`,
      );
      await refreshCatalog();
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? translateCatalogError(error.message)
          : 'No se pudo cambiar el estado de la configuracion seleccionada.',
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
      label: formatVariantDisplayName(variant),
      detail: `${variant.is_operational ? 'Operacion simple' : 'Variante'} #${variant.id} - ${variant.sku}`,
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
    if (!showRecipeModule) {
      blockRecipeFlow();
      return;
    }

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
          : 'No se pudo cargar la receta del item seleccionado.',
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
    if (!showRecipeModule) {
      blockRecipeFlow();
      return;
    }

    setRecipeDraftItems((current) => [...current, createEmptyRecipeDraft()]);
  }

  async function handleDeleteRecipeRow(index: number) {
    if (!showRecipeModule) {
      blockRecipeFlow();
      return;
    }

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
      setMessage(selectedVariant.is_operational ? `Ingrediente eliminado de la receta de la operacion simple #${selectedVariant.id}.` : `Ingrediente eliminado de la receta de la variante #${selectedVariant.id}.`);
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
    if (!showRecipeModule) {
      blockRecipeFlow();
      return;
    }

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
      setMessage(selectedVariant.is_operational ? `Receta de la operacion simple #${selectedVariant.id} guardada correctamente.` : `Receta de la variante #${selectedVariant.id} guardada correctamente.`);
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
  const activeRealVariantsCount = realVariants.filter((variant) => variant.active).length;
  const inactiveRealVariantsCount = realVariants.length - activeRealVariantsCount;
  const activeSimpleOperationalCount = simpleOperationalVariants.filter(
    (variant) => variant.active,
  ).length;
  const activeSimpleProductsCount = simpleProducts.filter((product) => product.active).length;
  const inactiveSimpleProductsCount = simpleProducts.length - activeSimpleProductsCount;
  const configuredRecipesCount = activeVariants.filter(
    (variant) => recipeStatusByVariant[variant.id],
  ).length;
  const visibleSimpleProductsWithOperation = filteredSimpleProducts.filter(
    (product) => product.operationalVariant !== null,
  );
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
  const operationalBadgeLabel = loadingCatalog
    ? 'Sincronizando'
    : variants.length > 0
      ? inactiveVariantsCount > 0
        ? 'Mixto'
        : 'Solo activas'
      : 'Sin operacion';
  const recipeBadgeLabel = loadingCatalog
    ? 'Verificando'
    : activeVariantsCount === 0
      ? 'Sin operaciones'
      : configuredRecipesCount === activeVariantsCount
        ? 'Cobertura completa'
        : configuredRecipesCount > 0
          ? 'Cobertura parcial'
          : 'Sin cobertura';
  const visibleProductsLabel = productSearchTerm.trim()
    ? `${filteredProducts.length} coincidencias`
    : productListFilter === 'ACTIVE'
      ? `${activeProductsCount} activos visibles`
      : `${inactiveProductsCount} inactivos visibles`;
  const visibleVariantsLabel = variantSearchTerm.trim()
    ? `${filteredRealVariants.length} coincidencias`
    : variantListFilter === 'ACTIVE'
      ? `${activeRealVariantsCount} activas visibles`
      : `${inactiveRealVariantsCount} inactivas visibles`;
  const visibleSimpleProductsLabel = simpleProductSearchTerm.trim()
    ? `${filteredSimpleProducts.length} coincidencias`
    : simpleProductListFilter === 'ACTIVE'
      ? `${activeSimpleProductsCount} activos visibles`
      : `${inactiveSimpleProductsCount} inactivos visibles`;
  const accessStatusLabel = canManageCatalog ? 'Edicion habilitada' : 'Solo lectura';
  const heroSummaryLabel = showRecipeModule ? 'Cobertura activa' : 'Operacion activa';
  const heroSummaryValue = showRecipeModule ? recipeBadgeLabel : operationalBadgeLabel;
  const heroSummaryNote = catalogAccessDenied
    ? 'Tu perfil actual solo puede revisar estado general del catalogo.'
    : showRecipeModule
      ? activeVariantsCount > 0
        ? `${configuredRecipesCount} recetas listas para ${activeVariantsCount} operaciones activas`
        : 'Crea operaciones para medir cobertura administrativa.'
      : `${activeSimpleOperationalCount} simples y ${activeRealVariantsCount} variantes activas en POS`;
  const productsHeroMetrics: ModulePageHeaderCard[] = [
    {
      label: 'Catalogo total',
      value: String(products.length),
      note: loadingCatalog
        ? 'Sincronizando productos y operaciones'
        : inactiveProductsCount > 0
          ? `${activeProductsCount} activos y ${inactiveProductsCount} inactivos`
          : `${activeProductsCount} activos en catalogo`,
      accent: catalogStatusTone,
      icon: <PackageSearch size={16} />,
      iconTone: catalogStatusTone,
    },
    {
      label: 'Productos simples',
      value: String(simpleProducts.length),
      note:
        simpleProducts.length > 0
          ? `${activeSimpleProductsCount} activos con operacion unificada`
          : 'Aun no hay productos simples configurados',
      accent: 'default' as const,
      icon: <Package2 size={16} />,
      iconTone: 'default',
    },
    {
      label: 'Variantes reales',
      value: String(realVariants.length),
      note:
        realVariants.length > 0
          ? `${activeRealVariantsCount} listas para venta`
          : 'Sin variantes reales configuradas',
      accent: 'info' as const,
      icon: <Layers3 size={16} />,
      iconTone: 'info',
    },
    {
      label: showRecipeModule ? 'Cobertura receta' : 'Operaciones activas',
      value: showRecipeModule
        ? activeVariantsCount > 0
          ? `${configuredRecipesCount}/${activeVariantsCount}`
          : '0'
        : String(activeSimpleOperationalCount + activeRealVariantsCount),
      note: showRecipeModule
        ? activeVariantsCount > 0
          ? recipeBadgeLabel
          : 'Sin cobertura pendiente por medir'
        : `${activeSimpleOperationalCount} simples y ${activeRealVariantsCount} variantes activas`,
      accent: showRecipeModule ? recipeCoverageTone : ('success' as const),
      icon: <CircleDot size={16} />,
      iconTone: showRecipeModule ? recipeCoverageTone : 'success',
    },
  ];
  const productsHeaderBadges: ModulePageHeaderBadge[] = [
    {
      label: catalogStatusLabel,
      tone: catalogStatusTone,
    },
    {
      label: accessStatusLabel,
      tone: canManageCatalog ? ('info' as const) : ('default' as const),
    },
  ];
  return (
    <div className="products-page grid min-w-0 gap-4 sm:gap-5">
      <section className="module-page-header" aria-label="Estado operativo de productos">
        <div className="module-page-header__shell">
          <div className="module-page-header__main">
            <div className="module-page-header__copy">
              <p className="module-page-header__eyebrow">Administracion de catalogo</p>
              <div className="module-page-header__title-row">
                <div className="module-page-header__title-wrap">
                  <span className="module-page-header__title-icon" aria-hidden="true">
                    <Boxes size={18} />
                  </span>
                  <h1 className="module-page-header__title">Productos</h1>
                  <ModuleInfoTooltip
                    label="Mas info sobre productos"
                    content="Controla estado del catalogo, productos simples, variantes activas y cobertura de recetas dentro del mismo flujo administrativo."
                  />
                  <div className="module-page-header__badges">
                    {productsHeaderBadges.map((badge, index) => (
                      <StatusBadge
                        key={`${badge.label}-${badge.tone ?? 'default'}-${index}`}
                        label={badge.label}
                        tone={badge.tone ?? 'default'}
                        className={clsx('module-page-header__badge', badge.className)}
                      />
                    ))}
                  </div>
                </div>
              </div>
              <p className="module-page-header__description">
                Catalogo comercial, operaciones de venta y control administrativo para mantener producto y receta en orden.
              </p>
            </div>

            <div className="module-page-header__aside">
              <div className="module-page-header__summary">
                <p className="module-page-header__summary-label">{heroSummaryLabel}</p>
                <p className="module-page-header__summary-value">{heroSummaryValue}</p>
                <p className="module-page-header__summary-note">{heroSummaryNote}</p>
              </div>
              <div className="module-page-header__aside-action">
                <Button
                  variant="secondary"
                  onClick={() => void refreshCatalog()}
                >
                  Actualizar catalogo
                </Button>
              </div>
            </div>
          </div>

          <div className="module-page-header__cards">
            {productsHeroMetrics.map((card, index) => (
              <div
                key={`module-card-${index}`}
                className="module-page-header__card"
                data-accent={card.accent ?? 'default'}
              >
                <div className="module-page-header__card-main">
                  {card.icon ? (
                    <span
                      className="module-page-header__card-icon"
                      aria-hidden="true"
                      data-tone={card.iconTone ?? 'default'}
                    >
                      {card.icon}
                    </span>
                  ) : null}
                  <div className="min-w-0">
                    <div className="module-page-header__card-top">
                      <p className="module-page-header__card-label">{card.label}</p>
                      {card.badge ? (
                        <StatusBadge
                          label={card.badge.label}
                          tone={card.badge.tone ?? 'default'}
                          className={clsx('module-page-header__card-badge', card.badge.className)}
                        />
                      ) : null}
                    </div>
                    <p className="module-page-header__card-value">{card.value}</p>
                    {card.note ? <p className="module-page-header__card-note">{card.note}</p> : null}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {message ? <FeedbackMessage tone="success" className="products-feedback">{message}</FeedbackMessage> : null}

      {submitError ? <FeedbackMessage tone="error" className="products-feedback">{submitError}</FeedbackMessage> : null}

      {catalogError ? <FeedbackMessage tone="error" className="products-feedback">{catalogError}</FeedbackMessage> : null}

      {catalogAccessDenied ? (
        <AccessState description="Tu perfil actual no puede consultar productos, operaciones de venta ni recetas administrativas." />
      ) : null}

      <div className="products-workspace grid min-w-0 items-start gap-4 lg:grid-cols-[minmax(0,24rem)_minmax(0,1fr)] xl:gap-5 xl:grid-cols-[minmax(0,25rem)_minmax(0,1fr)]">
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
                <h2 className="font-display text-2xl font-bold theme-text-strong">Crear producto</h2>
                <p className="products-panel__description">
                  Define ficha comercial, tipo de producto y estado operativo sin cambiar flujo.
                </p>
              </div>
            </div>
            <div className="products-panel__highlights">
              <div className="products-panel__spotlight products-panel__spotlight--variant">
                <p className="products-panel__spotlight-label">Familias disponibles</p>
                <p className="products-panel__spotlight-value">{variantReadyProducts.length}</p>
                <p className="products-panel__spotlight-note">
                  Solo se habilitan productos activos configurados para trabajar con variantes.
                </p>
              </div>
              <div className="products-panel__spotlight products-panel__spotlight--product">
                <p className="products-panel__spotlight-label">Tipo base</p>
                <p className="products-panel__spotlight-value">
                  {productCatalogDraft.productType === 'SIMPLE' ? 'Simple' : 'Con variantes'}
                </p>
                <p className="products-panel__spotlight-note">
                  {productName.trim()
                    ? productName
                    : 'Define la ficha base antes de crear operaciones de venta.'}
                </p>
              </div>
            </div>
            <div className="products-form-stack grid gap-4">
              <Input
                label="Nombre"
                wrapperClassName="products-field"
                labelClassName="products-field__label"
                className="products-field__control"
                value={productName}
                onChange={(event) => setProductName(event.target.value)}
                placeholder="Latte avellana"
              />
              <ProductImageField
                productName={productName}
                productType={productCatalogDraft.productType}
                imageUrl={productImageDraft.imageUrl}
                imageAlt={productImageDraft.imageAlt}
                pendingImageFile={productImageDraft.pendingImageFile}
                markedForRemoval={productImageDraft.markedForRemoval}
                error={productImageDraft.error}
                disabled={!canManageCatalog || creatingProduct}
                onSelectImage={(file) =>
                  setProductImageDraft((current) => selectProductImage(current, file))
                }
                onRemoveImage={() =>
                  setProductImageDraft((current) => removeProductImage(current))
                }
                onRestoreImage={() =>
                  setProductImageDraft((current) => restoreProductImage(current))
                }
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

              {showFiscalFields ? (
                <ProductFiscalFieldsSection
                  open={productFiscalSectionOpen}
                  onOpenChange={handleProductFiscalSectionOpenChange}
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
              ) : null}
              <CheckboxField
                label="Activo"
                description="Define si el producto estara disponible en el catalogo operativo."
                wrapperClassName="products-toggle-card"
                className="products-toggle-card__label"
                checked={productActive}
                onChange={(event) => setProductActive(event.target.checked)}
              />


              <div className="products-panel__actions flex gap-3">
                <Button
                  disabled={!canManageCatalog || creatingProduct || !productName.trim()}
                  onClick={handleCreateProduct}
                  className="products-panel__cta"
                >
                  {creatingProduct ? 'Guardando...' : 'Crear producto'}
                </Button>
                {!canManageCatalog ? (
                  <Button variant="secondary" disabled className="products-panel__secondary">
                    Solo lectura
                  </Button>
                ) : null}
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
                <p className="text-sm theme-text-muted">Operaciones de venta</p>
                <h2 className="font-display text-2xl font-bold theme-text-strong">Crear variante</h2>
                <p className="products-panel__description">
                  Asigna SKU, tamano y precio a familias activas preparadas para POS.
                </p>
              </div>
            </div>
            <div className="products-panel__highlights">
              <div className="products-panel__spotlight products-panel__spotlight--variant">
                <p className="products-panel__spotlight-label">Familias disponibles</p>
                <p className="products-panel__spotlight-value">{variantReadyProducts.length}</p>
                <p className="products-panel__spotlight-note">
                  Solo aparecen productos activos listos para trabajar con variantes reales.
                </p>
              </div>
              <div className="products-panel__spotlight">
                <p className="products-panel__spotlight-label">Estado inicial</p>
                <p className="products-panel__spotlight-value">
                  {variantActive ? 'Activa' : 'Inactiva'}
                </p>
                <p className="products-panel__spotlight-note">
                  {variantProductId
                    ? 'Se creara para la familia seleccionada.'
                    : 'Selecciona primero una familia para continuar.'}
                </p>
              </div>
            </div>
            <div className="products-form-stack grid gap-4">
              <Select
                label="Producto"
                wrapperClassName="products-field"
                labelClassName="products-field__label"
                className="products-field__control"
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
              <p className="products-inline-note">
                Solo se listan productos activos configurados como tipo variante.
              </p>


              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label="Tamaño"
                  wrapperClassName="products-field"
                  labelClassName="products-field__label"
                  className="products-field__control"
                  value={variantSize}
                  onChange={(event) => setVariantSize(event.target.value)}
                  placeholder="Ej: 12oz"
                />
                <Input
                  label="SKU"
                  wrapperClassName="products-field"
                  labelClassName="products-field__label"
                  className="products-field__control"
                  value={variantSku}
                  onChange={(event) => setVariantSku(event.target.value)}
                  placeholder="Ej: CAF-AM-12"
                />
              </div>

              <Input
                type="number"
                min={0}
                label="Precio de venta"
                wrapperClassName="products-field"
                labelClassName="products-field__label"
                className="products-field__control"
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
                wrapperClassName="products-toggle-card"
                className="products-toggle-card__label"
                checked={variantActive}
                onChange={(event) => setVariantActive(event.target.checked)}
              />

              <div className="products-panel__actions flex gap-3">
                <Button
                  disabled={!canManageCatalog || creatingVariant || variantReadyProducts.length === 0}
                  onClick={handleCreateVariant}
                  className="products-panel__cta"
                >
                  {creatingVariant ? 'Guardando...' : 'Crear variante'}
                </Button>
                {!canManageCatalog ? (
                  <Button variant="secondary" disabled className="products-panel__secondary">
                    Solo lectura
                  </Button>
                ) : null}
              </div>
            </div>
          </Card>
        </div>

        <div className="products-data-rail grid min-w-0 gap-4 sm:gap-5">
          <Card
            padding="none"
            glow={false}
            className="products-panel products-panel--list"
            contentClassName="products-panel__body"
          >
            <div className="products-panel__header">
              <div className="products-panel__header-copy">
                <p className="text-sm theme-text-muted">Vista general</p>
                <h2 className="font-display text-2xl font-bold theme-text-strong">Productos</h2>
                <p className="products-panel__description">
                  Listado base del catalogo con operacion principal, estado y precio de referencia.
                </p>
              </div>
            </div>

            <CatalogListToolbar
              countLabel={visibleProductsLabel}
              searchValue={productSearchTerm}
              onSearchChange={setProductSearchTerm}
              searchAriaLabel="Buscar productos por nombre o SKU"
              activeFilter={productListFilter}
              filters={productStatusFilterOptions}
              onFilterChange={(value) => setProductListFilter(value as StatusOnlyFilter)}
            />

            {loadingCatalog ? (
              <div className="mt-6">
                <LoadingState
                  title="Cargando productos"
                  description="Estamos preparando el catalogo y sus operaciones activas."
                  rows={4}
                />
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="mt-6">
                <EmptyState
                  title={
                    productSearchTerm.trim()
                      ? 'Sin coincidencias para esta busqueda'
                      : productListFilter === 'ACTIVE'
                        ? 'Sin productos activos'
                        : 'Sin productos inactivos'
                  }
                  description={
                    productSearchTerm.trim()
                      ? 'No encontramos productos que coincidan con el nombre o SKU ingresado.'
                      : productListFilter === 'ACTIVE'
                        ? 'Activa un producto existente o crea uno nuevo para verlo en este listado.'
                        : 'Cuando desactives productos, podras revisarlos y reactivarlos desde aqui.'
                  }
                />
              </div>
            ) : (
              <CatalogItemsTable
                ariaLabel="Listado de productos"
                caption="Tabla general de productos del catalogo"
                rows={filteredProducts}
                rowKey={(product) => product.id}
                rowClassName={(product) => (!product.active ? 'opacity-80' : undefined)}
                tableMinWidthClassName="min-w-[1360px]"
                columns={[
                  {
                    key: 'id',
                    header: 'ID',
                    width: '72px',
                    cellClassName: 'whitespace-nowrap text-xs theme-text-muted',
                    render: (product) => `#${product.id}`,
                  },
                  {
                    key: 'product',
                    header: 'Producto',
                    width: '360px',
                    render: (product) => {
                      const displayVariant = getProductCardVariant(product);
                      const metaItems = getProductCardMetaItems(product, displayVariant);

                      return (
                        <div className="products-table-entity">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="truncate text-[15px] font-semibold theme-text-strong">
                              {product.name}
                            </p>
                            <StatusBadge
                              label={product.productType === 'SIMPLE' ? 'Simple' : 'Con variantes'}
                              tone={product.productType === 'VARIANT' ? 'info' : 'default'}
                            />
                          </div>
                          <p className="products-table-entity__summary">
                            {getProductTableSummary(product)}
                          </p>
                          {metaItems.length > 0 ? (
                            <div className="products-table-meta">
                              {metaItems.map((item) => (
                                <span key={item.label} className="products-table-meta__item">
                                  <span className="text-[color:var(--text-faint)]">
                                    {item.label}
                                  </span>
                                  <span
                                    className={clsx(
                                      'font-medium theme-text-strong',
                                      item.mono && 'font-mono text-[11px]',
                                    )}
                                  >
                                    {item.value}
                                  </span>
                                </span>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      );
                    },
                  },
                  {
                    key: 'operation',
                    header: 'Operacion',
                    width: '220px',
                    render: (product) => {
                      const displayVariant = getProductCardVariant(product);
                      const operationSummary = getProductOperationSummary(product, displayVariant);

                      return (
                        <div className="products-table-stack">
                          <p className="products-table-stack__title">{operationSummary.title}</p>
                          {operationSummary.detail ? (
                            <p className="products-table-stack__detail">{operationSummary.detail}</p>
                          ) : null}
                        </div>
                      );
                    },
                  },
                  {
                    key: 'price',
                    header: 'Precio',
                    width: '116px',
                    align: 'right',
                    cellClassName: 'whitespace-nowrap',
                    render: (product) => {
                      const displayVariant = getProductCardVariant(product);

                      return (
                        <span className="products-table-price">
                          {getProductCardPriceLabel(product, displayVariant)}
                        </span>
                      );
                    },
                  },
                  {
                    key: 'status',
                    header: 'Estado',
                    width: '128px',
                    render: (product) => (
                      <StatusBadge
                        label={product.active ? 'Activo' : 'Inactivo'}
                        tone={product.active ? 'success' : 'default'}
                        className="min-w-[104px] justify-center"
                      />
                    ),
                  },
                  ...(showRecipeModule
                    ? [
                        {
                          key: 'recipe',
                          header: 'Receta',
                          width: '128px',
                          render: (product: EnrichedCatalogProduct) => {
                            const recipeState = getProductCardRecipeState(
                              product,
                              recipeStatusByVariant,
                            );

                            return (
                              <StatusBadge
                                label={recipeState.label}
                                tone={recipeState.tone}
                                className="min-w-[112px] justify-center"
                              />
                            );
                          },
                        },
                      ]
                    : []),
                  {
                    key: 'actions',
                    header: 'Acciones',
                    width: showRecipeModule ? '320px' : '256px',
                    render: (product) =>
                      canManageCatalog ? (
                        <div className="products-table-actions">
                          <div className="products-table-actions__primary">
                            <Button
                              variant="secondary"
                              className="action-soft-brand products-action-edit"
                              aria-haspopup="dialog"
                              aria-controls="product-editor-dialog"
                              onClick={() => openProductEditor(product)}
                            >
                              Editar
                            </Button>
                          </div>
                          <div className="products-table-actions__secondary">
                            <Button
                              variant="ghost"
                              className={product.active ? 'products-action-toggle' : 'action-soft-success'}
                              onClick={() => void handleToggleProductStatus(product)}
                            >
                              {product.active ? 'Desactivar' : 'Activar'}
                            </Button>
                            <Button
                              variant="ghost"
                              className="action-soft-danger products-action-delete"
                              onClick={() => requestProductDelete(product)}
                            >
                              Eliminar
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-[color:var(--text-faint)]">
                          Sin acciones disponibles
                        </span>
                      ),
                  },
                ]}
              />
            )}
          </Card>

          <Card
            padding="none"
            glow={false}
            className="products-panel products-panel--list"
            contentClassName="products-panel__body"
          >
            <div className="products-panel__header">
              <div className="products-panel__header-copy">
                <p className="text-sm theme-text-muted">Operacion unificada</p>
                <h2 className="font-display text-2xl font-bold theme-text-strong">Productos simples</h2>
                <p className="products-panel__description">
                  Vista operativa de productos simples con su registro POS asociado.
                </p>
              </div>
            </div>
            <CatalogListToolbar
              countLabel={visibleSimpleProductsLabel}
              searchValue={simpleProductSearchTerm}
              onSearchChange={setSimpleProductSearchTerm}
              searchAriaLabel="Buscar productos simples por nombre o SKU"
              activeFilter={simpleProductListFilter}
              filters={productStatusFilterOptions}
              onFilterChange={(value) => setSimpleProductListFilter(value as StatusOnlyFilter)}
            />

            {loadingCatalog ? (
              <div className="mt-6 grid gap-3">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="data-list-card h-20 animate-pulse rounded-lg" />
                ))}
              </div>
            ) : filteredSimpleProducts.length === 0 ? (
              <div className="mt-6">
                <EmptyState
                  title={
                    simpleProductSearchTerm.trim()
                      ? 'Sin coincidencias para esta busqueda'
                      : simpleProductListFilter === 'ACTIVE'
                      ? 'Sin productos simples activos'
                      : 'Sin productos simples inactivos'
                  }
                  description={
                    simpleProductSearchTerm.trim()
                      ? 'No encontramos productos simples que coincidan con el nombre o SKU ingresado.'
                      : simpleProductListFilter === 'ACTIVE'
                      ? 'Activa un producto simple existente o crea uno nuevo para verlo en este listado.'
                      : 'Cuando desactives productos simples, podras revisarlos y reactivarlos desde aqui.'
                  }
                />
              </div>
            ) : visibleSimpleProductsWithOperation.length === 0 ? (
              <div className="mt-6">
                <EmptyState
                  title="Operacion simple pendiente"
                  description="No se encontro configuracion operativa para los productos simples visibles. Refresca el catalogo para regenerarla."
                />
              </div>
            ) : (
              <CatalogItemsTable
                ariaLabel="Listado de productos simples"
                caption="Tabla de productos simples con operacion unificada"
                rows={visibleSimpleProductsWithOperation}
                rowKey={(product) => product.id}
                rowClassName={(product) =>
                  !product.active || !product.operationalVariant?.active ? 'opacity-80' : undefined
                }
                tableMinWidthClassName="min-w-[1180px]"
                columns={[
                  {
                    key: 'id',
                    header: 'ID',
                    width: '72px',
                    cellClassName: 'whitespace-nowrap text-xs theme-text-muted',
                    render: (product) => `#${product.id}`,
                  },
                  {
                    key: 'product',
                    header: 'Producto',
                    render: (product) => (
                      <p className="truncate text-[15px] font-semibold theme-text-strong">
                        {product.name}
                      </p>
                    ),
                  },
                  {
                    key: 'sku',
                    header: 'SKU',
                    width: '148px',
                    cellClassName: 'font-mono text-[12px]',
                    render: (product) => product.operationalVariant?.sku ?? 'Sin SKU',
                  },
                  {
                    key: 'price',
                    header: 'Precio',
                    width: '112px',
                    align: 'right',
                    cellClassName: 'whitespace-nowrap',
                    render: (product) => (
                      <span className="metric-accent text-[15px] font-semibold">
                        {formatCurrency(Number(product.operationalVariant?.sale_price ?? 0))}
                      </span>
                    ),
                  },
                  {
                    key: 'status',
                    header: 'Estado',
                    width: '132px',
                    render: (product) => (
                      <StatusBadge
                        label={getSimpleProductTableStatus(product)}
                        tone={product.active && product.operationalVariant?.active ? 'success' : 'default'}
                        className="min-w-[104px] justify-center"
                      />
                    ),
                  },
                  ...(showRecipeModule
                    ? [
                        {
                          key: 'recipe',
                          header: 'Receta',
                          width: '128px',
                          render: (product: EnrichedCatalogProduct) => {
                            const variant = product.operationalVariant;
                            const hasRecipe = variant ? recipeStatusByVariant[variant.id] ?? false : false;

                            return (
                              <StatusBadge
                                label={hasRecipe ? 'Con receta' : 'Sin receta'}
                                tone={hasRecipe ? 'info' : 'warning'}
                                className="min-w-[112px] justify-center"
                              />
                            );
                          },
                        },
                      ]
                    : []),
                  {
                    key: 'actions',
                    header: 'Acciones',
                    width: '332px',
                    render: (product) =>
                      canManageCatalog && product.operationalVariant ? (
                        <div className="products-table-actions">
                          <div className="products-table-actions__primary">
                            <Button variant="secondary" className="action-soft-brand products-action-edit" aria-haspopup="dialog" aria-controls="product-editor-dialog" onClick={() => openProductEditor(product)}>
                              Editar
                            </Button>
                            <Button variant="secondary" className="action-soft-brand products-action-operation" aria-haspopup="dialog" aria-controls="variant-editor-dialog" onClick={() => openVariantEditor(product.operationalVariant!)}>
                              Operacion
                            </Button>
                            {showRecipeModule ? (
                              <Button variant="secondary" className="action-soft-brand products-action-recipe" aria-haspopup="dialog" aria-controls="recipe-manager-dialog" onClick={() => void openRecipeManager(product.operationalVariant!)}>
                                Receta
                              </Button>
                            ) : null}
                          </div>
                          <div className="products-table-actions__secondary">
                            <Button variant="ghost" className={product.operationalVariant.active ? 'products-action-toggle' : 'action-soft-success'} onClick={() => void handleToggleVariantStatus(product.operationalVariant!)}>
                              {product.operationalVariant.active ? 'Desactivar' : 'Activar'}
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-[color:var(--text-faint)]">Sin acciones disponibles</span>
                      ),
                  },
                ]}
              />
            )}
          </Card>

          <Card
            padding="none"
            glow={false}
            className="products-panel products-panel--list"
            contentClassName="products-panel__body"
          >
            <div className="products-panel__header">
              <div className="products-panel__header-copy">
                <p className="text-sm theme-text-muted">Listado real</p>
                <h2 className="font-display text-2xl font-bold theme-text-strong">Variantes</h2>
                <p className="products-panel__description">
                  Seguimiento de variantes reales, precio, estado comercial y receta.
                </p>
              </div>
            </div>
            <CatalogListToolbar
              countLabel={visibleVariantsLabel}
              searchValue={variantSearchTerm}
              onSearchChange={setVariantSearchTerm}
              searchAriaLabel="Buscar variantes por nombre o SKU"
              activeFilter={variantListFilter}
              filters={variantStatusFilterOptions}
              onFilterChange={(value) => setVariantListFilter(value as StatusOnlyFilter)}
            />

            {loadingCatalog ? (
              <div className="mt-6 grid gap-3">
                {Array.from({ length: 5 }).map((_, index) => (
                  <div key={index} className="data-list-card h-20 animate-pulse rounded-lg" />
                ))}
              </div>
            ) : realVariants.length === 0 ? (
              <div className="mt-6">
                <EmptyState
                  title="Sin variantes cargadas"
                  description="Crea la primera variante real para ampliar el catalogo y los combos."
                />
              </div>
            ) : filteredRealVariants.length === 0 ? (
              <div className="mt-6">
                <EmptyState
                  title={variantSearchTerm.trim() ? 'Sin coincidencias para esta busqueda' : 'No hay variantes para este filtro'}
                  description={
                    variantSearchTerm.trim()
                      ? 'No encontramos variantes que coincidan con el nombre o SKU ingresado.'
                      : variantListFilter === 'ACTIVE'
                      ? 'No hay variantes activas para mostrar en este momento.'
                      : 'No hay variantes inactivas para revisar en este momento.'
                  }
                />
              </div>
            ) : (
              <CatalogItemsTable
                ariaLabel="Listado de variantes"
                caption="Tabla de variantes del catalogo"
                rows={filteredRealVariants}
                rowKey={(variant) => variant.id}
                rowClassName={(variant) => (!variant.active ? 'opacity-80' : undefined)}
                tableMinWidthClassName="min-w-[1280px]"
                columns={[
                  { key: 'id', header: 'ID', width: '64px', cellClassName: 'whitespace-nowrap text-xs theme-text-muted', render: (variant) => `#${variant.id}` },
                  {
                    key: 'product',
                    header: 'Producto',
                    render: (variant) => (
                      <div className="min-w-0">
                        <p className="truncate text-[15px] font-semibold theme-text-strong">
                          {variant.product_name}
                        </p>
                        {!variant.active ? (
                          <p className="mt-1 text-xs text-[color:var(--text-faint)]">
                            Variante inactiva. Sigue disponible aqui para revision o reactivacion.
                          </p>
                        ) : null}
                      </div>
                    ),
                  },
                  { key: 'size', header: 'Tamano', width: '92px', cellClassName: 'whitespace-nowrap text-sm', render: (variant) => variant.size },
                  { key: 'sku', header: 'SKU', width: '112px', cellClassName: 'font-mono text-[12px]', render: (variant) => variant.sku },
                  { key: 'price', header: 'Precio', width: '104px', align: 'right', cellClassName: 'whitespace-nowrap', render: (variant) => (<span className="metric-accent text-[15px] font-semibold">{formatCurrency(Number(variant.sale_price))}</span>) },
                  { key: 'status', header: 'Estado', width: '108px', render: (variant) => (<StatusBadge label={variant.active ? 'Activa' : 'Inactiva'} tone={variant.active ? 'success' : 'default'} className="min-w-[92px] justify-center" />) },
                  ...(showRecipeModule
                    ? [
                        {
                          key: 'recipe',
                          header: 'Receta',
                          width: '128px',
                          render: (variant: CatalogVariant) => {
                            const hasRecipe = recipeStatusByVariant[variant.id] ?? false;

                            return (
                              <StatusBadge
                                label={hasRecipe ? 'Con receta' : 'Sin receta'}
                                tone={hasRecipe ? 'info' : 'warning'}
                                className="min-w-[112px] justify-center"
                              />
                            );
                          },
                        },
                      ]
                    : []),
                  {
                    key: 'actions',
                    header: 'Acciones',
                    width: showRecipeModule ? '372px' : '252px',
                    render: (variant) =>
                      canManageCatalog ? (
                        <div className="products-table-actions">
                          <div className="products-table-actions__primary">
                            <Button
                              variant="secondary"
                              className="action-soft-brand products-action-edit"
                              aria-haspopup="dialog"
                              aria-controls="variant-editor-dialog"
                              onClick={() => openVariantEditor(variant)}
                            >
                              Editar
                            </Button>
                            {showRecipeModule ? (
                              <Button
                                variant="secondary"
                                className="action-soft-brand products-action-recipe"
                                aria-haspopup="dialog"
                                aria-controls="recipe-manager-dialog"
                                onClick={() => void openRecipeManager(variant)}
                              >
                                Receta
                              </Button>
                            ) : null}
                          </div>
                          <div className="products-table-actions__secondary">
                            <Button
                              variant="ghost"
                              className={variant.active ? 'products-action-toggle' : 'action-soft-success'}
                              onClick={() => void handleToggleVariantStatus(variant)}
                            >
                              {variant.active ? 'Desactivar' : 'Activar'}
                            </Button>
                            <Button
                              variant="ghost"
                              className="action-soft-danger products-action-delete"
                              onClick={() => requestVariantDelete(variant)}
                            >
                              Eliminar
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-[color:var(--text-faint)]">
                          Sin acciones disponibles
                        </span>
                      ),
                  },
                ]}
              />
            )}

            {showRecipeModule && activeVariantsCount > 0 ? (
              <div className="products-inline-note products-inline-note--footer toolbar-shell mt-4 rounded-lg px-4 py-3 text-xs text-[color:var(--text-faint)]">
                Las operaciones activas sin receta seguiran detectandose aqui para que administracion complete la configuracion antes de vender.
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
          <ProductImageField
            productName={editProductName || selectedProduct?.name}
            productType={editProductCatalogDraft.productType}
            imageUrl={editProductImageDraft.imageUrl}
            imageAlt={editProductImageDraft.imageAlt}
            pendingImageFile={editProductImageDraft.pendingImageFile}
            markedForRemoval={editProductImageDraft.markedForRemoval}
            error={editProductImageDraft.error}
            disabled={editingProduct}
            onSelectImage={(file) =>
              setEditProductImageDraft((current) => selectProductImage(current, file))
            }
            onRemoveImage={() =>
              setEditProductImageDraft((current) => removeProductImage(current))
            }
            onRestoreImage={() =>
              setEditProductImageDraft((current) => restoreProductImage(current))
            }
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
          {showFiscalFields ? (
            <ProductFiscalFieldsSection
              open={editProductFiscalSectionOpen}
              onOpenChange={handleEditProductFiscalSectionOpenChange}
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
          ) : null}
          <CheckboxField
            label="Activo"
            description="Define si el producto estara disponible en el catalogo operativo."
            checked={editProductActive}
            onChange={(event) => setEditProductActive(event.target.checked)}
          />
          <div className="modal-action-row">
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
        title={selectedVariant?.is_operational ? 'Editar operacion simple' : 'Editar variante'}
        subtitle={selectedVariant?.is_operational
          ? 'Ajusta SKU, precio y estado de la operacion que mantiene compatible el producto simple con POS y recetas.'
          : 'Ajusta tamano, SKU, precio y estado de la variante seleccionada.'}
      >
        <div className="grid min-w-0 gap-4 sm:gap-5">
          {selectedVariant?.is_operational ? null : (
            <Input
              label="Tamano"
              value={editVariantSize}
              onChange={(event) => setEditVariantSize(event.target.value)}
              placeholder="Ej: 16oz"
            />
          )}
          <Input
            label="SKU"
            value={editVariantSku}
            onChange={(event) => setEditVariantSku(event.target.value)}
            placeholder={selectedVariant?.is_operational ? 'Ej: CAF-BASE' : 'Ej: LAT-AV-16'}
          />
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
            label={selectedVariant?.is_operational ? 'Operativa en POS' : 'Activa'}
            description={selectedVariant?.is_operational
              ? 'Cuando se desactiva, el producto simple deja de operar en POS.'
              : 'Las variantes inactivas no se muestran en POS.'}
            checked={editVariantActive}
            onChange={(event) => setEditVariantActive(event.target.checked)}
          />
          <div className="modal-action-row">
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
          <div className="products-delete-summary rounded-lg px-4 py-4">
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
          <div className="modal-action-row">
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

      {showRecipeModule ? (
        <Modal
          id="recipe-manager-dialog"
          open={recipeModalOpen}
          onClose={() => setRecipeModalOpen(false)}
          title="Gestionar receta"
          subtitle={
            selectedVariant
              ? [
                  formatVariantDisplayName(selectedVariant),
                  formatVariantSubtitle(selectedVariant, { includeSkuPrefix: true }) || null,
                ]
                  .filter(Boolean)
                  .join(' - ')
              : 'Configura los ingredientes del item seleccionado'
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
                    className="data-list-card rounded-lg p-4"
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

            <div className="modal-action-row modal-action-row--split">
              <Button variant="secondary" onClick={handleAddRecipeRow}>
                Agregar ingrediente
              </Button>
              <div className="modal-action-row__group">
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
      ) : null}
    </div>
  );
}

type CatalogFilterOption<T extends string> = {
  value: T;
  label: string;
};

function CatalogListToolbar<T extends string>({
  countLabel,
  searchValue,
  onSearchChange,
  searchAriaLabel,
  filters,
  activeFilter,
  onFilterChange,
}: {
  countLabel: string;
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchAriaLabel: string;
  filters: readonly CatalogFilterOption<T>[];
  activeFilter: T;
  onFilterChange: (value: T) => void;
}) {
  return (
    <div className="products-list-toolbar toolbar-shell mt-4 grid gap-3 rounded-lg px-4 py-3 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
      <div className="products-list-toolbar__summary">
        <p className="products-list-toolbar__label">Vista activa</p>
        <p className="products-list-toolbar__count">{countLabel}</p>
      </div>
      <div className="products-list-toolbar__controls flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-end xl:w-auto">
        <SearchField
          value={searchValue}
          onChange={(event) => onSearchChange(event.target.value)}
          onClear={() => onSearchChange('')}
          placeholder="Buscar por nombre o SKU"
          aria-label={searchAriaLabel}
          fieldClassName="products-list-toolbar__search-field"
          className="min-h-10"
          wrapperClassName="products-list-toolbar__search w-full sm:max-w-[280px] xl:max-w-[320px]"
        />
        <div className="products-list-toolbar__filters flex flex-wrap justify-end gap-2">
          {filters.map((filterOption) => (
            <FilterChip
              key={filterOption.value}
              active={activeFilter === filterOption.value}
              className="products-list-toolbar__filter min-w-[90px] justify-center"
              label={filterOption.label}
              onClick={() => onFilterChange(filterOption.value)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function getProductCardVariant(product: EnrichedCatalogProduct) {
  if (product.productType === 'SIMPLE') return product.operationalVariant;

  const activeVariant = product.relatedVariants.find((variant) => variant.active);
  return activeVariant ?? product.relatedVariants[0] ?? null;
}

function getProductCardMetaItems(
  product: EnrichedCatalogProduct,
  variant: CatalogVariant | null,
) {
  const items: Array<{ label: string; value: string; mono?: boolean }> = [];

  if (variant?.sku) {
    items.push({ label: 'SKU', value: variant.sku, mono: true });
  }

  if (product.brand) {
    items.push({ label: 'Marca', value: product.brand });
  }

  return items;
}

function getProductCardPriceLabel(
  product: EnrichedCatalogProduct,
  variant: CatalogVariant | null,
) {
  if (product.productType === 'VARIANT') {
    const variantPrices = product.relatedVariants
      .map((candidate) => Number(candidate.sale_price))
      .filter((price) => Number.isFinite(price));

    if (variantPrices.length > 1) {
      return `Desde ${formatCurrency(Math.min(...variantPrices))}`;
    }
  }

  return variant ? formatCurrency(Number(variant.sale_price)) : 'Sin precio';
}

function getProductCardRecipeState(
  product: EnrichedCatalogProduct,
  recipeStatusByVariant: Record<number, boolean>,
) {
  const activeRealVariants = product.relatedVariants.filter((variant) => variant.active);
  const comparableVariants =
    product.productType === 'SIMPLE'
      ? product.operationalVariant
        ? [product.operationalVariant]
        : []
      : activeRealVariants.length > 0
        ? activeRealVariants
        : product.relatedVariants;

  const hasRecipe =
    comparableVariants.length > 0 &&
    comparableVariants.every((variant) => recipeStatusByVariant[variant.id] ?? false);

  return {
    label: hasRecipe ? 'Con receta' : 'Sin receta',
    tone: hasRecipe ? 'info' : 'warning',
  } as const;
}

function getProductTableSummary(product: EnrichedCatalogProduct) {
  const description = product.description?.trim();
  if (description) return description;

  if (product.productType === 'SIMPLE') {
    return product.operationalVariant
      ? 'Producto simple listo para operacion unificada.'
      : 'Producto simple pendiente de operacion en POS.';
  }

  return product.relatedVariants.length > 0
    ? `${product.relatedVariants.length} variantes configuradas para venta.`
    : 'Producto sin variantes reales configuradas.';
}

function getProductOperationSummary(
  product: EnrichedCatalogProduct,
  variant: CatalogVariant | null,
) {
  if (product.productType === 'SIMPLE') {
    if (!variant) {
      return {
        title: 'Sin operacion unificada',
        detail: 'Refresca catalogo para regenerar operacion.',
      };
    }

    return {
      title: 'Operacion unificada',
      detail: variant.active ? 'Lista para operar en POS.' : 'Operacion POS inactiva.',
    };
  }

  const comparableVariants = product.relatedVariants.length > 0
    ? product.relatedVariants
    : variant
      ? [variant]
      : [];
  const sizes = Array.from(
    new Set(
      comparableVariants
        .map((candidate) => candidate.size.trim())
        .filter(Boolean),
    ),
  );

  if (sizes.length > 0) {
    return {
      title: sizes.join(' - '),
      detail: undefined,
    };
  }

  if (comparableVariants.length > 0) {
    return {
      title: 'Sin tamano definido',
      detail: `${comparableVariants.length} variantes configuradas`,
    };
  }

  return {
    title: 'Sin variantes activas',
    detail: 'Crea una variante para habilitar venta en POS.',
  };
}

function getSimpleProductTableStatus(product: EnrichedCatalogProduct) {
  if (!product.active) return 'Inactivo';
  if (!product.operationalVariant?.active) return 'POS inactivo';
  return 'Activo';
}

function normalizeCatalogSearch(value: string) {
  return value.trim().toLocaleLowerCase();
}

function matchesProductSearch(product: EnrichedCatalogProduct, searchTerm: string) {
  const normalizedSearch = normalizeCatalogSearch(searchTerm);
  if (!normalizedSearch) return true;

  const candidate = [
    product.name,
    product.operationalVariant?.sku ?? '',
    ...product.relatedVariants.map((variant) => variant.sku),
  ]
    .join(' ')
    .toLocaleLowerCase();

  return candidate.includes(normalizedSearch);
}

function matchesSimpleProductSearch(product: EnrichedCatalogProduct, searchTerm: string) {
  const normalizedSearch = normalizeCatalogSearch(searchTerm);
  if (!normalizedSearch) return true;

  return [product.name, product.operationalVariant?.sku ?? '']
    .join(' ')
    .toLocaleLowerCase()
    .includes(normalizedSearch);
}

function matchesVariantSearch(variant: CatalogVariant, searchTerm: string) {
  const normalizedSearch = normalizeCatalogSearch(searchTerm);
  if (!normalizedSearch) return true;

  return [variant.product_name, variant.sku]
    .join(' ')
    .toLocaleLowerCase()
    .includes(normalizedSearch);
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

function getProductImageDraft(product: CatalogProduct): ProductImageDraft {
  return getCatalogEntityImageDraft(product, product.name);
}

async function persistProductImageDraft(productId: number, draft: ProductImageDraft) {
  if (draft.pendingImageFile) {
    return posApi.uploadProductImage(productId, draft.pendingImageFile);
  }

  if (draft.markedForRemoval && draft.imageUrl) {
    return posApi.deleteProductImage(productId);
  }

  return null;
}

function buildProductUpdateSuccessMessage(productId: number, draft: ProductImageDraft) {
  if (draft.markedForRemoval && draft.imageUrl && !draft.pendingImageFile) {
    return `Producto #${productId} actualizado sin imagen.`;
  }

  if (draft.pendingImageFile) {
    return `Producto #${productId} actualizado con imagen.`;
  }

  return `Producto #${productId} actualizado correctamente.`;
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
  if (message === 'Product image file is required') return 'Selecciona una imagen valida antes de guardar.';
  if (message === 'Product image must be WebP, PNG, JPG or JPEG') {
    return 'Usa una imagen WebP, PNG, JPG o JPEG.';
  }
  if (message === 'Product image must be 3 MB or smaller') {
    return 'La imagen no puede superar 3 MB.';
  }
  if (message === 'Product image upload is invalid') {
    return 'La imagen seleccionada no es valida. Prueba con otro archivo.';
  }
  if (message === 'Product image could not be stored') {
    return 'No se pudo guardar la imagen en servidor. Intenta de nuevo.';
  }
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









