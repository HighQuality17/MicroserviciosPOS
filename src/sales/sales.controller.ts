import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CreateSaleDto } from './dto/create-sale.dto';
import { GetRecentSalesQueryDto } from './dto/get-recent-sales-query.dto';
import { GetSalesQueryDto } from './dto/get-sales-query.dto';
import { PaySaleDto } from './dto/pay-sale.dto';
import { SalesService } from './sales.service';

@Controller('sales')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.CASHIER)
  create(@Body() dto: CreateSaleDto) {
    return this.salesService.create(dto);
  }

  @Post(':id/pay')
  @Roles(UserRole.ADMIN, UserRole.CASHIER)
  pay(@Param('id', ParseIntPipe) id: number, @Body() dto: PaySaleDto) {
    return this.salesService.pay(id, dto);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.CASHIER, UserRole.AUDITOR)
  findAll(@Query() query: GetSalesQueryDto) {
    return this.salesService.findAll(query);
  }

  @Get('recent')
  @Roles(UserRole.ADMIN, UserRole.CASHIER, UserRole.AUDITOR)
  recent(@Query() query: GetRecentSalesQueryDto) {
    return this.salesService.recent(query.limit);
  }

  @Get('latest')
  @Roles(UserRole.ADMIN, UserRole.CASHIER, UserRole.AUDITOR)
  latest() {
    return this.salesService.latest();
  }

  @Get(':id/receipt')
  @Roles(UserRole.ADMIN, UserRole.CASHIER, UserRole.AUDITOR)
  receipt(@Param('id', ParseIntPipe) id: number) {
    return this.salesService.receipt(id);
  }
}
