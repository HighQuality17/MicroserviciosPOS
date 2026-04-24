import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { mkdir, rm, writeFile } from 'fs/promises';
import { join, resolve, sep } from 'path';
import {
  PRODUCT_IMAGE_MAX_BYTES,
  isSupportedProductImageMimeType,
  type ProductImageUploadFile,
  resolveProductImageExtension,
} from './product-image.util';

@Injectable()
export class ProductImageStorageService {
  private readonly uploadsRoot = resolve(process.cwd(), 'uploads');

  validateProductImageFile(file: ProductImageUploadFile | undefined | null) {
    if (!file) {
      throw new BadRequestException('Product image file is required');
    }

    if (!isSupportedProductImageMimeType(file.mimetype)) {
      throw new BadRequestException('Product image must be WebP, PNG, JPG or JPEG');
    }

    if (file.size > PRODUCT_IMAGE_MAX_BYTES) {
      throw new BadRequestException('Product image must be 3 MB or smaller');
    }
  }

  async storeProductImage(productId: number, file: ProductImageUploadFile) {
    this.validateProductImageFile(file);

    const extension = resolveProductImageExtension(file.mimetype);
    if (!extension) {
      throw new BadRequestException('Product image must be WebP, PNG, JPG or JPEG');
    }

    const storageKey = `products/product-${productId}-${Date.now()}-${randomUUID()}.${extension}`;
    const absolutePath = this.resolveAbsoluteImagePath(storageKey);

    await mkdir(join(this.uploadsRoot, 'products'), { recursive: true });

    try {
      await writeFile(absolutePath, file.buffer);
    } catch {
      throw new InternalServerErrorException('Product image could not be stored');
    }

    return storageKey;
  }

  async deleteProductImage(imagePath: string | null | undefined) {
    if (!imagePath) {
      return;
    }

    const absolutePath = this.resolveAbsoluteImagePath(imagePath);
    await rm(absolutePath, { force: true });
  }

  private resolveAbsoluteImagePath(imagePath: string) {
    const normalizedImagePath = imagePath.replace(/\\/g, '/').replace(/^\/+/, '');
    const absolutePath = resolve(this.uploadsRoot, normalizedImagePath);
    const uploadsRootWithSeparator = `${this.uploadsRoot}${sep}`;

    if (
      absolutePath !== this.uploadsRoot &&
      !absolutePath.startsWith(uploadsRootWithSeparator)
    ) {
      throw new BadRequestException('Product image path is invalid');
    }

    return absolutePath;
  }
}
