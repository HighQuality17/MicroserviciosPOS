import { api, unwrap } from '@/services/api/client';
import type {
  AdminLowStockItem,
  AdminRecentActivityResponse,
  AdminSalesByPaymentResponse,
  AdminSummary,
  AdminTopItemsResponse,
  CatalogCombo,
  CatalogProduct,
  CatalogResponse,
  CatalogVariant,
  CashCurrentResponse,
  CashSession,
  Combo,
  Ingredient,
  Product,
  SaleReceipt,
  StockListResponse,
  Variant,
} from '@/types/api';

export const posApi = {
  getAdminSummary: () => unwrap<AdminSummary>(api.get('/admin/summary')),
  getAdminSalesByPayment: () =>
    unwrap<AdminSalesByPaymentResponse>(api.get('/admin/sales-by-payment')),
  getAdminTopItems: () => unwrap<AdminTopItemsResponse>(api.get('/admin/top-items')),
  getAdminLowStock: () => unwrap<AdminLowStockItem[]>(api.get('/admin/low-stock')),
  getAdminRecentActivity: () =>
    unwrap<AdminRecentActivityResponse>(api.get('/admin/recent-activity')),
  getCatalog: () => unwrap<CatalogResponse>(api.get('/catalog')),
  getProducts: () => unwrap<CatalogProduct[]>(api.get('/products')),
  getVariants: () => unwrap<CatalogVariant[]>(api.get('/variants')),
  getCombos: () => unwrap<CatalogCombo[]>(api.get('/combos')),
  getIngredients: () => unwrap<Ingredient[]>(api.get('/ingredients')),
  openCash: (payload: {
    location_id: number;
    opened_by: number;
    opening_cash: number;
  }) => unwrap<CashSession>(api.post('/cash/open', payload)),
  closeCash: (payload: {
    cash_session_id: number;
    closed_by: number;
    closing_cash_counted: number;
  }) => unwrap(api.post('/cash/close', payload)),
  getCurrentCash: (locationId: number) =>
    unwrap<CashCurrentResponse>(api.get('/cash/current', { params: { location_id: locationId } })),
  createProduct: (payload: { name: string; active?: boolean }) =>
    unwrap<Product>(api.post('/products', payload)),
  createVariant: (payload: {
    product_id: number;
    size: string;
    sku: string;
    sale_price: number;
    active?: boolean;
  }) => unwrap<Variant>(api.post('/variants', payload)),
  createIngredient: (payload: {
    name: string;
    dimension: string;
    default_unit_code: string;
  }) => unwrap<Ingredient>(api.post('/ingredients', payload)),
  adjustStock: (payload: {
    location_id: number;
    ingredient_id: number;
    qty: number;
    unit_code: string;
    reason?: string;
    user_id: number;
  }) => unwrap(api.post('/stock/adjust', payload)),
  getStock: (locationId: number) =>
    unwrap<StockListResponse>(api.get('/stock', { params: { location_id: locationId } })),
  createCombo: (payload: {
    name: string;
    sale_price: number;
    active?: boolean;
  }) => unwrap<Combo>(api.post('/combos', payload)),
  addComboItems: (comboId: number, payload: { items: Array<{ variant_id: number; qty: number }> }) =>
    unwrap(api.post(`/combos/${comboId}/items`, payload)),
  createSale: (payload: {
    location_id: number;
    cashier_id: number;
    cash_session_id: number;
    items: Array<{ item_type: 'VARIANT' | 'COMBO'; ref_id: number; qty: number }>;
    discount_type?: 'NONE' | 'PERCENT' | 'FIXED';
    discount_value?: number;
  }) => unwrap<{ id: number }>(api.post('/sales', payload)),
  paySale: (saleId: number, payload: {
    method: 'CASH' | 'TRANSFER';
    amount_received: number;
    user_id: number;
  }) => unwrap(api.post(`/sales/${saleId}/pay`, payload)),
  getSaleReceipt: (saleId: number) =>
    unwrap<SaleReceipt>(api.get(`/sales/${saleId}/receipt`)),
};
