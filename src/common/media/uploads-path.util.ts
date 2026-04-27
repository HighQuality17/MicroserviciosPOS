import { mkdir } from 'fs/promises';
import { join, resolve } from 'path';

const defaultUploadsDirectoryName = 'uploads';
export const catalogUploadsDirectories = ['products', 'combos'] as const;

export const UPLOADS_PUBLIC_PREFIX = '/uploads/';
export type CatalogUploadsDirectory = (typeof catalogUploadsDirectories)[number];

export function resolveUploadsRoot() {
  const configuredUploadsDir = process.env.UPLOADS_DIR?.trim();

  if (!configuredUploadsDir) {
    return resolve(process.cwd(), defaultUploadsDirectoryName);
  }

  return resolve(configuredUploadsDir);
}

export function resolveUploadsDirectory(directory: CatalogUploadsDirectory) {
  return join(resolveUploadsRoot(), directory);
}

export async function ensureUploadsDirectoriesExist() {
  const uploadsRoot = resolveUploadsRoot();

  await mkdir(uploadsRoot, { recursive: true });
  await Promise.all(
    catalogUploadsDirectories.map((directory) =>
      mkdir(join(uploadsRoot, directory), { recursive: true }),
    ),
  );
}
