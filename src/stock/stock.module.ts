import { Module } from '@nestjs/common';
import { BusinessActivityModule } from '../business-activity/business-activity.module';
import { StockController } from './stock.controller';
import { StockService } from './stock.service';

@Module({
  imports: [BusinessActivityModule],
  controllers: [StockController],
  providers: [StockService],
  exports: [StockService],
})
export class StockModule {}
