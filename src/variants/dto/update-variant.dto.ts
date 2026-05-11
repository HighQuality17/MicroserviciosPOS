import { IsBoolean, IsNumber, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateVariantDto {
  @IsString()
  @MaxLength(15, {
    message: 'size must be shorter than or equal to 15 characters',
  })
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
