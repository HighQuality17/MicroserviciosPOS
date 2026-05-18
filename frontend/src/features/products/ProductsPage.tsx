import '@/features/products/products-d2b.css';
import clsx from 'clsx';
import { type ReactNode, useEffect, useMemo, useState } from 'react';
import { Boxes, CircleDot, Layers3, Package2, PackageSearch } from 'lucide-react';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { AccessState } from '@/components/AccessState';
import { CheckboxField } from '@/components/CheckboxField';
import { FeedbackMessage } from '@/components/FeedbackMessage';
import { EmptyState } from '@/components/EmptyState';
import { Input } from '@/components/Input';
import { LoadingState } from '@/components/LoadingState';
import { Modal } from '@/components/Modal';
import {
  ModulePageHeader,
  type ModulePageHeaderBadge,
  type ModulePageHeaderCard,
} from '@/components/ModulePageHeader';
import { ProductMedia } from '@/components/ProductMedia';
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
type CreationWorkspaceTab = 'PRODUCT' | 'VARIANT';
type CatalogExplorerTab = 'PRODUCTS' | 'SIMPLES' | 'VARIANTS';

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

const PRESENTATION_MAX_LENGTH = 15;

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

const creationWorkspaceTabs: Array<{ value: CreationWorkspaceTab; label: string }> = [
  { value: 'PRODUCT', label: 'Producto' },
  { value: 'VARIANT', label: 'Variante' },
];

const catalogExplorerTabs: Array<{ value: CatalogExplorerTab; label: string }> = [
  { value: 'PRODUCTS', label: 'Productos' },
  { value: 'SIMPLES', label: 'Simples' },
  { value: 'VARIANTS', label: 'Variantes' },
];

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
  const [simpleProductPresentation, setSimpleProductPresentation] = useState('');
  const [simpleProductPriceInput, setSimpleProductPriceInput] = useState('');
  const [productFiscalSectionOpen, setProductFiscalSectionOpen] = useState(false);
  const [productListFilter, setProductListFilter] = useState<StatusOnlyFilter>('ACTIVE');
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [variantListFilter, setVariantListFilter] = useState<StatusOnlyFilter>('ACTIVE');
  const [variantSearchTerm, setVariantSearchTerm] = useState('');
  const [simpleProductListFilter, setSimpleProductListFilter] = useState<StatusOnlyFilter>('ACTIVE');
  const [simpleProductSearchTerm, setSimpleProductSearchTerm] = useState('');
  const [creationWorkspaceTab, setCreationWorkspaceTab] =
    useState<CreationWorkspaceTab>('PRODUCT');
  const [catalogExplorerTab, setCatalogExplorerTab] =
    useState<CatalogExplorerTab>('PRODUCTS');

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
  const [editSimpleProductPresentation, setEditSimpleProductPresentation] = useState('');
  const [editSimpleProductPriceInput, setEditSimpleProductPriceInput] = useState('');
  const [editSimpleProductOperationActive, setEditSimpleProductOperationActive] = useState(true);
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
    setSimpleProductPresentation('');
    setSimpleProductPriceInput('');
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
    const simpleSalePrice = parseNumberInput(simpleProductPriceInput);

    if (!productName.trim()) {
      setSubmitError('El nombre del producto es obligatorio.');
      return;
    }
    if (
      productCatalogDraft.productType === 'SIMPLE' &&
      !simpleProductPresentation.trim()
    ) {
      setSubmitError('La presentacion es obligatoria para productos simples.');
      return;
    }
    if (simpleProductPresentation.trim().length > PRESENTATION_MAX_LENGTH) {
      setSubmitError('La presentacion no puede superar 15 caracteres.');
      return;
    }
    if (
      productCatalogDraft.productType === 'SIMPLE' &&
      (simpleSalePrice === null || simpleSalePrice < 0)
    ) {
      setSubmitError('El precio de venta debe ser mayor o igual a 0.');
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
        ...(productCatalogDraft.productType === 'SIMPLE'
          ? { simplePresentation: simpleProductPresentation.trim() }
          : {}),
        ...serializeProductCatalogDraft(productCatalogDraft),
        ...serializeProductFiscalDraft(
          showFiscalFields ? productFiscalDraft : createEmptyProductFiscalDraft(),
        ),
        active: productActive,
      });

      let persistedProduct = createdProduct;
      const operationalVariant = getSimpleOperationalVariant(createdProduct);

      if (productCatalogDraft.productType === 'SIMPLE' && !operationalVariant) {
        setSubmitError('No se pudo preparar la operacion simple del producto.');
        return;
      }

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
        setMessage('Producto creado correctamente.');
        setSubmitError(
          `Producto creado, pero imagen no pudo ${resolveProductImageMutationAction(productImageDraft)}. Abre editar para reintentar. ${translateCatalogError(
            imageError instanceof Error ? imageError.message : 'No se pudo guardar la imagen.',
          )}`,
        );
        await refreshCatalog();
        return;
      }

      if (productCatalogDraft.productType === 'SIMPLE' && operationalVariant) {
        try {
          await posApi.updateVariant(operationalVariant.id, {
            sale_price: simpleSalePrice ?? 0,
            active: productActive,
          });
        } catch (operationError) {
          addSessionProduct(persistedProduct);
          resetCreateProductForm();
          setMessage('Producto creado correctamente.');
          setSubmitError(
            `Producto creado, pero precio de venta no pudo guardarse. ${translateCatalogError(
              operationError instanceof Error
                ? operationError.message
                : 'No se pudo actualizar la operacion simple.',
            )}`,
          );
          await refreshCatalog();
          return;
        }
      }

      addSessionProduct(persistedProduct);
      resetCreateProductForm();
      setMessage(
        productImageDraft.pendingImageFile
          ? 'Producto creado con imagen.'
          : 'Producto creado correctamente.',
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
    if (!variantSize.trim()) {
      setSubmitError('El tamano es obligatorio.');
      return;
    }
    if (variantSize.trim().length > PRESENTATION_MAX_LENGTH) {
      setSubmitError('El tamano no puede superar 15 caracteres.');
      return;
    }
    if (!variantSku.trim()) {
      setSubmitError('El SKU de venta es obligatorio.');
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
      setMessage('Variante creada correctamente.');
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
    const operationalVariant = getSimpleOperationalVariant(product);

    setSelectedProduct(product);
    setEditProductName(product.name);
    setEditProductCatalogDraft(getProductCatalogDraft(product));
    setEditProductFiscalDraft(getProductFiscalDraft(product));
    setEditProductImageDraft(getProductImageDraft(product));
    setEditProductActive(product.active);
    setEditSimpleProductPresentation(getSimpleProductPresentation(product));
    setEditSimpleProductPriceInput(
      operationalVariant ? String(Number(operationalVariant.sale_price)) : '',
    );
    setEditSimpleProductOperationActive(operationalVariant?.active ?? product.active);
    setEditProductFiscalSectionOpen(showFiscalFields && hasConfiguredFiscalData(product));
    setProductEditorOpen(true);
    setSubmitError(null);
  }

  async function handleSaveProduct() {
    if (!selectedProduct) return;
    const simpleSalePrice = parseNumberInput(editSimpleProductPriceInput);

    if (!editProductName.trim()) {
      setSubmitError('El nombre del producto es obligatorio.');
      return;
    }
    if (
      editProductCatalogDraft.productType === 'SIMPLE' &&
      !editSimpleProductPresentation.trim()
    ) {
      setSubmitError('La presentacion es obligatoria para productos simples.');
      return;
    }
    if (editSimpleProductPresentation.trim().length > PRESENTATION_MAX_LENGTH) {
      setSubmitError('La presentacion no puede superar 15 caracteres.');
      return;
    }
    if (
      editProductCatalogDraft.productType === 'SIMPLE' &&
      (simpleSalePrice === null || simpleSalePrice < 0)
    ) {
      setSubmitError('El precio de venta debe ser mayor o igual a 0.');
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
        ...(editProductCatalogDraft.productType === 'SIMPLE'
          ? { simplePresentation: editSimpleProductPresentation.trim() }
          : {}),
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
        setMessage('Producto actualizado correctamente.');
        setSubmitError(
          `Producto actualizado, pero imagen no pudo ${resolveProductImageMutationAction(editProductImageDraft)}. ${translateCatalogError(
            imageError instanceof Error ? imageError.message : 'No se pudo actualizar la imagen.',
          )}`,
        );
        await refreshCatalog();
        return;
      }

      if (editProductCatalogDraft.productType === 'SIMPLE') {
        const operationalVariant = getSimpleOperationalVariant(updatedProduct);

        if (!operationalVariant) {
          setSelectedProduct(persistedProduct);
          setMessage('Producto actualizado correctamente.');
          setSubmitError('No se pudo localizar la operacion simple del producto.');
          await refreshCatalog();
          return;
        }

        try {
          await posApi.updateVariant(operationalVariant.id, {
            sale_price: simpleSalePrice ?? 0,
            active: editSimpleProductOperationActive,
          });
        } catch (operationError) {
          setSelectedProduct(persistedProduct);
          setMessage('Producto actualizado correctamente.');
          setSubmitError(
            `Producto actualizado, pero precio de venta no pudo guardarse. ${translateCatalogError(
              operationError instanceof Error
                ? operationError.message
                : 'No se pudo actualizar la operacion simple.',
            )}`,
          );
          await refreshCatalog();
          return;
        }
      }

      setSelectedProduct(persistedProduct);
      setProductEditorOpen(false);
      setEditProductImageDraft(createEmptyProductImageDraft());
      setMessage(buildProductUpdateSuccessMessage(editProductImageDraft));
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
        `Producto ${product.active ? 'desactivado' : 'activado'} correctamente.`,
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
    if (variant.is_operational) return;

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
      setSubmitError(
        'Tamano y SKU de venta son obligatorios.',
      );
      return;
    }
    if (editVariantSize.trim().length > PRESENTATION_MAX_LENGTH) {
      setSubmitError('El tamano no puede superar 15 caracteres.');
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
        size: editVariantSize.trim(),
        sku: editVariantSku.trim(),
        sale_price: salePrice,
        active: editVariantActive,
      });
      setVariantEditorOpen(false);
      setMessage('Variante actualizada correctamente.');
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
          ? `Operacion simple ${variant.active ? 'desactivada' : 'activada'} correctamente.`
          : `Variante ${variant.active ? 'desactivada' : 'activada'} correctamente.`,
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
      detail: 'Producto de catalogo',
    });
    setSubmitError(null);
  }

  function requestVariantDelete(variant: CatalogVariant) {
    setDeleteTarget({
      kind: 'VARIANT',
      id: variant.id,
      label: formatVariantDisplayName(variant),
      detail: `${variant.is_operational ? 'Operacion simple' : 'Variante'} - SKU ${variant.sku}`,
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
        setMessage('Producto eliminado correctamente.');
      } else {
        await posApi.deleteVariant(deleteTarget.id);
        if (selectedVariant?.id === deleteTarget.id) {
          setVariantEditorOpen(false);
          setRecipeModalOpen(false);
          setSelectedVariant(null);
          setLoadedRecipe(null);
        }
        setMessage('Variante eliminada correctamente.');
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
  const visibleSimpleProductsWithOperation = useMemo(
    () => filteredSimpleProducts.filter((product) => product.operationalVariant !== null),
    [filteredSimpleProducts],
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
      ? `${activeProductsCount} activos`
      : `${inactiveProductsCount} inactivos`;
  const visibleVariantsLabel = variantSearchTerm.trim()
    ? `${filteredRealVariants.length} coincidencias`
    : variantListFilter === 'ACTIVE'
      ? `${activeRealVariantsCount} activas`
      : `${inactiveRealVariantsCount} inactivas`;
  const visibleSimpleProductsLabel = simpleProductSearchTerm.trim()
    ? `${filteredSimpleProducts.length} coincidencias`
    : simpleProductListFilter === 'ACTIVE'
      ? `${activeSimpleProductsCount} activos`
      : `${inactiveSimpleProductsCount} inactivos`;
  const catalogExplorerCountLabel = catalogExplorerTab === 'PRODUCTS'
    ? visibleProductsLabel
    : catalogExplorerTab === 'SIMPLES'
      ? visibleSimpleProductsLabel
      : visibleVariantsLabel;
  const catalogExplorerSearchValue = catalogExplorerTab === 'PRODUCTS'
    ? productSearchTerm
    : catalogExplorerTab === 'SIMPLES'
      ? simpleProductSearchTerm
      : variantSearchTerm;
  const catalogExplorerActiveFilter = catalogExplorerTab === 'PRODUCTS'
    ? productListFilter
    : catalogExplorerTab === 'SIMPLES'
      ? simpleProductListFilter
      : variantListFilter;
  const catalogExplorerFilterOptions = catalogExplorerTab === 'VARIANTS'
    ? variantStatusFilterOptions
    : productStatusFilterOptions;
  const catalogExplorerSearchLabel = catalogExplorerTab === 'PRODUCTS'
    ? 'Buscar productos por nombre o SKU'
    : catalogExplorerTab === 'SIMPLES'
      ? 'Buscar productos simples por nombre o SKU'
      : 'Buscar variantes por nombre o SKU';
  const catalogExplorerTabLabel = catalogExplorerTabs.find(
    (tab) => tab.value === catalogExplorerTab,
  )?.label ?? 'Catalogo';
  function handleCatalogExplorerSearchChange(value: string) {
    if (catalogExplorerTab === 'PRODUCTS') {
      setProductSearchTerm(value);
      return;
    }

    if (catalogExplorerTab === 'SIMPLES') {
      setSimpleProductSearchTerm(value);
      return;
    }

    setVariantSearchTerm(value);
  }
  function handleCatalogExplorerFilterChange(value: StatusOnlyFilter) {
    if (catalogExplorerTab === 'PRODUCTS') {
      setProductListFilter(value);
      return;
    }

    if (catalogExplorerTab === 'SIMPLES') {
      setSimpleProductListFilter(value);
      return;
    }

    setVariantListFilter(value);
  }
  const heroSummaryLabel = showRecipeModule ? 'Cobertura activa' : 'Operacion activa';
  const heroSummaryValue = showRecipeModule ? recipeBadgeLabel : operationalBadgeLabel;
  const heroSummaryNote = catalogAccessDenied
    ? 'Solo lectura'
    : showRecipeModule
      ? activeVariantsCount > 0
        ? `${configuredRecipesCount}/${activeVariantsCount} con receta`
        : 'Sin operaciones'
      : `${activeSimpleOperationalCount} simples / ${activeRealVariantsCount} variantes`;
  const productsHeroMetrics: ModulePageHeaderCard[] = [
    {
      label: 'Catalogo',
      value: String(products.length),
      note: loadingCatalog
        ? 'Sincronizando'
        : inactiveProductsCount > 0
          ? `${activeProductsCount} activos / ${inactiveProductsCount} inactivos`
          : `${activeProductsCount} activos`,
      accent: catalogStatusTone,
      icon: <PackageSearch size={16} />,
      iconTone: catalogStatusTone,
    },
    {
      label: 'Simples',
      value: String(simpleProducts.length),
      note:
        simpleProducts.length > 0
          ? `${activeSimpleProductsCount} activos`
          : 'Sin simples',
      accent: 'default' as const,
      icon: <Package2 size={16} />,
      iconTone: 'default',
    },
    {
      label: 'Variantes',
      value: String(realVariants.length),
      note:
        realVariants.length > 0
          ? `${activeRealVariantsCount} activas`
          : 'Sin variantes',
      accent: 'info' as const,
      icon: <Layers3 size={16} />,
      iconTone: 'info',
    },
    {
      label: showRecipeModule ? 'Receta' : 'Operaciones',
      value: showRecipeModule
        ? activeVariantsCount > 0
          ? `${configuredRecipesCount}/${activeVariantsCount}`
          : '0'
        : String(activeSimpleOperationalCount + activeRealVariantsCount),
      note: showRecipeModule
        ? activeVariantsCount > 0
          ? recipeBadgeLabel
          : 'Sin operaciones'
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
    ...(!canManageCatalog
      ? [
          {
            label: 'Solo lectura',
            tone: 'default' as const,
          },
        ]
      : []),
  ];

  function renderMobileInfoItem(
    label: string,
    value: ReactNode,
    options?: { accent?: 'price' | 'default' },
  ) {
    return (
      <div className="products-mobile-card__info-item">
        <span className="products-mobile-card__info-label">{label}</span>
        <div
          className={clsx(
            'products-mobile-card__info-value',
            options?.accent === 'price' && 'products-mobile-card__info-value--price',
          )}
        >
          {value}
        </div>
      </div>
    );
  }

  function renderMobileEntityHeader(
    label: string,
    image: { src: string | null; alt: string | null; kind: 'SIMPLE' | 'VARIANT' },
    chip: { label: string; tone: 'info' | 'default' },
    sku?: string | null,
  ) {
    return (
      <div className="products-mobile-card__header">
        <ProductMedia
          size="sm"
          label={label}
          src={image.src}
          alt={image.alt ?? label}
          kind={image.kind}
          className="products-mobile-card__media"
        />
        <div className="min-w-0 products-mobile-card__header-copy">
          <p className="products-mobile-card__name">{label}</p>
          <StatusBadge label={chip.label} tone={chip.tone} className="products-mobile-card__type" />
          {sku ? <p className="products-mobile-card__sku">SKU {sku}</p> : null}
        </div>
      </div>
    );
  }

  function renderProductMobileCard(product: EnrichedCatalogProduct) {
    const displayVariant = getProductCardVariant(product);
    const operationSummary = getProductOperationSummary(product, displayVariant);
    const recipeState = showRecipeModule
      ? getProductCardRecipeState(product, recipeStatusByVariant)
      : null;

    return (
      <article className="products-mobile-card">
        {renderMobileEntityHeader(
          product.name,
          {
            src: product.imageUrl,
            alt: product.imageAlt,
            kind: product.productType === 'VARIANT' ? 'VARIANT' : 'SIMPLE',
          },
          {
            label: product.productType === 'SIMPLE' ? 'Simple' : 'Variantes',
            tone: 'info',
          },
          product.internalCode,
        )}
        <div className="products-mobile-card__info-grid">
          {renderMobileInfoItem('Operacion', operationSummary.title || 'Sin presentacion')}
          {renderMobileInfoItem(
            'Precio',
            <span className="products-mobile-card__price">
              {getProductCardPriceLabel(product, displayVariant)}
            </span>,
            { accent: 'price' },
          )}
          {renderMobileInfoItem(
            'Estado',
            <StatusBadge
              label={product.active ? 'Activo' : 'Inactivo'}
              tone={product.active ? 'success' : 'default'}
            />,
          )}
          {showRecipeModule && recipeState
            ? renderMobileInfoItem(
                'Receta',
                <StatusBadge label={recipeState.label} tone={recipeState.tone} />,
              )
            : null}
        </div>
        {canManageCatalog ? (
          <div className="products-mobile-card__actions">
            <Button
              variant="secondary"
              className="action-soft-brand"
              aria-haspopup="dialog"
              aria-controls="product-editor-dialog"
              onClick={() => openProductEditor(product)}
            >
              Editar
            </Button>
            <Button
              variant="ghost"
              className={product.active ? 'products-action-toggle' : 'action-soft-success'}
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
      </article>
    );
  }

  function renderSimpleProductMobileCard(product: EnrichedCatalogProduct) {
    const displayVariant = getProductCardVariant(product);
    const recipeState = showRecipeModule
      ? getProductCardRecipeState(product, recipeStatusByVariant)
      : null;

    return (
      <article className="products-mobile-card">
        {renderMobileEntityHeader(
          product.name,
          { src: product.imageUrl, alt: product.imageAlt, kind: 'SIMPLE' },
          { label: 'Simple', tone: 'info' },
          product.internalCode,
        )}
        <div className="products-mobile-card__info-grid">
          {renderMobileInfoItem(
            'Presentacion',
            displayVariant?.size.trim() || 'Sin presentacion',
          )}
          {renderMobileInfoItem(
            'Precio',
            <span className="products-mobile-card__price">
              {getProductCardPriceLabel(product, displayVariant)}
            </span>,
            { accent: 'price' },
          )}
          {renderMobileInfoItem(
            'Estado',
            <StatusBadge
              label={getSimpleProductTableStatus(product)}
              tone={product.active && product.operationalVariant?.active ? 'success' : 'default'}
            />,
          )}
          {showRecipeModule && recipeState
            ? renderMobileInfoItem(
                'Receta',
                <StatusBadge label={recipeState.label} tone={recipeState.tone} />,
              )
            : null}
        </div>
        {canManageCatalog && product.operationalVariant ? (
          <div className="products-mobile-card__actions products-mobile-card__actions--grid">
            <Button
              variant="secondary"
              className="action-soft-brand"
              aria-haspopup="dialog"
              aria-controls="product-editor-dialog"
              onClick={() => openProductEditor(product)}
            >
              Editar
            </Button>
            {showRecipeModule ? (
              <Button
                variant="secondary"
                className="action-soft-brand"
                aria-haspopup="dialog"
                aria-controls="recipe-manager-dialog"
                onClick={() => void openRecipeManager(product.operationalVariant!)}
              >
                Receta
              </Button>
            ) : null}
            <Button
              variant="ghost"
              className={product.operationalVariant.active ? 'products-action-toggle' : 'action-soft-success'}
              onClick={() => void handleToggleVariantStatus(product.operationalVariant!)}
            >
              {product.operationalVariant.active ? 'Desactivar' : 'Activar'}
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
      </article>
    );
  }

  function renderVariantMobileCard(variant: CatalogVariant) {
    const recipeState = showRecipeModule
      ? {
          label: recipeStatusByVariant[variant.id] ? 'Con receta' : 'Sin receta',
          tone: recipeStatusByVariant[variant.id] ? ('info' as const) : ('warning' as const),
        }
      : null;

    return (
      <article className="products-mobile-card">
        {renderMobileEntityHeader(
          variant.product_name,
          { src: variant.image_url, alt: variant.image_alt, kind: 'VARIANT' },
          { label: 'Variante', tone: 'info' },
          variant.sku,
        )}
        <div className="products-mobile-card__info-grid">
          {renderMobileInfoItem('Presentacion', variant.size || 'Sin tamano')}
          {renderMobileInfoItem(
            'Precio',
            <span className="products-mobile-card__price">
              {formatCurrency(Number(variant.sale_price))}
            </span>,
            { accent: 'price' },
          )}
          {renderMobileInfoItem(
            'Estado',
            <StatusBadge label={variant.active ? 'Activa' : 'Inactiva'} tone={variant.active ? 'success' : 'default'} />,
          )}
          {showRecipeModule && recipeState
            ? renderMobileInfoItem('Receta', <StatusBadge label={recipeState.label} tone={recipeState.tone} />)
            : null}
        </div>
        {canManageCatalog ? (
          <div className="products-mobile-card__actions products-mobile-card__actions--grid">
            <Button
              variant="secondary"
              className="action-soft-brand"
              aria-haspopup="dialog"
              aria-controls="variant-editor-dialog"
              onClick={() => openVariantEditor(variant)}
            >
              Editar
            </Button>
            {showRecipeModule ? (
              <Button
                variant="secondary"
                className="action-soft-brand"
                aria-haspopup="dialog"
                aria-controls="recipe-manager-dialog"
                onClick={() => void openRecipeManager(variant)}
              >
                Receta
              </Button>
            ) : null}
            <Button
              variant="ghost"
              className={variant.active ? 'products-action-toggle' : 'action-soft-success'}
              onClick={() => void handleToggleVariantStatus(variant)}
            >
              {variant.active ? 'Desactivar' : 'Activar'}
            </Button>
            <Button
              variant="ghost"
              className="action-soft-danger"
              onClick={() => requestVariantDelete(variant)}
            >
              Eliminar
            </Button>
          </div>
        ) : null}
      </article>
    );
  }

  return (
    <div className="products-page products-page--catalog grid min-w-0 gap-4 sm:gap-5">
      <ModulePageHeader
        ariaLabel="Estado operativo de productos"
        eyebrow="Administracion de catalogo"
        title="Productos"
        icon={<Boxes size={18} />}
        badges={productsHeaderBadges}
        summary={{
          label: heroSummaryLabel,
          value: heroSummaryValue,
          note: heroSummaryNote,
        }}
        asideAction={
          <Button variant="secondary" onClick={() => void refreshCatalog()}>
            Actualizar catalogo
          </Button>
        }
        cards={productsHeroMetrics}
      />

      {message ? <FeedbackMessage tone="success" className="products-feedback">{message}</FeedbackMessage> : null}

      {submitError ? <FeedbackMessage tone="error" className="products-feedback">{submitError}</FeedbackMessage> : null}

      {catalogError ? <FeedbackMessage tone="error" className="products-feedback">{catalogError}</FeedbackMessage> : null}

      {catalogAccessDenied ? (
        <AccessState description="Sin permiso para consultar catalogo." />
      ) : null}

      <div className="products-workspace grid min-w-0 items-start gap-4 lg:grid-cols-[minmax(0,24rem)_minmax(0,1fr)] xl:gap-5 xl:grid-cols-[minmax(0,25rem)_minmax(0,1fr)]">
        <div className="products-form-rail grid min-w-0 gap-4 sm:gap-5">
          <Card
            padding="none"
            glow={false}
            className="products-panel products-panel--form products-panel--creation-workspace"
            contentClassName="products-panel__body"
          >
            <ProductsPanelHeader
              eyebrow="Creacion"
              title="Nuevo catalogo"
              meta={
                creationWorkspaceTab === 'PRODUCT' ? (
                  <StatusBadge
                    label={productCatalogDraft.productType === 'SIMPLE' ? 'Simple' : 'Con variantes'}
                    tone={productCatalogDraft.productType === 'VARIANT' ? 'info' : 'default'}
                  />
                ) : (
                  <StatusBadge
                    label={variantActive ? 'Activa' : 'Inactiva'}
                    tone={variantActive ? 'success' : 'default'}
                  />
                )
              }
            />
            <ProductsSegmentedControl
              options={creationWorkspaceTabs}
              value={creationWorkspaceTab}
              onChange={setCreationWorkspaceTab}
              ariaLabel="Seleccionar flujo de creacion"
              idPrefix="products-create"
            />

            {creationWorkspaceTab === 'PRODUCT' ? (
              <div
                id="products-create-product-panel"
                role="tabpanel"
                aria-labelledby="products-create-product-tab"
                className="products-creation-pane"
              >
                <div className="products-form-stack">
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
                  {productCatalogDraft.productType === 'SIMPLE' ? (
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Input
                        label="Presentacion"
                        wrapperClassName="products-field"
                        labelClassName="products-field__label"
                        className="products-field__control"
                        value={simpleProductPresentation}
                        onChange={(event) => setSimpleProductPresentation(event.target.value)}
                        placeholder="Ej: Botella 350 ml"
                        maxLength={15}
                      />
                      <Input
                        type="number"
                        min={0}
                        label="Precio de venta"
                        wrapperClassName="products-field"
                        labelClassName="products-field__label"
                        className="products-field__control"
                        value={simpleProductPriceInput}
                        onChange={(event) => {
                          const nextValue = normalizeNumberInput(event.target.value);
                          if (nextValue !== null) setSimpleProductPriceInput(nextValue);
                        }}
                        placeholder="Ej: 12000"
                      />
                    </div>
                  ) : null}

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
                    wrapperClassName="products-toggle-card"
                    className="products-toggle-card__label"
                    checked={productActive}
                    onChange={(event) => setProductActive(event.target.checked)}
                  />

                  <div className="products-panel__actions">
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
              </div>
            ) : (
              <div
                id="products-create-variant-panel"
                role="tabpanel"
                aria-labelledby="products-create-variant-tab"
                className="products-creation-pane"
              >
                <div className="products-form-stack">
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
                        ? 'Sin familias activas'
                        : 'Selecciona un producto'}
                    </option>
                    {variantReadyProducts.map((product) => (
                      <option key={product.id} value={String(product.id)}>
                        {product.name}{product.internalCode ? ` / ${product.internalCode}` : ''}
                      </option>
                    ))}
                  </Select>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Input
                      label="Tamano"
                      wrapperClassName="products-field"
                      labelClassName="products-field__label"
                      className="products-field__control"
                      value={variantSize}
                      onChange={(event) => setVariantSize(event.target.value)}
                      placeholder="Ej: 12oz"
                      maxLength={15}
                    />
                    <Input
                      label="SKU de venta"
                      wrapperClassName="products-field"
                      labelClassName="products-field__label"
                      className="products-field__control"
                      value={variantSku}
                      onChange={(event) => setVariantSku(event.target.value)}
                      placeholder="Ej: LAT-12OZ"
                      maxLength={80}
                    />
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
                  </div>

                  <CheckboxField
                    label="Activa"
                    wrapperClassName="products-toggle-card"
                    className="products-toggle-card__label"
                    checked={variantActive}
                    onChange={(event) => setVariantActive(event.target.checked)}
                  />

                  <div className="products-panel__actions">
                    <Button
                      disabled={
                        !canManageCatalog ||
                        creatingVariant ||
                        variantReadyProducts.length === 0 ||
                        !variantSku.trim()
                      }
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
              </div>
            )}
          </Card>
        </div>

        <div className="products-data-rail grid min-w-0 gap-4 sm:gap-5">
          <Card
            padding="none"
            glow={false}
            className="products-panel products-panel--list products-panel--catalog-explorer"
            contentClassName="products-panel__body"
          >
            <ProductsPanelHeader
              eyebrow="Explorador"
              title="Catalogo"
              meta={<StatusBadge label={catalogExplorerTabLabel} tone="info" />}
            />
            <ProductsSegmentedControl
              options={catalogExplorerTabs}
              value={catalogExplorerTab}
              onChange={setCatalogExplorerTab}
              ariaLabel="Seleccionar vista del catalogo"
              idPrefix="products-explorer"
            />
            <CatalogListToolbar
              countLabel={catalogExplorerCountLabel}
              searchValue={catalogExplorerSearchValue}
              onSearchChange={handleCatalogExplorerSearchChange}
              searchAriaLabel={catalogExplorerSearchLabel}
              activeFilter={catalogExplorerActiveFilter}
              filters={catalogExplorerFilterOptions}
              onFilterChange={handleCatalogExplorerFilterChange}
            />

            {catalogExplorerTab === 'PRODUCTS' ? (
              <div
                id="products-explorer-products-panel"
                role="tabpanel"
                aria-labelledby="products-explorer-products-tab"
                className="products-explorer-pane"
              >
                {loadingCatalog ? (
                  <div className="mt-6">
                <LoadingState
                  title="Cargando productos"
                  description="Sincronizando catalogo."
                  rows={4}
                />
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="mt-6">
                <EmptyState
                  title={
                    productSearchTerm.trim()
                      ? 'Sin coincidencias'
                      : productListFilter === 'ACTIVE'
                        ? 'Sin productos activos'
                        : 'Sin productos inactivos'
                  }
                  description={
                    productSearchTerm.trim()
                      ? 'Sin coincidencias.'
                      : productListFilter === 'ACTIVE'
                        ? 'Crea o reactiva un producto.'
                        : 'Sin inactivos.'
                  }
                />
              </div>
            ) : (
              <CatalogItemsTable
                ariaLabel="Listado de productos"
                caption="Tabla general de productos del catalogo"
                rows={filteredProducts}
                paginationLabel="productos"
                mobileCardRender={(product) => renderProductMobileCard(product)}
                rowKey={(product) => product.id}
                rowClassName={(product) => (!product.active ? 'opacity-80' : undefined)}
                tableMinWidthClassName="min-w-[1080px]"
                columns={[
                  {
                    key: 'product',
                    header: 'Producto',
                    width: '360px',
                    render: (product) => {
                      const metaItems = getProductCardMetaItems(product);
                      const summary = getProductTableSummary(product);

                      return (
                        <div className="products-table-entity products-table-entity--with-media">
                          <ProductMedia
                            size="sm"
                            label={product.name}
                            src={product.imageUrl}
                            alt={product.imageAlt ?? product.name}
                            kind={product.productType === 'VARIANT' ? 'VARIANT' : 'SIMPLE'}
                            className="products-table-media"
                          />
                          <div className="min-w-0">
                            <div className="products-table-entity__title-row">
                              <p className="products-table-entity__name text-[15px] font-semibold theme-text-strong">
                                {product.name}
                              </p>
                              <StatusBadge
                                label={product.productType === 'SIMPLE' ? 'Simple' : 'Variantes'}
                                tone="info"
                              />
                            </div>
                            {metaItems.length > 0 ? (
                              <div className="products-table-meta">
                                {metaItems.map((item) => (
                                  <span
                                    key={item.label}
                                    className={clsx(
                                      'products-table-meta__item',
                                      item.mono && 'products-table-meta__item--mono',
                                    )}
                                  >
                                    <span className="products-table-meta__label">{item.label}</span>
                                    <span>{item.value}</span>
                                  </span>
                                ))}
                              </div>
                            ) : null}
                            {summary ? (
                              <p className="products-table-entity__summary">{summary}</p>
                            ) : null}
                          </div>
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
                            <p
                              className={clsx(
                                'products-table-stack__detail',
                                operationSummary.detailMono && 'products-table-stack__detail--mono',
                              )}
                            >
                              {operationSummary.detail}
                            </p>
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
                    width: showRecipeModule ? '292px' : '232px',
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
              </div>
            ) : catalogExplorerTab === 'SIMPLES' ? (
              <div
                id="products-explorer-simples-panel"
                role="tabpanel"
                aria-labelledby="products-explorer-simples-tab"
                className="products-explorer-pane"
              >

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
                      ? 'Sin coincidencias'
                      : simpleProductListFilter === 'ACTIVE'
                      ? 'Sin productos simples activos'
                      : 'Sin productos simples inactivos'
                  }
                  description={
                    simpleProductSearchTerm.trim()
                      ? 'Sin coincidencias.'
                      : simpleProductListFilter === 'ACTIVE'
                      ? 'Crea o reactiva un producto simple.'
                      : 'Sin inactivos.'
                  }
                />
              </div>
            ) : visibleSimpleProductsWithOperation.length === 0 ? (
              <div className="mt-6">
                <EmptyState
                  title="Operacion simple pendiente"
                  description="Refresca el catalogo para regenerarla."
                />
              </div>
            ) : (
              <CatalogItemsTable
                ariaLabel="Listado de productos simples"
                caption="Tabla de productos simples con operacion unificada"
                rows={visibleSimpleProductsWithOperation}
                paginationLabel="productos"
                mobileCardRender={(product) => renderSimpleProductMobileCard(product)}
                rowKey={(product) => product.id}
                rowClassName={(product) =>
                  !product.active || !product.operationalVariant?.active ? 'opacity-80' : undefined
                }
                tableMinWidthClassName="min-w-[1080px]"
                columns={[
                  {
                    key: 'product',
                    header: 'Producto',
                    width: '360px',
                    render: (product) => {
                      const metaItems = getProductCardMetaItems(product);
                      const summary = getProductTableSummary(product);

                      return (
                        <div className="products-table-entity products-table-entity--with-media">
                          <ProductMedia
                            size="sm"
                            label={product.name}
                            src={product.imageUrl}
                            alt={product.imageAlt ?? product.name}
                            kind="SIMPLE"
                            className="products-table-media"
                          />
                          <div className="min-w-0">
                            <div className="products-table-entity__title-row">
                              <p className="products-table-entity__name text-[15px] font-semibold theme-text-strong">
                                {product.name}
                              </p>
                              <StatusBadge label="Simple" tone="info" />
                            </div>
                            {metaItems.length > 0 ? (
                              <div className="products-table-meta">
                                {metaItems.map((item) => (
                                  <span
                                    key={item.label}
                                    className={clsx(
                                      'products-table-meta__item',
                                      item.mono && 'products-table-meta__item--mono',
                                    )}
                                  >
                                    <span className="products-table-meta__label">{item.label}</span>
                                    <span>{item.value}</span>
                                  </span>
                                ))}
                              </div>
                            ) : null}
                            {summary ? (
                              <p className="products-table-entity__summary">{summary}</p>
                            ) : null}
                          </div>
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
                            <p
                              className={clsx(
                                'products-table-stack__detail',
                                operationSummary.detailMono && 'products-table-stack__detail--mono',
                              )}
                            >
                              {operationSummary.detail}
                            </p>
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
                    width: showRecipeModule ? '304px' : '232px',
                    render: (product) =>
                      canManageCatalog && product.operationalVariant ? (
                        <div className="products-table-actions">
                          <div className="products-table-actions__primary">
                            <Button variant="secondary" className="action-soft-brand products-action-edit" aria-haspopup="dialog" aria-controls="product-editor-dialog" onClick={() => openProductEditor(product)}>
                              Editar
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
                            <Button variant="ghost" className="action-soft-danger products-action-delete" onClick={() => requestProductDelete(product)}>
                              Eliminar
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
              </div>
            ) : (
              <div
                id="products-explorer-variants-panel"
                role="tabpanel"
                aria-labelledby="products-explorer-variants-tab"
                className="products-explorer-pane"
              >

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
                  description="Crea una variante para habilitar venta."
                />
              </div>
            ) : filteredRealVariants.length === 0 ? (
              <div className="mt-6">
                <EmptyState
                  title={variantSearchTerm.trim() ? 'Sin coincidencias' : 'Sin variantes'}
                  description={
                    variantSearchTerm.trim()
                      ? 'Sin coincidencias.'
                      : variantListFilter === 'ACTIVE'
                      ? 'Sin variantes activas.'
                      : 'Sin variantes inactivas.'
                  }
                />
              </div>
            ) : (
              <CatalogItemsTable
                ariaLabel="Listado de variantes"
                caption="Tabla de variantes del catalogo"
                rows={filteredRealVariants}
                paginationLabel="variantes"
                mobileCardRender={(variant) => renderVariantMobileCard(variant)}
                rowKey={(variant) => variant.id}
                rowClassName={(variant) => (!variant.active ? 'opacity-80' : undefined)}
                tableMinWidthClassName="min-w-[1040px]"
                columns={[
                  {
                    key: 'product',
                    header: 'Producto',
                    render: (variant) => (
                      <div className="products-table-entity products-table-entity--with-media">
                        <ProductMedia
                          size="sm"
                          label={variant.product_name}
                          src={variant.image_url}
                          alt={variant.image_alt ?? variant.product_name}
                          kind="VARIANT"
                          className="products-table-media"
                        />
                        <div className="min-w-0">
                          <p className="products-table-entity__name text-[15px] font-semibold theme-text-strong">
                            {variant.product_name}
                          </p>
                        </div>
                      </div>
                    ),
                  },
                  {
                    key: 'variant',
                    header: 'Variante',
                    width: '180px',
                    render: (variant) => (
                      <div className="products-table-stack">
                        <p className="products-table-stack__title">{variant.size || 'Sin tamano'}</p>
                        <p className="products-table-stack__detail products-table-stack__detail--mono">
                          SKU {variant.sku}
                        </p>
                      </div>
                    ),
                  },
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
                    width: showRecipeModule ? '304px' : '232px',
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
              </div>
            )}
          </Card>
        </div>
      </div>
      <Modal
        id="product-editor-dialog"
        open={productEditorOpen}
        onClose={() => setProductEditorOpen(false)}
        title="Editar producto"
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
          {editProductCatalogDraft.productType === 'SIMPLE' ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                label="Presentacion"
                value={editSimpleProductPresentation}
                onChange={(event) => setEditSimpleProductPresentation(event.target.value)}
                placeholder="Ej: Botella 350 ml"
                maxLength={15}
              />
              <Input
                type="number"
                min={0}
                label="Precio de venta"
                value={editSimpleProductPriceInput}
                onChange={(event) => {
                  const nextValue = normalizeNumberInput(event.target.value);
                  if (nextValue !== null) setEditSimpleProductPriceInput(nextValue);
                }}
                placeholder="Ej: 12000"
              />
              <CheckboxField
                label="Operativa en POS"
                checked={editSimpleProductOperationActive}
                onChange={(event) => setEditSimpleProductOperationActive(event.target.checked)}
              />
            </div>
          ) : null}
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
        title="Editar variante"
      >
        <div className="grid min-w-0 gap-4 sm:gap-5">
          <Input
            label="Tamano"
            value={editVariantSize}
            onChange={(event) => setEditVariantSize(event.target.value)}
            placeholder="Ej: 16oz"
            maxLength={15}
          />
          <Input
            label="SKU de venta"
            value={editVariantSku}
            onChange={(event) => setEditVariantSku(event.target.value)}
            placeholder="Ej: LAT-AV-16"
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
            label="Activa"
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
        subtitle="Operacion permanente si no hay dependencias."
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
            El sistema bloqueara la eliminacion si existen ventas o relaciones activas.
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
            description="Leyendo ingredientes."
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

type ProductsSegmentOption<T extends string> = {
  value: T;
  label: string;
};

function ProductsPanelHeader({
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

function ProductsSegmentedControl<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  idPrefix,
}: {
  options: Array<ProductsSegmentOption<T>> | readonly ProductsSegmentOption<T>[];
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
    <div className="products-list-toolbar toolbar-shell mt-4 grid xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
      <div className="products-list-toolbar__summary">
        <p className="products-list-toolbar__count">{countLabel}</p>
      </div>
      <div className="products-list-toolbar__controls flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-end xl:w-auto">
        <SearchField
          value={searchValue}
          onChange={(event) => onSearchChange(event.target.value)}
          onClear={() => onSearchChange('')}
          placeholder="Nombre / SKU"
          aria-label={searchAriaLabel}
          fieldClassName="products-list-toolbar__search-field"
          className="min-h-10"
          wrapperClassName="products-list-toolbar__search w-full sm:max-w-[280px] xl:max-w-[320px]"
        />
        <div
          className="products-list-toolbar__filters flex flex-wrap justify-end gap-2"
          role="group"
          aria-label="Filtrar por estado"
        >
          {filters.map((filterOption) => (
            <button
              type="button"
              key={filterOption.value}
              aria-pressed={activeFilter === filterOption.value}
              data-active={activeFilter === filterOption.value || undefined}
              className="products-list-toolbar__filter min-w-[78px] justify-center"
              onClick={() => onFilterChange(filterOption.value)}
            >
              {filterOption.label}
            </button>
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

function getProductCardMetaItems(product: EnrichedCatalogProduct) {
  const items: Array<{ label: string; value: string; mono?: boolean }> = [];

  if (product.internalCode) {
    items.push({ label: 'SKU', value: product.internalCode, mono: true });
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
  return null;
}

function getProductOperationSummary(
  product: EnrichedCatalogProduct,
  variant: CatalogVariant | null,
): { title: string; detail?: string; detailMono?: boolean } {
  if (product.productType === 'SIMPLE') {
    if (!variant) {
      return {
        title: 'Sin presentacion',
        detail: undefined,
      };
    }

    return {
      title: variant.size.trim() || 'Sin presentacion',
      detail: undefined,
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
      detail: `${comparableVariants.length} ${comparableVariants.length === 1 ? 'variante' : 'variantes'}`,
    };
  }

  if (comparableVariants.length > 0) {
    return {
      title: 'Presentaciones por definir',
      detail: `${comparableVariants.length} variantes`,
    };
  }

  return {
    title: 'Sin variantes configuradas',
    detail: 'Pendiente',
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
    product.internalCode ?? '',
    ...(product.productType === 'SIMPLE' ? [] : [product.operationalVariant?.sku ?? '']),
    ...product.relatedVariants.map((variant) => variant.sku),
  ]
    .join(' ')
    .toLocaleLowerCase();

  return candidate.includes(normalizedSearch);
}

function matchesSimpleProductSearch(product: EnrichedCatalogProduct, searchTerm: string) {
  const normalizedSearch = normalizeCatalogSearch(searchTerm);
  if (!normalizedSearch) return true;

  return [product.name, product.internalCode ?? '']
    .join(' ')
    .toLocaleLowerCase()
    .includes(normalizedSearch);
}

function getSimpleOperationalVariant(product: {
  productType: ProductType;
  variants?: Array<{ id: number; sale_price: number; active: boolean; size: string; is_operational?: boolean }>;
}) {
  if (product.productType !== 'SIMPLE') return null;

  return (
    product.variants?.find((variant) => variant.is_operational || variant.active) ??
    product.variants?.[0] ??
    null
  );
}

function getSimpleProductPresentation(product: {
  productType: ProductType;
  variants?: Array<{ id: number; sale_price: number; active: boolean; size: string; is_operational?: boolean }>;
}) {
  const operationalVariant = getSimpleOperationalVariant(product);
  return operationalVariant?.size ?? '';
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

function buildProductUpdateSuccessMessage(draft: ProductImageDraft) {
  if (draft.markedForRemoval && draft.imageUrl && !draft.pendingImageFile) {
    return 'Producto actualizado sin imagen.';
  }

  if (draft.pendingImageFile) {
    return 'Producto actualizado con imagen.';
  }

  return 'Producto actualizado correctamente.';
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
  if (message === 'Simple product SKU already exists') return 'Ya existe una variante u operacion con ese SKU.';
  if (message === 'Variant sku already exists') return 'Ya existe una variante con ese SKU.';
  if (message === 'simplePresentation must be shorter than or equal to 15 characters') {
    return 'La presentacion no puede superar 15 caracteres.';
  }
  if (message === 'size must be shorter than or equal to 15 characters') {
    return 'El tamano no puede superar 15 caracteres.';
  }
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









