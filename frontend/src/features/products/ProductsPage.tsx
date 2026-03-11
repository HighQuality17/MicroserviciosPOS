import { useMemo, useState } from 'react';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { Input } from '@/components/Input';
import { posApi } from '@/services/api/posApi';
import { useAppStore } from '@/store/appStore';

export function ProductsPage() {
  const sessionProducts = useAppStore((state) => state.sessionProducts);
  const sessionVariants = useAppStore((state) => state.sessionVariants);
  const addSessionProduct = useAppStore((state) => state.addSessionProduct);
  const addSessionVariant = useAppStore((state) => state.addSessionVariant);

  const [productName, setProductName] = useState('');
  const [variantProductId, setVariantProductId] = useState(1);
  const [variantSize, setVariantSize] = useState('12oz');
  const [variantSku, setVariantSku] = useState('');
  const [variantPrice, setVariantPrice] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const productsById = useMemo(
    () => new Map(sessionProducts.map((product) => [product.id, product])),
    [sessionProducts],
  );

  async function handleCreateProduct() {
    try {
      setLoading(true);
      setError(null);
      const product = await posApi.createProduct({ name: productName, active: true });
      addSessionProduct(product);
      setProductName('');
      setMessage(`Producto #${product.id} creado.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear producto');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateVariant() {
    try {
      setLoading(true);
      setError(null);
      const variant = await posApi.createVariant({
        product_id: variantProductId,
        size: variantSize,
        sku: variantSku,
        sale_price: variantPrice,
      });
      addSessionVariant(variant);
      setVariantSku('');
      setVariantPrice(0);
      setMessage(`Variante #${variant.id} creada.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear variante');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[420px_minmax(0,1fr)]">
      <div className="grid gap-4">
        <Card>
          <p className="text-sm text-slate-400">Alta rápida</p>
          <h2 className="font-display text-2xl font-bold text-white">Crear producto</h2>
          <div className="mt-5 grid gap-4">
            <Input
              label="Nombre"
              value={productName}
              onChange={(event) => setProductName(event.target.value)}
              placeholder="Latte Vainilla"
            />
            <Button disabled={loading || !productName.trim()} onClick={handleCreateProduct}>
              Crear producto
            </Button>
          </div>
        </Card>

        <Card>
          <p className="text-sm text-slate-400">Alta rápida</p>
          <h2 className="font-display text-2xl font-bold text-white">Crear variante</h2>
          <div className="mt-5 grid gap-4">
            <Input
              type="number"
              label="product_id"
              value={variantProductId}
              onChange={(event) => setVariantProductId(Number(event.target.value))}
            />
            <Input label="Tamaño" value={variantSize} onChange={(event) => setVariantSize(event.target.value)} />
            <Input label="SKU" value={variantSku} onChange={(event) => setVariantSku(event.target.value)} />
            <Input
              type="number"
              label="Precio"
              value={variantPrice}
              onChange={(event) => setVariantPrice(Number(event.target.value))}
            />
            <Button disabled={loading || !variantSku.trim()} onClick={handleCreateVariant}>
              Crear variante
            </Button>
          </div>
        </Card>

        {message ? <div className="rounded-3xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">{message}</div> : null}
        {error ? <div className="rounded-3xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</div> : null}
      </div>

      <Card>
        <p className="text-sm text-slate-400">Catálogo de sesión</p>
        <h2 className="font-display text-2xl font-bold text-white">Productos y variantes</h2>
        <p className="mt-2 text-sm text-slate-500">
          El backend actual no expone GET de productos ni variantes. Esta tabla refleja lo creado desde esta sesión.
        </p>

        <div className="mt-6 grid gap-4">
          {sessionVariants.length === 0 ? (
            <EmptyState
              title="Sin variantes en memoria"
              description="Crea productos y variantes aquí; el POS puede consumirlas en esta misma sesión."
            />
          ) : (
            sessionVariants.map((variant) => (
              <div key={variant.id} className="rounded-3xl border border-slate-800 bg-slate-950/50 p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-medium text-white">
                      {productsById.get(variant.productId)?.name ?? `Producto ${variant.productId}`}
                    </p>
                    <p className="mt-1 text-sm text-slate-400">
                      {variant.size} · {variant.sku}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-display text-xl font-bold text-teal-300">
                      ${Number(variant.salePrice).toLocaleString('es-CO')}
                    </p>
                    <p className="text-xs text-slate-500">ID {variant.id}</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
