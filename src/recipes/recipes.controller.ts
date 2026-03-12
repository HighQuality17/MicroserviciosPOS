import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ReplaceVariantRecipeDto } from './dto/replace-variant-recipe.dto';
import { UpsertVariantRecipeDto } from './dto/upsert-variant-recipe.dto';
import { RecipesService } from './recipes.service';

@Controller('recipes')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RecipesController {
  constructor(private readonly recipesService: RecipesService) {}

  @Post('variant/:variantId')
  @Roles(UserRole.ADMIN)
  upsertForVariant(
    @Param('variantId', ParseIntPipe) variantId: number,
    @Body() dto: UpsertVariantRecipeDto,
  ) {
    return this.recipesService.upsertForVariant(variantId, dto);
  }

  @Get('variant/:variantId')
  @Roles(UserRole.ADMIN, UserRole.AUDITOR)
  findForVariant(@Param('variantId', ParseIntPipe) variantId: number) {
    return this.recipesService.findForVariant(variantId);
  }

  @Put('variant/:variantId')
  @Roles(UserRole.ADMIN)
  replaceForVariant(
    @Param('variantId', ParseIntPipe) variantId: number,
    @Body() dto: ReplaceVariantRecipeDto,
  ) {
    return this.recipesService.replaceForVariant(variantId, dto);
  }

  @Delete('variant/:variantId/items/:ingredientId')
  @Roles(UserRole.ADMIN)
  removeRecipeItem(
    @Param('variantId', ParseIntPipe) variantId: number,
    @Param('ingredientId', ParseIntPipe) ingredientId: number,
  ) {
    return this.recipesService.removeRecipeItem(variantId, ingredientId);
  }
}
