import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
} from '@nestjs/common';
import { ReplaceVariantRecipeDto } from './dto/replace-variant-recipe.dto';
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

  @Get('variant/:variantId')
  findForVariant(@Param('variantId', ParseIntPipe) variantId: number) {
    return this.recipesService.findForVariant(variantId);
  }

  @Put('variant/:variantId')
  replaceForVariant(
    @Param('variantId', ParseIntPipe) variantId: number,
    @Body() dto: ReplaceVariantRecipeDto,
  ) {
    return this.recipesService.replaceForVariant(variantId, dto);
  }

  @Delete('variant/:variantId/items/:ingredientId')
  removeRecipeItem(
    @Param('variantId', ParseIntPipe) variantId: number,
    @Param('ingredientId', ParseIntPipe) ingredientId: number,
  ) {
    return this.recipesService.removeRecipeItem(variantId, ingredientId);
  }
}
