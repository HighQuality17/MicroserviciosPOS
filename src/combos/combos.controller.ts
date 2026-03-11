import { Body, Controller, Param, ParseIntPipe, Post } from '@nestjs/common';
import { CombosService } from './combos.service';
import { CreateComboDto } from './dto/create-combo.dto';
import { UpsertComboItemsDto } from './dto/upsert-combo-items.dto';

@Controller('combos')
export class CombosController {
  constructor(private readonly combosService: CombosService) {}

  @Post()
  create(@Body() dto: CreateComboDto) {
    return this.combosService.create(dto);
  }

  @Post(':id/items')
  upsertItems(
    @Param('id', ParseIntPipe) comboId: number,
    @Body() dto: UpsertComboItemsDto,
  ) {
    return this.combosService.upsertItems(comboId, dto);
  }
}
