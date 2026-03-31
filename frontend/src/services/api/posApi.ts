import { api, unwrap } from "@/services/api/client";
import type { ThemeName } from "@/theme/theme";
import type {
  AdminLowStockItem,
  AdminRecentActivityResponse,
  AdminSalesByPaymentResponse,
  AdminSummary,
  AdminTopItemsResponse,
  AuthLoginResponse,
  AuthUser,
  CashCurrentResponse,
  CashSession,
  CatalogCombo,
  CatalogProduct,
  CatalogResponse,
  CatalogVariant,
  Combo,
  Ingredient,
  LatestSaleResponse,
  Location,
  Product,
  RecentSalesResponse,
  SaleReceipt,
  SalesHistoryResponse,
  StockAdjustmentMutationResponse,
  StockAdjustmentsResponse,
  StockListResponse,
  Variant,
  VariantRecipe,
} from "@/types/api";

function buildStockAdjustmentsParams(params?: {
  location_id?: number;
  ingredient_id?: number;
  movement_type?: "ENTRY" | "EXIT" | "ADJUSTMENT";
  reason_code?:
    | "PURCHASE"
    | "INITIAL_LOAD"
    | "SUPPLIER_RETURN"
    | "POSITIVE_ADJUSTMENT"
    | "WASTE"
    | "DAMAGE"
    | "INTERNAL_USE"
    | "EXPIRATION"
    | "NEGATIVE_ADJUSTMENT"
    | "PHYSICAL_COUNT"
    | "ADMIN_CORRECTION";
  include_sale_movements?: boolean;
  limit?: number;
}) {
  if (!params) {
    return undefined;
  }

  return {
    ...(Number.isInteger(params.location_id)
      ? { location_id: params.location_id }
      : {}),
    ...(Number.isInteger(params.ingredient_id)
      ? { ingredient_id: params.ingredient_id }
      : {}),
    ...(params.movement_type ? { movement_type: params.movement_type } : {}),
    ...(params.reason_code ? { reason_code: params.reason_code } : {}),
    ...(typeof params.include_sale_movements === "boolean"
      ? { include_sale_movements: params.include_sale_movements }
      : {}),
    ...(Number.isInteger(params.limit) ? { limit: params.limit } : {}),
  };
}

function buildStockAdjustmentsUrl(params?: {
  location_id?: number;
  ingredient_id?: number;
  movement_type?: "ENTRY" | "EXIT" | "ADJUSTMENT";
  reason_code?:
    | "PURCHASE"
    | "INITIAL_LOAD"
    | "SUPPLIER_RETURN"
    | "POSITIVE_ADJUSTMENT"
    | "WASTE"
    | "DAMAGE"
    | "INTERNAL_USE"
    | "EXPIRATION"
    | "NEGATIVE_ADJUSTMENT"
    | "PHYSICAL_COUNT"
    | "ADMIN_CORRECTION";
  include_sale_movements?: boolean;
  limit?: number;
}) {
  const normalized = buildStockAdjustmentsParams(params);

  if (!normalized) {
    return "/stock/adjustments";
  }

  const query = new URLSearchParams();

  for (const [key, value] of Object.entries(normalized)) {
    query.set(key, String(value));
  }

  const search = query.toString();
  return search ? `/stock/adjustments?${search}` : "/stock/adjustments";
}

export const posApi = {
  login: (payload: { email?: string; username?: string; password: string }) =>
    unwrap<AuthLoginResponse>(api.post("/auth/login", payload)),
  getMe: () => unwrap<AuthUser>(api.get("/auth/me")),
  updateMyThemePreference: (theme: ThemeName) =>
    unwrap<AuthUser>(api.patch("/auth/me/theme", { theme })),
  getAdminSummary: () => unwrap<AdminSummary>(api.get("/admin/summary")),
  getAdminSalesByPayment: () =>
    unwrap<AdminSalesByPaymentResponse>(api.get("/admin/sales-by-payment")),
  getAdminTopItems: () =>
    unwrap<AdminTopItemsResponse>(api.get("/admin/top-items")),
  getAdminLowStock: () =>
    unwrap<AdminLowStockItem[]>(api.get("/admin/low-stock")),
  getAdminRecentActivity: () =>
    unwrap<AdminRecentActivityResponse>(api.get("/admin/recent-activity")),
  getLocations: () => unwrap<Location[]>(api.get("/locations")),
  createLocation: (payload: { name: string }) =>
    unwrap<Location>(api.post("/locations", payload)),
  getCatalog: () => unwrap<CatalogResponse>(api.get("/catalog")),
  getProducts: () => unwrap<CatalogProduct[]>(api.get("/products")),
  getVariants: () => unwrap<CatalogVariant[]>(api.get("/variants")),
  getCombos: () => unwrap<CatalogCombo[]>(api.get("/combos")),
  getIngredients: () => unwrap<Ingredient[]>(api.get("/ingredients")),
  openCash: (payload: {
    location_id: number;
    opened_by: number;
    opening_cash: number;
  }) => unwrap<CashSession>(api.post("/cash/open", payload)),
  closeCash: (payload: {
    cash_session_id: number;
    closed_by: number;
    closing_cash_counted: number;
  }) => unwrap(api.post("/cash/close", payload)),
  getCurrentCash: (locationId: number) =>
    unwrap<CashCurrentResponse>(
      api.get("/cash/current", { params: { location_id: locationId } }),
    ),
  createProduct: (payload: { name: string; active?: boolean }) =>
    unwrap<Product>(api.post("/products", payload)),
  updateProduct: (
    productId: number,
    payload: { name?: string; active?: boolean },
  ) => unwrap<Product>(api.patch(`/products/${productId}`, payload)),
  updateProductStatus: (productId: number, payload: { active: boolean }) =>
    unwrap<Product>(api.patch(`/products/${productId}/status`, payload)),
  createVariant: (payload: {
    product_id: number;
    size: string;
    sku: string;
    sale_price: number;
    active?: boolean;
  }) => unwrap<Variant>(api.post("/variants", payload)),
  updateVariant: (
    variantId: number,
    payload: {
      size?: string;
      sku?: string;
      sale_price?: number;
      active?: boolean;
    },
  ) => unwrap<Variant>(api.patch(`/variants/${variantId}`, payload)),
  updateVariantStatus: (variantId: number, payload: { active: boolean }) =>
    unwrap<Variant>(api.patch(`/variants/${variantId}/status`, payload)),
  getVariantRecipe: (variantId: number) =>
    unwrap<VariantRecipe>(api.get(`/recipes/variant/${variantId}`)),
  updateVariantRecipe: (
    variantId: number,
    payload: {
      items: Array<{ ingredient_id: number; qty: number; unit_code: string }>;
    },
  ) => unwrap<VariantRecipe>(api.put(`/recipes/variant/${variantId}`, payload)),
  deleteRecipeItem: (variantId: number, ingredientId: number) =>
    unwrap<VariantRecipe>(
      api.delete(`/recipes/variant/${variantId}/items/${ingredientId}`),
    ),
  createIngredient: (payload: {
    name: string;
    dimension: string;
    default_unit_code: string;
  }) => unwrap<Ingredient>(api.post("/ingredients", payload)),
  adjustStock: (payload: {
    location_id: number;
    ingredient_id: number;
    qty: number;
    unit_code: string;
    reason?: string;
    user_id: number;
  }) => unwrap(api.post("/stock/adjust", payload)),
  createStockAdjustment: (payload: {
    location_id: number;
    ingredient_id: number;
    movement_type: "ENTRY" | "EXIT" | "ADJUSTMENT";
    reason_code:
      | "PURCHASE"
      | "INITIAL_LOAD"
      | "SUPPLIER_RETURN"
      | "POSITIVE_ADJUSTMENT"
      | "WASTE"
      | "DAMAGE"
      | "INTERNAL_USE"
      | "EXPIRATION"
      | "NEGATIVE_ADJUSTMENT"
      | "PHYSICAL_COUNT"
      | "ADMIN_CORRECTION";
    qty?: number;
    unit_code: string;
    counted_stock?: number;
    support_document?: string;
    unit_cost_at_time?: number;
    batch_number?: string;
    notes?: string;
  }) =>
    unwrap<StockAdjustmentMutationResponse>(
      api.post("/stock/adjustments", payload),
    ),
  getStock: (locationId: number) =>
    unwrap<StockListResponse>(
      api.get("/stock", { params: { location_id: locationId } }),
    ),
  getStockAdjustments: (params?: {
    location_id?: number;
    ingredient_id?: number;
    movement_type?: "ENTRY" | "EXIT" | "ADJUSTMENT";
    reason_code?:
      | "PURCHASE"
      | "INITIAL_LOAD"
      | "SUPPLIER_RETURN"
      | "POSITIVE_ADJUSTMENT"
      | "WASTE"
      | "DAMAGE"
      | "INTERNAL_USE"
      | "EXPIRATION"
      | "NEGATIVE_ADJUSTMENT"
      | "PHYSICAL_COUNT"
      | "ADMIN_CORRECTION";
    include_sale_movements?: boolean;
    limit?: number;
  }) =>
    unwrap<StockAdjustmentsResponse>(api.get(buildStockAdjustmentsUrl(params))),
  getStockAdjustmentById: (movementId: number) =>
    unwrap(api.get(`/stock/adjustments/${movementId}`)),
  createCombo: (payload: {
    name: string;
    sale_price: number;
    active?: boolean;
  }) => unwrap<Combo>(api.post("/combos", payload)),
  addComboItems: (
    comboId: number,
    payload: { items: Array<{ variant_id: number; qty: number }> },
  ) => unwrap(api.post(`/combos/${comboId}/items`, payload)),
  createSale: (payload: {
    location_id: number;
    cashier_id: number;
    cash_session_id: number;
    items: Array<{
      item_type: "VARIANT" | "COMBO";
      ref_id: number;
      qty: number;
    }>;
    discount_type?: "NONE" | "PERCENT" | "FIXED";
    discount_value?: number;
  }) => unwrap<{ id: number }>(api.post("/sales", payload)),
  paySale: (
    saleId: number,
    payload: {
      method: "CASH" | "TRANSFER";
      amount_received: number;
      user_id: number;
    },
  ) => unwrap(api.post(`/sales/${saleId}/pay`, payload)),
  getSales: (params?: {
    page?: number;
    limit?: number;
    status?: "PENDING" | "PAID" | "VOID";
    payment_method?: "CASH" | "TRANSFER";
    date_from?: string;
    date_to?: string;
    location_id?: number;
  }) => unwrap<SalesHistoryResponse>(api.get("/sales", { params })),
  getRecentSales: (limit = 5) =>
    unwrap<RecentSalesResponse>(
      api.get("/sales/recent", { params: { limit } }),
    ),
  getLatestSale: () =>
    unwrap<LatestSaleResponse | null>(api.get("/sales/latest")),
  getSaleReceipt: (saleId: number) =>
    unwrap<SaleReceipt>(api.get(`/sales/${saleId}/receipt`)),
};

