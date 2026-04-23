import type {
  BusinessActivityEntityType,
  BusinessActivityType,
  IngredientMovementReasonCode,
  IngredientMovementReferenceType,
  IngredientMovementType,
  PaymentMethod,
  SaleItemType,
  SaleStatus,
} from '@prisma/client';

export interface ActivityActorReference {
  user_id: number | null;
  user_name: string | null;
}

export interface ActivityLocationReference {
  location_id: number | null;
  location_name: string | null;
}

export interface BusinessActivityNavigationTarget {
  label: string;
  path: string;
  query?: Record<string, string>;
}

export interface CashOpenedActivitySummary {
  cash_session_id: number;
  opened_at: string;
  opening_cash: number;
  responsible_name: string;
  location_name: string;
}

export interface CashOpenedActivityDetail extends CashOpenedActivitySummary {
  location_id: number;
  responsible_id: number;
}

export interface CashClosedActivitySummary {
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

export interface CashClosedActivityDetail extends CashClosedActivitySummary {
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

export interface SaleCompletedActivityLineItem {
  id: number;
  item_type: SaleItemType;
  ref_id: number;
  description: string;
  qty: number;
  unit_price: number;
  line_total: number;
}

export interface SaleCompletedActivitySummary {
  sale_id: number;
  created_at: string;
  total: number;
  status: SaleStatus;
  payment_method: PaymentMethod | null;
  responsible_name: string;
  location_name: string;
}

export interface SaleCompletedActivityDetail extends SaleCompletedActivitySummary {
  location_id: number;
  cashier_id: number;
  subtotal: number;
  discount_type: string;
  discount_value: number;
  discount_amount: number;
  amount_received: number | null;
  change_given: number | null;
  items: SaleCompletedActivityLineItem[];
}

export interface StockMovementActivitySummary {
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

export interface StockMovementActivityDetail extends StockMovementActivitySummary {
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

export type BusinessActivitySummaryPayload =
  | CashOpenedActivitySummary
  | CashClosedActivitySummary
  | SaleCompletedActivitySummary
  | StockMovementActivitySummary;

export type BusinessActivityDetailPayload =
  | CashOpenedActivityDetail
  | CashClosedActivityDetail
  | SaleCompletedActivityDetail
  | StockMovementActivityDetail;

export interface BusinessActivityListItem<
  TSummary extends BusinessActivitySummaryPayload = BusinessActivitySummaryPayload,
> {
  id: number;
  activity_type: BusinessActivityType;
  entity_type: BusinessActivityEntityType;
  entity_id: number;
  occurred_at: Date;
  title: string;
  subtitle: string;
  actor: ActivityActorReference | null;
  location: ActivityLocationReference | null;
  summary: TSummary;
  navigation: BusinessActivityNavigationTarget | null;
}

export interface BusinessActivityDetailItem<
  TSummary extends BusinessActivitySummaryPayload = BusinessActivitySummaryPayload,
  TDetail extends BusinessActivityDetailPayload = BusinessActivityDetailPayload,
> extends BusinessActivityListItem<TSummary> {
  detail: TDetail;
}

export interface BusinessActivityFeedResponse {
  items: BusinessActivityListItem[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
  has_previous_page: boolean;
  has_next_page: boolean;
}
