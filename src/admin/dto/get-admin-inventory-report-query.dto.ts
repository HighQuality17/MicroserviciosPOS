import { Transform } from "class-transformer";
import { IsDateString, IsEnum, IsInt, IsOptional, Min } from "class-validator";
import { IngredientMovementType } from "@prisma/client";

function toOptionalNumber(value: unknown) {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isNaN(parsed) ? value : parsed;
}

export class GetAdminInventoryReportQueryDto {
  @IsDateString()
  from!: string;

  @IsDateString()
  to!: string;

  @Transform(({ value }) => toOptionalNumber(value))
  @IsInt()
  @Min(1)
  @IsOptional()
  locationId?: number;

  @Transform(({ value }) => toOptionalNumber(value))
  @IsInt()
  @Min(1)
  @IsOptional()
  ingredientId?: number;

  @IsEnum(IngredientMovementType)
  @IsOptional()
  movementType?: IngredientMovementType;
}
