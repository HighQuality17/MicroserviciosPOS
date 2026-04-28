import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/Button';
import { FeedbackMessage } from '@/components/FeedbackMessage';
import { Input } from '@/components/Input';
import { Modal } from '@/components/Modal';
import { Select } from '@/components/Select';
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
      id="payment-dialog"
      open={open}
      onClose={onClose}
      title="Cobrar venta"
      subtitle="Confirma el método de pago y envía la venta al backend local."
    >
      <form
        className="grid gap-5"
        onSubmit={(event) => {
          event.preventDefault();
          void handleConfirm();
        }}
      >
        <div className="surface-subtle-strong rounded-3xl p-5">
          <p className="text-sm text-[color:var(--text-secondary)]">Total a pagar</p>
          <p className="mt-2 font-display text-4xl font-bold metric-accent-strong">
            {formatCurrency(total)}
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            label="Método"
            value={method}
            onChange={(event) => {
              setMethod(event.target.value as PaymentMethod);
              setAmountReceivedInput('');
              setValidationError(null);
            }}
          >
            <option value="CASH">Efectivo</option>
            <option value="TRANSFER">Transferencia</option>
          </Select>

          <Input
            type="number"
            min={0}
            step="100"
            label="Monto recibido"
            placeholder={method === 'TRANSFER' ? 'Se aplica el total exacto' : 'Ej: 20000'}
            hint={
              method === 'TRANSFER'
                ? 'En transferencia se aplica automáticamente el total exacto.'
                : 'Ingresa el efectivo recibido para calcular el cambio.'
            }
            error={method === 'CASH' ? validationError ?? undefined : undefined}
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

        <div className="surface-subtle grid gap-3 rounded-3xl p-4 text-sm text-[color:var(--text-secondary)] sm:grid-cols-2">
          <div>
            <p className="text-[color:var(--text-faint)]">Aplicado</p>
            <p className="mt-1 font-semibold metric-accent">{formatCurrency(total)}</p>
          </div>
          <div>
            <p className="text-[color:var(--text-faint)]">Cambio</p>
            <p className="mt-1 font-semibold metric-accent">{formatCurrency(change)}</p>
          </div>
        </div>

        {error ? <FeedbackMessage tone="error">{error}</FeedbackMessage> : null}

        <div className="modal-action-row">
          <Button variant="ghost" type="button" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={loading}>
            {loading ? 'Procesando...' : 'Confirmar pago'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
