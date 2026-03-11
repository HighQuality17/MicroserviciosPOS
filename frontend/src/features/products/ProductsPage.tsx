import { useEffect, useMemo, useState } from 'react';
import { Layers3, PackagePlus, Shapes } from 'lucide-react';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { Input } from '@/components/Input';
import { SummaryCard } from '@/components/SummaryCard';
import { posApi } from '@/services/api/posApi';
import { useAppStore } from '@/store/appStore';
import { formatCurrency } from '@/utils/format';
import type { CatalogProduct, CatalogVariant } from '@/types/api';

export function ProductsPage() {
  const addSessionProduct = useAppStore((state) => state.addSessionProduct);
  const addSessionVariant = useAppStore((state) => state.addSessionVariant);

  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [variants, setVariants] = useState<CatalogVariant[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [creatingProduct, setCreatingProduct] = useState(false);
  const [creatingVariant, setCreatingVariant] = useState(false);

  const [productName, setProductName] = useState('');
  const [productDescription, setProductDescription] = useState('');
  const [productCategory, setProductCategory] = useState('Bebidas');
  const [productActive, setProductActive] = useState(true);

  const [variantProductId, setVariantProductId] = useState<number>(0);
  const [variantSize, setVariantSize] = useState('12oz');
  const [variantSku, setVariantSku] = useState('');
  const [variantPrice, setVariantPrice] = useState(0);
  const [variantActive, setVariantActive] = useState(true);

  const productsById = useMemo(
    () => new Map(products.map((product) => [product.id, product])),
    [products],
  );

  const enrichedProducts = useMemo(() => {
    return products.map((product) => ({
      ...product,
      relatedVariants:
        product.variants.length > 0
          ? product.variants
          : variants.filter((variant) => variant.product_id === product.id),
    }));
  }, [products, variants]);

  useEffect(() => {
    void refreshCatalog();
  }, []);

  async function refreshCatalog() {
    try {
      setLoadingCatalog(true);
      setCatalogError(null);

      const [productsResponse, variantsResponse] = await Promise.all([
        posApi.getProducts(),
        posApi.getVariants(),
      ]);

      setProducts(productsResponse);
      setVariants(variantsResponse);

      if (productsResponse.length > 0 && variantProductId === 0) {
        setVariantProductId(productsResponse[0].id);
      }
    } catch (error) {
      setCatalogError(
        error instanceof Error
          ? error.message
          : 'No fue posible cargar productos y variantes',
      );
    } finally {
      setLoadingCatalog(false);
    }
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
      setProductCategory('Bebidas');
      setProductActive(true);
      setMessage(`Producto #${product.id} creado correctamente.`);
      await refreshCatalog();
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : 'No se pudo crear el producto',
      );
    } finally {
      setCreatingProduct(false);
    }
  }

  async function handleCreateVariant() {
    if (variantProductId <= 0) {
      setSubmitError('Selecciona un producto para la variante.');
      return;
    }
    if (!variantSize.trim() || !variantSku.trim()) {
      setSubmitError('Tamaño y SKU son obligatorios.');
      return;
    }
    if (variantPrice < 0) {
      setSubmitError('El precio debe ser mayor o igual a 0.');
      return;
    }

    try {
      setCreatingVariant(true);
      setSubmitError(null);
      setMessage(null);

      const variant = await posApi.createVariant({
        product_id: variantProductId,
        size: variantSize.trim(),
        sku: variantSku.trim(),
        sale_price: variantPrice,
        active: variantActive,
      });

      addSessionVariant(variant);
      setVariantSku('');
      setVariantPrice(0);
      setVariantActive(true);
      setMessage(`Variante #${variant.id} creada correctamente.`);
      await refreshCatalog();
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : 'No se pudo crear la variante',
      );
    } finally {
      setCreatingVariant(false);
    }
  }

  return (
    <div className="grid gap-4">
      <div className="grid gap-4 md:grid-cols-3">
        <SummaryCard
          title="Productos"
          value={String(products.length)}
          hint="Catalogo real cargado desde backend"
          icon={<PackagePlus size={18} />}
        />
        <SummaryCard
          title="Variantes"
          value={String(variants.length)}
          hint="Listas para POS y combos"
          icon={<Shapes size={18} />}
        />
        <SummaryCard
          title="Cobertura"
          value={products.length > 0 ? 'Activa' : 'Pendiente'}
          hint="Pantalla preparada para futura edicion y baja"
          icon={<Layers3 size={18} />}
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
            <p className="text-sm text-slate-400">Gestion de productos</p>
            <h2 className="font-display text-2xl font-bold text-white">Crear producto</h2>
            <div className="mt-5 grid gap-4">
              <Input
                label="Nombre"
                value={productName}
                onChange={(event) => setProductName(event.target.value)}
                placeholder="Latte avellana"
              />

              <label className="block space-y-2">
                <span className="text-sm font-medium text-slate-200">
                  Descripcion
                </span>
                <textarea
                  value={productDescription}
                  onChange={(event) => setProductDescription(event.target.value)}
                  placeholder="Campo visual preparado para la siguiente fase de backend."
                  className="min-h-28 w-full rounded-2xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-teal-400/70"
                />
                <span className="text-xs text-slate-500">
                  Aun no se envia al backend. Solo se persisten `name` y `active`.
                </span>
              </label>

              <Input
                label="Categoria"
                value={productCategory}
                onChange={(event) => setProductCategory(event.target.value)}
                hint="Preparado visualmente para una futura fase de catalogacion."
              />

              <label className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-950/50 px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-white">Activo</p>
                  <p className="text-xs text-slate-500">
                    Se envia al backend en el alta actual.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={productActive}
                  onChange={(event) => setProductActive(event.target.checked)}
                  className="h-5 w-5 rounded border-slate-600 bg-slate-900 text-teal-400"
                />
              </label>

              <div className="flex gap-3">
                <Button
                  disabled={creatingProduct || !productName.trim()}
                  onClick={handleCreateProduct}
                >
                  {creatingProduct ? 'Guardando...' : 'Crear producto'}
                </Button>
                <Button variant="secondary" disabled>
                  Editar proximamente
                </Button>
              </div>
            </div>
          </Card>

          <Card>
            <p className="text-sm text-slate-400">Gestion de variantes</p>
            <h2 className="font-display text-2xl font-bold text-white">Crear variante</h2>
            <div className="mt-5 grid gap-4">
              <label className="block space-y-2">
                <span className="text-sm font-medium text-slate-200">Producto</span>
                <select
                  value={variantProductId}
                  onChange={(event) => setVariantProductId(Number(event.target.value))}
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-sm text-slate-100 outline-none focus:border-teal-400/70"
                >
                  {products.length === 0 ? (
                    <option value={0}>Sin productos cargados</option>
                  ) : (
                    products.map((product) => (
                      <option key={product.id} value={product.id}>
                        #{product.id} · {product.name}
                      </option>
                    ))
                  )}
                </select>
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label="Tamano"
                  value={variantSize}
                  onChange={(event) => setVariantSize(event.target.value)}
                />
                <Input
                  label="SKU"
                  value={variantSku}
                  onChange={(event) => setVariantSku(event.target.value)}
                />
              </div>

              <Input
                type="number"
                min={0}
                label="Precio de venta"
                value={variantPrice}
                onChange={(event) => setVariantPrice(Number(event.target.value))}
              />

              <label className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-950/50 px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-white">Activa</p>
                  <p className="text-xs text-slate-500">
                    Las variantes inactivas no deben ir al POS.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={variantActive}
                  onChange={(event) => setVariantActive(event.target.checked)}
                  className="h-5 w-5 rounded border-slate-600 bg-slate-900 text-teal-400"
                />
              </label>

              <div className="flex gap-3">
                <Button
                  disabled={creatingVariant || products.length === 0}
                  onClick={handleCreateVariant}
                >
                  {creatingVariant ? 'Guardando...' : 'Crear variante'}
                </Button>
                <Button variant="secondary" disabled>
                  Duplicar proximamente
                </Button>
              </div>
            </div>
          </Card>
        </div>

        <div className="grid gap-4">
          <Card>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm text-slate-400">Listado real</p>
                <h2 className="font-display text-2xl font-bold text-white">
                  Productos
                </h2>
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
            ) : enrichedProducts.length === 0 ? (
              <div className="mt-6">
                <EmptyState
                  title="Sin productos cargados"
                  description="Usa el formulario de la izquierda para crear el primer producto del catalogo."
                />
              </div>
            ) : (
              <div className="mt-6 grid gap-4">
                {enrichedProducts.map((product) => (
                  <div
                    key={product.id}
                    className="rounded-3xl border border-slate-800 bg-slate-950/50 p-5"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <div className="flex items-center gap-3">
                          <p className="font-display text-xl font-bold text-white">
                            {product.name}
                          </p>
                          <span
                            className={`rounded-full px-3 py-1 text-xs ${
                              product.active
                                ? 'bg-emerald-500/15 text-emerald-300'
                                : 'bg-slate-700/60 text-slate-300'
                            }`}
                          >
                            {product.active ? 'Activo' : 'Inactivo'}
                          </span>
                        </div>
                        <p className="mt-2 text-sm text-slate-500">
                          ID {product.id} · {product.relatedVariants.length} variantes asociadas
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="ghost" disabled>
                          Editar
                        </Button>
                        <Button variant="ghost" disabled>
                          Desactivar
                        </Button>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {product.relatedVariants.length === 0 ? (
                        <span className="text-sm text-slate-500">
                          Sin variantes asociadas aun.
                        </span>
                      ) : (
                        product.relatedVariants.map((variant) => (
                          <span
                            key={variant.id}
                            className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-300"
                          >
                            #{variant.id} · {variant.size} · {variant.sku}
                          </span>
                        ))
                      )}
                    </div>
                  </div>
                ))}
              </div>
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
                    className="h-20 animate-pulse rounded-3xl border border-slate-800 bg-slate-950/50"
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
              <div className="mt-6 overflow-hidden rounded-3xl border border-slate-800">
                <div className="grid grid-cols-[80px_minmax(0,1.4fr)_100px_150px_140px_110px] gap-3 bg-slate-900/80 px-4 py-3 text-xs uppercase tracking-[0.18em] text-slate-500">
                  <span>ID</span>
                  <span>Producto</span>
                  <span>Size</span>
                  <span>SKU</span>
                  <span>Precio</span>
                  <span>Estado</span>
                </div>
                {variants.map((variant) => (
                  <div
                    key={variant.id}
                    className="grid grid-cols-[80px_minmax(0,1.4fr)_100px_150px_140px_110px] gap-3 border-t border-slate-800 bg-slate-950/50 px-4 py-4 text-sm text-slate-200"
                  >
                    <span className="text-slate-400">#{variant.id}</span>
                    <div className="min-w-0">
                      <p className="truncate font-medium text-white">
                        {variant.product_name}
                      </p>
                      <p className="truncate text-xs text-slate-500">
                        product_id {variant.product_id}
                      </p>
                    </div>
                    <span>{variant.size}</span>
                    <span className="truncate">{variant.sku}</span>
                    <span>{formatCurrency(Number(variant.sale_price))}</span>
                    <span
                      className={
                        variant.active ? 'text-emerald-300' : 'text-slate-400'
                      }
                    >
                      {variant.active ? 'Activa' : 'Inactiva'}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {variants.length > 0 ? (
              <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950/40 px-4 py-3 text-xs text-slate-500">
                La pantalla queda preparada para futuras acciones de editar, desactivar o
                reasignar variantes sin cambiar la estructura visual.
              </div>
            ) : null}
          </Card>
        </div>
      </div>
    </div>
  );
}
