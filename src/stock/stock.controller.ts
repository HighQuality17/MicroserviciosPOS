import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { AdjustStockDto } from './dto/adjust-stock.dto';
import { GetStockQueryDto } from './dto/get-stock-query.dto';
import { StockService } from './stock.service';

@Controller('stock')
export class StockController {
  constructor(private readonly stockService: StockService) {}

  @Post('adjust')
  adjust(@Body() dto: AdjustStockDto) {
    return this.stockService.adjust(dto);
  }

  @Get()
  getByLocation(@Query() query: GetStockQueryDto) {
    return this.stockService.getByLocation(query);
  }
}
