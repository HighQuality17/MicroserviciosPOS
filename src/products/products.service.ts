import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, ProductType, SaleItemType, TaxCategory, VatType } from '@prisma/client';
import { CatalogImageStorageService } from '../common/media/catalog-image-storage.service';
import {
  buildCatalogImageAlt,
  buildCatalogImagePublicUrl,
  type CatalogImageUploadFile,
} from '../common/media/catalog-image.util';
import { PrismaService } from '../prisma/prisma.service';
import {
  ensureOperationalVariantForSimpleProduct,
  ensureOperationalVariantsForSimpleProducts,
  isOperationalVariantProduct,
} from './operational-variant.util';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { UpdateProductStatusDto } from './dto/update-product-status.dto';

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly catalogImageStorageService: CatalogImageStorageService,
  ) {}

  async create(dto: CreateProductDto) {
    try {
      const product = await this.prisma.$transaction(async (tx) => {
        const createdProduct = await tx.product.create({
          data: {
            name: dto.name.trim(),
            productType: dto.productType ?? ProductType.SIMPLE,
            ...this.mapCommercialProductData(dto),
            ...this.mapFiscalProductData(dto),
            active: dto.active ?? true,
          },
        });

        if (createdProduct.productType === ProductType.SIMPLE) {
          await ensureOperationalVariantForSimpleProduct(tx, createdProduct.id);
        }

        return tx.product.findUniqueOrThrow({
          where: { id: createdProduct.id },
          include: {
            variants: {
              orderBy: [{ size: 'asc' }, { id: 'asc' }],
            },
          },
        });
      });

      return this.mapProduct(product);
    } catch (error) {
      this.handleProductWriteError(error);
    }
  }

  async findAll() {
    await ensureOperationalVariantsForSimpleProducts(this.prisma);

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
    await ensureOperationalVariantsForSimpleProducts(this.prisma);

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
    const currentProduct = await this.prisma.product.findUnique({
      where: { id },
      include: {
        variants: {
          select: { id: true },
          take: 2,
        },
      },
    });

    if (!currentProduct) {
      throw new NotFoundException('Product not found');
    }

    const nextProductType = dto.productType ?? currentProduct.productType;
    if (
      currentProduct.productType !== nextProductType &&
      nextProductType === ProductType.SIMPLE &&
      currentProduct.variants.length > 1
    ) {
      throw new BadRequestException(
        'Product with multiple variants cannot be converted to SIMPLE',
      );
    }

    try {
      const product = await this.prisma.$transaction(async (tx) => {
        await tx.product.update({
          where: { id },
          data: {
            ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
            ...(dto.productType !== undefined ? { productType: dto.productType } : {}),
            ...this.mapCommercialProductData(dto),
            ...this.mapFiscalProductData(dto),
            ...(dto.active !== undefined ? { active: dto.active } : {}),
          },
        });

        if (nextProductType === ProductType.SIMPLE) {
          await ensureOperationalVariantForSimpleProduct(tx, id);
        }

        return tx.product.findUniqueOrThrow({
          where: { id },
          include: {
            variants: {
              orderBy: [{ size: 'asc' }, { id: 'asc' }],
            },
          },
        });
      });

      return this.mapProduct(product);
    } catch (error) {
      this.handleProductWriteError(error);
    }
  }

  async updateStatus(id: number, dto: UpdateProductStatusDto) {
    await this.ensureProductExists(id);

    const product = await this.prisma.$transaction(async (tx) => {
      const updatedProduct = await tx.product.update({
        where: { id },
        data: { active: dto.active },
      });

      if (updatedProduct.productType === ProductType.SIMPLE) {
        await ensureOperationalVariantForSimpleProduct(tx, id);
      }

      return tx.product.findUniqueOrThrow({
        where: { id },
        include: {
          variants: {
            orderBy: [{ size: 'asc' }, { id: 'asc' }],
          },
        },
      });
    });

    return this.mapProduct(product);
  }

  async updateImage(id: number, file?: CatalogImageUploadFile) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        variants: {
          orderBy: [{ size: 'asc' }, { id: 'asc' }],
        },
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    if (!file) {
      throw new BadRequestException('Product image file is required');
    }

    this.catalogImageStorageService.validateImageFile(file, 'Product');

    const nextImagePath = await this.catalogImageStorageService.storeImage(
      {
        directory: 'products',
        entityLabel: 'Product',
        fileNamePrefix: 'product',
      },
      id,
      file,
    );

    try {
      const updatedProduct = await this.prisma.product.update({
        where: { id },
        data: {
          imagePath: nextImagePath,
        },
        include: {
          variants: {
            orderBy: [{ size: 'asc' }, { id: 'asc' }],
          },
        },
      });

      await this.catalogImageStorageService.deleteImage(product.imagePath);

      return this.mapProduct(updatedProduct);
    } catch (error) {
      await this.catalogImageStorageService.deleteImage(nextImagePath);
      this.handleProductWriteError(error);
    }
  }

  async removeImage(id: number) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        variants: {
          orderBy: [{ size: 'asc' }, { id: 'asc' }],
        },
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    if (!product.imagePath) {
      return this.mapProduct(product);
    }

    const updatedProduct = await this.prisma.product.update({
      where: { id },
      data: {
        imagePath: null,
      },
      include: {
        variants: {
          orderBy: [{ size: 'asc' }, { id: 'asc' }],
        },
      },
    });

    await this.catalogImageStorageService.deleteImage(product.imagePath);

    return this.mapProduct(updatedProduct);
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

      if (isOperationalVariantProduct(product.productType) && product.variants.length === 1) {
        await this.prisma.$transaction(async (tx) => {
          await tx.variantRecipeItem.deleteMany({
            where: { variantId: product.variants[0].id },
          });

          await tx.productVariant.delete({
            where: { id: product.variants[0].id },
          });

          await tx.product.delete({
            where: { id },
          });
        });

        await this.catalogImageStorageService.deleteImage(product.imagePath);

        return {
          id,
          deleted: true,
          message: 'Product deleted successfully',
        };
      }

      if (isOperationalVariantProduct(product.productType)) {
        throw new BadRequestException(
          'Simple product has multiple operational variants configured. Resolve them before deleting the product.',
        );
      }

      throw new BadRequestException(
        'Product has variants configured. Delete or deactivate its variants before deleting the product.',
      );
    }

    await this.prisma.product.delete({
      where: { id },
    });

    await this.catalogImageStorageService.deleteImage(product.imagePath);

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

      if (target.includes('sku')) {
        throw new ConflictException('Simple product SKU already exists');
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
    imagePath: string | null;
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
    const imageUrl = buildCatalogImagePublicUrl(product.imagePath);
    const imageAlt = imageUrl ? buildCatalogImageAlt(product.name) : null;

    return {
      id: product.id,
      name: product.name,
      internalCode: product.internalCode,
      barcode: product.barcode,
      supplierReference: product.supplierReference,
      description: product.description,
      brand: product.brand,
      imageUrl,
      imageAlt,
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
          product_name: product.name,
          product_type: product.productType,
          is_operational: isOperationalVariantProduct(product.productType),
          size: variant.size,
          sku: variant.sku,
          sale_price: Number(variant.salePrice),
          image_url: imageUrl,
          image_alt: imageAlt,
          active: variant.active,
        })) ?? [],
    };
  }
}
