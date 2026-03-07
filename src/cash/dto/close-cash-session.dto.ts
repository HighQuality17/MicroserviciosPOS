import { IsInt, IsNumber, Min } from 'class-validator';

export class CloseCashSessionDto {
  @IsInt()
  cash_session_id!: number;

  @IsInt()
  closed_by!: number;

  @IsNumber()
  @Min(0)
  closing_cash_counted!: number;
}
