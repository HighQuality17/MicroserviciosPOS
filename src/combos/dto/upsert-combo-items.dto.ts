import { Type } from 'class-transformer';
import { IsArray, IsInt, IsNumber, Min, ValidateNested } from 'class-validator';

export class ComboItemDto {
  @IsInt()
  variant_id!: number;

  @IsNumber()
  @Min(0.001)
  qty!: number;
}

export class UpsertComboItemsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ComboItemDto)
  items!: ComboItemDto[];
}
