import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class UpdateComboDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  @IsOptional()
  name?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  sale_price?: number;

  @IsBoolean()
  @IsOptional()
  active?: boolean;
}
