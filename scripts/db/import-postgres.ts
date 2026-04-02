import * as path from 'node:path';
import { PrismaClient } from '@prisma/client';
import {
  ExportSnapshot,
  autoIncrementTableSpecs,
  denormalizeSnapshotRow,
  getArgValue,
  hasArg,
  readJson,
  resolveArtifactsDirectory,
  tableSpecs,
} from './common';

type DelegateLike = {
  count: (args?: Record<string, unknown>) => Promise<number>;
  createMany: (args: { data: Record<string, unknown>[] }) => Promise<{
    count: number;
  }>;
};

type SequenceClient = {
  $executeRawUnsafe: (query: string) => Promise<unknown>;
};

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const artifactsDirectory = resolveArtifactsDirectory(true);
  const snapshotPath =
    getArgValue('--snapshot-path') ?? path.join(artifactsDirectory, 'snapshot.json');
  const snapshot = readJson<ExportSnapshot>(snapshotPath);
  const resetOnly = hasArg('--reset-sequences-only');

  if (resetOnly) {
    const resetSummary = await resetSequences(prisma);
    console.log(
      JSON.stringify(
        {
          mode: 'reset-sequences-only',
          tables: resetSummary,
        },
        null,
        2,
      ),
    );
    return;
  }

  await assertTargetDatabaseIsEmpty(prisma);
  assertSnapshotIsConsistent(snapshot);

  const importedCounts: Record<string, number> = {};

  await prisma.$transaction(
    async (tx) => {
      for (const tableSpec of tableSpecs) {
        const rows = (snapshot.tables[tableSpec.key] ?? []).map((row) =>
          denormalizeSnapshotRow(tableSpec, row),
        );

        if (rows.length === 0) {
          importedCounts[tableSpec.sourceTable] = 0;
          continue;
        }

        const delegate = (tx as unknown as Record<string, DelegateLike>)[
          tableSpec.prismaDelegate
        ];
        const result = await delegate.createMany({ data: rows });
        importedCounts[tableSpec.sourceTable] = result.count;
      }

      await resetSequences(tx as unknown as SequenceClient);
    },
    {
      maxWait: 60_000,
      timeout: 600_000,
    },
  );

  console.log(
    JSON.stringify(
      {
        mode: 'import',
        imported_counts: importedCounts,
        manifest_table_counts: snapshot.manifest.tableCounts,
      },
      null,
      2,
    ),
  );
}

function assertSnapshotIsConsistent(snapshot: ExportSnapshot): void {
  for (const tableSpec of tableSpecs) {
    const expectedCount = snapshot.manifest.tableCounts[tableSpec.sourceTable] ?? 0;
    const actualCount = snapshot.tables[tableSpec.key]?.length ?? 0;

    if (expectedCount !== actualCount) {
      throw new Error(
        `Snapshot inconsistency for ${tableSpec.sourceTable}: manifest=${expectedCount}, rows=${actualCount}.`,
      );
    }
  }
}

async function assertTargetDatabaseIsEmpty(client: PrismaClient): Promise<void> {
  const nonEmptyTables: Array<{ table: string; count: number }> = [];

  for (const tableSpec of tableSpecs) {
    const delegate = (client as unknown as Record<string, DelegateLike>)[
      tableSpec.prismaDelegate
    ];
    const count = await delegate.count();
    if (count > 0) {
      nonEmptyTables.push({
        table: tableSpec.sourceTable,
        count,
      });
    }
  }

  if (nonEmptyTables.length > 0) {
    throw new Error(
      `Target PostgreSQL database is not empty: ${JSON.stringify(nonEmptyTables)}`,
    );
  }
}

async function resetSequences(client: SequenceClient): Promise<string[]> {
  const adjustedTables: string[] = [];

  for (const tableSpec of autoIncrementTableSpecs) {
    const sql = `
      SELECT setval(
        pg_get_serial_sequence('"${tableSpec.sourceTable}"', 'id'),
        COALESCE(MAX("id"), 1),
        MAX("id") IS NOT NULL
      )
      FROM "${tableSpec.sourceTable}";
    `;

    await client.$executeRawUnsafe(sql);
    adjustedTables.push(tableSpec.sourceTable);
  }

  return adjustedTables;
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
