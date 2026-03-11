import { create } from 'zustand';
import type { CartItem, DiscountType } from '@/types/api';

interface CartState {
  items: CartItem[];
  discountType: DiscountType;
  discountValue: number;
  addItem: (item: Omit<CartItem, 'qty' | 'key'> & { qty?: number }) => void;
  updateQty: (key: string, qty: number) => void;
  removeItem: (key: string) => void;
  clearCart: () => void;
  setDiscount: (discountType: DiscountType, discountValue: number) => void;
}

export const useCartStore = create<CartState>((set) => ({
  items: [],
  discountType: 'NONE',
  discountValue: 0,
  addItem: (item) =>
    set((state) => {
      const key = `${item.item_type}-${item.ref_id}`;
      const existing = state.items.find((cartItem) => cartItem.key === key);

      if (existing) {
        return {
          items: state.items.map((cartItem) =>
            cartItem.key === key
              ? { ...cartItem, qty: cartItem.qty + (item.qty ?? 1) }
              : cartItem,
          ),
        };
      }

      return {
        items: [
          ...state.items,
          {
            ...item,
            qty: item.qty ?? 1,
            key,
          },
        ],
      };
    }),
  updateQty: (key, qty) =>
    set((state) => ({
      items: state.items
        .map((item) => (item.key === key ? { ...item, qty } : item))
        .filter((item) => item.qty > 0),
    })),
  removeItem: (key) =>
    set((state) => ({
      items: state.items.filter((item) => item.key !== key),
    })),
  clearCart: () =>
    set({
      items: [],
      discountType: 'NONE',
      discountValue: 0,
    }),
  setDiscount: (discountType, discountValue) =>
    set({
      discountType,
      discountValue,
    }),
}));
