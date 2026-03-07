# POS Local API (Sprint 1)

Backend offline-first para POS en Windows (listo para integrar con Electron en Sprint 2).

Stack:
- NestJS + TypeScript
- Prisma ORM
- SQLite local
- DTOs + class-validator
- Manejo de errores y respuesta consistente

## 1. Instalación y ejecución

1. Crear `.env`:

```env
DATABASE_URL="file:./dev.db"
```

2. Instalar dependencias:

```bash
npm install
```

3. Generar cliente Prisma y migrar:

```bash
npx prisma generate
npx prisma migrate dev
```

4. Seed de unidades base:

```bash
npx prisma db seed
```

5. Ejecutar API:

```bash
npm run start:dev
```

Base URL: `http://localhost:3000/api`

## 2. Convenciones clave

- Inventario siempre guardado en unidad base:
- `WEIGHT` => gramos
- `VOLUME` => mililitros
- `COUNT` => unit
- `unit_types` incluye: `g`, `kg`, `ml`, `L`, `unit` con `factor_to_base`.
- En ajustes/recetas, si envías otra unidad (`kg`, `L`), se convierte automáticamente a base.

## 3. Endpoints implementados

- `POST /locations`
- `POST /unit-types/seed`
- `POST /ingredients`
- `POST /stock/adjust`
- `GET /stock?location_id=...`
- `POST /products`
- `POST /variants`
- `POST /recipes/variant/:variantId`
- `POST /cash/open`
- `POST /cash/close`
- `GET /cash/current?location_id=...`
- `POST /sales`
- `POST /sales/:id/pay`
- `GET /sales/:id/receipt`

## 4. Flujo de venta/pago

1. Crear venta (`status=PENDING`) con items tipo `VARIANT`.
2. Aplicar descuento `NONE|PERCENT|FIXED`.
3. Pagar:
- `CASH`: `amount_received >= total`, calcula `change_given`.
- `TRANSFER`: `amount_received >= total`, `change_given = 0`.
4. En el pago se ejecuta transacción atómica:
- crea `payment`
- cambia venta a `PAID`
- descuenta inventario por receta (`ingredient_movements` tipo `OUT`)
- crea registro en `audit_log`

## 5. Estructura

```txt
src/
  audit/
  cash/
  common/
  ingredients/
  locations/
  prisma/
  products/
  recipes/
  sales/
  stock/
  unit-types/
  variants/
prisma/
  migrations/
  schema.prisma
  seed.ts
```

## 6. Ejemplos de requests

Ver `requests.http` para flujo completo.
