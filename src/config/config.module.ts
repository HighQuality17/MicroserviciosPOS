import { Module } from '@nestjs/common';
import { BusinessActivityModule } from '../business-activity/business-activity.module';
import { ConfigController } from './config.controller';
import { ConfigService } from './config.service';

@Module({
  imports: [BusinessActivityModule],
  controllers: [ConfigController],
  providers: [ConfigService],
  exports: [ConfigService],
})
export class ConfigModule {}
