# Backend

## Resumen técnico

El backend está construido con NestJS y TypeScript en la raíz del repositorio. Su foco es exponer una API local para autenticación, catálogo, inventario, caja, ventas y analítica administrativa.

## Stack y dependencias principales

- NestJS 10
- Prisma ORM 6
- PostgreSQL
- JWT
- `bcrypt`
- `class-validator`
- `class-transformer`

## Scripts disponibles

```bash
pnpm run build
pnpm run start
pnpm run start:dev
pnpm run start:prod
pnpm run lint
pnpm run format
pnpm exec prisma generate
pnpm run prisma:migrate
pnpm run prisma:migrate:deploy
pnpm run prisma:seed
pnpm run prisma:seed:demo
pnpm run db:sqlite:export
pnpm run db:postgres:import
pnpm run db:postgres:verify
```

Observación verificable: el backend sí expone script de lint; no expone script de test automatizado en `package.json`.

## Arranque y configuración global

Archivo de entrada: `src/main.ts`

Comportamiento global confirmado:

- CORS habilitado;
- prefijo global `/api`;
- validación global con transformación automática;
- interceptor global para respuestas exitosas;
- filtro global para respuestas de error;
- desconexión ordenada de Prisma en `SIGINT` y `SIGTERM`.

## Seguridad y autenticación

### Autenticación

- `POST /api/auth/login`
- `GET /api/auth/me`
- `PATCH /api/auth/me/theme`

Detalles verificados:

- el login acepta `email` o `username`;
- la contraseña se compara con `bcrypt`;
- el token se firma con `JWT_SECRET` o, si no existe, con fallback local;
- el módulo JWT define expiración de `12h`;
- `themePreference` forma parte del usuario autenticado recuperado por `/auth/me`.

### Autorización por rol

Roles disponibles en Prisma:

- `ADMIN`
- `CASHIER`
- `AUDITOR`

## Convenciones de respuesta

### Éxito

Todas las respuestas exitosas salen envueltas en:

```json
{
  "success": true,
  "data": {},
  "timestamp": "2026-03-26T00:00:00.000Z"
}
```

### Error

Los errores se normalizan con estructura:

```json
{
  "success": false,
  "error": {
    "statusCode": 400,
    "message": "Mensaje",
    "path": "/api/...",
    "timestamp": "2026-03-26T00:00:00.000Z"
  }
}
```

## Módulos del backend

### `auth`

- login;
- consulta del usuario autenticado;
- actualización de preferencia de tema.

### `locations`

- listado de POS disponibles;
- alta de nuevas ubicaciones.

### `unit-types`

- seed de unidades base (`g`, `kg`, `ml`, `L`, `unit`).

### `ingredients`

- listado de ingredientes;
- creación de ingredientes con validación entre dimensión y unidad por defecto.

### `stock`

- ajuste manual de stock por ubicación;
- consulta de stock por ubicación;
- conversión automática a unidad base.

### `products`

- alta, listado activo, edición, cambio de estado y eliminación condicionada.

### `variants`

- alta, listado activo, edición, cambio de estado y eliminación condicionada;
- validación de SKU único;
- bloqueo de borrado si existen ventas históricas o combos asociados.

### `recipes`

- alta/reemplazo/consulta/eliminación de receta por variante;
- conversión a unidad base según tipo de unidad;
- validación de compatibilidad entre ingrediente y unidad.

### `combos`

- alta de combo;
- configuración de items;
- consulta de combos activos con sus variantes.

### `cash`

- apertura;
- cierre con cálculo de esperado, contado y diferencia;
- consulta de caja activa por ubicación.

### `sales`

- creación de venta `PENDING`;
- pago con cambio a `PAID`;
- validación de stock antes del pago;
- recibo detallado;
- últimas ventas e historial filtrable.

### `admin`

- resumen ejecutivo del día;
- ventas por método de pago;
- top de ítems vendidos;
- stock bajo;
- actividad reciente.

### `audit`

- registra eventos como `SALE_PAID` dentro del flujo de ventas.

## Matriz resumida de acceso a endpoints

| Área | Lectura | Escritura |
| --- | --- | --- |
| Auth | Usuario autenticado | Usuario autenticado |
| Locations | `ADMIN`, `CASHIER` | `ADMIN` |
| Ingredients | `ADMIN`, `AUDITOR` | `ADMIN` |
| Stock | `ADMIN`, `AUDITOR` | `ADMIN` |
| Products | `ADMIN`, `AUDITOR` | `ADMIN` |
| Variants | `ADMIN`, `AUDITOR` | `ADMIN` |
| Recipes | `ADMIN`, `AUDITOR` | `ADMIN` |
| Combos | `ADMIN`, `AUDITOR` | `ADMIN` |
| Cash | `ADMIN`, `CASHIER` | `ADMIN`, `CASHIER` |
| Sales | `ADMIN`, `CASHIER`, `AUDITOR` | `ADMIN`, `CASHIER` |
| Admin analytics | `ADMIN`, `AUDITOR` | No aplica |

## Reglas de negocio verificadas

- El catálogo operativo para POS solo expone productos, variantes y combos activos.
- Las ventas permiten descuentos `NONE`, `PERCENT` y `FIXED`.
- Los pagos aceptan `CASH` y `TRANSFER`.
- El stock se descuenta al momento del pago, no en la creación de la venta.
- Una variante sin receta impide completar el cobro.
- Un combo sin ítems configurados impide venderse correctamente.
- No puede abrirse más de una caja activa por ubicación.

## Material auxiliar incluido

- `requests.http`: colección manual para probar login, catálogo, caja, ventas y admin.
- `prisma/seed.ts`: usuarios base y unidades por defecto.

## Límites observables

- No se detectó suite automatizada de tests dentro del backend.
- No se detectó configuración de despliegue productivo más allá de scripts de build y arranque.
