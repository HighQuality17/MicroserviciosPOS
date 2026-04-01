import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, ProductType } from '@prisma/client';
import { round } from '../common/utils/number.util';
import { PrismaService } from '../prisma/prisma.service';
import { isOperationalVariantProduct } from '../products/operational-variant.util';
import { ReplaceVariantRecipeDto } from './dto/replace-variant-recipe.dto';
import { UpsertVariantRecipeDto } from './dto/upsert-variant-recipe.dto';

@Injectable()
export class RecipesService {
  constructor(private readonly prisma: PrismaService) {}

  async upsertForVariant(variantId: number, dto: UpsertVariantRecipeDto) {
    return this.replaceRecipeItems(variantId, dto.items);
  }

  async findForVariant(variantId: number) {
    const variant = await this.findVariantOrThrow(variantId);
    const items = await this.prisma.variantRecipeItem.findMany({
      where: { variantId },
      include: {
        ingredient: true,
      },
      orderBy: [{ ingredient: { name: 'asc' } }],
    });

    return this.mapRecipe(variant, items);
  }

  async replaceForVariant(variantId: number, dto: ReplaceVariantRecipeDto) {
    return this.replaceRecipeItems(variantId, dto.items);
  }

  async removeRecipeItem(variantId: number, ingredientId: number) {
    const variant = await this.findVariantOrThrow(variantId);
    const recipeItem = await this.prisma.variantRecipeItem.findUnique({
      where: {
        variantId_ingredientId: {
          variantId,
          ingredientId,
        },
      },
    });

    if (!recipeItem) {
      throw new NotFoundException('Recipe item not found for this variant');
    }

    await this.prisma.variantRecipeItem.delete({
      where: {
        variantId_ingredientId: {
          variantId,
          ingredientId,
        },
      },
    });

    const items = await this.prisma.variantRecipeItem.findMany({
      where: { variantId },
      include: {
        ingredient: true,
      },
      orderBy: [{ ingredient: { name: 'asc' } }],
    });

    return this.mapRecipe(variant, items);
  }

  private async replaceRecipeItems(
    variantId: number,
    items: UpsertVariantRecipeDto['items'],
  ) {
    const variant = await this.findVariantOrThrow(variantId);
    const payload = await this.buildRecipePayload(variantId, items);

    await this.prisma.$transaction(async (tx) => {
      await tx.variantRecipeItem.deleteMany({
        where: { variantId },
      });

      if (payload.length > 0) {
        await tx.variantRecipeItem.createMany({ data: payload });
      }
    });

    const recipeItems = await this.prisma.variantRecipeItem.findMany({
      where: { variantId },
      include: {
        ingredient: true,
      },
      orderBy: [{ ingredient: { name: 'asc' } }],
    });

    return this.mapRecipe(variant, recipeItems);
  }

  private async buildRecipePayload(
    variantId: number,
    items: UpsertVariantRecipeDto['items'],
  ): Promise<Prisma.VariantRecipeItemCreateManyInput[]> {
    const payload: Prisma.VariantRecipeItemCreateManyInput[] = [];

    for (const item of items) {
      if (item.qty <= 0) {
        throw new BadRequestException('qty must be > 0');
      }

      const [ingredient, unitType] = await Promise.all([
        this.prisma.ingredient.findUnique({
          where: { id: item.ingredient_id },
        }),
        this.prisma.unitType.findUnique({
          where: { code: item.unit_code },
        }),
      ]);

      if (!ingredient) {
        throw new NotFoundException(
          `Ingredient ${item.ingredient_id} was not found`,
        );
      }
      if (!unitType) {
        throw new BadRequestException(`unit_code ${item.unit_code} is invalid`);
      }
      if (ingredient.dimension !== unitType.dimension) {
        throw new BadRequestException(
          `Ingredient ${ingredient.id} dimension mismatch with ${item.unit_code}`,
        );
      }

      payload.push({
        variantId,
        ingredientId: item.ingredient_id,
        qtyBaseRequired: round(item.qty * Number(unitType.factorToBase), 3),
      });
    }

    return payload;
  }

  private async findVariantOrThrow(variantId: number) {
    const variant = await this.prisma.productVariant.findUnique({
      where: { id: variantId },
      include: {
        product: true,
      },
    });

    if (!variant) {
      throw new NotFoundException('Variant not found');
    }

    return variant;
  }

  private mapRecipe(
    variant: {
      id: number;
      size: string;
      active: boolean;
      product: { id: number; name: string; active: boolean; productType: ProductType };
    },
    items: Array<{
      ingredientId: number;
      qtyBaseRequired: unknown;
      ingredient: {
        id: number;
        name: string;
        dimension: string;
        defaultUnitCode: string;
      };
    }>,
  ) {
    return {
      variant_id: variant.id,
      product_id: variant.product.id,
      product_name: variant.product.name,
      product_type: variant.product.productType,
      is_operational: isOperationalVariantProduct(variant.product.productType),
      size: variant.size,
      active: variant.active,
      has_recipe: items.length > 0,
      items: items.map((item) => ({
        ingredient_id: item.ingredientId,
        ingredient_name: item.ingredient.name,
        dimension: item.ingredient.dimension,
        default_unit_code: item.ingredient.defaultUnitCode,
        qty_base_required: Number(item.qtyBaseRequired),
      })),
    };
  }
}
