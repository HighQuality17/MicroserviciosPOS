import { hash } from 'bcrypt';
import { PrismaClient, Dimension, UserRole } from '@prisma/client';

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
  const defaultPasswordHash = await hash('Pos123456!', 10);
  const users = [
    {
      id: 1,
      name: 'Administrador',
      username: 'admin',
      email: 'admin@local.pos',
      role: UserRole.ADMIN,
    },
    {
      id: 2,
      name: 'Cajero Principal',
      username: 'cashier',
      email: 'cashier@local.pos',
      role: UserRole.CASHIER,
    },
    {
      id: 3,
      name: 'Auditor',
      username: 'auditor',
      email: 'auditor@local.pos',
      role: UserRole.AUDITOR,
    },
  ];

  for (const user of users) {
    await prisma.user.upsert({
      where: { id: user.id },
      update: {
        name: user.name,
        username: user.username,
        email: user.email,
        passwordHash: defaultPasswordHash,
        role: user.role,
      },
      create: {
        ...user,
        passwordHash: defaultPasswordHash,
      },
    });
  }
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
