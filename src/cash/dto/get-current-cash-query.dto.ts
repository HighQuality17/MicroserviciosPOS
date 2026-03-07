import { IsInt } from 'class-validator';

export class GetCurrentCashQueryDto {
  @IsInt()
  location_id!: number;
}
