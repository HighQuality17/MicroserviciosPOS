import { Dimension } from '@prisma/client';
import { IsEnum, IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateIngredientDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @IsEnum(Dimension)
  dimension!: Dimension;

  @IsString()
  @IsNotEmpty()
  default_unit_code!: string;
}
