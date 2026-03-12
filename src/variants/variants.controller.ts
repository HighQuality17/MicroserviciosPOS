import { Body, Controller, Get, Post } from '@nestjs/common';
import { CreateVariantDto } from './dto/create-variant.dto';
import { VariantsService } from './variants.service';

@Controller('variants')
export class VariantsController {
  constructor(private readonly variantsService: VariantsService) {}

  @Post()
  create(@Body() dto: CreateVariantDto) {
    return this.variantsService.create(dto);
  }

  @Get()
  findActive() {
    return this.variantsService.findActive();
  }
}
