import * as path from 'node:path';
import { PrismaClient } from '@prisma/client';
import {
  ExportSnapshot,
  PaymentMetric,
  SaleMetrics,
  allIntegrityChecksPass,
  autoIncrementTableSpecs,
  decimalStringsMatch,
  readJson,
  resolveArtifactsDirectory,
  tableSpecs,
} from './common';

type DelegateLike = {
  count: (args?: Record<string, unknown>) => Promise<number>;
};

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const artifactsDirectory = resolveArtifactsDirectory(true);
  const snapshot = readJson<ExportSnapshot>(
    path.join(artifactsDirectory, 'snapshot.json'),
  );

  const tableCounts = await collectTableCounts();
  const saleMetrics = await collectSaleMetrics();
  const cashSessionMetrics = await collectCashSessionMetrics();
  const paymentMetrics = await collectPaymentMetrics();
  const lowStockCount = await collectLowStockCount();
  const integrityChecks = await collectIntegrityChecks();
  const sequenceChecks = await collectSequenceChecks();

  const mismatches = [
    ...compareTableCounts(snapshot.manifest.tableCounts, tableCounts),
    ...compareSaleMetrics(snapshot.manifest.saleMetrics, saleMetrics),
    ...compareCashSessionMetrics(
      snapshot.manifest.cashSessionMetrics,
      cashSessionMetrics,
    ),
    ...comparePaymentMetrics(snapshot.manifest.paymentMetrics, paymentMetrics),
    ...compareLowStock(snapshot.manifest.lowStockCount, lowStockCount),
    ...compareIntegrityChecks(snapshot.manifest.integrityChecks, integrityChecks),
    ...compareSequenceChecks(sequenceChecks),
  ];

  const result = {
    artifacts_directory: artifactsDirectory,
    source_manifest: snapshot.manifest,
    postgres: {
      table_counts: tableCounts,
      sale_metrics: saleMetrics,
      cash_session_metrics: cashSessionMetrics,
      payment_metrics: paymentMetrics,
      low_stock_count: lowStockCount,
      integrity_checks: integrityChecks,
      sequence_checks: sequenceChecks,
    },
    mismatches,
  };

  console.log(JSON.stringify(result, null, 2));

  if (mismatches.length > 0) {
    throw new Error('Parity verification failed.');
  }

  if (!allIntegrityChecksPass(integrityChecks)) {
    throw new Error('Integrity verification failed.');
  }
}

async function collectTableCounts(): Promise<Record<string, number>> {
  const counts: Record<string, number> = {};

  for (const tableSpec of tableSpecs) {
    const delegate = (prisma as unknown as Record<string, DelegateLike>)[
      tableSpec.prismaDelegate
    ];
    counts[tableSpec.sourceTable] = await delegate.count();
  }

  return counts;
}

async function collectSaleMetrics(): Promise<SaleMetrics> {
  const [paidAggregate, pendingAggregate] = await Promise.all([
    prisma.sale.aggregate({
      where: { status: 'PAID' },
      _count: { _all: true },
      _sum: { total: true },
    }),
    prisma.sale.aggregate({
      where: { status: 'PENDING' },
      _count: { _all: true },
      _sum: { total: true },
    }),
  ]);

  return {
    paidCount: paidAggregate._count._all,
    paidTotal: String(paidAggregate._sum.total ?? 0),
    pendingCount: pendingAggregate._count._all,
    pendingTotal: String(pendingAggregate._sum.total ?? 0),
  };
}

async function collectCashSessionMetrics(): Promise<{
  totalCount: number;
  openCount: number;
  closedCount: number;
}> {
  const [totalCount, openCount] = await Promise.all([
    prisma.cashSession.count(),
    prisma.cashSession.count({ where: { closedAt: null } }),
  ]);

  return {
    totalCount,
    openCount,
    closedCount: totalCount - openCount,
  };
}

async function collectPaymentMetrics(): Promise<PaymentMetric[]> {
  const rows = await prisma.payment.groupBy({
    by: ['method'],
    _count: { _all: true },
    _sum: {
      amountApplied: true,
      amountReceived: true,
      changeGiven: true,
    },
  });

  return rows
    .map((row) => ({
      method: row.method,
      count: row._count._all,
      amountApplied: String(row._sum.amountApplied ?? 0),
      amountReceived: String(row._sum.amountReceived ?? 0),
      changeGiven: String(row._sum.changeGiven ?? 0),
    }))
    .sort((left, right) => left.method.localeCompare(right.method));
}

async function collectLowStockCount(): Promise<number> {
  const stocks = await prisma.ingredientStock.findMany({
    include: {
      ingredient: true,
    },
  });

  return stocks.filter((stock) => {
    const threshold = stock.ingredient.dimension === 'COUNT' ? 10 : 500;
    return Number(stock.qtyOnHandBase) <= threshold;
  }).length;
}

async function collectIntegrityChecks(): Promise<Record<string, number>> {
  const queries: Record<string, string> = {
    productVariant_without_product:
      'SELECT COUNT(*)::text AS count FROM "ProductVariant" pv LEFT JOIN "Product" p ON p.id = pv."productId" WHERE p.id IS NULL',
    comboItem_without_combo:
      'SELECT COUNT(*)::text AS count FROM "ComboItem" ci LEFT JOIN "Combo" c ON c.id = ci."comboId" WHERE c.id IS NULL',
    comboItem_without_variant:
      'SELECT COUNT(*)::text AS count FROM "ComboItem" ci LEFT JOIN "ProductVariant" pv ON pv.id = ci."variantId" WHERE pv.id IS NULL',
    variantRecipe_without_variant:
      'SELECT COUNT(*)::text AS count FROM "VariantRecipeItem" vri LEFT JOIN "ProductVariant" pv ON pv.id = vri."variantId" WHERE pv.id IS NULL',
    variantRecipe_without_ingredient:
      'SELECT COUNT(*)::text AS count FROM "VariantRecipeItem" vri LEFT JOIN "Ingredient" i ON i.id = vri."ingredientId" WHERE i.id IS NULL',
    ingredientStock_without_ingredient:
      'SELECT COUNT(*)::text AS count FROM "IngredientStock" s LEFT JOIN "Ingredient" i ON i.id = s."ingredientId" WHERE i.id IS NULL',
    ingredientStock_without_location:
      'SELECT COUNT(*)::text AS count FROM "IngredientStock" s LEFT JOIN "Location" l ON l.id = s."locationId" WHERE l.id IS NULL',
    cashSession_without_location:
      'SELECT COUNT(*)::text AS count FROM "CashSession" cs LEFT JOIN "Location" l ON l.id = cs."locationId" WHERE l.id IS NULL',
    cashSession_without_user:
      'SELECT COUNT(*)::text AS count FROM "CashSession" cs LEFT JOIN "User" u ON u.id = cs."openedBy" WHERE u.id IS NULL',
    sale_without_location:
      'SELECT COUNT(*)::text AS count FROM "Sale" s LEFT JOIN "Location" l ON l.id = s."locationId" WHERE l.id IS NULL',
    sale_without_cashier:
      'SELECT COUNT(*)::text AS count FROM "Sale" s LEFT JOIN "User" u ON u.id = s."cashierId" WHERE u.id IS NULL',
    sale_without_cash_session:
      'SELECT COUNT(*)::text AS count FROM "Sale" s LEFT JOIN "CashSession" cs ON cs.id = s."cashSessionId" WHERE cs.id IS NULL',
    payment_without_sale:
      'SELECT COUNT(*)::text AS count FROM "Payment" p LEFT JOIN "Sale" s ON s.id = p."saleId" WHERE s.id IS NULL',
    audit_without_user:
      'SELECT COUNT(*)::text AS count FROM "AuditLog" a LEFT JOIN "User" u ON u.id = a."userId" WHERE u.id IS NULL',
    movement_without_ingredient:
      'SELECT COUNT(*)::text AS count FROM "IngredientMovement" m LEFT JOIN "Ingredient" i ON i.id = m."ingredientId" WHERE i.id IS NULL',
    movement_without_location:
      'SELECT COUNT(*)::text AS count FROM "IngredientMovement" m LEFT JOIN "Location" l ON l.id = m."locationId" WHERE l.id IS NULL',
    movement_without_user:
      'SELECT COUNT(*)::text AS count FROM "IngredientMovement" m LEFT JOIN "User" u ON u.id = m."userId" WHERE u.id IS NULL',
    movement_sale_ref_missing:
      'SELECT COUNT(*)::text AS count FROM "IngredientMovement" m LEFT JOIN "Sale" s ON s.id = m."refSaleId" WHERE m."refSaleId" IS NOT NULL AND s.id IS NULL',
    saleItem_variant_ref_missing:
      `SELECT COUNT(*)::text AS count
       FROM "SaleItem" si
       LEFT JOIN "ProductVariant" pv ON pv.id = si."refId"
       WHERE si."itemType" = 'VARIANT' AND pv.id IS NULL`,
    saleItem_combo_ref_missing:
      `SELECT COUNT(*)::text AS count
       FROM "SaleItem" si
       LEFT JOIN "Combo" c ON c.id = si."refId"
       WHERE si."itemType" = 'COMBO' AND c.id IS NULL`,
  };

  const results: Record<string, number> = {};

  for (const [key, sql] of Object.entries(queries)) {
    const rows = (await prisma.$queryRawUnsafe(sql)) as Array<{ count: string }>;
    results[key] = Number(rows[0]?.count ?? '0');
  }

  return results;
}

async function collectSequenceChecks(): Promise<
  Array<{
    table: string;
    sequenceName: string | null;
    maxId: number;
    lastValue: number;
    isCalled: boolean;
    ok: boolean;
  }>
> {
  const results: Array<{
    table: string;
    sequenceName: string | null;
    maxId: number;
    lastValue: number;
    isCalled: boolean;
    ok: boolean;
  }> = [];

  for (const tableSpec of autoIncrementTableSpecs) {
    const metaRows = (await prisma.$queryRawUnsafe(
      `
        SELECT
          pg_get_serial_sequence('"${tableSpec.sourceTable}"', 'id') AS "sequenceName",
          COALESCE(MAX("id"), 0)::text AS "maxId"
        FROM "${tableSpec.sourceTable}";
      `,
    )) as Array<{ sequenceName: string | null; maxId: string }>;

    const meta = metaRows[0];
    if (!meta?.sequenceName) {
      results.push({
        table: tableSpec.sourceTable,
        sequenceName: null,
        maxId: Number(meta?.maxId ?? 0),
        lastValue: 0,
        isCalled: false,
        ok: false,
      });
      continue;
    }

    const sequenceRows = (await prisma.$queryRawUnsafe(
      `SELECT last_value::text AS "lastValue", is_called AS "isCalled" FROM ${meta.sequenceName};`,
    )) as Array<{ lastValue: string; isCalled: boolean }>;

    const maxId = Number(meta.maxId);
    const lastValue = Number(sequenceRows[0]?.lastValue ?? '0');
    const isCalled = Boolean(sequenceRows[0]?.isCalled);
    const ok =
      maxId === 0 ? lastValue === 1 && !isCalled : lastValue >= maxId && isCalled;

    results.push({
      table: tableSpec.sourceTable,
      sequenceName: meta.sequenceName,
      maxId,
      lastValue,
      isCalled,
      ok,
    });
  }

  return results;
}

function compareTableCounts(
  expected: Record<string, number>,
  actual: Record<string, number>,
): string[] {
  const mismatches: string[] = [];

  for (const [table, count] of Object.entries(expected)) {
    if ((actual[table] ?? 0) !== count) {
      mismatches.push(
        `table_count:${table}: expected ${count}, got ${actual[table] ?? 0}`,
      );
    }
  }

  return mismatches;
}

function compareSaleMetrics(expected: SaleMetrics, actual: SaleMetrics): string[] {
  const mismatches: string[] = [];

  if (expected.paidCount !== actual.paidCount) {
    mismatches.push(
      `sale_metrics:paidCount: expected ${expected.paidCount}, got ${actual.paidCount}`,
    );
  }

  if (!decimalStringsMatch(expected.paidTotal, actual.paidTotal)) {
    mismatches.push(
      `sale_metrics:paidTotal: expected ${expected.paidTotal}, got ${actual.paidTotal}`,
    );
  }

  if (expected.pendingCount !== actual.pendingCount) {
    mismatches.push(
      `sale_metrics:pendingCount: expected ${expected.pendingCount}, got ${actual.pendingCount}`,
    );
  }

  if (!decimalStringsMatch(expected.pendingTotal, actual.pendingTotal)) {
    mismatches.push(
      `sale_metrics:pendingTotal: expected ${expected.pendingTotal}, got ${actual.pendingTotal}`,
    );
  }

  return mismatches;
}

function compareCashSessionMetrics(
  expected: { totalCount: number; openCount: number; closedCount: number },
  actual: { totalCount: number; openCount: number; closedCount: number },
): string[] {
  const mismatches: string[] = [];

  for (const key of ['totalCount', 'openCount', 'closedCount'] as const) {
    if (expected[key] !== actual[key]) {
      mismatches.push(
        `cash_session_metrics:${key}: expected ${expected[key]}, got ${actual[key]}`,
      );
    }
  }

  return mismatches;
}

function comparePaymentMetrics(
  expected: PaymentMetric[],
  actual: PaymentMetric[],
): string[] {
  const mismatches: string[] = [];
  const actualByMethod = new Map(actual.map((item) => [item.method, item]));

  for (const expectedItem of expected) {
    const actualItem = actualByMethod.get(expectedItem.method);
    if (!actualItem) {
      mismatches.push(`payment_metrics:${expectedItem.method}: missing method`);
      continue;
    }

    if (expectedItem.count !== actualItem.count) {
      mismatches.push(
        `payment_metrics:${expectedItem.method}:count: expected ${expectedItem.count}, got ${actualItem.count}`,
      );
    }

    if (!decimalStringsMatch(expectedItem.amountApplied, actualItem.amountApplied)) {
      mismatches.push(
        `payment_metrics:${expectedItem.method}:amountApplied: expected ${expectedItem.amountApplied}, got ${actualItem.amountApplied}`,
      );
    }

    if (
      !decimalStringsMatch(expectedItem.amountReceived, actualItem.amountReceived)
    ) {
      mismatches.push(
        `payment_metrics:${expectedItem.method}:amountReceived: expected ${expectedItem.amountReceived}, got ${actualItem.amountReceived}`,
      );
    }

    if (!decimalStringsMatch(expectedItem.changeGiven, actualItem.changeGiven)) {
      mismatches.push(
        `payment_metrics:${expectedItem.method}:changeGiven: expected ${expectedItem.changeGiven}, got ${actualItem.changeGiven}`,
      );
    }
  }

  if (expected.length !== actual.length) {
    mismatches.push(
      `payment_metrics:length: expected ${expected.length}, got ${actual.length}`,
    );
  }

  return mismatches;
}

function compareLowStock(expected: number, actual: number): string[] {
  return expected === actual
    ? []
    : [`low_stock_count: expected ${expected}, got ${actual}`];
}

function compareIntegrityChecks(
  expected: Record<string, number>,
  actual: Record<string, number>,
): string[] {
  const mismatches: string[] = [];

  for (const [key, value] of Object.entries(expected)) {
    if ((actual[key] ?? 0) !== value) {
      mismatches.push(
        `integrity_checks:${key}: expected ${value}, got ${actual[key] ?? 0}`,
      );
    }
  }

  return mismatches;
}

function compareSequenceChecks(
  checks: Array<{
    table: string;
    ok: boolean;
    maxId: number;
    lastValue: number;
    isCalled: boolean;
  }>,
): string[] {
  return checks
    .filter((check) => !check.ok)
    .map(
      (check) =>
        `sequence:${check.table}: invalid state maxId=${check.maxId}, lastValue=${check.lastValue}, isCalled=${check.isCalled}`,
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
