import { Prisma, PrismaClient, ProductType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type PrismaLike = PrismaService | Prisma.TransactionClient | PrismaClient;

const OPERATIONAL_VARIANT_SIZE = '';

function buildOperationalVariantSku(productId: number) {
  return `PRD-${productId}-BASE`;
}

function normalizeOptionalText(value: string | null | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function resolveOperationalVariantSku(
  productId: number,
  productInternalCode: string | null | undefined,
  currentSku?: string,
) {
  return (
    normalizeOptionalText(productInternalCode) ??
    normalizeOptionalText(currentSku) ??
    buildOperationalVariantSku(productId)
  );
}

function isUniqueConstraintError(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002'
  );
}

export async function ensureOperationalVariantForSimpleProduct(
  prisma: PrismaLike,
  productId: number,
  options?: { size?: string | null },
) {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: {
      variants: {
        orderBy: { id: 'asc' },
        select: {
          id: true,
          sku: true,
          size: true,
          active: true,
        },
        take: 2,
      },
    },
  });

  if (!product || product.productType !== ProductType.SIMPLE) {
    return;
  }

  const operationalVariant = product.variants[0];
  const nextSku = resolveOperationalVariantSku(
    product.id,
    product.internalCode,
    operationalVariant?.sku,
  );
  const requestedSize = normalizeOptionalText(options?.size);
  const nextSize = requestedSize ?? operationalVariant?.size ?? OPERATIONAL_VARIANT_SIZE;

  if (operationalVariant) {
    const nextData: { sku?: string; active?: boolean; size?: string } = {};

    if (operationalVariant.sku !== nextSku) {
      nextData.sku = nextSku;
    }

    if (operationalVariant.size !== nextSize) {
      nextData.size = nextSize;
    }

    if (operationalVariant.active !== product.active) {
      nextData.active = product.active;
    }

    if (Object.keys(nextData).length > 0) {
      await prisma.productVariant.update({
        where: { id: operationalVariant.id },
        data: nextData,
      });
    }

    return;
  }

  try {
    await prisma.productVariant.create({
      data: {
        productId: product.id,
        size: nextSize,
        sku: nextSku,
        salePrice: 0,
        active: product.active,
      },
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return;
    }

    throw error;
  }
}

export async function ensureOperationalVariantsForSimpleProducts(
  prisma: PrismaLike,
) {
  const products = await prisma.product.findMany({
    where: {
      productType: ProductType.SIMPLE,
    },
    select: {
      id: true,
    },
  });

  for (const product of products) {
    await ensureOperationalVariantForSimpleProduct(prisma, product.id);
  }
}

export function isOperationalVariantProduct(productType: ProductType) {
  return productType === ProductType.SIMPLE;
}
