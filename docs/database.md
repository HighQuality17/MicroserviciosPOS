# Base de Datos

## Tecnología y ubicación

- ORM: Prisma
- proveedor: SQLite
- esquema: `prisma/schema.prisma`
- migraciones: `prisma/migrations/`
- seed: `prisma/seed.ts`

## Configuración actual

Variable de entorno principal:

```env
DATABASE_URL="file:./prisma/dev.db"
```

Esto confirma una persistencia local basada en archivo SQLite dentro del proyecto.

## Modelos principales

### Seguridad y usuarios

### `User`

- identidad básica;
- `username` y `email` únicos;
- `passwordHash`;
- `role`;
- `themePreference`.

### `AuditLog`

- usuario;
- acción;
- entidad afectada;
- metadatos serializados.

### Operación comercial

### `Location`

Representa puntos de venta reales usados por caja, ventas e inventario.

### `CashSession`

Registra aperturas y cierres por ubicación con:

- apertura;
- efectivo inicial;
- efectivo esperado al cierre;
- efectivo contado;
- marca temporal de cierre.

### `Sale`

Entidad principal de venta con:

- subtotal;
- descuento;
- total;
- estado `PENDING`, `PAID` o `VOID`;
- relación con ubicación, cajero y caja.

### `SaleItem`

- ítems tipo `VARIANT` o `COMBO`;
- cantidad;
- precio unitario;
- total de línea.

### `Payment`

- método `CASH` o `TRANSFER`;
- monto recibido;
- monto aplicado;
- cambio entregado.

### Catálogo

### `Product`

- producto comercial;
- estado activo/inactivo.

### `ProductVariant`

- presentación vendible real;
- relación con producto;
- tamaño;
- SKU único;
- precio de venta;
- estado activo/inactivo.

### `Combo`

- producto compuesto con precio propio;
- puede contener varias variantes;
- estado activo/inactivo.

### `ComboItem`

- relación entre combo y variante;
- cantidad de esa variante dentro del combo.

### `VariantRecipeItem`

- receta por variante;
- ingrediente consumido;
- cantidad requerida en unidad base.

### Inventario

### `UnitType`

Catálogo de unidades con factor de conversión a base:

- peso: `g`, `kg`
- volumen: `ml`, `L`
- conteo: `unit`

### `Ingredient`

- nombre único;
- dimensión (`WEIGHT`, `VOLUME`, `COUNT`);
- unidad por defecto.

### `IngredientStock`

- stock actual por ingrediente y ubicación;
- cantidad en unidad base.

### `IngredientMovement`

- entradas, salidas y ajustes;
- relación con usuario, ingrediente, ubicación y venta cuando aplica.

## Reglas de persistencia verificadas

- El stock siempre se guarda en unidad base.
- Las recetas también se persisten en unidad base.
- El descuento de inventario ocurre al pagar la venta.
- `themePreference` del usuario tiene valor por defecto `midnight-indigo`.
- Una caja abierta se identifica por `closedAt = null`.

## Seed inicial

El seed actual crea:

- unidades base por defecto;
- usuario administrador;
- usuario cajero;
- usuario auditor.

Credenciales documentadas también en [`../README.md`](../README.md) y [`MANUAL_USUARIO.md`](MANUAL_USUARIO.md).

## Migraciones presentes

El historial de migraciones del repositorio permite identificar estas etapas:

- inicialización base;
- incorporación de campos de autenticación;
- soporte de combos;
- persistencia de preferencia de tema de usuario.

El detalle evolutivo está resumido en [`changelog-summary.md`](changelog-summary.md).
