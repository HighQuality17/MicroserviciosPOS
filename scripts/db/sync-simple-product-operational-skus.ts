import { PrismaClient, ProductType } from '@prisma/client';
import { ensureOperationalVariantForSimpleProduct } from '../../src/products/operational-variant.util';

const prisma = new PrismaClient();

function isGeneratedOperationalSku(productId: number, sku: string) {
  return sku === `PRD-${productId}-BASE`;
}

async function main() {
  const simpleProducts = await prisma.product.findMany({
    where: {
      productType: ProductType.SIMPLE,
    },
    select: {
      id: true,
      internalCode: true,
      variants: {
        orderBy: { id: 'asc' },
        select: {
          id: true,
          sku: true,
        },
        take: 1,
      },
    },
    orderBy: { id: 'asc' },
  });

  const candidates = simpleProducts.filter((product) => {
    const operationalVariant = product.variants[0];
    if (!operationalVariant) return true;
    if (!product.internalCode?.trim()) return false;
    return operationalVariant.sku !== product.internalCode.trim();
  });

  for (const product of candidates) {
    await ensureOperationalVariantForSimpleProduct(prisma, product.id);
  }

  const remainingGeneratedSkus = await prisma.productVariant.findMany({
    where: {
      product: {
        productType: ProductType.SIMPLE,
      },
    },
    select: {
      id: true,
      productId: true,
      sku: true,
    },
  });

  const generatedBaseSkus = remainingGeneratedSkus.filter((variant) =>
    isGeneratedOperationalSku(variant.productId, variant.sku),
  ).length;

  console.log(
    JSON.stringify(
      {
        simple_products_scanned: simpleProducts.length,
        candidates_updated: candidates.length,
        generated_base_skus_remaining: generatedBaseSkus,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
