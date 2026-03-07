import { IsBoolean, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateVariantDto {
  @IsInt()
  product_id!: number;

  @IsString()
  @IsNotEmpty()
  size!: string;

  @IsString()
  @IsNotEmpty()
  sku!: string;

  @IsNumber()
  sale_price!: number;

  @IsBoolean()
  @IsOptional()
  active?: boolean;
}
