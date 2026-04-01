import { Prisma, ProductType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type PrismaLike = PrismaService | Prisma.TransactionClient;

const OPERATIONAL_VARIANT_SIZE = '';

function buildOperationalVariantSku(productId: number) {
  return `PRD-${productId}-BASE`;
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
) {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: {
      variants: {
        select: { id: true },
        take: 2,
      },
    },
  });

  if (
    !product ||
    product.productType !== ProductType.SIMPLE ||
    product.variants.length > 0
  ) {
    return;
  }

  try {
    await prisma.productVariant.create({
      data: {
        productId: product.id,
        size: OPERATIONAL_VARIANT_SIZE,
        sku: buildOperationalVariantSku(product.id),
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
      variants: {
        none: {},
      },
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
