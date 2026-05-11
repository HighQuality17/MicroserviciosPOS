import { ProductType, TaxCategory, VatType } from '@prisma/client';
import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

export class UpdateProductDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  @IsOptional()
  name?: string;

  @IsString()
  @MaxLength(80)
  @IsOptional()
  internalCode?: string | null;

  @IsString()
  @MaxLength(80)
  @IsOptional()
  barcode?: string | null;

  @IsString()
  @MaxLength(120)
  @IsOptional()
  supplierReference?: string | null;

  @IsString()
  @MaxLength(1000)
  @IsOptional()
  description?: string | null;

  @IsString()
  @MaxLength(80)
  @IsOptional()
  brand?: string | null;

  @IsString()
  @MaxLength(15, {
    message: 'simplePresentation must be shorter than or equal to 15 characters',
  })
  @IsOptional()
  simplePresentation?: string | null;

  @IsEnum(ProductType)
  @IsOptional()
  productType?: ProductType;

  @IsString()
  @Matches(/^\d{8}$/, {
    message: 'unspscCode must be an 8-digit UNSPSC code',
  })
  @IsOptional()
  unspscCode?: string | null;

  @IsEnum(VatType)
  @IsOptional()
  vatType?: VatType | null;

  @IsEnum(TaxCategory)
  @IsOptional()
  taxCategory?: TaxCategory | null;

  @IsString()
  @MaxLength(20)
  @IsOptional()
  unitMeasure?: string | null;

  @IsBoolean()
  @IsOptional()
  isService?: boolean;

  @IsBoolean()
  @IsOptional()
  applyInc?: boolean;

  @IsBoolean()
  @IsOptional()
  active?: boolean;
}
