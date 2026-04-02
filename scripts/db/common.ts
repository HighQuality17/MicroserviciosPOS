import { createHash } from 'node:crypto';
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

export interface SqliteDatabaseLike {
  prepare: (sql: string) => {
    all: () => Array<Record<string, unknown>>;
  };
  close: () => void;
}

export type ColumnKind = 'string' | 'int' | 'decimal' | 'boolean' | 'datetime';

export interface ColumnSpec {
  dbName: string;
  fieldName: string;
  kind: ColumnKind;
}

export interface TableSpec {
  key: string;
  sourceTable: string;
  prismaDelegate: string;
  orderBy: string;
  autoIncrement: boolean;
  columns: ColumnSpec[];
}

export interface PaymentMetric {
  method: string;
  count: number;
  amountApplied: string;
  amountReceived: string;
  changeGiven: string;
}

export interface SaleMetrics {
  paidCount: number;
  paidTotal: string;
  pendingCount: number;
  pendingTotal: string;
}

export interface CashSessionMetrics {
  totalCount: number;
  openCount: number;
  closedCount: number;
}

export interface ParityManifest {
  version: number;
  generatedAt: string;
  sqliteSourceUrl: string;
  sqliteSourcePath: string;
  sqliteBackupPath: string;
  sqliteBackupSha256: string;
  sqliteBackupSizeBytes: number;
  migrationHistory: string[];
  tableCounts: Record<string, number>;
  saleMetrics: SaleMetrics;
  cashSessionMetrics: CashSessionMetrics;
  paymentMetrics: PaymentMetric[];
  lowStockCount: number;
  integrityChecks: Record<string, number>;
}

export interface ExportSnapshot {
  manifest: ParityManifest;
  tables: Record<string, Record<string, unknown>[]>;
}

export const DECIMAL_SCALE = 6n;
export const DEFAULT_ARTIFACTS_ROOT = path.join(
  os.tmpdir(),
  'MicroserviciosPOS',
  'postgresql-migration',
);

export const tableSpecs: TableSpec[] = [
  {
    key: 'unitTypes',
    sourceTable: 'UnitType',
    prismaDelegate: 'unitType',
    orderBy: '"id" ASC',
    autoIncrement: true,
    columns: [
      { dbName: 'id', fieldName: 'id', kind: 'int' },
      { dbName: 'code', fieldName: 'code', kind: 'string' },
      { dbName: 'dimension', fieldName: 'dimension', kind: 'string' },
      { dbName: 'factorToBase', fieldName: 'factorToBase', kind: 'decimal' },
    ],
  },
  {
    key: 'users',
    sourceTable: 'User',
    prismaDelegate: 'user',
    orderBy: '"id" ASC',
    autoIncrement: true,
    columns: [
      { dbName: 'id', fieldName: 'id', kind: 'int' },
      { dbName: 'name', fieldName: 'name', kind: 'string' },
      { dbName: 'username', fieldName: 'username', kind: 'string' },
      { dbName: 'email', fieldName: 'email', kind: 'string' },
      { dbName: 'passwordHash', fieldName: 'passwordHash', kind: 'string' },
      { dbName: 'role', fieldName: 'role', kind: 'string' },
      {
        dbName: 'themePreference',
        fieldName: 'themePreference',
        kind: 'string',
      },
    ],
  },
  {
    key: 'locations',
    sourceTable: 'Location',
    prismaDelegate: 'location',
    orderBy: '"id" ASC',
    autoIncrement: true,
    columns: [
      { dbName: 'id', fieldName: 'id', kind: 'int' },
      { dbName: 'name', fieldName: 'name', kind: 'string' },
    ],
  },
  {
    key: 'ingredients',
    sourceTable: 'Ingredient',
    prismaDelegate: 'ingredient',
    orderBy: '"id" ASC',
    autoIncrement: true,
    columns: [
      { dbName: 'id', fieldName: 'id', kind: 'int' },
      { dbName: 'name', fieldName: 'name', kind: 'string' },
      { dbName: 'dimension', fieldName: 'dimension', kind: 'string' },
      {
        dbName: 'defaultUnitCode',
        fieldName: 'defaultUnitCode',
        kind: 'string',
      },
    ],
  },
  {
    key: 'products',
    sourceTable: 'Product',
    prismaDelegate: 'product',
    orderBy: '"id" ASC',
    autoIncrement: true,
    columns: [
      { dbName: 'id', fieldName: 'id', kind: 'int' },
      { dbName: 'name', fieldName: 'name', kind: 'string' },
      { dbName: 'internalCode', fieldName: 'internalCode', kind: 'string' },
      { dbName: 'barcode', fieldName: 'barcode', kind: 'string' },
      {
        dbName: 'supplierReference',
        fieldName: 'supplierReference',
        kind: 'string',
      },
      { dbName: 'description', fieldName: 'description', kind: 'string' },
      { dbName: 'brand', fieldName: 'brand', kind: 'string' },
      { dbName: 'productType', fieldName: 'productType', kind: 'string' },
      { dbName: 'unspscCode', fieldName: 'unspscCode', kind: 'string' },
      { dbName: 'vatType', fieldName: 'vatType', kind: 'string' },
      { dbName: 'taxCategory', fieldName: 'taxCategory', kind: 'string' },
      { dbName: 'unitMeasure', fieldName: 'unitMeasure', kind: 'string' },
      { dbName: 'isService', fieldName: 'isService', kind: 'boolean' },
      { dbName: 'applyInc', fieldName: 'applyInc', kind: 'boolean' },
      { dbName: 'active', fieldName: 'active', kind: 'boolean' },
    ],
  },
  {
    key: 'productVariants',
    sourceTable: 'ProductVariant',
    prismaDelegate: 'productVariant',
    orderBy: '"id" ASC',
    autoIncrement: true,
    columns: [
      { dbName: 'id', fieldName: 'id', kind: 'int' },
      { dbName: 'productId', fieldName: 'productId', kind: 'int' },
      { dbName: 'size', fieldName: 'size', kind: 'string' },
      { dbName: 'sku', fieldName: 'sku', kind: 'string' },
      { dbName: 'salePrice', fieldName: 'salePrice', kind: 'decimal' },
      { dbName: 'active', fieldName: 'active', kind: 'boolean' },
    ],
  },
  {
    key: 'combos',
    sourceTable: 'Combo',
    prismaDelegate: 'combo',
    orderBy: '"id" ASC',
    autoIncrement: true,
    columns: [
      { dbName: 'id', fieldName: 'id', kind: 'int' },
      { dbName: 'name', fieldName: 'name', kind: 'string' },
      { dbName: 'salePrice', fieldName: 'salePrice', kind: 'decimal' },
      { dbName: 'active', fieldName: 'active', kind: 'boolean' },
    ],
  },
  {
    key: 'variantRecipeItems',
    sourceTable: 'VariantRecipeItem',
    prismaDelegate: 'variantRecipeItem',
    orderBy: '"variantId" ASC, "ingredientId" ASC',
    autoIncrement: false,
    columns: [
      { dbName: 'variantId', fieldName: 'variantId', kind: 'int' },
      { dbName: 'ingredientId', fieldName: 'ingredientId', kind: 'int' },
      {
        dbName: 'qtyBaseRequired',
        fieldName: 'qtyBaseRequired',
        kind: 'decimal',
      },
    ],
  },
  {
    key: 'comboItems',
    sourceTable: 'ComboItem',
    prismaDelegate: 'comboItem',
    orderBy: '"id" ASC',
    autoIncrement: true,
    columns: [
      { dbName: 'id', fieldName: 'id', kind: 'int' },
      { dbName: 'comboId', fieldName: 'comboId', kind: 'int' },
      { dbName: 'variantId', fieldName: 'variantId', kind: 'int' },
      { dbName: 'qty', fieldName: 'qty', kind: 'decimal' },
    ],
  },
  {
    key: 'ingredientStocks',
    sourceTable: 'IngredientStock',
    prismaDelegate: 'ingredientStock',
    orderBy: '"ingredientId" ASC, "locationId" ASC',
    autoIncrement: false,
    columns: [
      { dbName: 'ingredientId', fieldName: 'ingredientId', kind: 'int' },
      { dbName: 'locationId', fieldName: 'locationId', kind: 'int' },
      {
        dbName: 'qtyOnHandBase',
        fieldName: 'qtyOnHandBase',
        kind: 'decimal',
      },
    ],
  },
  {
    key: 'cashSessions',
    sourceTable: 'CashSession',
    prismaDelegate: 'cashSession',
    orderBy: '"id" ASC',
    autoIncrement: true,
    columns: [
      { dbName: 'id', fieldName: 'id', kind: 'int' },
      { dbName: 'locationId', fieldName: 'locationId', kind: 'int' },
      { dbName: 'openedBy', fieldName: 'openedBy', kind: 'int' },
      { dbName: 'openedAt', fieldName: 'openedAt', kind: 'datetime' },
      { dbName: 'openingCash', fieldName: 'openingCash', kind: 'decimal' },
      { dbName: 'closedAt', fieldName: 'closedAt', kind: 'datetime' },
      {
        dbName: 'closingCashExpected',
        fieldName: 'closingCashExpected',
        kind: 'decimal',
      },
      {
        dbName: 'closingCashCounted',
        fieldName: 'closingCashCounted',
        kind: 'decimal',
      },
    ],
  },
  {
    key: 'sales',
    sourceTable: 'Sale',
    prismaDelegate: 'sale',
    orderBy: '"id" ASC',
    autoIncrement: true,
    columns: [
      { dbName: 'id', fieldName: 'id', kind: 'int' },
      { dbName: 'locationId', fieldName: 'locationId', kind: 'int' },
      { dbName: 'cashierId', fieldName: 'cashierId', kind: 'int' },
      { dbName: 'cashSessionId', fieldName: 'cashSessionId', kind: 'int' },
      { dbName: 'subtotal', fieldName: 'subtotal', kind: 'decimal' },
      { dbName: 'discountType', fieldName: 'discountType', kind: 'string' },
      { dbName: 'discountValue', fieldName: 'discountValue', kind: 'decimal' },
      {
        dbName: 'discountAmount',
        fieldName: 'discountAmount',
        kind: 'decimal',
      },
      { dbName: 'total', fieldName: 'total', kind: 'decimal' },
      { dbName: 'status', fieldName: 'status', kind: 'string' },
      { dbName: 'createdAt', fieldName: 'createdAt', kind: 'datetime' },
    ],
  },
  {
    key: 'saleItems',
    sourceTable: 'SaleItem',
    prismaDelegate: 'saleItem',
    orderBy: '"id" ASC',
    autoIncrement: true,
    columns: [
      { dbName: 'id', fieldName: 'id', kind: 'int' },
      { dbName: 'saleId', fieldName: 'saleId', kind: 'int' },
      { dbName: 'itemType', fieldName: 'itemType', kind: 'string' },
      { dbName: 'refId', fieldName: 'refId', kind: 'int' },
      { dbName: 'qty', fieldName: 'qty', kind: 'decimal' },
      { dbName: 'unitPrice', fieldName: 'unitPrice', kind: 'decimal' },
      { dbName: 'lineTotal', fieldName: 'lineTotal', kind: 'decimal' },
    ],
  },
  {
    key: 'payments',
    sourceTable: 'Payment',
    prismaDelegate: 'payment',
    orderBy: '"id" ASC',
    autoIncrement: true,
    columns: [
      { dbName: 'id', fieldName: 'id', kind: 'int' },
      { dbName: 'saleId', fieldName: 'saleId', kind: 'int' },
      { dbName: 'method', fieldName: 'method', kind: 'string' },
      {
        dbName: 'amountReceived',
        fieldName: 'amountReceived',
        kind: 'decimal',
      },
      {
        dbName: 'amountApplied',
        fieldName: 'amountApplied',
        kind: 'decimal',
      },
      { dbName: 'changeGiven', fieldName: 'changeGiven', kind: 'decimal' },
    ],
  },
  {
    key: 'auditLogs',
    sourceTable: 'AuditLog',
    prismaDelegate: 'auditLog',
    orderBy: '"id" ASC',
    autoIncrement: true,
    columns: [
      { dbName: 'id', fieldName: 'id', kind: 'int' },
      { dbName: 'userId', fieldName: 'userId', kind: 'int' },
      { dbName: 'action', fieldName: 'action', kind: 'string' },
      { dbName: 'entity', fieldName: 'entity', kind: 'string' },
      { dbName: 'entityId', fieldName: 'entityId', kind: 'int' },
      { dbName: 'createdAt', fieldName: 'createdAt', kind: 'datetime' },
      { dbName: 'metadataJson', fieldName: 'metadataJson', kind: 'string' },
    ],
  },
  {
    key: 'ingredientMovements',
    sourceTable: 'IngredientMovement',
    prismaDelegate: 'ingredientMovement',
    orderBy: '"id" ASC',
    autoIncrement: true,
    columns: [
      { dbName: 'id', fieldName: 'id', kind: 'int' },
      { dbName: 'ingredientId', fieldName: 'ingredientId', kind: 'int' },
      { dbName: 'locationId', fieldName: 'locationId', kind: 'int' },
      { dbName: 'type', fieldName: 'movementType', kind: 'string' },
      { dbName: 'qtyBase', fieldName: 'qtyBase', kind: 'decimal' },
      { dbName: 'reason', fieldName: 'notes', kind: 'string' },
      {
        dbName: 'referenceType',
        fieldName: 'referenceType',
        kind: 'string',
      },
      { dbName: 'refSaleId', fieldName: 'referenceId', kind: 'int' },
      { dbName: 'createdAt', fieldName: 'createdAt', kind: 'datetime' },
      { dbName: 'userId', fieldName: 'adjustedByUserId', kind: 'int' },
      { dbName: 'reasonCode', fieldName: 'reasonCode', kind: 'string' },
      {
        dbName: 'supportDocument',
        fieldName: 'supportDocument',
        kind: 'string',
      },
      {
        dbName: 'unitCostAtTime',
        fieldName: 'unitCostAtTime',
        kind: 'decimal',
      },
      { dbName: 'batchNumber', fieldName: 'batchNumber', kind: 'string' },
      {
        dbName: 'previousStock',
        fieldName: 'previousStock',
        kind: 'decimal',
      },
      { dbName: 'newStock', fieldName: 'newStock', kind: 'decimal' },
      { dbName: 'countedStock', fieldName: 'countedStock', kind: 'decimal' },
    ],
  },
];

export const autoIncrementTableSpecs = tableSpecs.filter(
  (tableSpec) => tableSpec.autoIncrement,
);

export function getArgValue(flag: string): string | undefined {
  const index = process.argv.indexOf(flag);
  if (index === -1) {
    return undefined;
  }

  return process.argv[index + 1];
}

export function hasArg(flag: string): boolean {
  return process.argv.includes(flag);
}

export function ensureDirectory(directoryPath: string): void {
  mkdirSync(directoryPath, { recursive: true });
}

export function assertDirectoryIsEmpty(directoryPath: string): void {
  if (!existsSync(directoryPath)) {
    return;
  }

  if (readdirSync(directoryPath).length > 0) {
    throw new Error(
      `The artifacts directory ${directoryPath} is not empty. Use a new directory or clean it first.`,
    );
  }
}

export function writeJson(filePath: string, value: unknown): void {
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

export function readJson<T>(filePath: string): T {
  return JSON.parse(readFileSync(filePath, 'utf8')) as T;
}

export function resolveRepoRoot(): string {
  return path.resolve(__dirname, '..', '..');
}

export function createArtifactsDirectoryPath(): string {
  return path.join(DEFAULT_ARTIFACTS_ROOT, toTimestampLabel(new Date()));
}

export function resolveArtifactsDirectory(required = false): string {
  const explicit = getArgValue('--artifacts-dir');
  if (explicit) {
    return path.resolve(explicit);
  }

  if (required) {
    throw new Error(
      'Missing --artifacts-dir. Provide the directory created by export-sqlite.ts.',
    );
  }

  return createArtifactsDirectoryPath();
}

export function resolveSqliteDatabaseUrl(): string {
  const explicit =
    getArgValue('--sqlite-url') ??
    process.env.SQLITE_DATABASE_URL ??
    (process.env.DATABASE_URL?.startsWith('file:')
      ? process.env.DATABASE_URL
      : undefined);

  if (!explicit) {
    throw new Error(
      'Missing SQLITE_DATABASE_URL. Set it to the SQLite source, for example file:./prisma/dev.db.',
    );
  }

  if (!explicit.startsWith('file:')) {
    throw new Error(
      `SQLITE_DATABASE_URL must start with file:. Received: ${explicit}`,
    );
  }

  return explicit;
}

export function resolveSqliteFilePath(sqliteDatabaseUrl: string): string {
  const rawPath = sqliteDatabaseUrl.slice('file:'.length);
  const repoRoot = resolveRepoRoot();
  const schemaRelativePath = path.resolve(repoRoot, 'prisma', rawPath);
  const cwdRelativePath = path.resolve(repoRoot, rawPath);

  if (existsSync(schemaRelativePath)) {
    return schemaRelativePath;
  }

  if (existsSync(cwdRelativePath)) {
    return cwdRelativePath;
  }

  return schemaRelativePath;
}

export function openSqliteReadOnly(sqliteFilePath: string): SqliteDatabaseLike {
  const { DatabaseSync } = require('node:sqlite') as {
    DatabaseSync: new (
      databasePath: string,
      options: { open: boolean; readOnly: boolean },
    ) => SqliteDatabaseLike;
  };

  return new DatabaseSync(sqliteFilePath, { open: true, readOnly: true });
}

export function createSqliteBackup(
  sourcePath: string,
  artifactsDirectory: string,
): {
  backupPath: string;
  sha256: string;
  sizeBytes: number;
} {
  const backupDirectory = path.join(artifactsDirectory, 'sqlite-backup');
  ensureDirectory(backupDirectory);

  const backupPath = path.join(backupDirectory, path.basename(sourcePath));
  copyFileSync(sourcePath, backupPath);

  const backupBuffer = readFileSync(backupPath);
  const sha256 = createHash('sha256').update(backupBuffer).digest('hex');
  const sizeBytes = statSync(backupPath).size;

  return {
    backupPath,
    sha256,
    sizeBytes,
  };
}

export function buildSelectSql(tableSpec: TableSpec): string {
  const columns = tableSpec.columns
    .map(({ dbName, fieldName }) =>
      dbName === fieldName
        ? `"${dbName}"`
        : `"${dbName}" AS "${fieldName}"`,
    )
    .join(', ');

  return `SELECT ${columns} FROM "${tableSpec.sourceTable}" ORDER BY ${tableSpec.orderBy}`;
}

export function exportTableRows(
  database: SqliteDatabaseLike,
  tableSpec: TableSpec,
): Record<string, unknown>[] {
  const rows = database.prepare(buildSelectSql(tableSpec)).all() as Array<
    Record<string, unknown>
  >;

  return rows.map((row) => normalizeSqliteRow(tableSpec, row));
}

export function normalizeSqliteRow(
  tableSpec: TableSpec,
  row: Record<string, unknown>,
): Record<string, unknown> {
  const normalizedRow: Record<string, unknown> = {};

  for (const column of tableSpec.columns) {
    const rawValue = row[column.fieldName];
    normalizedRow[column.fieldName] = normalizeValue(rawValue, column.kind);
  }

  return normalizedRow;
}

export function denormalizeSnapshotRow(
  tableSpec: TableSpec,
  row: Record<string, unknown>,
): Record<string, unknown> {
  const normalizedRow: Record<string, unknown> = {};

  for (const column of tableSpec.columns) {
    const rawValue = row[column.fieldName];
    normalizedRow[column.fieldName] =
      column.kind === 'datetime' && rawValue !== null && rawValue !== undefined
        ? new Date(String(rawValue))
        : rawValue;
  }

  return normalizedRow;
}

function normalizeValue(value: unknown, kind: ColumnKind): unknown {
  if (value === null || value === undefined) {
    return null;
  }

  if (kind === 'boolean') {
    return Boolean(value);
  }

  if (kind === 'datetime') {
    return toIsoDateTime(value);
  }

  if (kind === 'decimal') {
    return normalizeDecimalString(value);
  }

  if (kind === 'int') {
    return Number(value);
  }

  return String(value);
}

function toIsoDateTime(value: unknown): string {
  if (value instanceof Date) {
    return value.toISOString();
  }

  const candidate =
    typeof value === 'number' ? new Date(value) : new Date(String(value));

  if (Number.isNaN(candidate.getTime())) {
    throw new Error(`Unable to convert value "${String(value)}" to ISO datetime.`);
  }

  return candidate.toISOString();
}

export function toTimestampLabel(date: Date): string {
  return date
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}Z$/, 'Z');
}

export function normalizeDecimalString(value: unknown): string {
  if (value === null || value === undefined) {
    return '0';
  }

  return trimDecimalString(String(value));
}

export function trimDecimalString(value: string): string {
  if (!value.includes('.')) {
    return value;
  }

  return value.replace(/\.?0+$/, '');
}

export function decimalToScaledBigInt(
  value: string | number,
  scale = DECIMAL_SCALE,
): bigint {
  const normalized = trimDecimalString(String(value));
  const negative = normalized.startsWith('-');
  const unsigned = negative ? normalized.slice(1) : normalized;
  const [integerPart, fractionalPart = ''] = unsigned.split('.');
  const scaleNumber = Number(scale);
  const paddedFractional = `${fractionalPart}${'0'.repeat(scaleNumber)}`.slice(
    0,
    scaleNumber,
  );
  const base = 10n ** scale;
  const scaledValue =
    BigInt(integerPart || '0') * base + BigInt(paddedFractional || '0');

  return negative ? -scaledValue : scaledValue;
}

export function scaledBigIntToDecimalString(
  value: bigint,
  scale = DECIMAL_SCALE,
): string {
  const negative = value < 0n;
  const absolute = negative ? value * -1n : value;
  const base = 10n ** scale;
  const integerPart = absolute / base;
  const fractionalPart = absolute % base;
  const rawFraction = fractionalPart
    .toString()
    .padStart(Number(scale), '0')
    .replace(/0+$/, '');

  const joined = rawFraction
    ? `${integerPart.toString()}.${rawFraction}`
    : integerPart.toString();

  return negative ? `-${joined}` : joined;
}

export function addDecimalStrings(
  values: Array<string | number | null | undefined>,
): string {
  const total = values.reduce<bigint>((sum, value) => {
    if (value === null || value === undefined) {
      return sum;
    }

    return sum + decimalToScaledBigInt(value);
  }, 0n);

  return scaledBigIntToDecimalString(total);
}

export function decimalStringsMatch(left: string, right: string): boolean {
  return decimalToScaledBigInt(left) === decimalToScaledBigInt(right);
}

export function loadMigrationHistory(database: SqliteDatabaseLike): string[] {
  const rows = database
    .prepare(
      'SELECT migration_name FROM "_prisma_migrations" WHERE rolled_back_at IS NULL ORDER BY finished_at ASC',
    )
    .all() as Array<{ migration_name: string }>;

  return rows.map((row) => row.migration_name);
}

export function buildManifest(
  tables: Record<string, Record<string, unknown>[]>,
  metadata: {
    generatedAt: string;
    sqliteSourceUrl: string;
    sqliteSourcePath: string;
    sqliteBackupPath: string;
    sqliteBackupSha256: string;
    sqliteBackupSizeBytes: number;
    migrationHistory: string[];
  },
): ParityManifest {
  return {
    version: 1,
    generatedAt: metadata.generatedAt,
    sqliteSourceUrl: metadata.sqliteSourceUrl,
    sqliteSourcePath: metadata.sqliteSourcePath,
    sqliteBackupPath: metadata.sqliteBackupPath,
    sqliteBackupSha256: metadata.sqliteBackupSha256,
    sqliteBackupSizeBytes: metadata.sqliteBackupSizeBytes,
    migrationHistory: metadata.migrationHistory,
    tableCounts: buildTableCounts(tables),
    saleMetrics: buildSaleMetrics(tables),
    cashSessionMetrics: buildCashSessionMetrics(tables),
    paymentMetrics: buildPaymentMetrics(tables),
    lowStockCount: buildLowStockCount(tables),
    integrityChecks: buildIntegrityChecks(tables),
  };
}

function buildTableCounts(
  tables: Record<string, Record<string, unknown>[]>,
): Record<string, number> {
  const counts: Record<string, number> = {};

  for (const tableSpec of tableSpecs) {
    counts[tableSpec.sourceTable] = tables[tableSpec.key]?.length ?? 0;
  }

  return counts;
}

function buildSaleMetrics(
  tables: Record<string, Record<string, unknown>[]>,
): SaleMetrics {
  const sales = tables.sales ?? [];
  const paidSales = sales.filter((sale) => sale.status === 'PAID');
  const pendingSales = sales.filter((sale) => sale.status === 'PENDING');

  return {
    paidCount: paidSales.length,
    paidTotal: addDecimalStrings(
      paidSales.map((sale) => sale.total as string | number | null | undefined),
    ),
    pendingCount: pendingSales.length,
    pendingTotal: addDecimalStrings(
      pendingSales.map(
        (sale) => sale.total as string | number | null | undefined,
      ),
    ),
  };
}

function buildCashSessionMetrics(
  tables: Record<string, Record<string, unknown>[]>,
): CashSessionMetrics {
  const cashSessions = tables.cashSessions ?? [];
  const openCount = cashSessions.filter((cashSession) => !cashSession.closedAt)
    .length;

  return {
    totalCount: cashSessions.length,
    openCount,
    closedCount: cashSessions.length - openCount,
  };
}

function buildPaymentMetrics(
  tables: Record<string, Record<string, unknown>[]>,
): PaymentMetric[] {
  const paymentGroups = new Map<string, Array<Record<string, unknown>>>();

  for (const payment of tables.payments ?? []) {
    const method = String(payment.method);
    const group = paymentGroups.get(method) ?? [];
    group.push(payment);
    paymentGroups.set(method, group);
  }

  return Array.from(paymentGroups.entries())
    .map(([method, rows]) => ({
      method,
      count: rows.length,
      amountApplied: addDecimalStrings(
        rows.map(
          (row) => row.amountApplied as string | number | null | undefined,
        ),
      ),
      amountReceived: addDecimalStrings(
        rows.map(
          (row) => row.amountReceived as string | number | null | undefined,
        ),
      ),
      changeGiven: addDecimalStrings(
        rows.map(
          (row) => row.changeGiven as string | number | null | undefined,
        ),
      ),
    }))
    .sort((left, right) => left.method.localeCompare(right.method));
}

function buildLowStockCount(
  tables: Record<string, Record<string, unknown>[]>,
): number {
  const ingredientById = new Map<number, Record<string, unknown>>();
  for (const ingredient of tables.ingredients ?? []) {
    ingredientById.set(Number(ingredient.id), ingredient);
  }

  let lowStockCount = 0;
  for (const stock of tables.ingredientStocks ?? []) {
    const ingredient = ingredientById.get(Number(stock.ingredientId));
    if (!ingredient) {
      continue;
    }

    const threshold = ingredient.dimension === 'COUNT' ? 10 : 500;
    const qtyOnHandBase = Number(stock.qtyOnHandBase ?? 0);
    if (qtyOnHandBase <= threshold) {
      lowStockCount += 1;
    }
  }

  return lowStockCount;
}

function buildIntegrityChecks(
  tables: Record<string, Record<string, unknown>[]>,
): Record<string, number> {
  const users = new Set((tables.users ?? []).map((row) => Number(row.id)));
  const locations = new Set((tables.locations ?? []).map((row) => Number(row.id)));
  const ingredients = new Set((tables.ingredients ?? []).map((row) => Number(row.id)));
  const products = new Set((tables.products ?? []).map((row) => Number(row.id)));
  const productVariants = new Set(
    (tables.productVariants ?? []).map((row) => Number(row.id)),
  );
  const combos = new Set((tables.combos ?? []).map((row) => Number(row.id)));
  const cashSessions = new Set(
    (tables.cashSessions ?? []).map((row) => Number(row.id)),
  );
  const sales = new Set((tables.sales ?? []).map((row) => Number(row.id)));

  const result: Record<string, number> = {
    productVariant_without_product: 0,
    comboItem_without_combo: 0,
    comboItem_without_variant: 0,
    variantRecipe_without_variant: 0,
    variantRecipe_without_ingredient: 0,
    ingredientStock_without_ingredient: 0,
    ingredientStock_without_location: 0,
    cashSession_without_location: 0,
    cashSession_without_user: 0,
    sale_without_location: 0,
    sale_without_cashier: 0,
    sale_without_cash_session: 0,
    payment_without_sale: 0,
    audit_without_user: 0,
    movement_without_ingredient: 0,
    movement_without_location: 0,
    movement_without_user: 0,
    movement_sale_ref_missing: 0,
    saleItem_variant_ref_missing: 0,
    saleItem_combo_ref_missing: 0,
  };

  for (const row of tables.productVariants ?? []) {
    if (!products.has(Number(row.productId))) {
      result.productVariant_without_product += 1;
    }
  }

  for (const row of tables.comboItems ?? []) {
    if (!combos.has(Number(row.comboId))) {
      result.comboItem_without_combo += 1;
    }
    if (!productVariants.has(Number(row.variantId))) {
      result.comboItem_without_variant += 1;
    }
  }

  for (const row of tables.variantRecipeItems ?? []) {
    if (!productVariants.has(Number(row.variantId))) {
      result.variantRecipe_without_variant += 1;
    }
    if (!ingredients.has(Number(row.ingredientId))) {
      result.variantRecipe_without_ingredient += 1;
    }
  }

  for (const row of tables.ingredientStocks ?? []) {
    if (!ingredients.has(Number(row.ingredientId))) {
      result.ingredientStock_without_ingredient += 1;
    }
    if (!locations.has(Number(row.locationId))) {
      result.ingredientStock_without_location += 1;
    }
  }

  for (const row of tables.cashSessions ?? []) {
    if (!locations.has(Number(row.locationId))) {
      result.cashSession_without_location += 1;
    }
    if (!users.has(Number(row.openedBy))) {
      result.cashSession_without_user += 1;
    }
  }

  for (const row of tables.sales ?? []) {
    if (!locations.has(Number(row.locationId))) {
      result.sale_without_location += 1;
    }
    if (!users.has(Number(row.cashierId))) {
      result.sale_without_cashier += 1;
    }
    if (!cashSessions.has(Number(row.cashSessionId))) {
      result.sale_without_cash_session += 1;
    }
  }

  for (const row of tables.payments ?? []) {
    if (!sales.has(Number(row.saleId))) {
      result.payment_without_sale += 1;
    }
  }

  for (const row of tables.auditLogs ?? []) {
    if (!users.has(Number(row.userId))) {
      result.audit_without_user += 1;
    }
  }

  for (const row of tables.ingredientMovements ?? []) {
    if (!ingredients.has(Number(row.ingredientId))) {
      result.movement_without_ingredient += 1;
    }
    if (!locations.has(Number(row.locationId))) {
      result.movement_without_location += 1;
    }
    if (!users.has(Number(row.adjustedByUserId))) {
      result.movement_without_user += 1;
    }
    if (
      row.referenceId !== null &&
      row.referenceId !== undefined &&
      !sales.has(Number(row.referenceId))
    ) {
      result.movement_sale_ref_missing += 1;
    }
  }

  for (const row of tables.saleItems ?? []) {
    if (row.itemType === 'VARIANT' && !productVariants.has(Number(row.refId))) {
      result.saleItem_variant_ref_missing += 1;
    }

    if (row.itemType === 'COMBO' && !combos.has(Number(row.refId))) {
      result.saleItem_combo_ref_missing += 1;
    }
  }

  return result;
}

export function allIntegrityChecksPass(
  integrityChecks: Record<string, number>,
): boolean {
  return Object.values(integrityChecks).every((value) => value === 0);
}
