import type { ProductMediaKind } from '@/components/ProductMedia';
import { resolveApiAssetUrl } from '@/services/api/assets';

export type CatalogImageDraft = {
  imageUrl: string | null;
  imageAlt: string;
  pendingImageFile: File | null;
  markedForRemoval: boolean;
  error: string | null;
};

export const catalogImageUrlKeys = [
  'image_url',
  'imageUrl',
  'thumbnail_url',
  'thumbnailUrl',
  'photo_url',
  'photoUrl',
  'image_src',
  'imageSrc',
] as const;

export const catalogImageAltKeys = [
  'image_alt',
  'imageAlt',
  'alt_text',
  'altText',
] as const;

const allowedCatalogImageMimeTypes = new Set([
  'image/webp',
  'image/png',
  'image/jpeg',
]);

const maxCatalogImageFileBytes = 3 * 1024 * 1024;

export function createEmptyCatalogImageDraft(): CatalogImageDraft {
  return {
    imageUrl: null,
    imageAlt: '',
    pendingImageFile: null,
    markedForRemoval: false,
    error: null,
  };
}

export function getCatalogEntityImageDraft(
  entity: unknown,
  fallbackName: string,
): CatalogImageDraft {
  const imageUrl = resolveApiAssetUrl(
    readOptionalCatalogMediaValue(entity, catalogImageUrlKeys),
  );

  return {
    imageUrl,
    imageAlt: readOptionalCatalogMediaValue(entity, catalogImageAltKeys) ?? fallbackName,
    pendingImageFile: null,
    markedForRemoval: false,
    error: null,
  };
}

export function selectCatalogImage(
  current: CatalogImageDraft,
  file: File | null,
): CatalogImageDraft {
  if (!file) {
    return {
      ...current,
      error: null,
    };
  }

  const validationError = validateCatalogImageFile(file);

  if (validationError) {
    return {
      ...current,
      error: validationError,
    };
  }

  return {
    ...current,
    pendingImageFile: file,
    markedForRemoval: false,
    error: null,
  };
}

export function removeCatalogImage(current: CatalogImageDraft): CatalogImageDraft {
  if (current.pendingImageFile) {
    return {
      ...current,
      pendingImageFile: null,
      error: null,
    };
  }

  if (current.imageUrl && !current.markedForRemoval) {
    return {
      ...current,
      markedForRemoval: true,
      error: null,
    };
  }

  return {
    ...current,
    error: null,
  };
}

export function restoreCatalogImage(current: CatalogImageDraft): CatalogImageDraft {
  if (!current.imageUrl) {
    return {
      ...current,
      error: null,
    };
  }

  return {
    ...current,
    pendingImageFile: null,
    markedForRemoval: false,
    error: null,
  };
}

export function validateCatalogImageFile(file: File) {
  const normalizedName = file.name.trim().toLowerCase();
  const hasAllowedMimeType =
    !file.type || allowedCatalogImageMimeTypes.has(file.type.toLowerCase());
  const hasAllowedExtension = ['.webp', '.png', '.jpg', '.jpeg'].some((extension) =>
    normalizedName.endsWith(extension),
  );

  if (!hasAllowedMimeType && !hasAllowedExtension) {
    return 'Usa una imagen WebP, PNG, JPG o JPEG.';
  }

  if (file.size > maxCatalogImageFileBytes) {
    return 'La imagen no puede superar 3 MB.';
  }

  return null;
}

export function readOptionalCatalogMediaValue(
  candidate: unknown,
  keys: readonly string[],
) {
  if (!candidate || typeof candidate !== 'object') {
    return null;
  }

  const record = candidate as Record<string, unknown>;

  for (const key of keys) {
    const value = record[key];

    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }

  return null;
}

export function resolveCatalogImageMutationAction(draft: CatalogImageDraft) {
  if (draft.markedForRemoval && draft.imageUrl && !draft.pendingImageFile) {
    return 'quitarse';
  }

  if (draft.pendingImageFile && draft.imageUrl && !draft.markedForRemoval) {
    return 'reemplazarse';
  }

  return 'guardarse';
}

export function resolveCatalogImageKind(kind?: ProductMediaKind) {
  return kind ?? 'DEFAULT';
}
