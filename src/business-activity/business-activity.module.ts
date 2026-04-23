import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { BusinessActivityService } from './business-activity.service';

@Module({
  imports: [PrismaModule],
  providers: [BusinessActivityService],
  exports: [BusinessActivityService],
})
export class BusinessActivityModule {}
