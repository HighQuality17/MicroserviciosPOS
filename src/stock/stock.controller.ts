import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AdjustStockDto } from './dto/adjust-stock.dto';
import { GetStockQueryDto } from './dto/get-stock-query.dto';
import { StockService } from './stock.service';

@Controller('stock')
@UseGuards(JwtAuthGuard, RolesGuard)
export class StockController {
  constructor(private readonly stockService: StockService) {}

  @Post('adjust')
  @Roles(UserRole.ADMIN)
  adjust(@Body() dto: AdjustStockDto) {
    return this.stockService.adjust(dto);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.AUDITOR)
  getByLocation(@Query() query: GetStockQueryDto) {
    return this.stockService.getByLocation(query);
  }
}
