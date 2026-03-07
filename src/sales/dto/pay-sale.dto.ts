import { PaymentMethod } from '@prisma/client';
import { IsEnum, IsInt, IsNumber, Min } from 'class-validator';

export class PaySaleDto {
  @IsEnum(PaymentMethod)
  method!: PaymentMethod;

  @IsNumber()
  @Min(0)
  amount_received!: number;

  @IsInt()
  user_id!: number;
}
