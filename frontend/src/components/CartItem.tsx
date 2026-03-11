import { Minus, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/Button';
import type { CartItem as CartItemType } from '@/types/api';
import { formatCurrency } from '@/utils/format';

interface CartItemProps {
  item: CartItemType;
  onChangeQty: (qty: number) => void;
  onRemove: () => void;
}

export function CartItem({ item, onChangeQty, onRemove }: CartItemProps) {
  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-950/50 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-medium text-white">{item.name}</p>
          {item.subtitle ? <p className="mt-1 text-xs text-slate-500">{item.subtitle}</p> : null}
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="rounded-xl p-2 text-slate-500 transition hover:bg-rose-500/10 hover:text-rose-300"
        >
          <Trash2 size={16} />
        </button>
      </div>
      <div className="mt-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="secondary" className="px-3 py-2" onClick={() => onChangeQty(item.qty - 1)}>
            <Minus size={14} />
          </Button>
          <span className="w-10 text-center text-sm font-semibold text-white">{item.qty}</span>
          <Button variant="secondary" className="px-3 py-2" onClick={() => onChangeQty(item.qty + 1)}>
            <Plus size={14} />
          </Button>
        </div>
        <p className="font-display text-lg font-bold text-teal-300">
          {formatCurrency(item.unit_price * item.qty)}
        </p>
      </div>
    </div>
  );
}
