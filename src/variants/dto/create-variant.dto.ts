import { IsBoolean, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateVariantDto {
  @IsInt()
  product_id!: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(15, {
    message: 'size must be shorter than or equal to 15 characters',
  })
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
