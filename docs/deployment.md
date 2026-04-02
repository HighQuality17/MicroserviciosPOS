# Puesta en Marcha y Despliegue

## Alcance

El repositorio no incluye una estrategia automatizada visible de despliegue final, pero si deja preparado el ciclo manual para PostgreSQL:

- baseline Prisma para PostgreSQL;
- seed de referencia separado del seed demo;
- exportacion desde SQLite legacy;
- importacion y verificacion de paridad;
- rollback documentado.

## Desarrollo local

### Backend

```bash
npm install
# crear .env a partir de .env.example
npm run prisma:generate
npm run prisma:migrate:deploy
npm run prisma:seed
# opcional: solo para una base vacia de pruebas
npm run prisma:seed:demo
npm run start:dev
```

Resultado esperado:

- API disponible en `http://localhost:3000/api`;
- PostgreSQL operativo;
- datos de referencia cargados;
- usuarios demo disponibles solo si se ejecuto `prisma:seed:demo`.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Resultado esperado:

- frontend en desarrollo con Vite;
- consumo de `http://localhost:3000/api` por defecto;
- posibilidad de redefinir la URL con `VITE_API_URL`.

## Migracion desde SQLite existente

Usa la guia detallada en [docs/postgresql-migration.md](./postgresql-migration.md). El flujo resumido es:

```bash
npm run db:sqlite:export -- --artifacts-dir <ruta-artifacts>
npm run prisma:migrate:deploy
npm run db:postgres:import -- --artifacts-dir <ruta-artifacts>
npm run db:postgres:verify -- --artifacts-dir <ruta-artifacts>
```

## Build

### Backend

```bash
npm run build
npm run start:prod
```

Artefacto generado: `dist/`

### Frontend

```bash
cd frontend
npm run build
npm run preview
```

Artefacto generado: `frontend/dist/`

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
