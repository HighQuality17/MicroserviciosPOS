import { Controller, Post } from '@nestjs/common';
import { UnitTypesService } from './unit-types.service';

@Controller('unit-types')
export class UnitTypesController {
  constructor(private readonly unitTypesService: UnitTypesService) {}

  @Post('seed')
  seed() {
    return this.unitTypesService.seedDefaults();
  }
}
