import { Module } from '@nestjs/common';
import { BusinessActivityModule } from '../business-activity/business-activity.module';
import { CashController } from './cash.controller';
import { CashService } from './cash.service';

@Module({
  imports: [BusinessActivityModule],
  controllers: [CashController],
  providers: [CashService],
  exports: [CashService],
})
export class CashModule {}
