import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, ProductType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { isOperationalVariantProduct } from '../products/operational-variant.util';
import { CreateComboDto } from './dto/create-combo.dto';
import { UpsertComboItemsDto } from './dto/upsert-combo-items.dto';

@Injectable()
export class CombosService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateComboDto) {
    try {
      return await this.prisma.combo.create({
        data: {
          name: dto.name.trim(),
          salePrice: dto.sale_price,
          active: dto.active ?? true,
        },
      });
    } catch {
      throw new ConflictException('Combo name already exists');
    }
  }

  async upsertItems(comboId: number, dto: UpsertComboItemsDto) {
    const combo = await this.prisma.combo.findUnique({
      where: { id: comboId },
    });
    if (!combo) throw new NotFoundException('Combo not found');

    const variantIds = dto.items.map((item) => item.variant_id);
    const variants = await this.prisma.productVariant.findMany({
      where: { id: { in: variantIds } },
    });
    const variantById = new Map(variants.map((variant) => [variant.id, variant]));

    const payload: Prisma.ComboItemCreateManyInput[] = dto.items.map((item) => {
      const variant = variantById.get(item.variant_id);
      if (!variant || !variant.active) {
        throw new BadRequestException(
          `Variant ${item.variant_id} is invalid/inactive`,
        );
      }

      return {
        comboId,
        variantId: item.variant_id,
        qty: item.qty,
      };
    });

    await this.prisma.$transaction(async (tx) => {
      await tx.comboItem.deleteMany({
        where: { comboId },
      });

      await tx.comboItem.createMany({
        data: payload,
      });
    });

    return this.prisma.combo.findUnique({
      where: { id: comboId },
      include: {
        items: {
          include: {
            variant: {
              include: { product: true },
            },
          },
          orderBy: { id: 'asc' },
        },
      },
    });
  }

  async findActive() {
    const combos = await this.prisma.combo.findMany({
      where: { active: true },
      include: {
        items: {
          include: {
            variant: {
              include: {
                product: true,
              },
            },
          },
          orderBy: { id: 'asc' },
        },
      },
      orderBy: { name: 'asc' },
    });

    return combos.map((combo) => ({
      id: combo.id,
      name: combo.name,
      sale_price: Number(combo.salePrice),
      active: combo.active,
      items: combo.items.map((item) => ({
        id: item.id,
        combo_id: item.comboId,
        variant_id: item.variantId,
        qty: Number(item.qty),
        variant: {
          id: item.variant.id,
          product_id: item.variant.productId,
          product_name: item.variant.product.name,
          product_type: item.variant.product.productType,
          is_operational: isOperationalVariantProduct(item.variant.product.productType),
          size: item.variant.size,
          sku: item.variant.sku,
          sale_price: Number(item.variant.salePrice),
          active: item.variant.active,
        },
      })),
    }));
  }
}
