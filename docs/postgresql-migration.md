# Migracion de SQLite a PostgreSQL

## Objetivo

Esta fase trata la migracion como cambio de motor de persistencia, no como rediseño del sistema. El dominio, contratos HTTP y modulos de negocio se mantienen.

## Requisitos previos

- `DATABASE_URL` debe apuntar a PostgreSQL.
- `SQLITE_DATABASE_URL` debe apuntar a la SQLite legacy real.
- Node.js y npm instalados.
- PostgreSQL vacio y accesible.

Ejemplo de PostgreSQL local con Docker:

```bash
docker run --name microserviciospos-postgres ^
  -e POSTGRES_USER=example-user-only ^
  -e POSTGRES_PASSWORD=example-password-only ^
  -e POSTGRES_DB=microserviciospos ^
  -p 5432:5432 ^
  -d postgres:16
```

## Ruta efectiva de la SQLite legacy

Con el `schema.prisma` historico y `SQLITE_DATABASE_URL="file:./prisma/dev.db"`, la ruta efectiva esperada es:

`prisma/prisma/dev.db`

El script de exportacion resuelve esa ruta de forma explicita y la copia a un backup inmutable antes de leer datos.

## Archivos y scripts involucrados

- baseline PostgreSQL: `prisma/migrations/<timestamp>_postgresql_baseline/migration.sql`
- migraciones SQLite legacy: `prisma/migrations_sqlite_legacy/`
- exportacion SQLite: `scripts/db/export-sqlite.ts`
- importacion PostgreSQL: `scripts/db/import-postgres.ts`
- verificacion de paridad: `scripts/db/verify-parity.ts`

## Flujo completo

### 1. Preparar entorno

```bash
npm install
npm run prisma:generate
```

### 2. Congelar la fuente SQLite

```bash
npm run db:sqlite:export -- --artifacts-dir C:\Temp\MicroserviciosPOS\migration-20260402
```

Salida esperada dentro de `artifacts-dir`:

- `sqlite-backup/dev.db`
- `manifest.json`
- `snapshot.json`

`manifest.json` guarda:

- ruta y hash SHA-256 del backup;
- conteos por tabla;
- ventas pagadas y pendientes;
- sesiones de caja abiertas/cerradas;
- low stock;
- chequeos de integridad y historial de migraciones visto en SQLite.

### 3. Aplicar baseline PostgreSQL

```bash
npm run prisma:migrate:deploy
```

### 4. Importar snapshot a PostgreSQL

La base destino debe estar vacia. El script aborta si detecta tablas con datos.

```bash
npm run db:postgres:import -- --artifacts-dir C:\Temp\MicroserviciosPOS\migration-20260402
```

El import respeta este orden:

1. `UnitType`
2. `User`
3. `Location`
4. `Ingredient`
5. `Product`
6. `ProductVariant`
7. `Combo`
8. `VariantRecipeItem`
9. `ComboItem`
10. `IngredientStock`
11. `CashSession`
12. `Sale`
13. `SaleItem`
14. `Payment`
15. `AuditLog`
16. `IngredientMovement`

El mismo flujo ajusta secuencias al `MAX(id)` de cada tabla autoincremental.

Si solo necesitas re-ajustar secuencias:

```bash
npm run db:postgres:reset-sequences
```

### 5. Verificar paridad

```bash
npm run db:postgres:verify -- --artifacts-dir C:\Temp\MicroserviciosPOS\migration-20260402
```

La verificacion valida al menos:

- conteos por tabla;
- ventas `PAID` y `PENDING`;
- sesiones de caja abiertas/cerradas;
- low stock;
- integridad relacional;
- ausencia de huerfanos;
- estado correcto de secuencias.

### 6. Activar el cutover

Con la verificacion limpia:

1. deja `DATABASE_URL` apuntando al PostgreSQL nuevo;
2. conserva `SQLITE_DATABASE_URL` para rollback;
3. inicia backend:

```bash
npm run start:dev
```

4. valida manualmente:
   - login;
   - POS;
   - caja;
   - ventas;
   - stock auditado;
   - admin.

## Usuarios demo

Si necesitas entorno de pruebas sobre una base vacia que no venga de importacion:

```bash
npm run prisma:seed:demo
```

Si la base esta vacia y no viene de SQLite, puedes correr antes:

```bash
npm run prisma:seed
```

No ejecutes este comando sobre una base real importada desde SQLite.
El script aborta automaticamente si detecta datos operativos.

## Rollback

Si algo falla antes del cutover:

1. no cambies el backend productivo a PostgreSQL;
2. conserva la SQLite original y el backup exportado;
3. corrige el problema en PostgreSQL y repite importacion/verificacion.

Si algo falla despues del cutover:

1. detiene el backend;
2. vuelve el codigo al commit o rama previa a esta migracion, porque el runtime Prisma de esta rama queda fijado a PostgreSQL;
3. restaura el `.env` del entorno legacy SQLite;
4. reinicia backend con la version previa;
5. conserva el `artifacts-dir` y los logs de verificacion para analizar la falla;
6. no descartes el PostgreSQL hasta entender la causa.

## Notas de seguridad

- no usar `db push` como sustituto de migraciones;
- no mezclar `seed.demo` con importacion real;
- no resetear la base destino como enfoque principal;
- no borrar la SQLite legacy hasta completar el cutover y la validacion funcional;
- no asumir que el rollback a SQLite se resuelve solo cambiando `DATABASE_URL` en esta rama.
