import * as path from 'node:path';
import {
  ExportSnapshot,
  allIntegrityChecksPass,
  assertDirectoryIsEmpty,
  buildManifest,
  createSqliteBackup,
  ensureDirectory,
  exportTableRows,
  loadMigrationHistory,
  openSqliteReadOnly,
  resolveArtifactsDirectory,
  resolveSqliteDatabaseUrl,
  resolveSqliteFilePath,
  tableSpecs,
  writeJson,
} from './common';

async function main(): Promise<void> {
  const artifactsDirectory = resolveArtifactsDirectory(false);
  ensureDirectory(artifactsDirectory);
  assertDirectoryIsEmpty(artifactsDirectory);

  const sqliteSourceUrl = resolveSqliteDatabaseUrl();
  const sqliteSourcePath = resolveSqliteFilePath(sqliteSourceUrl);
  const backup = createSqliteBackup(sqliteSourcePath, artifactsDirectory);
  const database = openSqliteReadOnly(backup.backupPath);

  try {
    const tables: ExportSnapshot['tables'] = {};
    for (const tableSpec of tableSpecs) {
      tables[tableSpec.key] = exportTableRows(database, tableSpec);
    }

    const manifest = buildManifest(tables, {
      generatedAt: new Date().toISOString(),
      sqliteSourceUrl,
      sqliteSourcePath,
      sqliteBackupPath: backup.backupPath,
      sqliteBackupSha256: backup.sha256,
      sqliteBackupSizeBytes: backup.sizeBytes,
      migrationHistory: loadMigrationHistory(database),
    });

    if (!allIntegrityChecksPass(manifest.integrityChecks)) {
      throw new Error(
        `The SQLite source has orphaned records. Integrity summary: ${JSON.stringify(
          manifest.integrityChecks,
        )}`,
      );
    }

    const snapshot: ExportSnapshot = {
      manifest,
      tables,
    };

    const manifestPath = path.join(artifactsDirectory, 'manifest.json');
    const snapshotPath = path.join(artifactsDirectory, 'snapshot.json');
    writeJson(manifestPath, manifest);
    writeJson(snapshotPath, snapshot);

    console.log(
      JSON.stringify(
        {
          artifacts_directory: artifactsDirectory,
          manifest_path: manifestPath,
          snapshot_path: snapshotPath,
          sqlite_backup_path: backup.backupPath,
          sqlite_backup_sha256: backup.sha256,
          table_counts: manifest.tableCounts,
          sale_metrics: manifest.saleMetrics,
          cash_session_metrics: manifest.cashSessionMetrics,
          payment_metrics: manifest.paymentMetrics,
          low_stock_count: manifest.lowStockCount,
        },
        null,
        2,
      ),
    );
  } finally {
    database.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
