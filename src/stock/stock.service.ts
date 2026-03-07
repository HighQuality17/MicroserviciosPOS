import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { IngredientMovementType } from '@prisma/client';
import { round } from '../common/utils/number.util';
import { PrismaService } from '../prisma/prisma.service';
import { AdjustStockDto } from './dto/adjust-stock.dto';
import { GetStockQueryDto } from './dto/get-stock-query.dto';

@Injectable()
export class StockService {
  constructor(private readonly prisma: PrismaService) {}

  async adjust(dto: AdjustStockDto) {
    const [location, ingredient, unitType, user] = await Promise.all([
      this.prisma.location.findUnique({ where: { id: dto.location_id } }),
      this.prisma.ingredient.findUnique({ where: { id: dto.ingredient_id } }),
      this.prisma.unitType.findUnique({ where: { code: dto.unit_code } }),
      this.prisma.user.findUnique({ where: { id: dto.user_id } }),
    ]);

    if (!location) throw new NotFoundException('Location not found');
    if (!ingredient) throw new NotFoundException('Ingredient not found');
    if (!unitType) throw new BadRequestException('unit_code does not exist');
    if (!user) throw new NotFoundException('User not found');
    if (ingredient.dimension !== unitType.dimension) {
      throw new BadRequestException('unit_code dimension does not match ingredient');
    }

    const qtyBase = round(dto.qty * Number(unitType.factorToBase), 3);

    return this.prisma.$transaction(async (tx) => {
      const current = await tx.ingredientStock.findUnique({
        where: {
          ingredientId_locationId: {
            ingredientId: dto.ingredient_id,
            locationId: dto.location_id,
          },
        },
      });

      const currentQty = Number(current?.qtyOnHandBase ?? 0);
      const nextQty = round(currentQty + qtyBase, 3);
      if (nextQty < 0) {
        throw new BadRequestException('Insufficient stock for negative adjustment');
      }

      const stock = await tx.ingredientStock.upsert({
        where: {
          ingredientId_locationId: {
            ingredientId: dto.ingredient_id,
            locationId: dto.location_id,
          },
        },
        update: { qtyOnHandBase: nextQty },
        create: {
          ingredientId: dto.ingredient_id,
          locationId: dto.location_id,
          qtyOnHandBase: nextQty,
        },
      });

      const movement = await tx.ingredientMovement.create({
        data: {
          ingredientId: dto.ingredient_id,
          locationId: dto.location_id,
          type: IngredientMovementType.ADJUST,
          qtyBase,
          reason: dto.reason,
          userId: dto.user_id,
        },
      });

      return {
        stock,
        movement,
      };
    });
  }

  async getByLocation(query: GetStockQueryDto) {
    const location = await this.prisma.location.findUnique({
      where: { id: query.location_id },
    });
    if (!location) throw new NotFoundException('Location not found');

    const rows = await this.prisma.ingredientStock.findMany({
      where: { locationId: query.location_id },
      include: {
        ingredient: true,
        location: true,
      },
      orderBy: [{ ingredient: { name: 'asc' } }],
    });

    return {
      location,
      items: rows,
    };
  }
}
