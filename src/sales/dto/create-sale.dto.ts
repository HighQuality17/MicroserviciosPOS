import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { DiscountType, SaleItemType } from '@prisma/client';

export class CreateSaleItemDto {
  @IsEnum(SaleItemType)
  item_type!: SaleItemType;

  @IsInt()
  ref_id!: number;

  @IsNumber()
  @Min(0.001)
  qty!: number;
}

export class CreateSaleDto {
  @IsInt()
  location_id!: number;

  @IsInt()
  cashier_id!: number;

  @IsInt()
  cash_session_id!: number;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateSaleItemDto)
  items!: CreateSaleItemDto[];

  @IsEnum(DiscountType)
  @IsOptional()
  discount_type?: DiscountType;

  @IsNumber()
  @Min(0)
  @IsOptional()
  discount_value?: number;
}
