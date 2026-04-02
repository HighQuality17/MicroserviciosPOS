# Base de Datos

## Estado actual

- ORM: Prisma
- proveedor operativo: PostgreSQL
- esquema: `prisma/schema.prisma`
- baseline activo: `prisma/migrations/`
- historial SQLite legado: `prisma/migrations_sqlite_legacy/`
- seed de referencia: `prisma/seed.ts`
- seed demo opcional: `prisma/seed.demo.ts`
- tooling de migracion: `scripts/db/`

## Variables de entorno

Backend:

```env
DATABASE_URL="postgresql://example-user-only:example-password-only@localhost:5432/microserviciospos?schema=public"
SQLITE_DATABASE_URL="file:./prisma/dev.db"
JWT_SECRET="example-jwt-secret-only"
```

- `DATABASE_URL` apunta a PostgreSQL y es la fuente operativa del backend.
- `SQLITE_DATABASE_URL` se conserva solo para exportacion, importacion y referencia de la fuente legacy.

## Fuente de verdad

La fuente de verdad del modelo es el `schema.prisma` actual mas la SQLite viva validada durante la migracion. El historial SQLite no se reutiliza como historial activo de PostgreSQL debido al drift detectado en `_prisma_migrations`.

## Modelos principales

### Seguridad y usuarios

`User`

- nombre;
- `username` y `email` unicos;
- `passwordHash`;
- `role`;
- `themePreference`.

`AuditLog`

- usuario;
- accion;
- entidad afectada;
- metadatos serializados.

### Operacion comercial

`Location`

- punto de venta operativo;
- relacion con caja, ventas e inventario.

`CashSession`

- apertura y cierre por ubicacion;
- efectivo inicial;
- efectivo esperado y contado al cierre.

`Sale`

- subtotal;
- descuento;
- total;
- estado `PENDING`, `PAID` o `VOID`;
- relacion con ubicacion, cajero y caja.

`SaleItem`

- item `VARIANT` o `COMBO`;
- cantidad;
- precio unitario;
- total de linea.

`Payment`

- metodo `CASH` o `TRANSFER`;
- monto recibido;
- monto aplicado;
- cambio entregado.

### Catalogo

`Product`

- producto comercial;
- datos comerciales y fiscales;
- estado activo.

`ProductVariant`

- presentacion vendible;
- relacion con producto;
- SKU unico;
- precio de venta;
- estado activo.

`Combo`

- producto compuesto con precio propio;
- estado activo.

`ComboItem`

- relacion combo-variante;
- cantidad por variante.

`VariantRecipeItem`

- receta por variante;
- ingrediente consumido;
- cantidad requerida en unidad base.

### Inventario

`UnitType`

- catalogo de unidades base y conversion;
- peso: `g`, `kg`;
- volumen: `ml`, `L`;
- conteo: `unit`.

`Ingredient`

- nombre unico;
- dimension;
- unidad por defecto.

`IngredientStock`

- stock por ingrediente y ubicacion;
- cantidad en unidad base.

`IngredientMovement`

- entradas, salidas y ajustes;
- relacion con usuario, ingrediente, ubicacion y venta cuando aplica.

## Seeds

`prisma/seed.ts`

- solo crea o sincroniza datos de referencia seguros;
- hoy se limita a `UnitType`;
- es idempotente y seguro sobre una base vacia.

`prisma/seed.demo.ts`

- crea usuarios demo `admin`, `cashier` y `auditor`;
- aborta si detecta una base con datos operativos;
- no debe ejecutarse durante una importacion real desde SQLite.

## Migracion SQLite -> PostgreSQL

El flujo conservador de migracion queda separado del runtime diario:

1. exportar la SQLite viva con `scripts/db/export-sqlite.ts`;
2. aplicar baseline PostgreSQL;
3. importar snapshot a PostgreSQL con `scripts/db/import-postgres.ts`;
4. resetear secuencias;
5. verificar paridad con `scripts/db/verify-parity.ts`;
6. cambiar `DATABASE_URL` al destino PostgreSQL.

La guia operativa completa esta en [docs/postgresql-migration.md](./postgresql-migration.md).
