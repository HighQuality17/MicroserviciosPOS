import { Transform } from "class-transformer";
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  Max,
  Min,
} from "class-validator";
import {
  IngredientMovementReasonCode,
  IngredientMovementType,
} from "@prisma/client";

function toOptionalInt(value: unknown) {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isNaN(parsed) ? value : parsed;
}

function toOptionalBoolean(value: unknown) {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  if (value === true || value === "true") {
    return true;
  }

  if (value === false || value === "false") {
    return false;
  }

  return value;
}

export class GetStockAdjustmentsQueryDto {
  @Transform(({ value }) => toOptionalInt(value))
  @IsOptional()
  @IsInt()
  location_id?: number;

  @Transform(({ value }) => toOptionalInt(value))
  @IsOptional()
  @IsInt()
  ingredient_id?: number;

  @IsOptional()
  @IsEnum(IngredientMovementType)
  movement_type?: IngredientMovementType;

  @IsOptional()
  @IsEnum(IngredientMovementReasonCode)
  reason_code?: IngredientMovementReasonCode;

  @Transform(({ value }) => toOptionalBoolean(value))
  @IsOptional()
  @IsBoolean()
  include_sale_movements?: boolean;

  @Transform(({ value }) => toOptionalInt(value))
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
