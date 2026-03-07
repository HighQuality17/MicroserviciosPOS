import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class VariantRecipeItemDto {
  @IsInt()
  ingredient_id!: number;

  @IsNumber()
  qty!: number;

  @IsString()
  @IsNotEmpty()
  unit_code!: string;
}

export class UpsertVariantRecipeDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => VariantRecipeItemDto)
  items!: VariantRecipeItemDto[];
}
