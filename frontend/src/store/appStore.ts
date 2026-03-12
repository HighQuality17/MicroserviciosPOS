import { create } from 'zustand';
import type {
  CashSession,
  Combo,
  Ingredient,
  Location,
  Product,
  SaleReceipt,
  Variant,
} from '@/types/api';

interface AppState {
  currentLocation: Location;
  currentCashSession: CashSession | null;
  sessionProducts: Product[];
  sessionVariants: Variant[];
  sessionIngredients: Ingredient[];
  sessionCombos: Combo[];
  recentReceipts: SaleReceipt[];
  setCurrentLocation: (location: Location) => void;
  setCurrentCashSession: (session: CashSession | null) => void;
  addSessionProduct: (product: Product) => void;
  addSessionVariant: (variant: Variant) => void;
  addSessionIngredient: (ingredient: Ingredient) => void;
  addSessionCombo: (combo: Combo) => void;
  addRecentReceipt: (receipt: SaleReceipt) => void;
}

export const useAppStore = create<AppState>((set) => ({
  currentLocation: { id: 1, name: 'POS1' },
  currentCashSession: null,
  sessionProducts: [],
  sessionVariants: [],
  sessionIngredients: [],
  sessionCombos: [],
  recentReceipts: [],
  setCurrentLocation: (location) => set({ currentLocation: location }),
  setCurrentCashSession: (session) => set({ currentCashSession: session }),
  addSessionProduct: (product) =>
    set((state) => ({ sessionProducts: upsertById(state.sessionProducts, product) })),
  addSessionVariant: (variant) =>
    set((state) => ({ sessionVariants: upsertById(state.sessionVariants, variant) })),
  addSessionIngredient: (ingredient) =>
    set((state) => ({ sessionIngredients: upsertById(state.sessionIngredients, ingredient) })),
  addSessionCombo: (combo) =>
    set((state) => ({ sessionCombos: upsertById(state.sessionCombos, combo) })),
  addRecentReceipt: (receipt) =>
    set((state) => ({ recentReceipts: upsertReceipt(state.recentReceipts, receipt) })),
}));

function upsertById<T extends { id: number }>(items: T[], item: T): T[] {
  const exists = items.some((current) => current.id === item.id);
  if (!exists) return [item, ...items];
  return items.map((current) => (current.id === item.id ? item : current));
}

function upsertReceipt(items: SaleReceipt[], receipt: SaleReceipt): SaleReceipt[] {
  const exists = items.some((current) => current.sale_id === receipt.sale_id);
  if (!exists) return [receipt, ...items];
  return items.map((current) =>
    current.sale_id === receipt.sale_id ? receipt : current,
  );
}
