import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, ProductType, SaleItemType, TaxCategory, VatType } from '@prisma/client';
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
          productType: dto.productType ?? ProductType.SIMPLE,
          ...this.mapCommercialProductData(dto),
          ...this.mapFiscalProductData(dto),
          active: dto.active ?? true,
        },
      });

      return this.mapProduct(product);
    } catch (error) {
      this.handleProductWriteError(error);
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
          ...(dto.productType !== undefined ? { productType: dto.productType } : {}),
          ...this.mapCommercialProductData(dto),
          ...this.mapFiscalProductData(dto),
          ...(dto.active !== undefined ? { active: dto.active } : {}),
        },
      });

      return this.mapProduct(product);
    } catch (error) {
      this.handleProductWriteError(error);
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

  private mapCommercialProductData(dto: {
    internalCode?: string | null;
    barcode?: string | null;
    supplierReference?: string | null;
    description?: string | null;
    brand?: string | null;
  }) {
    return {
      ...(dto.internalCode !== undefined
        ? { internalCode: this.normalizeOptionalText(dto.internalCode) }
        : {}),
      ...(dto.barcode !== undefined
        ? { barcode: this.normalizeOptionalText(dto.barcode) }
        : {}),
      ...(dto.supplierReference !== undefined
        ? { supplierReference: this.normalizeOptionalText(dto.supplierReference) }
        : {}),
      ...(dto.description !== undefined
        ? { description: this.normalizeOptionalText(dto.description) }
        : {}),
      ...(dto.brand !== undefined ? { brand: this.normalizeOptionalText(dto.brand) } : {}),
    };
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

  private handleProductWriteError(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      const target = this.getUniqueTarget(error);

      if (target.includes('name')) {
        throw new ConflictException('Product name already exists');
      }

      if (target.includes('internalCode')) {
        throw new ConflictException('Product internal code already exists');
      }

      if (target.includes('barcode')) {
        throw new ConflictException('Product barcode already exists');
      }

      throw new ConflictException('Product unique field already exists');
    }

    throw error;
  }

  private getUniqueTarget(error: Prisma.PrismaClientKnownRequestError) {
    const target = error.meta?.target;

    if (Array.isArray(target)) {
      return target.map(String).join(',');
    }

    return typeof target === 'string' ? target : '';
  }

  private mapProduct(product: {
    id: number;
    name: string;
    internalCode: string | null;
    barcode: string | null;
    supplierReference: string | null;
    description: string | null;
    brand: string | null;
    productType: ProductType;
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
      internalCode: product.internalCode,
      barcode: product.barcode,
      supplierReference: product.supplierReference,
      description: product.description,
      brand: product.brand,
      productType: product.productType,
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
