import { Body, Controller, Param, ParseIntPipe, Post } from '@nestjs/common';
import { UpsertVariantRecipeDto } from './dto/upsert-variant-recipe.dto';
import { RecipesService } from './recipes.service';

@Controller('recipes')
export class RecipesController {
  constructor(private readonly recipesService: RecipesService) {}

  @Post('variant/:variantId')
  upsertForVariant(
    @Param('variantId', ParseIntPipe) variantId: number,
    @Body() dto: UpsertVariantRecipeDto,
  ) {
    return this.recipesService.upsertForVariant(variantId, dto);
  }
}
