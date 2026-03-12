import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CombosService } from './combos.service';
import { CreateComboDto } from './dto/create-combo.dto';
import { UpsertComboItemsDto } from './dto/upsert-combo-items.dto';

@Controller('combos')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CombosController {
  constructor(private readonly combosService: CombosService) {}

  @Post()
  @Roles(UserRole.ADMIN)
  create(@Body() dto: CreateComboDto) {
    return this.combosService.create(dto);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.AUDITOR)
  findActive() {
    return this.combosService.findActive();
  }

  @Post(':id/items')
  @Roles(UserRole.ADMIN)
  upsertItems(
    @Param('id', ParseIntPipe) comboId: number,
    @Body() dto: UpsertComboItemsDto,
  ) {
    return this.combosService.upsertItems(comboId, dto);
  }
}
