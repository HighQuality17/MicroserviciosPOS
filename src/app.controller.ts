import { Controller, Get } from '@nestjs/common';
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
  root() {
    return { ok: true, name: 'MicroserviciosPOS API', version: '0.1' };
  }

  @Get('health')
  health() {
    return { ok: true };
  }

  @Get('catalog')
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
