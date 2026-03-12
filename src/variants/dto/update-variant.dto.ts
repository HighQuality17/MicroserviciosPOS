import { IsBoolean, IsNumber, IsOptional, IsString } from 'class-validator';

export class UpdateVariantDto {
  @IsString()
  @IsOptional()
  size?: string;

  @IsString()
  @IsOptional()
  sku?: string;

  @IsNumber()
  @IsOptional()
  sale_price?: number;

  @IsBoolean()
  @IsOptional()
  active?: boolean;
}
