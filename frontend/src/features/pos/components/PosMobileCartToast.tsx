import { ChevronRight, ShoppingCart } from 'lucide-react';
import { Toast } from '@/components/Toast';
import { formatCurrency } from '@/utils/format';

export interface PosMobileCartToastData {
  itemName: string;
  itemCount: number;
  subtotal: number;
}

interface PosMobileCartToastProps {
  toast: PosMobileCartToastData | null;
  cartSheetId: string;
  onOpenCart: () => void;
}

export function PosMobileCartToast({
  toast,
  cartSheetId,
  onOpenCart,
}: PosMobileCartToastProps) {
  if (!toast) {
    return null;
  }

  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      className="pointer-events-none fixed inset-x-4 bottom-24 z-40 sm:hidden"
    >
      <button
        type="button"
        onClick={onOpenCart}
        aria-haspopup="dialog"
        aria-controls={cartSheetId}
        className="pointer-events-auto w-full text-left"
      >
        <Toast tone="info" className="pos-mobile-cart-toast rounded-[1.45rem] px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="pos-mobile-cart-toast__icon" aria-hidden="true">
              <ShoppingCart size={17} strokeWidth={2} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold theme-text-strong">Agregado al carrito</p>
              <p className="truncate text-sm theme-text-secondary">{toast.itemName}</p>
              <div className="pos-mobile-cart-toast__meta">
                <span>{formatItemCount(toast.itemCount)}</span>
                <span aria-hidden="true">•</span>
                <span>
                  Subtotal <strong>{formatCurrency(toast.subtotal)}</strong>
                </span>
              </div>
            </div>
            <ChevronRight size={18} className="shrink-0 theme-text-secondary" aria-hidden="true" />
          </div>
        </Toast>
      </button>
    </div>
  );
}

function formatItemCount(value: number) {
  return value === 1 ? '1 item' : `${value} items`;
}
