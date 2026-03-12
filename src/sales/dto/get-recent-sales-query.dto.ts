import { Transform } from 'class-transformer';
import { IsInt, Max, Min } from 'class-validator';

export class GetRecentSalesQueryDto {
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') {
      return 5;
    }

    const parsed = Number(value);
    return Number.isNaN(parsed) ? value : parsed;
  })
  @IsInt()
  @Min(1)
  @Max(20)
  limit = 5;
}
