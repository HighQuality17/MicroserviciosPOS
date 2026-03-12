import { Controller, Get, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { Roles } from './auth/decorators/roles.decorator';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { RolesGuard } from './auth/guards/roles.guard';
import { Public } from './auth/public.decorator';
import { CombosService } from './combos/combos.service';
import { ProductsService } from './products/products.service';
import { VariantsService } from './variants/variants.service';

@Controller()
export class AppController {
  constructor(
    private readonly productsService: ProductsService,
    private readonly variantsService: VariantsService,
    private readonly combosService: CombosService,
  ) {}

  @Get()
  @Public()
  root() {
    return { ok: true, name: 'MicroserviciosPOS API', version: '0.1' };
  }

  @Get('health')
  @Public()
  health() {
    return { ok: true };
  }

  @Get('catalog')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.CASHIER)
  async catalog() {
    const [products, variants, combos] = await Promise.all([
      this.productsService.findActive(),
      this.variantsService.findActive(),
      this.combosService.findActive(),
    ]);

    return {
      products,
      variants,
      combos,
    };
  }
}
