import { IsIn, IsOptional } from 'class-validator';

export type LocationStatusFilter = 'ALL' | 'ACTIVE' | 'INACTIVE';

export class GetLocationsQueryDto {
  @IsOptional()
  @IsIn(['ALL', 'ACTIVE', 'INACTIVE'])
  status?: LocationStatusFilter;
}
