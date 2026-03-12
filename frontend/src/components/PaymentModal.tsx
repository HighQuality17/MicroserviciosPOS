import { useMemo, useState } from 'react';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Modal } from '@/components/Modal';
import type { PaymentMethod } from '@/types/api';
import { formatCurrency } from '@/utils/format';

interface PaymentModalProps {
  open: boolean;
  total: number;
  loading: boolean;
  error: string | null;
  onClose: () => void;
  onConfirm: (payload: { method: PaymentMethod; amount_received: number }) => Promise<void>;
}

export function PaymentModal({
  open,
  total,
  loading,
  error,
  onClose,
  onConfirm,
}: PaymentModalProps) {
  const [method, setMethod] = useState<PaymentMethod>('CASH');
  const [amountReceived, setAmountReceived] = useState<number>(total);

  const change = useMemo(() => {
    if (method !== 'CASH') return 0;
    return Math.max(amountReceived - total, 0);
  }, [amountReceived, method, total]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Cobrar venta"
      subtitle="Confirma el método de pago y envía la venta al backend local."
    >
      <div className="grid gap-5">
        <div className="rounded-3xl border border-slate-800 bg-slate-950/60 p-5">
          <p className="text-sm text-slate-400">Total a pagar</p>
          <p className="mt-2 font-display text-4xl font-bold text-teal-300">
            {formatCurrency(total)}
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block space-y-2">
            <span className="text-sm font-medium text-slate-200">Método</span>
            <select
              value={method}
              onChange={(event) => {
                const nextMethod = event.target.value as PaymentMethod;
                setMethod(nextMethod);
                if (nextMethod === 'TRANSFER') {
                  setAmountReceived(total);
                }
              }}
              className="w-full rounded-2xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-sm text-slate-100 outline-none focus:border-teal-400/70"
            >
              <option value="CASH">Efectivo</option>
              <option value="TRANSFER">Transferencia</option>
            </select>
          </label>

          <Input
            type="number"
            min={0}
            step="100"
            label="Monto recibido"
            value={amountReceived}
            onChange={(event) => setAmountReceived(Number(event.target.value))}
            disabled={method === 'TRANSFER'}
          />
        </div>

        <div className="grid gap-3 rounded-3xl border border-slate-800 bg-slate-950/50 p-4 text-sm text-slate-300 sm:grid-cols-2">
          <div>
            <p className="text-slate-500">Aplicado</p>
            <p className="mt-1 font-semibold text-white">{formatCurrency(total)}</p>
          </div>
          <div>
            <p className="text-slate-500">Cambio</p>
            <p className="mt-1 font-semibold text-white">{formatCurrency(change)}</p>
          </div>
        </div>

        {error ? (
          <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
            {error}
          </div>
        ) : null}

        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            disabled={loading}
            onClick={() => onConfirm({ method, amount_received: amountReceived })}
          >
            {loading ? 'Procesando...' : 'Confirmar pago'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
