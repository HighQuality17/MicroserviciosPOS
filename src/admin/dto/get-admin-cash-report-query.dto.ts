import { Transform } from "class-transformer";
import { IsDateString, IsIn, IsInt, IsOptional, Min } from "class-validator";

export type CashReportStatusFilter = "ALL" | "OPEN" | "CLOSED";

function toOptionalNumber(value: unknown) {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isNaN(parsed) ? value : parsed;
}

export class GetAdminCashReportQueryDto {
  @IsDateString()
  from!: string;

  @IsDateString()
  to!: string;

  @Transform(({ value }) => toOptionalNumber(value))
  @IsInt()
  @Min(1)
  @IsOptional()
  locationId?: number;

  @IsIn(["ALL", "OPEN", "CLOSED"])
  @IsOptional()
  status?: CashReportStatusFilter;
}
