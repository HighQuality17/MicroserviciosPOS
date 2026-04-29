import { Transform } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

function toOptionalNumber(value: unknown) {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isNaN(parsed) ? value : parsed;
}

export class GetAdminActivityQueryDto {
  @Transform(({ value }) => toOptionalNumber(value) ?? 1)
  @IsInt()
  @Min(1)
  page = 1;

  @Transform(({ value }) => toOptionalNumber(value) ?? 8)
  @IsInt()
  @Min(1)
  @Max(50)
  limit = 8;

  @IsOptional()
  @IsIn(['ALL', 'CASH', 'SALES', 'INVENTORY', 'CONFIG'])
  category?: 'ALL' | 'CASH' | 'SALES' | 'INVENTORY' | 'CONFIG';

  @IsOptional()
  @IsString()
  q?: string;
}
