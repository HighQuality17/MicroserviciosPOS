import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ProductType, SaleItemType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  ensureOperationalVariantsForSimpleProducts,
  isOperationalVariantProduct,
} from '../products/operational-variant.util';
import {
  buildProductImageAlt,
  buildProductImagePublicUrl,
} from '../products/product-image.util';
import { CreateVariantDto } from './dto/create-variant.dto';
import { VariantListStatus } from './dto/get-variants-query.dto';
import { UpdateVariantDto } from './dto/update-variant.dto';
import { UpdateVariantStatusDto } from './dto/update-variant-status.dto';

@Injectable()
export class VariantsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateVariantDto) {
    const product = await this.prisma.product.findUnique({
      where: { id: dto.product_id },
    });
    if (!product) throw new NotFoundException('Product not found');
    if (product.productType !== ProductType.VARIANT) {
      throw new BadRequestException('Product type does not support variants');
    }
    if (dto.sale_price < 0) {
      throw new BadRequestException('sale_price must be >= 0');
    }

    try {
      const variant = await this.prisma.productVariant.create({
        data: {
          productId: dto.product_id,
          size: dto.size.trim(),
          sku: dto.sku.trim(),
          salePrice: dto.sale_price,
          active: dto.active ?? true,
        },
        include: {
          product: true,
        },
      });

      return this.mapVariant(variant);
    } catch {
      throw new ConflictException('Variant sku already exists');
    }
  }

  async findActive() {
    await ensureOperationalVariantsForSimpleProducts(this.prisma);

    const variants = await this.prisma.productVariant.findMany({
      where: {
        active: true,
        product: {
          active: true,
        },
      },
      include: {
        product: true,
      },
      orderBy: [{ product: { name: 'asc' } }, { size: 'asc' }, { id: 'asc' }],
    });

    return variants.map((variant) => this.mapVariant(variant));
  }

  async findAll(status: VariantListStatus = VariantListStatus.ACTIVE) {
    await ensureOperationalVariantsForSimpleProducts(this.prisma);

    const variants = await this.prisma.productVariant.findMany({
      where: this.resolveVariantListWhere(status),
      include: {
        product: true,
      },
      orderBy: [{ active: 'desc' }, { product: { name: 'asc' } }, { size: 'asc' }, { id: 'asc' }],
    });

    return variants.map((variant) => this.mapVariant(variant));
  }

  async update(id: number, dto: UpdateVariantDto) {
    const variant = await this.prisma.productVariant.findUnique({
      where: { id },
      include: {
        product: true,
      },
    });

    if (!variant) throw new NotFoundException('Variant not found');
    if (dto.sale_price !== undefined && dto.sale_price < 0) {
      throw new BadRequestException('sale_price must be >= 0');
    }

    const isOperational = isOperationalVariantProduct(variant.product.productType);
    if (
      isOperational &&
      dto.size !== undefined &&
      dto.size.trim().length > 0
    ) {
      throw new BadRequestException(
        'Operational variant size is managed automatically for simple products',
      );
    }

    if (!isOperational && variant.product.productType !== ProductType.VARIANT) {
      throw new BadRequestException('Product type does not support variants');
    }

    try {
      const updatedVariant = await this.prisma.productVariant.update({
        where: { id },
        data: {
          ...(dto.size !== undefined && !isOperational ? { size: dto.size.trim() } : {}),
          ...(dto.sku !== undefined ? { sku: dto.sku.trim() } : {}),
          ...(dto.sale_price !== undefined ? { salePrice: dto.sale_price } : {}),
          ...(dto.active !== undefined ? { active: dto.active } : {}),
        },
        include: {
          product: true,
        },
      });

      return this.mapVariant(updatedVariant);
    } catch {
      throw new ConflictException('Variant sku already exists');
    }
  }

  async updateStatus(id: number, dto: UpdateVariantStatusDto) {
    const variant = await this.prisma.productVariant.findUnique({
      where: { id },
      include: {
        product: true,
      },
    });

    if (!variant) throw new NotFoundException('Variant not found');

    const updatedVariant = await this.prisma.productVariant.update({
      where: { id },
      data: { active: dto.active },
      include: {
        product: true,
      },
    });

    return this.mapVariant(updatedVariant);
  }

  async remove(id: number) {
    const variant = await this.prisma.productVariant.findUnique({
      where: { id },
      include: {
        product: true,
      },
    });

    if (!variant) throw new NotFoundException('Variant not found');

    if (isOperationalVariantProduct(variant.product.productType)) {
      throw new BadRequestException(
        'Operational variant of a simple product cannot be deleted directly',
      );
    }

    const [historicalSalesCount, comboAssignmentsCount] = await Promise.all([
      this.prisma.saleItem.count({
        where: {
          itemType: SaleItemType.VARIANT,
          refId: id,
        },
      }),
      this.prisma.comboItem.count({
        where: { variantId: id },
      }),
    ]);

    if (historicalSalesCount > 0) {
      throw new BadRequestException(
        'Variant has historical sales. Deactivate it instead of deleting.',
      );
    }

    if (comboAssignmentsCount > 0) {
      throw new BadRequestException(
        'Variant is assigned to one or more combos. Remove it from those combos before deleting.',
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.variantRecipeItem.deleteMany({
        where: { variantId: id },
      });

      await tx.productVariant.delete({
        where: { id },
      });
    });

    return {
      id,
      deleted: true,
      message: 'Variant deleted successfully',
    };
  }

  private resolveVariantListWhere(status: VariantListStatus) {
    if (status === VariantListStatus.ALL) {
      return undefined;
    }

    if (status === VariantListStatus.INACTIVE) {
      return {
        active: false,
      };
    }

    return {
      active: true,
      product: {
        active: true,
      },
    };
  }

  private mapVariant(variant: {
    id: number;
    productId: number;
    size: string;
    sku: string;
    salePrice: unknown;
    active: boolean;
    product: { name: string; productType: ProductType; imagePath: string | null };
  }) {
    const imageUrl = buildProductImagePublicUrl(variant.product.imagePath);
    const imageAlt = imageUrl ? buildProductImageAlt(variant.product.name) : null;

    return {
      id: variant.id,
      product_id: variant.productId,
      product_name: variant.product.name,
      product_type: variant.product.productType,
      is_operational: isOperationalVariantProduct(variant.product.productType),
      size: variant.size,
      sku: variant.sku,
      sale_price: Number(variant.salePrice),
      image_url: imageUrl,
      image_alt: imageAlt,
      active: variant.active,
    };
  }
}
