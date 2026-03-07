import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVariantDto } from './dto/create-variant.dto';

@Injectable()
export class VariantsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateVariantDto) {
    const product = await this.prisma.product.findUnique({
      where: { id: dto.product_id },
    });
    if (!product) throw new NotFoundException('Product not found');
    if (dto.sale_price < 0) {
      throw new BadRequestException('sale_price must be >= 0');
    }

    try {
      return await this.prisma.productVariant.create({
        data: {
          productId: dto.product_id,
          size: dto.size.trim(),
          sku: dto.sku.trim(),
          salePrice: dto.sale_price,
          active: dto.active ?? true,
        },
      });
    } catch {
      throw new ConflictException('Variant sku already exists');
    }
  }
}
