import { PrismaClient, Dimension } from '@prisma/client';

const prisma = new PrismaClient();

const defaultUnitTypes = [
  { code: 'g', dimension: Dimension.WEIGHT, factorToBase: 1 },
  { code: 'kg', dimension: Dimension.WEIGHT, factorToBase: 1000 },
  { code: 'ml', dimension: Dimension.VOLUME, factorToBase: 1 },
  { code: 'L', dimension: Dimension.VOLUME, factorToBase: 1000 },
  { code: 'unit', dimension: Dimension.COUNT, factorToBase: 1 },
];

export async function seedReferenceData(client: PrismaClient): Promise<void> {
  for (const unitType of defaultUnitTypes) {
    await client.unitType.upsert({
      where: { code: unitType.code },
      update: {
        dimension: unitType.dimension,
        factorToBase: unitType.factorToBase,
      },
      create: unitType,
    });
  }
}

async function main(): Promise<void> {
  await seedReferenceData(prisma);
}

if (require.main === module) {
  main()
    .then(async () => {
      await prisma.$disconnect();
    })
    .catch(async (error) => {
      console.error(error);
      await prisma.$disconnect();
      process.exit(1);
    });
}
