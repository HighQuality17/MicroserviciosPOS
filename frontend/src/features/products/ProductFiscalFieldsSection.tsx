import { CheckboxField } from '@/components/CheckboxField';
import { Input } from '@/components/Input';
import { Select } from '@/components/Select';
import type { TaxCategory, VatType } from '@/types/api';

export interface ProductFiscalDraft {
  unspscCode: string;
  vatType: VatType | '';
  taxCategory: TaxCategory | '';
  unitMeasure: string;
  isService: boolean;
  applyInc: boolean;
}

interface ProductFiscalFieldsSectionProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  draft: ProductFiscalDraft;
  onUnspscCodeChange: (value: string) => void;
  onVatTypeChange: (value: VatType | '') => void;
  onTaxCategoryChange: (value: TaxCategory | '') => void;
  onUnitMeasureChange: (value: string) => void;
  onIsServiceChange: (value: boolean) => void;
  onApplyIncChange: (value: boolean) => void;
}

export const vatTypeLabels: Record<VatType, string> = {
  ZERO: '0%',
  EXEMPT: 'Exento',
  FIVE: '5%',
  NINETEEN: '19%',
  NOT_APPLICABLE: 'No aplica',
};

export const taxCategoryLabels: Record<TaxCategory, string> = {
  TAXED: 'Gravado',
  EXEMPT: 'Exento',
  EXCLUDED: 'Excluido',
  NOT_SUBJECT: 'No sujeto',
};

export function ProductFiscalFieldsSection({
  open,
  onOpenChange,
  draft,
  onUnspscCodeChange,
  onVatTypeChange,
  onTaxCategoryChange,
  onUnitMeasureChange,
  onIsServiceChange,
  onApplyIncChange,
}: ProductFiscalFieldsSectionProps) {
  return (
    <div className="grid gap-4">
      <CheckboxField
        label="Datos fiscales"
        description="Opción para configurar datos fiscales de producto"
        checked={open}
        onChange={(event) => onOpenChange(event.target.checked)}
      />

      {open ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Codigo UNSPSC"
              value={draft.unspscCode}
              onChange={(event) =>
                onUnspscCodeChange(event.target.value.replace(/\D+/g, '').slice(0, 8))
              }
              placeholder="Ej: 50201706"
              inputMode="numeric"
              maxLength={8}
            />
            <Input
              label="Unidad de medida"
              value={draft.unitMeasure}
              onChange={(event) => onUnitMeasureChange(event.target.value)}
              placeholder="Ej: NIU"
              maxLength={20}
            />
            <Select
              label="Tipo IVA"
              value={draft.vatType}
              onChange={(event) => onVatTypeChange(event.target.value as VatType | '')}
            >
              <option value="">Sin configurar</option>
              {Object.entries(vatTypeLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
            <Select
              label="Categoria tributaria"
              value={draft.taxCategory}
              onChange={(event) =>
                onTaxCategoryChange(event.target.value as TaxCategory | '')
              }
            >
              <option value="">Sin configurar</option>
              {Object.entries(taxCategoryLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <CheckboxField
              label="Es servicio"
              checked={draft.isService}
              onChange={(event) => onIsServiceChange(event.target.checked)}
              wrapperClassName="h-full"
            />
            <CheckboxField
              label="Aplica INC"
              checked={draft.applyInc}
              onChange={(event) => onApplyIncChange(event.target.checked)}
              wrapperClassName="h-full"
            />
          </div>
        </>
      ) : null}
    </div>
  );
}
