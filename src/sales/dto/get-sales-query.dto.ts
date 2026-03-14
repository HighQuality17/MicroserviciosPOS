import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  Max,
  Min,
} from 'class-validator';
import { PaymentMethod, SaleStatus } from '@prisma/client';

function toOptionalNumber(value: unknown) {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isNaN(parsed) ? value : parsed;
}

export class GetSalesQueryDto {
  @Transform(({ value }) => toOptionalNumber(value) ?? 1)
  @IsInt()
  @Min(1)
  page = 1;

  @Transform(({ value }) => toOptionalNumber(value) ?? 10)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 10;

  @IsEnum(SaleStatus)
  @IsOptional()
  status?: SaleStatus;

  @IsEnum(PaymentMethod)
  @IsOptional()
  payment_method?: PaymentMethod;

  @IsDateString()
  @IsOptional()
  date_from?: string;

  @IsDateString()
  @IsOptional()
  date_to?: string;

  @Transform(({ value }) => toOptionalNumber(value))
  @IsInt()
  @Min(1)
  @IsOptional()
  location_id?: number;
}
