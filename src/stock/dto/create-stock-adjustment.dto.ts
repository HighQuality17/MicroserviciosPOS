import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateIf,
} from "class-validator";
import {
  IngredientMovementReasonCode,
  IngredientMovementType,
} from "@prisma/client";

export class CreateStockAdjustmentDto {
  @IsInt()
  location_id!: number;

  @IsInt()
  ingredient_id!: number;

  @IsEnum(IngredientMovementType)
  movement_type!: IngredientMovementType;

  @IsEnum(IngredientMovementReasonCode)
  reason_code!: IngredientMovementReasonCode;

  @ValidateIf((dto) => dto.movement_type !== IngredientMovementType.ADJUSTMENT)
  @IsNumber()
  @Min(0.001)
  qty?: number;

  @IsString()
  @IsNotEmpty()
  unit_code!: string;

  @ValidateIf((dto) => dto.movement_type === IngredientMovementType.ADJUSTMENT)
  @IsNumber()
  @Min(0)
  counted_stock?: number;

  @IsOptional()
  @IsString()
  support_document?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  unit_cost_at_time?: number;

  @IsOptional()
  @IsString()
  batch_number?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
