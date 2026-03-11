import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsInt, IsNumber, Min, ValidateNested } from 'class-validator';

export class ComboItemDto {
  @IsInt()
  variant_id!: number;

  @IsNumber()
  @Min(0.001)
  qty!: number;
}

export class UpsertComboItemsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ComboItemDto)
  items!: ComboItemDto[];
}
