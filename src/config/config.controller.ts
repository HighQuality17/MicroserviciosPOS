import {
  Body,
  Controller,
  Get,
  Patch,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import {
  AuthenticatedUser,
  CurrentUser,
} from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UpdateBusinessConfigDto } from './dto/update-business-config.dto';
import { ConfigService } from './config.service';

@Controller('config')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.CASHIER, UserRole.AUDITOR)
export class ConfigController {
  constructor(private readonly configService: ConfigService) {}

  @Get('audit')
  @Roles(UserRole.ADMIN, UserRole.AUDITOR)
  getAudit() {
    return this.configService.getAudit();
  }

  @Get()
  getConfig() {
    return this.configService.getConfig();
  }

  @Patch()
  @Roles(UserRole.ADMIN)
  updateConfig(
    @Body() dto: UpdateBusinessConfigDto,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    if (!user) {
      throw new UnauthorizedException('Usuario autenticado no encontrado');
    }

    return this.configService.updateConfig(dto, user.sub);
  }
}
