import type { CartItem, DiscountType } from '@/types/api';

export function computeCartTotals(
  items: CartItem[],
  discountType: DiscountType,
  discountValue: number,
) {
  const subtotal = items.reduce(
    (sum, item) => sum + item.unit_price * item.qty,
    0,
  );

  let discountAmount = 0;

  if (discountType === 'PERCENT') {
    discountAmount = subtotal * (discountValue / 100);
  }

  if (discountType === 'FIXED') {
    discountAmount = Math.min(discountValue, subtotal);
  }

  const total = Math.max(subtotal - discountAmount, 0);

  return {
    subtotal,
    discountAmount,
    total,
  };
}
