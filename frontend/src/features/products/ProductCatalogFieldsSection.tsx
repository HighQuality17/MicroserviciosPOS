import { Input } from '@/components/Input';
import { Select } from '@/components/Select';
import { Textarea } from '@/components/Textarea';
import type { ProductType } from '@/types/api';

export interface ProductCatalogDraft {
  internalCode: string;
  barcode: string;
  supplierReference: string;
  description: string;
  brand: string;
  productType: ProductType;
}

interface ProductCatalogFieldsSectionProps {
  draft: ProductCatalogDraft;
  onInternalCodeChange: (value: string) => void;
  onBarcodeChange: (value: string) => void;
  onSupplierReferenceChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onBrandChange: (value: string) => void;
  onProductTypeChange: (value: ProductType) => void;
}

export const productTypeLabels: Record<ProductType, string> = {
  SIMPLE: 'Simple',
  VARIANT: 'Con variantes',
};

export function ProductCatalogFieldsSection({
  draft,
  onInternalCodeChange,
  onBarcodeChange,
  onSupplierReferenceChange,
  onDescriptionChange,
  onBrandChange,
  onProductTypeChange,
}: ProductCatalogFieldsSectionProps) {
  return (
    <div className="products-form-sections grid gap-4">
      <div className="products-form-group products-form-group--strong surface-subtle-strong rounded-lg p-4 sm:p-5">
        <p className="products-form-group__label text-[11px] font-semibold uppercase tracking-[0.22em] theme-text-secondary">
          Datos comerciales
        </p>
        <p className="products-form-group__description mt-2 text-sm theme-text-muted">
          Completa identificadores operativos, marca y tipo sin afectar la logica actual de variantes.
        </p>

        <div className="products-form-group__grid mt-4 grid gap-4 sm:grid-cols-2">
          <Input
            label="Codigo interno"
            wrapperClassName="products-field"
            labelClassName="products-field__label"
            className="products-field__control"
            value={draft.internalCode}
            onChange={(event) => onInternalCodeChange(event.target.value)}
            placeholder="Ej: CAF-LAT-001"
            maxLength={80}
          />
          <Input
            label="Codigo de barras"
            wrapperClassName="products-field"
            labelClassName="products-field__label"
            className="products-field__control"
            value={draft.barcode}
            onChange={(event) => onBarcodeChange(event.target.value)}
            placeholder="Ej: 7701234567890"
            maxLength={80}
          />
          <Input
            label="Marca"
            wrapperClassName="products-field"
            labelClassName="products-field__label"
            className="products-field__control"
            value={draft.brand}
            onChange={(event) => onBrandChange(event.target.value)}
            placeholder="Ej: Registry House"
            maxLength={80}
          />
          <Select
            label="Tipo de producto"
            wrapperClassName="products-field"
            labelClassName="products-field__label"
            className="products-field__control"
            value={draft.productType}
            onChange={(event) => onProductTypeChange(event.target.value as ProductType)}
          >
            {Object.entries(productTypeLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="products-form-group surface-subtle rounded-lg p-4 sm:p-5">
        <p className="products-form-group__label text-[11px] font-semibold uppercase tracking-[0.22em] theme-text-secondary">
          Detalle adicional
        </p>
        <p className="products-form-group__description mt-2 text-sm theme-text-muted">
          Referencia del proveedor y descripcion comercial opcional para enriquecer el catalogo.
        </p>

        <div className="products-form-group__grid mt-4 grid gap-4">
          <Input
            label="Referencia proveedor"
            wrapperClassName="products-field"
            labelClassName="products-field__label"
            className="products-field__control"
            value={draft.supplierReference}
            onChange={(event) => onSupplierReferenceChange(event.target.value)}
            placeholder="Ej: PROV-LAT-AV-220"
            maxLength={120}
          />
          <Textarea
            label="Descripcion"
            wrapperClassName="products-field"
            labelClassName="products-field__label"
            className="products-field__control min-h-28 resize-y"
            value={draft.description}
            onChange={(event) => onDescriptionChange(event.target.value)}
            placeholder="Resumen comercial breve, notas operativas o detalles utiles para catalogo."
            maxLength={1000}
            rows={4}
          />
        </div>
      </div>
    </div>
  );
}
