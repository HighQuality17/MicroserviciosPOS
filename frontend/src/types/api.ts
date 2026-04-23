import type { ThemeName } from "@/theme/theme";

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

export type UserRole = "ADMIN" | "CASHIER" | "AUDITOR";
export type DiscountType = "NONE" | "PERCENT" | "FIXED";
export type PaymentMethod = "CASH" | "TRANSFER";
export type SaleItemType = "VARIANT" | "COMBO";
export type IngredientDimension = "WEIGHT" | "VOLUME" | "COUNT";
export type IngredientMovementType = "ENTRY" | "EXIT" | "ADJUSTMENT";
export type IngredientMovementReasonCode =
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
export type IngredientMovementReferenceType = "MANUAL" | "SALE";
export type VatType =
  | "ZERO"
  | "EXEMPT"
  | "FIVE"
  | "NINETEEN"
  | "NOT_APPLICABLE";
export type TaxCategory =
  | "TAXED"
  | "EXEMPT"
  | "EXCLUDED"
  | "NOT_SUBJECT";
export type ProductType = "SIMPLE" | "VARIANT";
export type ComboListStatus = "ALL" | "ACTIVE" | "INACTIVE";
export type BusinessType =
  | "DESSERT_SHOP"
  | "CAFE"
  | "RESTAURANT"
  | "RETAIL"
  | "MINIMARKET"
  | "SALON"
  | "CUSTOM";
export interface User {
  id: number;
  name: string;
  role: UserRole;
}

export interface AuthUser extends User {
  username: string;
  email: string;
  themePreference: ThemeName | null;
}

export interface AuthLoginResponse {
  access_token: string;
  user: User;
}

export interface Location {
  id: number;
  name: string;
}

export interface Product {
  id: number;
  name: string;
  internalCode: string | null;
  barcode: string | null;
  supplierReference: string | null;
  description: string | null;
  brand: string | null;
  productType: ProductType;
  unspscCode: string | null;
  vatType: VatType | null;
  taxCategory: TaxCategory | null;
  unitMeasure: string | null;
  isService: boolean;
  applyInc: boolean;
  active: boolean;
  variants?: CatalogVariant[];
}

export type Variant = CatalogVariant;

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

export interface StockAdjustmentUser {
  id: number;
  name: string;
  role: UserRole;
}

export interface StockAdjustmentSale {
  id: number;
  status: string;
  total: number | string;
  createdAt: string;
}

export interface StockAdjustmentItem {
  id: number;
  ingredientId: number;
  locationId: number;
  movementType: IngredientMovementType;
  qtyBase: number | string;
  notes: string | null;
  referenceType: IngredientMovementReferenceType | null;
  referenceId: number | null;
  createdAt: string;
  adjustedByUserId: number;
  reasonCode: IngredientMovementReasonCode | null;
  supportDocument: string | null;
  unitCostAtTime: number | string | null;
  batchNumber: string | null;
  previousStock: number | string | null;
  newStock: number | string | null;
  countedStock: number | string | null;
  ingredient: Ingredient;
  location: Location;
  adjustedByUser: StockAdjustmentUser;
  sale: StockAdjustmentSale | null;
}

export interface StockAdjustmentMutationResponse {
  stock: {
    ingredientId: number;
    locationId: number;
    qtyOnHandBase: number | string;
  };
  movement: StockAdjustmentItem;
}

export interface StockAdjustmentsResponse {
  items: StockAdjustmentItem[];
  total: number;
  limit: number;
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
  cashier: Pick<User, "id" | "name">;
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
  cashier: Pick<User, "id" | "name">;
}

export interface RecentSalesResponse {
  items: SaleRecentItem[];
}

export interface LatestSaleResponse extends SaleReceipt {
  status: string;
}

export interface SalesHistoryItem {
  sale_id: number;
  created_at: string;
  total: number;
  status: string;
  payment_method: PaymentMethod | null;
  location_id: number;
  location_name: string;
  cashier_id: number;
  cashier_name: string;
}

export interface SalesHistoryResponse {
  items: SalesHistoryItem[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export interface CartItem {
  key: string;
  item_type: SaleItemType;
  ref_id: number;
  name: string;
  subtitle?: string;
  unit_price: number;
  qty: number;
  product_type?: ProductType;
  is_operational?: boolean;
}

export interface CatalogVariant {
  id: number;
  product_id: number;
  product_name: string;
  product_type: ProductType;
  is_operational: boolean;
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
  product_type: ProductType;
  is_operational: boolean;
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
  internalCode: string | null;
  barcode: string | null;
  supplierReference: string | null;
  description: string | null;
  brand: string | null;
  productType: ProductType;
  unspscCode: string | null;
  vatType: VatType | null;
  taxCategory: TaxCategory | null;
  unitMeasure: string | null;
  isService: boolean;
  applyInc: boolean;
  active: boolean;
  variants: CatalogVariant[];
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
  activity_type: "SALE" | "CASH_SESSION" | "STOCK_ADJUSTMENT";
  action: string;
  created_at: string;
  entity_id: number;
  title: string;
  subtitle: string;
}

export interface AdminRecentActivityResponse {
  items: AdminRecentActivityItem[];
}

export type AdminActivityType =
  | "CASH_OPENED"
  | "CASH_CLOSED"
  | "SALE_COMPLETED"
  | "STOCK_MOVEMENT";

export type AdminActivityEntityType =
  | "CASH_SESSION"
  | "SALE"
  | "INGREDIENT_MOVEMENT";

export interface AdminActivityActor {
  user_id: number | null;
  user_name: string | null;
}

export interface AdminActivityLocation {
  location_id: number | null;
  location_name: string | null;
}

export interface AdminActivityNavigation {
  label: string;
  path: string;
  query?: Record<string, string>;
}

export interface AdminCashOpenedActivitySummary {
  cash_session_id: number;
  opened_at: string;
  opening_cash: number;
  responsible_name: string;
  location_name: string;
}

export interface AdminCashOpenedActivityDetail extends AdminCashOpenedActivitySummary {
  location_id: number;
  responsible_id: number;
}

export interface AdminCashClosedActivitySummary {
  cash_session_id: number;
  opened_at: string;
  closed_at: string;
  opening_cash: number;
  expected: number;
  counted: number;
  difference: number;
  responsible_name: string;
  location_name: string;
}

export interface AdminCashClosedActivityDetail extends AdminCashClosedActivitySummary {
  location_id: number;
  opened_by_id: number;
  opened_by_name: string;
  closed_by_id: number;
  closed_by_name: string;
  cash_sales_total: number;
  transfer_sales_total: number;
  total_change_given: number;
  summary_snapshot: {
    opening_cash: number;
    cash_sales_total: number;
    transfer_sales_total: number;
    total_change_given: number;
    closing_cash_expected: number;
    closing_cash_counted: number;
    difference: number;
  };
}

export interface AdminSaleCompletedActivityLineItem {
  id: number;
  item_type: SaleItemType;
  ref_id: number;
  description: string;
  qty: number;
  unit_price: number;
  line_total: number;
}

export interface AdminSaleCompletedActivitySummary {
  sale_id: number;
  created_at: string;
  total: number;
  status: string;
  payment_method: PaymentMethod | null;
  responsible_name: string;
  location_name: string;
}

export interface AdminSaleCompletedActivityDetail
  extends AdminSaleCompletedActivitySummary {
  location_id: number;
  cashier_id: number;
  subtotal: number;
  discount_type: string;
  discount_value: number;
  discount_amount: number;
  amount_received: number | null;
  change_given: number | null;
  items: AdminSaleCompletedActivityLineItem[];
}

export interface AdminStockMovementActivitySummary {
  movement_id: number;
  ingredient_id: number;
  ingredient_name: string;
  movement_type: IngredientMovementType;
  reason_code: IngredientMovementReasonCode | null;
  qty_delta: number;
  location_name: string;
  responsible_name: string;
  created_at: string;
}

export interface AdminStockMovementActivityDetail
  extends AdminStockMovementActivitySummary {
  location_id: number;
  responsible_id: number;
  reference_type: IngredientMovementReferenceType | null;
  reference_id: number | null;
  notes: string | null;
  support_document: string | null;
  batch_number: string | null;
  unit_cost_at_time: number | null;
  previous_stock: number | null;
  new_stock: number | null;
  counted_stock: number | null;
}

export type AdminActivitySummary =
  | AdminCashOpenedActivitySummary
  | AdminCashClosedActivitySummary
  | AdminSaleCompletedActivitySummary
  | AdminStockMovementActivitySummary;

export type AdminActivityDetail =
  | AdminCashOpenedActivityDetail
  | AdminCashClosedActivityDetail
  | AdminSaleCompletedActivityDetail
  | AdminStockMovementActivityDetail;

export interface AdminActivityListItem {
  id: number;
  activity_type: AdminActivityType;
  entity_type: AdminActivityEntityType;
  entity_id: number;
  occurred_at: string;
  title: string;
  subtitle: string;
  actor: AdminActivityActor | null;
  location: AdminActivityLocation | null;
  summary: AdminActivitySummary;
  navigation: AdminActivityNavigation | null;
}

export interface AdminActivityDetailResponse extends AdminActivityListItem {
  detail: AdminActivityDetail;
}

export interface AdminActivityFeedResponse {
  items: AdminActivityListItem[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
  has_previous_page: boolean;
  has_next_page: boolean;
}

export interface BusinessModules {
  ingredients: boolean;
  recipes: boolean;
  combos: boolean;
  priceLists: boolean;
  fiscalFields: boolean;
  electronicInvoicing: boolean;
}

export interface BusinessConfig {
  id: number;
  businessName: string;
  legalName: string | null;
  businessType: BusinessType;
  currencyCode: string;
  timezone: string;
  countryCode: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  modules: BusinessModules;
  updatedById: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateBusinessConfigPayload {
  businessName?: string;
  legalName?: string | null;
  businessType?: BusinessType;
  currencyCode?: string;
  timezone?: string;
  countryCode?: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  modules?: Partial<BusinessModules>;
  applyPreset?: boolean;
}



