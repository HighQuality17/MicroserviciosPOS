import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, SaleItemType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { isOperationalVariantProduct } from '../products/operational-variant.util';
import { CreateComboDto } from './dto/create-combo.dto';
import { ComboListStatus } from './dto/get-combos-query.dto';
import { UpdateComboDto } from './dto/update-combo.dto';
import { UpdateComboStatusDto } from './dto/update-combo-status.dto';
import { UpsertComboItemsDto } from './dto/upsert-combo-items.dto';

type ComboWithItems = Prisma.ComboGetPayload<{
  include: {
    items: {
      include: {
        variant: {
          include: {
            product: true;
          };
        };
      };
      orderBy: {
        id: 'asc';
      };
    };
  };
}>;

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

  async findActive() {
    return this.findAll(ComboListStatus.ACTIVE);
  }

  async findAll(status: ComboListStatus = ComboListStatus.ACTIVE) {
    const combos = await this.prisma.combo.findMany({
      where: this.resolveComboListWhere(status),
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
      orderBy:
        status === ComboListStatus.ALL
          ? [{ active: 'desc' }, { name: 'asc' }]
          : [{ name: 'asc' }],
    });

    return combos.map((combo) => this.mapCombo(combo));
  }

  async update(id: number, dto: UpdateComboDto) {
    const combo = await this.prisma.combo.findUnique({
      where: { id },
    });

    if (!combo) throw new NotFoundException('Combo not found');

    try {
      return await this.prisma.combo.update({
        where: { id },
        data: {
          ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
          ...(dto.sale_price !== undefined ? { salePrice: dto.sale_price } : {}),
          ...(dto.active !== undefined ? { active: dto.active } : {}),
        },
      });
    } catch {
      throw new ConflictException('Combo name already exists');
    }
  }

  async updateStatus(id: number, dto: UpdateComboStatusDto) {
    const combo = await this.prisma.combo.findUnique({
      where: { id },
    });

    if (!combo) throw new NotFoundException('Combo not found');

    return this.prisma.combo.update({
      where: { id },
      data: {
        active: dto.active,
      },
    });
  }

  async remove(id: number) {
    const combo = await this.prisma.combo.findUnique({
      where: { id },
    });

    if (!combo) throw new NotFoundException('Combo not found');

    const historicalSalesCount = await this.prisma.saleItem.count({
      where: {
        itemType: SaleItemType.COMBO,
        refId: id,
      },
    });

    if (historicalSalesCount > 0) {
      throw new BadRequestException(
        'Combo has historical sales. Deactivate it instead of deleting.',
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.comboItem.deleteMany({
        where: { comboId: id },
      });

      await tx.combo.delete({
        where: { id },
      });
    });

    return {
      id,
      deleted: true,
      message: 'Combo deleted successfully',
    };
  }

  async upsertItems(comboId: number, dto: UpsertComboItemsDto) {
    const combo = await this.prisma.combo.findUnique({
      where: { id: comboId },
      include: {
        items: true,
      },
    });
    if (!combo) throw new NotFoundException('Combo not found');

    const variantIds = dto.items.map((item) => item.variant_id);
    const uniqueVariantIds = new Set(variantIds);
    if (uniqueVariantIds.size !== variantIds.length) {
      throw new BadRequestException(
        'Duplicate variant items are not allowed in combo composition',
      );
    }

    const assignedVariantIds = new Set(
      combo.items.map((item) => item.variantId),
    );
    const variants = await this.prisma.productVariant.findMany({
      where: { id: { in: variantIds } },
    });
    const variantById = new Map(variants.map((variant) => [variant.id, variant]));

    const payload: Prisma.ComboItemCreateManyInput[] = dto.items.map((item) => {
      const variant = variantById.get(item.variant_id);
      if (!variant) {
        throw new BadRequestException(
          `Variant ${item.variant_id} is invalid/inactive`,
        );
      }
      if (!variant.active && !assignedVariantIds.has(item.variant_id)) {
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

      if (payload.length > 0) {
        await tx.comboItem.createMany({
          data: payload,
        });
      }
    });

    const updatedCombo = await this.prisma.combo.findUnique({
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

    if (!updatedCombo) throw new NotFoundException('Combo not found');

    return this.mapCombo(updatedCombo);
  }

  private resolveComboListWhere(status: ComboListStatus) {
    if (status === ComboListStatus.ALL) {
      return undefined;
    }

    if (status === ComboListStatus.INACTIVE) {
      return {
        active: false,
      };
    }

    return {
      active: true,
    };
  }

  private mapCombo(combo: ComboWithItems) {
    return {
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
          is_operational: isOperationalVariantProduct(
            item.variant.product.productType,
          ),
          size: item.variant.size,
          sku: item.variant.sku,
          sale_price: Number(item.variant.salePrice),
          active: item.variant.active,
        },
      })),
    };
  }
}
