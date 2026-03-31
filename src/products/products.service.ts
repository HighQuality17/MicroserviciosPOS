import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SaleItemType, TaxCategory, VatType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { UpdateProductStatusDto } from './dto/update-product-status.dto';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateProductDto) {
    try {
      const product = await this.prisma.product.create({
        data: {
          name: dto.name.trim(),
          ...this.mapFiscalProductData(dto),
          active: dto.active ?? true,
        },
      });

      return this.mapProduct(product);
    } catch {
      throw new ConflictException('Product name already exists');
    }
  }

  async findAll() {
    const products = await this.prisma.product.findMany({
      include: {
        variants: {
          orderBy: [{ size: 'asc' }, { id: 'asc' }],
        },
      },
      orderBy: [{ active: 'desc' }, { name: 'asc' }],
    });

    return products.map((product) => this.mapProduct(product));
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
          ...this.mapFiscalProductData(dto),
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

  private normalizeOptionalText(value?: string | null) {
    const normalized = value?.trim();
    return normalized ? normalized : null;
  }

  private mapFiscalProductData(dto: {
    unspscCode?: string | null;
    vatType?: VatType | null;
    taxCategory?: TaxCategory | null;
    unitMeasure?: string | null;
    isService?: boolean;
    applyInc?: boolean;
  }) {
    return {
      ...(dto.unspscCode !== undefined
        ? { unspscCode: this.normalizeOptionalText(dto.unspscCode) }
        : {}),
      ...(dto.vatType !== undefined ? { vatType: dto.vatType ?? null } : {}),
      ...(dto.taxCategory !== undefined
        ? { taxCategory: dto.taxCategory ?? null }
        : {}),
      ...(dto.unitMeasure !== undefined
        ? { unitMeasure: this.normalizeOptionalText(dto.unitMeasure) }
        : {}),
      ...(dto.isService !== undefined ? { isService: dto.isService } : {}),
      ...(dto.applyInc !== undefined ? { applyInc: dto.applyInc } : {}),
    };
  }

  private mapProduct(product: {
    id: number;
    name: string;
    unspscCode: string | null;
    vatType: VatType | null;
    taxCategory: TaxCategory | null;
    unitMeasure: string | null;
    isService: boolean;
    applyInc: boolean;
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
      unspscCode: product.unspscCode,
      vatType: product.vatType,
      taxCategory: product.taxCategory,
      unitMeasure: product.unitMeasure,
      isService: product.isService,
      applyInc: product.applyInc,
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

