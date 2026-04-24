export interface ProductImageUploadFile {
  buffer: Buffer;
  mimetype: string;
  size: number;
}

export const PRODUCT_IMAGE_MAX_BYTES = 3 * 1024 * 1024;

const productImageMimeTypeToExtension = {
  'image/webp': 'webp',
  'image/png': 'png',
  'image/jpeg': 'jpg',
} as const;

export function isSupportedProductImageMimeType(mimeType: string | undefined) {
  if (!mimeType) {
    return false;
  }

  return mimeType in productImageMimeTypeToExtension;
}

export function resolveProductImageExtension(mimeType: string | undefined) {
  if (!mimeType || !(mimeType in productImageMimeTypeToExtension)) {
    return null;
  }

  return productImageMimeTypeToExtension[
    mimeType as keyof typeof productImageMimeTypeToExtension
  ];
}

export function buildProductImagePublicUrl(imagePath: string | null | undefined) {
  if (!imagePath) {
    return null;
  }

  const normalizedImagePath = imagePath.replace(/\\/g, '/').replace(/^\/+/, '');
  return `/uploads/${normalizedImagePath}`;
}

export function buildProductImageAlt(productName: string) {
  return `Imagen de ${productName}`;
}
