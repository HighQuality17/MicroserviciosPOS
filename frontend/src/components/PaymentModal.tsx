import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Modal } from '@/components/Modal';
import type { PaymentMethod } from '@/types/api';
import { formatCurrency } from '@/utils/format';
import { normalizeNumberInput, parseNumberInput } from '@/utils/numberInput';

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
  const [amountReceivedInput, setAmountReceivedInput] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setMethod('CASH');
      setAmountReceivedInput('');
      setValidationError(null);
    }
  }, [open]);

  const amountReceived =
    method === 'TRANSFER' ? total : parseNumberInput(amountReceivedInput) ?? 0;

  const change = useMemo(() => {
    if (method !== 'CASH') return 0;
    return Math.max(amountReceived - total, 0);
  }, [amountReceived, method, total]);

  async function handleConfirm() {
    if (method === 'CASH') {
      const parsedAmount = parseNumberInput(amountReceivedInput);
      if (parsedAmount === null || parsedAmount < total) {
        setValidationError('Ingresa un monto recibido válido mayor o igual al total.');
        return;
      }
    }

    setValidationError(null);
    await onConfirm({
      method,
      amount_received: method === 'TRANSFER' ? total : Number(amountReceivedInput),
    });
  }

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
                setMethod(event.target.value as PaymentMethod);
                setAmountReceivedInput('');
                setValidationError(null);
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
            placeholder={method === 'TRANSFER' ? 'Se aplica el total exacto' : 'Ej: 20000'}
            value={method === 'TRANSFER' ? '' : amountReceivedInput}
            onChange={(event) => {
              const nextValue = normalizeNumberInput(event.target.value, {
                allowDecimal: true,
              });
              if (nextValue !== null) {
                setAmountReceivedInput(nextValue);
              }
            }}
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

        {validationError ? (
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
            {validationError}
          </div>
        ) : null}

        {error ? (
          <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
            {error}
          </div>
        ) : null}

        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button disabled={loading} onClick={() => void handleConfirm()}>
            {loading ? 'Procesando...' : 'Confirmar pago'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}



