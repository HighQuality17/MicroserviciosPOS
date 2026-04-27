import { UPLOADS_PUBLIC_PREFIX } from './uploads-path.util';

export interface CatalogImageUploadFile {
  buffer: Buffer;
  mimetype: string;
  size: number;
}

export const CATALOG_IMAGE_MAX_BYTES = 3 * 1024 * 1024;

const catalogImageMimeTypeToExtension = {
  'image/webp': 'webp',
  'image/png': 'png',
  'image/jpeg': 'jpg',
} as const;

export function isSupportedCatalogImageMimeType(mimeType: string | undefined) {
  if (!mimeType) {
    return false;
  }

  return mimeType in catalogImageMimeTypeToExtension;
}

export function resolveCatalogImageExtension(mimeType: string | undefined) {
  if (!mimeType || !(mimeType in catalogImageMimeTypeToExtension)) {
    return null;
  }

  return catalogImageMimeTypeToExtension[
    mimeType as keyof typeof catalogImageMimeTypeToExtension
  ];
}

export function buildCatalogImagePublicUrl(imagePath: string | null | undefined) {
  if (!imagePath) {
    return null;
  }

  const normalizedImagePath = imagePath.replace(/\\/g, '/').replace(/^\/+/, '');
  return `${UPLOADS_PUBLIC_PREFIX}${normalizedImagePath}`;
}

export function buildCatalogImageAlt(name: string) {
  return `Imagen de ${name}`;
}
