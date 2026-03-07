import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { CashService } from './cash.service';
import { CloseCashSessionDto } from './dto/close-cash-session.dto';
import { GetCurrentCashQueryDto } from './dto/get-current-cash-query.dto';
import { OpenCashSessionDto } from './dto/open-cash-session.dto';

@Controller('cash')
export class CashController {
  constructor(private readonly cashService: CashService) {}

  @Post('open')
  open(@Body() dto: OpenCashSessionDto) {
    return this.cashService.open(dto);
  }

  @Post('close')
  close(@Body() dto: CloseCashSessionDto) {
    return this.cashService.close(dto);
  }

  @Get('current')
  current(@Query() query: GetCurrentCashQueryDto) {
    return this.cashService.getCurrent(query);
  }
}
