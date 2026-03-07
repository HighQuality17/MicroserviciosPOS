import {
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class AdjustStockDto {
  @IsInt()
  location_id!: number;

  @IsInt()
  ingredient_id!: number;

  @IsNumber()
  qty!: number;

  @IsString()
  @IsNotEmpty()
  unit_code!: string;

  @IsString()
  @IsOptional()
  reason?: string;

  @IsInt()
  user_id!: number;
}
