import { hash } from 'bcrypt';
import { PrismaClient, UserRole } from '@prisma/client';
import { seedReferenceData } from './seed';

const prisma = new PrismaClient();

async function assertFreshDemoDatabase(client: PrismaClient): Promise<void> {
  const [
    userCount,
    locationCount,
    ingredientCount,
    productCount,
    comboCount,
    cashSessionCount,
    saleCount,
    paymentCount,
    auditLogCount,
    movementCount,
  ] = await Promise.all([
    client.user.count(),
    client.location.count(),
    client.ingredient.count(),
    client.product.count(),
    client.combo.count(),
    client.cashSession.count(),
    client.sale.count(),
    client.payment.count(),
    client.auditLog.count(),
    client.ingredientMovement.count(),
  ]);

  const hasOperationalData =
    userCount > 0 ||
    locationCount > 0 ||
    ingredientCount > 0 ||
    productCount > 0 ||
    comboCount > 0 ||
    cashSessionCount > 0 ||
    saleCount > 0 ||
    paymentCount > 0 ||
    auditLogCount > 0 ||
    movementCount > 0;

  if (hasOperationalData) {
    throw new Error(
      'prisma/seed.demo.ts can only run on a fresh demo database. Do not use it after importing real SQLite data.',
    );
  }
}

async function seedDemoUsers(client: PrismaClient): Promise<void> {
  const defaultPasswordHash = await hash('example-demo-password-only', 10);
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
    await client.user.upsert({
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

async function main(): Promise<void> {
  await seedReferenceData(prisma);
  await assertFreshDemoDatabase(prisma);
  await seedDemoUsers(prisma);
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
