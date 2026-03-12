import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SaleItemType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { UpdateProductStatusDto } from './dto/update-product-status.dto';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateProductDto) {
    try {
      return await this.prisma.product.create({
        data: {
          name: dto.name.trim(),
          active: dto.active ?? true,
        },
      });
    } catch {
      throw new ConflictException('Product name already exists');
    }
  }

  async findActive() {
    const products = await this.prisma.product.findMany({
      where: { active: true },
      include: {
        variants: {
          where: { active: true },
          orderBy: [{ size: 'asc' }, { id: 'asc' }],
        },
      },
      orderBy: { name: 'asc' },
    });

    return products.map((product) => this.mapProduct(product));
  }

  async update(id: number, dto: UpdateProductDto) {
    await this.ensureProductExists(id);

    try {
      const product = await this.prisma.product.update({
        where: { id },
        data: {
          ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
          ...(dto.active !== undefined ? { active: dto.active } : {}),
        },
      });

      return this.mapProduct(product);
    } catch {
      throw new ConflictException('Product name already exists');
    }
  }

  async updateStatus(id: number, dto: UpdateProductStatusDto) {
    await this.ensureProductExists(id);

    const product = await this.prisma.product.update({
      where: { id },
      data: { active: dto.active },
    });

    return this.mapProduct(product);
  }

  async remove(id: number) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        variants: {
          select: { id: true },
        },
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    if (product.variants.length > 0) {
      const variantIds = product.variants.map((variant) => variant.id);
      const [historicalSalesCount, comboAssignmentsCount] = await Promise.all([
        this.prisma.saleItem.count({
          where: {
            itemType: SaleItemType.VARIANT,
            refId: { in: variantIds },
          },
        }),
        this.prisma.comboItem.count({
          where: { variantId: { in: variantIds } },
        }),
      ]);

      if (historicalSalesCount > 0) {
        throw new BadRequestException(
          'Product has variants with historical sales. Deactivate it instead of deleting.',
        );
      }

      if (comboAssignmentsCount > 0) {
        throw new BadRequestException(
          'Product has variants assigned to combos. Remove those links before deleting the product.',
        );
      }

      throw new BadRequestException(
        'Product has variants configured. Delete or deactivate its variants before deleting the product.',
      );
    }

    await this.prisma.product.delete({
      where: { id },
    });

    return {
      id,
      deleted: true,
      message: 'Product deleted successfully',
    };
  }

  private async ensureProductExists(id: number) {
    const product = await this.prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }
  }

  private mapProduct(product: {
    id: number;
    name: string;
    active: boolean;
    variants?: Array<{
      id: number;
      productId: number;
      size: string;
      sku: string;
      salePrice: unknown;
      active: boolean;
    }>;
  }) {
    return {
      id: product.id,
      name: product.name,
      active: product.active,
      variants:
        product.variants?.map((variant) => ({
          id: variant.id,
          product_id: variant.productId,
          size: variant.size,
          sku: variant.sku,
          sale_price: Number(variant.salePrice),
          active: variant.active,
        })) ?? [],
    };
  }
}
