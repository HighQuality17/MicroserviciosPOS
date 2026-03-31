import { TaxCategory, VatType } from '@prisma/client';
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
