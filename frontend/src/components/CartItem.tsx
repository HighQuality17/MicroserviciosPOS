import { Minus, Plus, Trash2 } from 'lucide-react';
import { IconButton } from '@/components/IconButton';
import { ProductMedia } from '@/components/ProductMedia';
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
        <ProductMedia
          label={item.name}
          kind={itemBadge.kind}
          size="sm"
          monogram={itemBadge.shortLabel}
        />

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

        <IconButton
          type="button"
          variant="ghost"
          size="sm"
          icon={<Trash2 size={16} />}
          onClick={onRemove}
          className="theme-text-secondary hover:bg-[var(--semantic-danger-background)] hover:text-[color:var(--semantic-danger-text)]"
          label={
            item.subtitle
              ? 'Eliminar ' + item.name + ' ' + item.subtitle + ' del carrito'
              : 'Eliminar ' + item.name + ' del carrito'
          }
        />
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <IconButton
            variant="secondary"
            size="sm"
            className="rounded-xl"
            onClick={() => onChangeQty(item.qty - 1)}
            label={'Reducir cantidad de ' + item.name}
            icon={<Minus size={14} />}
          />
          <span
            className="surface-subtle-strong flex min-h-10 min-w-12 items-center justify-center rounded-xl px-3 text-sm font-semibold theme-text-strong"
            aria-live="polite"
            aria-atomic="true"
            aria-label={'Cantidad actual de ' + item.name + ': ' + item.qty}
          >
            {item.qty}
          </span>
          <IconButton
            variant="secondary"
            size="sm"
            className="rounded-xl"
            onClick={() => onChangeQty(item.qty + 1)}
            label={'Aumentar cantidad de ' + item.name}
            icon={<Plus size={14} />}
          />
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

