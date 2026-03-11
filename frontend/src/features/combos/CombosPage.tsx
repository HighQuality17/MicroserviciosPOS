import { useState } from 'react';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { Input } from '@/components/Input';
import { posApi } from '@/services/api/posApi';
import { useAppStore } from '@/store/appStore';

export function CombosPage() {
  const sessionCombos = useAppStore((state) => state.sessionCombos);
  const sessionVariants = useAppStore((state) => state.sessionVariants);
  const addSessionCombo = useAppStore((state) => state.addSessionCombo);

  const [comboName, setComboName] = useState('');
  const [comboPrice, setComboPrice] = useState(0);
  const [comboId, setComboId] = useState(1);
  const [variantId, setVariantId] = useState(1);
  const [qty, setQty] = useState(1);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleCreateCombo() {
    try {
      setLoading(true);
      setError(null);
      const combo = await posApi.createCombo({
        name: comboName,
        sale_price: comboPrice,
        active: true,
      });
      addSessionCombo(combo);
      setComboName('');
      setComboPrice(0);
      setMessage(`Combo #${combo.id} creado.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear combo');
    } finally {
      setLoading(false);
    }
  }

  async function handleAddComboItems() {
    try {
      setLoading(true);
      setError(null);
      await posApi.setComboItems(comboId, {
        items: [{ variant_id: variantId, qty }],
      });
      setMessage(`Items asignados al combo #${comboId}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron agregar items');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[430px_minmax(0,1fr)]">
      <div className="grid gap-4">
        <Card>
          <p className="text-sm text-slate-400">Alta rápida</p>
          <h2 className="font-display text-2xl font-bold text-white">Crear combo</h2>
          <div className="mt-5 grid gap-4">
            <Input label="Nombre" value={comboName} onChange={(event) => setComboName(event.target.value)} />
            <Input type="number" label="Precio de venta" value={comboPrice} onChange={(event) => setComboPrice(Number(event.target.value))} />
            <Button disabled={loading || !comboName.trim()} onClick={handleCreateCombo}>
              Crear combo
            </Button>
          </div>
        </Card>

        <Card>
          <p className="text-sm text-slate-400">Composición</p>
          <h2 className="font-display text-2xl font-bold text-white">Agregar items al combo</h2>
          <div className="mt-5 grid gap-4">
            <Input type="number" label="combo_id" value={comboId} onChange={(event) => setComboId(Number(event.target.value))} />
            <Input type="number" label="variant_id" value={variantId} onChange={(event) => setVariantId(Number(event.target.value))} />
            <Input type="number" label="qty" value={qty} onChange={(event) => setQty(Number(event.target.value))} />
            <Button disabled={loading} onClick={handleAddComboItems}>
              Guardar items
            </Button>
          </div>
        </Card>

        {message ? <div className="rounded-3xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">{message}</div> : null}
        {error ? <div className="rounded-3xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</div> : null}
      </div>

      <Card>
        <p className="text-sm text-slate-400">Catálogo de sesión</p>
        <h2 className="font-display text-2xl font-bold text-white">Combos</h2>
        <p className="mt-2 text-sm text-slate-500">
          No existe GET de combos todavía. Aquí se muestran los combos creados en esta sesión y las variantes disponibles para armarlos.
        </p>
        <div className="mt-6 grid gap-4">
          {sessionCombos.length === 0 ? (
            <EmptyState
              title="Sin combos cargados"
              description="Crea un combo y luego asócialo a variantes existentes por ID."
            />
          ) : (
            sessionCombos.map((combo) => (
              <div key={combo.id} className="rounded-3xl border border-slate-800 bg-slate-950/50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-white">{combo.name}</p>
                    <p className="mt-1 text-sm text-slate-400">ID {combo.id}</p>
                  </div>
                  <p className="font-display text-xl font-bold text-teal-300">
                    ${Number(combo.salePrice).toLocaleString('es-CO')}
                  </p>
                </div>
              </div>
            ))
          )}

          <div className="rounded-3xl border border-slate-800 bg-slate-950/40 p-4">
            <p className="text-sm font-medium text-white">Variantes disponibles para combos</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {sessionVariants.length === 0 ? (
                <span className="text-sm text-slate-500">Primero crea variantes en Productos.</span>
              ) : (
                sessionVariants.map((variant) => (
                  <span key={variant.id} className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-300">
                    ID {variant.id} · {variant.size}
                  </span>
                ))
              )}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
