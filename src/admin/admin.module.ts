import { Module } from '@nestjs/common';
import { BusinessActivityModule } from '../business-activity/business-activity.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

@Module({
  imports: [BusinessActivityModule],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
