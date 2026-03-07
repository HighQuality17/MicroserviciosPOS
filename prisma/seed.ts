import { PrismaClient, Dimension } from '@prisma/client';

const prisma = new PrismaClient();

async function seedUnitTypes(): Promise<void> {
  const unitTypes = [
    { code: 'g', dimension: Dimension.WEIGHT, factorToBase: 1 },
    { code: 'kg', dimension: Dimension.WEIGHT, factorToBase: 1000 },
    { code: 'ml', dimension: Dimension.VOLUME, factorToBase: 1 },
    { code: 'L', dimension: Dimension.VOLUME, factorToBase: 1000 },
    { code: 'unit', dimension: Dimension.COUNT, factorToBase: 1 },
  ];

  for (const unitType of unitTypes) {
    await prisma.unitType.upsert({
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
  await seedUnitTypes();
  // Minimal user seed for local testing.
  await prisma.user.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, name: 'Admin', role: 'ADMIN' },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
