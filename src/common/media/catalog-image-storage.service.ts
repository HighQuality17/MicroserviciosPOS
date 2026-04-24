import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { mkdir, rm, writeFile } from 'fs/promises';
import { join, resolve, sep } from 'path';
import {
  CATALOG_IMAGE_MAX_BYTES,
  isSupportedCatalogImageMimeType,
  type CatalogImageUploadFile,
  resolveCatalogImageExtension,
} from './catalog-image.util';

type CatalogImageEntityConfig = {
  directory: string;
  entityLabel: 'Product' | 'Combo';
  fileNamePrefix: string;
};

@Injectable()
export class CatalogImageStorageService {
  private readonly uploadsRoot = resolve(process.cwd(), 'uploads');

  validateImageFile(
    file: CatalogImageUploadFile | undefined | null,
    entityLabel: CatalogImageEntityConfig['entityLabel'],
  ) {
    if (!file) {
      throw new BadRequestException(`${entityLabel} image file is required`);
    }

    if (!isSupportedCatalogImageMimeType(file.mimetype)) {
      throw new BadRequestException(
        `${entityLabel} image must be WebP, PNG, JPG or JPEG`,
      );
    }

    if (file.size > CATALOG_IMAGE_MAX_BYTES) {
      throw new BadRequestException(`${entityLabel} image must be 3 MB or smaller`);
    }
  }

  async storeImage(
    config: CatalogImageEntityConfig,
    entityId: number,
    file: CatalogImageUploadFile,
  ) {
    this.validateImageFile(file, config.entityLabel);

    const extension = resolveCatalogImageExtension(file.mimetype);
    if (!extension) {
      throw new BadRequestException(
        `${config.entityLabel} image must be WebP, PNG, JPG or JPEG`,
      );
    }

    const storageKey = `${config.directory}/${config.fileNamePrefix}-${entityId}-${Date.now()}-${randomUUID()}.${extension}`;
    const absolutePath = this.resolveAbsoluteImagePath(storageKey);

    await mkdir(join(this.uploadsRoot, config.directory), { recursive: true });

    try {
      await writeFile(absolutePath, file.buffer);
    } catch {
      throw new InternalServerErrorException(
        `${config.entityLabel} image could not be stored`,
      );
    }

    return storageKey;
  }

  async deleteImage(imagePath: string | null | undefined) {
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
      throw new BadRequestException('Catalog image path is invalid');
    }

    return absolutePath;
  }
}
