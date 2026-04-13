import { Boxes, Layers3, Minus, Package2, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/Button';
import type { CartItem as CartItemType } from '@/types/api';
import { formatCurrency } from '@/utils/format';

interface CartItemProps {
  item: CartItemType;
  onChangeQty: (qty: number) => void;
  onRemove: () => void;
}

export function CartItem({ item, onChangeQty, onRemove }: CartItemProps) {
  const itemBadge = resolveCartItemBadge(item);

  return (
    <div className="surface-subtle rounded-[1.45rem] p-4">
      <div className="flex items-start gap-3">
        <div className="pos-catalog-card__media h-12 w-12 rounded-[1.1rem]" data-kind={itemBadge.kind}>
          <span className="pos-catalog-card__icon">{resolveCartItemIcon(itemBadge.kind)}</span>
          <span className="pos-catalog-card__monogram text-[0.62rem]">{itemBadge.shortLabel}</span>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium theme-text-strong">{item.name}</p>
            <span className="soft-pill rounded-full px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.14em]">
              {itemBadge.label}
            </span>
          </div>

          {item.subtitle ? (
            <p className="mt-1 text-xs leading-5 theme-text-muted">{item.subtitle}</p>
          ) : null}

          <p className="mt-2 text-xs theme-text-faint">
            Unitario {formatCurrency(item.unit_price)}
          </p>
        </div>

        <Button
          type="button"
          variant="ghost"
          onClick={onRemove}
          className="min-h-10 rounded-xl px-2.5 py-2 theme-text-secondary hover:bg-[var(--semantic-danger-background)] hover:text-[color:var(--semantic-danger-text)]"
          aria-label={
            item.subtitle
              ? 'Eliminar ' + item.name + ' ' + item.subtitle + ' del carrito'
              : 'Eliminar ' + item.name + ' del carrito'
          }
        >
          <Trash2 size={16} />
        </Button>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            className="min-h-10 rounded-xl px-3 py-2"
            onClick={() => onChangeQty(item.qty - 1)}
            aria-label={'Reducir cantidad de ' + item.name}
          >
            <Minus size={14} />
          </Button>
          <span
            className="surface-subtle-strong flex min-h-10 min-w-12 items-center justify-center rounded-xl px-3 text-sm font-semibold theme-text-strong"
            aria-live="polite"
            aria-atomic="true"
            aria-label={'Cantidad actual de ' + item.name + ': ' + item.qty}
          >
            {item.qty}
          </span>
          <Button
            variant="secondary"
            className="min-h-10 rounded-xl px-3 py-2"
            onClick={() => onChangeQty(item.qty + 1)}
            aria-label={'Aumentar cantidad de ' + item.name}
          >
            <Plus size={14} />
          </Button>
        </div>

        <div className="text-right">
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] theme-text-faint">
            Total linea
          </p>
          <p className="font-display text-lg font-bold metric-accent">
            {formatCurrency(item.unit_price * item.qty)}
          </p>
        </div>
      </div>
    </div>
  );
}

function resolveCartItemBadge(item: CartItemType) {
  if (item.item_type === 'COMBO') {
    return {
      kind: 'COMBO' as const,
      label: 'Combo',
      shortLabel: 'CB',
    };
  }

  if (item.is_operational && item.product_type === 'SIMPLE') {
    return {
      kind: 'SIMPLE' as const,
      label: 'Producto simple',
      shortLabel: 'PS',
    };
  }

  return {
    kind: 'VARIANT' as const,
    label: 'Variante',
    shortLabel: 'VR',
  };
}

function resolveCartItemIcon(kind: 'SIMPLE' | 'VARIANT' | 'COMBO') {
  if (kind === 'COMBO') {
    return <Boxes size={16} strokeWidth={1.9} />;
  }

  if (kind === 'SIMPLE') {
    return <Package2 size={16} strokeWidth={1.9} />;
  }

  return <Layers3 size={16} strokeWidth={1.9} />;
}
