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
  availableLocations: Location[];
  currentLocation: Location | null;
  locationsLoading: boolean;
  locationsError: string | null;
  currentCashSession: CashSession | null;
  sessionProducts: Product[];
  sessionVariants: Variant[];
  sessionIngredients: Ingredient[];
  sessionCombos: Combo[];
  recentReceipts: SaleReceipt[];
  setAvailableLocations: (locations: Location[]) => void;
  setCurrentLocation: (location: Location | null) => void;
  setLocationsLoading: (loading: boolean) => void;
  setLocationsError: (message: string | null) => void;
  setCurrentCashSession: (session: CashSession | null) => void;
  addSessionProduct: (product: Product) => void;
  addSessionVariant: (variant: Variant) => void;
  addSessionIngredient: (ingredient: Ingredient) => void;
  addSessionCombo: (combo: Combo) => void;
  addRecentReceipt: (receipt: SaleReceipt) => void;
  resetAppState: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  availableLocations: [],
  currentLocation: null,
  locationsLoading: false,
  locationsError: null,
  currentCashSession: null,
  sessionProducts: [],
  sessionVariants: [],
  sessionIngredients: [],
  sessionCombos: [],
  recentReceipts: [],
  setAvailableLocations: (locations) =>
    set((state) => {
      const nextLocations = dedupeLocations(locations);
      const currentLocation =
        nextLocations.find((location) => location.id === state.currentLocation?.id) ??
        nextLocations[0] ??
        null;

      return {
        availableLocations: nextLocations,
        currentLocation,
        currentCashSession:
          state.currentCashSession && currentLocation
            ? state.currentCashSession.locationId === currentLocation.id
              ? state.currentCashSession
              : null
            : null,
      };
    }),
  setCurrentLocation: (location) =>
    set({
      currentLocation: location,
      currentCashSession: null,
    }),
  setLocationsLoading: (loading) => set({ locationsLoading: loading }),
  setLocationsError: (message) => set({ locationsError: message }),
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
  resetAppState: () =>
    set({
      availableLocations: [],
      currentLocation: null,
      locationsLoading: false,
      locationsError: null,
      currentCashSession: null,
      sessionProducts: [],
      sessionVariants: [],
      sessionIngredients: [],
      sessionCombos: [],
      recentReceipts: [],
    }),
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

function dedupeLocations(locations: Location[]) {
  const map = new Map<number, Location>();
  for (const location of locations) {
    map.set(location.id, location);
  }
  return Array.from(map.values());
}
