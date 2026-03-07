import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { round } from '../common/utils/number.util';
import { PrismaService } from '../prisma/prisma.service';
import { UpsertVariantRecipeDto } from './dto/upsert-variant-recipe.dto';

@Injectable()
export class RecipesService {
  constructor(private readonly prisma: PrismaService) {}

  async upsertForVariant(variantId: number, dto: UpsertVariantRecipeDto) {
    const variant = await this.prisma.productVariant.findUnique({
      where: { id: variantId },
    });
    if (!variant) throw new NotFoundException('Variant not found');

    const payload: Prisma.VariantRecipeItemCreateManyInput[] = [];
    for (const item of dto.items) {
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

    await this.prisma.$transaction(async (tx) => {
      await tx.variantRecipeItem.deleteMany({
        where: { variantId },
      });

      if (payload.length > 0) {
        await tx.variantRecipeItem.createMany({ data: payload });
      }
    });

    return this.prisma.variantRecipeItem.findMany({
      where: { variantId },
      include: {
        ingredient: true,
      },
      orderBy: [{ ingredient: { name: 'asc' } }],
    });
  }
}
