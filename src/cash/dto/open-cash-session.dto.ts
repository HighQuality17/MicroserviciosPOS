import { IsInt, IsNumber, Min } from 'class-validator';

export class OpenCashSessionDto {
  @IsInt()
  location_id!: number;

  @IsInt()
  opened_by!: number;

  @IsNumber()
  @Min(0)
  opening_cash!: number;
}
