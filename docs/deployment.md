# Puesta en Marcha y Despliegue

## Alcance

El repositorio no incluye una estrategia automatizada visible de despliegue final, pero si deja preparado el ciclo manual para PostgreSQL:

- baseline Prisma para PostgreSQL;
- seed de referencia separado del seed demo;
- exportacion desde SQLite legacy;
- importacion y verificacion de paridad;
- rollback documentado.

## Desarrollo local

Si quieres levantar el sistema con contenedores en lugar del flujo manual por procesos separados, usa la guia de [docs/docker.md](./docker.md).

### Backend

```bash
pnpm install
# crear .env a partir de .env.example
pnpm exec prisma generate
pnpm exec prisma migrate deploy
pnpm run prisma:seed
# opcional: solo para una base vacia de pruebas
pnpm run prisma:seed:demo
pnpm run start:dev
```

Resultado esperado:

- API disponible en `http://localhost:3000/api`;
- PostgreSQL operativo;
- datos de referencia cargados;
- usuarios demo disponibles solo si se ejecuto `prisma:seed:demo`.

### Frontend

```bash
pnpm -C frontend install
pnpm -C frontend run dev -- --host
```

Resultado esperado:

- frontend en desarrollo con Vite;
- consumo de `http://localhost:3000/api` por defecto;
- posibilidad de redefinir la URL con `VITE_API_URL`.

## Migracion desde SQLite existente

Usa la guia detallada en [docs/postgresql-migration.md](./postgresql-migration.md). El flujo resumido es:

```bash
pnpm run db:sqlite:export -- --artifacts-dir <ruta-artifacts>
pnpm exec prisma migrate deploy
pnpm run db:postgres:import -- --artifacts-dir <ruta-artifacts>
pnpm run db:postgres:verify -- --artifacts-dir <ruta-artifacts>
```

## Build

### Backend

```bash
pnpm run build
pnpm run start:prod
```

Artefacto generado: `dist/`

### Frontend

```bash
pnpm -C frontend run build
pnpm -C frontend run preview
```

Artefacto generado: `frontend/dist/`

## Docker local

El repositorio ya incluye una dockerizacion local con:

- `postgres` persistente;
- `backend` NestJS + Prisma;
- `frontend` servido por Nginx con proxy `/api`.

Para uso operativo local con Compose, sigue [docs/docker.md](./docker.md).

## Consideraciones operativas

- definir un `JWT_SECRET` real en cualquier entorno no local;
- respaldar la SQLite legacy antes del cutover;
- respaldar el PostgreSQL destino antes de repetir una importacion;
- no ejecutar `prisma:seed:demo` sobre una base importada real;
- correr siempre la verificacion de paridad antes de apuntar el backend al nuevo `DATABASE_URL`.

## Checklist minimo antes de exponer el backend

- crear `.env` desde `.env.example`;
- confirmar conectividad a PostgreSQL;
- aplicar baseline Prisma;
- ejecutar `prisma:seed` solo si la base esta vacia;
- ejecutar `prisma:seed:demo` solo si quieres usuarios de prueba;
- validar login, POS, caja, ventas, stock auditado y admin;
- documentar la ruta del backup SQLite y el resultado de `db:postgres:verify`.
