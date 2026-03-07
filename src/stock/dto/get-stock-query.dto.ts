import { IsInt } from 'class-validator';

export class GetStockQueryDto {
  @IsInt()
  location_id!: number;
}
