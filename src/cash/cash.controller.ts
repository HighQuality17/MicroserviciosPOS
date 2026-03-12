import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CashService } from './cash.service';
import { CloseCashSessionDto } from './dto/close-cash-session.dto';
import { GetCurrentCashQueryDto } from './dto/get-current-cash-query.dto';
import { OpenCashSessionDto } from './dto/open-cash-session.dto';

@Controller('cash')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CashController {
  constructor(private readonly cashService: CashService) {}

  @Post('open')
  @Roles(UserRole.ADMIN, UserRole.CASHIER)
  open(@Body() dto: OpenCashSessionDto) {
    return this.cashService.open(dto);
  }

  @Post('close')
  @Roles(UserRole.ADMIN, UserRole.CASHIER)
  close(@Body() dto: CloseCashSessionDto) {
    return this.cashService.close(dto);
  }

  @Get('current')
  @Roles(UserRole.ADMIN, UserRole.CASHIER)
  current(@Query() query: GetCurrentCashQueryDto) {
    return this.cashService.getCurrent(query);
  }
}
