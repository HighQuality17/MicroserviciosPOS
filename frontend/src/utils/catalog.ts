import type { CatalogVariant } from '@/types/api';

type VariantLike = Pick<
  CatalogVariant,
  'id' | 'product_name' | 'product_type' | 'is_operational' | 'size' | 'sku'
>;

export function isSimpleOperationalVariant(
  variant: Pick<CatalogVariant, 'product_type' | 'is_operational'>,
) {
  return variant.product_type === 'SIMPLE' && variant.is_operational;
}

export function formatVariantDisplayName(variant: VariantLike) {
  const parts = [variant.product_name];

  if (!isSimpleOperationalVariant(variant) && variant.size.trim()) {
    parts.push(variant.size.trim());
  }

  return parts.join(' - ').trim() || variant.product_name;
}

export function formatVariantSubtitle(
  variant: VariantLike,
  options?: { includeSkuPrefix?: boolean },
) {
  const parts: string[] = [];

  if (!isSimpleOperationalVariant(variant) && variant.size.trim()) {
    parts.push(variant.size.trim());
  }

  if (variant.sku.trim()) {
    parts.push(
      options?.includeSkuPrefix ? `SKU ${variant.sku.trim()}` : variant.sku.trim(),
    );
  }

  return parts.join(' - ');
}

export function formatVariantOptionLabel(variant: VariantLike) {
  const parts = [`#${variant.id}`, formatVariantDisplayName(variant)];

  if (variant.sku.trim()) {
    parts.push(variant.sku.trim());
  }

  return parts.join(' - ');
}
