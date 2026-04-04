import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CombosService } from './combos.service';
import { CreateComboDto } from './dto/create-combo.dto';
import { ComboListStatus, GetCombosQueryDto } from './dto/get-combos-query.dto';
import { UpdateComboDto } from './dto/update-combo.dto';
import { UpdateComboStatusDto } from './dto/update-combo-status.dto';
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
  findAll(@Query() query: GetCombosQueryDto) {
    return this.combosService.findAll(query.status ?? ComboListStatus.ACTIVE);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateComboDto,
  ) {
    return this.combosService.update(id, dto);
  }

  @Patch(':id/status')
  @Roles(UserRole.ADMIN)
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateComboStatusDto,
  ) {
    return this.combosService.updateStatus(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.combosService.remove(id);
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
