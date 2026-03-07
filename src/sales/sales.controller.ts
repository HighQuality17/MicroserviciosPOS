import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
} from '@nestjs/common';
import { CreateSaleDto } from './dto/create-sale.dto';
import { PaySaleDto } from './dto/pay-sale.dto';
import { SalesService } from './sales.service';

@Controller('sales')
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @Post()
  create(@Body() dto: CreateSaleDto) {
    return this.salesService.create(dto);
  }

  @Post(':id/pay')
  pay(@Param('id', ParseIntPipe) id: number, @Body() dto: PaySaleDto) {
    return this.salesService.pay(id, dto);
  }

  @Get(':id/receipt')
  receipt(@Param('id', ParseIntPipe) id: number) {
    return this.salesService.receipt(id);
  }
}
