import { IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { VariantRecipeItemDto } from './upsert-variant-recipe.dto';

export class ReplaceVariantRecipeDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VariantRecipeItemDto)
  items!: VariantRecipeItemDto[];
}
