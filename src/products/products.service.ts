import { ConflictException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';

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

    return products.map((product) => ({
      id: product.id,
      name: product.name,
      active: product.active,
      variants: product.variants.map((variant) => ({
        id: variant.id,
        product_id: variant.productId,
        size: variant.size,
        sku: variant.sku,
        sale_price: Number(variant.salePrice),
        active: variant.active,
      })),
    }));
  }
}
