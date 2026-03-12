export interface ApiResponse<T> {
  success: true;
  data: T;
  timestamp: string;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    statusCode: number;
    message: string | string[];
    path: string;
    timestamp: string;
  };
}

export type UserRole = 'ADMIN' | 'CASHIER' | 'AUDITOR';
export type DiscountType = 'NONE' | 'PERCENT' | 'FIXED';
export type PaymentMethod = 'CASH' | 'TRANSFER';
export type SaleItemType = 'VARIANT' | 'COMBO';
export type IngredientDimension = 'WEIGHT' | 'VOLUME' | 'COUNT';

export interface User {
  id: number;
  name: string;
  role: UserRole;
}

export interface Location {
  id: number;
  name: string;
}

export interface Product {
  id: number;
  name: string;
  active: boolean;
  variants?: CatalogVariant[];
}

export interface Variant {
  id: number;
  productId: number;
  size: string;
  sku: string;
  salePrice: number | string;
  active: boolean;
  product?: Product;
}

export interface Ingredient {
  id: number;
  name: string;
  dimension: IngredientDimension;
  defaultUnitCode: string;
}

export interface Combo {
  id: number;
  name: string;
  salePrice: number | string;
  active: boolean;
  items?: CatalogComboItem[];
}

export interface ComboItem {
  id: number;
  comboId: number;
  variantId: number;
  qty: number | string;
  variant?: Variant;
}

export interface CashSession {
  id: number;
  locationId: number;
  openedBy: number;
  openedAt: string;
  openingCash: number | string;
  closedAt: string | null;
  closingCashExpected?: number | string | null;
  closingCashCounted?: number | string | null;
}

export interface CashCurrentResponse {
  location: Location;
  current_session: CashSession | null;
}

export interface StockListItem {
  ingredientId: number;
  locationId: number;
  qtyOnHandBase: number | string;
  ingredient: Ingredient;
  location: Location;
}

export interface StockListResponse {
  location: Location;
  items: StockListItem[];
}

export interface Sale {
  id: number;
  subtotal: number | string;
  discountType: DiscountType;
  discountValue: number | string;
  discountAmount: number | string;
  total: number | string;
  status: string;
  createdAt: string;
}

export interface SaleReceiptItem {
  id: number;
  item_type: SaleItemType;
  ref_id: number;
  description: string;
  qty: number;
  unit_price: number;
  line_total: number;
}

export interface SaleReceipt {
  sale_id: number;
  created_at: string;
  location: Location;
  cashier: Pick<User, 'id' | 'name'>;
  items: SaleReceiptItem[];
  subtotal: number;
  discount_type: DiscountType;
  discount_value: number;
  discount_amount: number;
  total: number;
  payment_method: PaymentMethod | null;
  amount_received: number | null;
  change_given: number | null;
}

export interface SaleRecentItem {
  sale_id: number;
  created_at: string;
  total: number;
  status: string;
  payment_method: PaymentMethod | null;
  amount_received: number | null;
  change_given: number | null;
  location: Location;
  cashier: Pick<User, 'id' | 'name'>;
}

export interface RecentSalesResponse {
  items: SaleRecentItem[];
}

export interface LatestSaleResponse extends SaleReceipt {
  status: string;
}

export interface CartItem {
  key: string;
  item_type: SaleItemType;
  ref_id: number;
  name: string;
  subtitle?: string;
  unit_price: number;
  qty: number;
}

export interface CatalogVariant {
  id: number;
  product_id: number;
  product_name: string;
  size: string;
  sku: string;
  sale_price: number;
  active: boolean;
}

export interface VariantRecipeItem {
  ingredient_id: number;
  ingredient_name: string;
  dimension: IngredientDimension;
  default_unit_code: string;
  qty_base_required: number;
}

export interface VariantRecipe {
  variant_id: number;
  product_id: number;
  product_name: string;
  size: string;
  active: boolean;
  has_recipe: boolean;
  items: VariantRecipeItem[];
}

export interface CatalogComboItem {
  id: number;
  combo_id: number;
  variant_id: number;
  qty: number;
  variant: CatalogVariant;
}

export interface CatalogCombo {
  id: number;
  name: string;
  sale_price: number;
  active: boolean;
  items: CatalogComboItem[];
}

export interface CatalogProduct {
  id: number;
  name: string;
  active: boolean;
  variants: Array<{
    id: number;
    product_id: number;
    size: string;
    sku: string;
    sale_price: number;
    active: boolean;
  }>;
}

export interface CatalogResponse {
  products: CatalogProduct[];
  variants: CatalogVariant[];
  combos: CatalogCombo[];
}

export interface AdminSummary {
  sales_today_total: number;
  sales_count: number;
  average_ticket: number;
  current_cash_session: {
    id: number;
    location_id: number;
    location_name: string;
    opened_by: number;
    opened_by_name: string;
    opened_at: string;
    opening_cash: number;
  } | null;
  active_products_count: number;
  low_stock_count: number;
}

export interface AdminSalesByPaymentItem {
  method: PaymentMethod;
  total: number;
}

export interface AdminSalesByPaymentResponse {
  items: AdminSalesByPaymentItem[];
}

export interface AdminTopItem {
  name: string;
  item_type: SaleItemType;
  qty_sold: number;
}

export interface AdminTopItemsResponse {
  items: AdminTopItem[];
}

export interface AdminLowStockItem {
  ingredient_id: number;
  ingredient_name: string;
  dimension: IngredientDimension;
  location_id: number;
  location_name: string;
  qty_on_hand_base: number;
  threshold: number;
}

export interface AdminRecentActivityItem {
  activity_type: 'SALE' | 'CASH_SESSION' | 'STOCK_ADJUSTMENT';
  action: string;
  created_at: string;
  entity_id: number;
  title: string;
  subtitle: string;
}

export interface AdminRecentActivityResponse {
  items: AdminRecentActivityItem[];
}
