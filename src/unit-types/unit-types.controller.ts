import { Controller, Post, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UnitTypesService } from './unit-types.service';

@Controller('unit-types')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UnitTypesController {
  constructor(private readonly unitTypesService: UnitTypesService) {}

  @Post('seed')
  @Roles(UserRole.ADMIN)
  seed() {
    return this.unitTypesService.seedDefaults();
  }
}
