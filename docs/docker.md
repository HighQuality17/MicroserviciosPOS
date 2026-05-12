# Docker

## Alcance

Esta guia deja documentada la dockerizacion local operativa del proyecto sin cambiar logica funcional, contratos HTTP ni interfaz:

- `postgres` como servicio persistente;
- `backend` NestJS + Prisma construido desde la raiz del repositorio;
- `frontend` React/Vite servido por Nginx;
- proxy de `/api` desde Nginx hacia el backend;
- `DATABASE_URL` interna resuelta por nombre de servicio Docker (`postgres`).

No incluye todavia CI/CD, reverse proxy externo, orquestacion avanzada, hot reload ni automatizacion agresiva de migraciones al arranque.

## Archivos involucrados

- `compose.yaml`
- `Dockerfile`
- `.dockerignore`
- `.env.docker.example`
- `frontend/Dockerfile`
- `frontend/.dockerignore`
- `frontend/nginx.conf`

## Variables de entorno

Crea un archivo local a partir del ejemplo:

```bash
cp .env.docker.example .env.docker
```

En PowerShell:

```powershell
Copy-Item .env.docker.example .env.docker
```

Variables disponibles:

```env
POSTGRES_DB=DB_NAME
POSTGRES_USER=DB_USER
POSTGRES_PASSWORD=DB_PASSWORD
DATABASE_URL=postgresql://USER:PASSWORD@postgres:5432/DB_NAME?schema=public
JWT_SECRET=SET_JWT_SECRET
POSTGRES_PORT=5432
BACKEND_PORT=3000
FRONTEND_PORT=8080
```

Notas:

- `compose.yaml` ya no asigna secretos inline; `postgres` y `backend` los cargan desde `env_file: .env.docker`.
- El frontend se compila con `VITE_API_URL=/api`, por lo que las llamadas salen por la misma URL base del navegador.
- Ajusta `JWT_SECRET` antes de usar el stack fuera de pruebas locales.
- `.env.docker` debe permanecer local y fuera del repositorio.

## Comandos principales

Levantar una base nueva o vacia:

```bash
docker compose --env-file .env.docker up -d postgres
docker compose --env-file .env.docker run --rm backend pnpm exec prisma migrate deploy
docker compose --env-file .env.docker run --rm backend pnpm run prisma:seed
docker compose --env-file .env.docker up --build -d backend frontend
```

Levantar una base ya migrada o importada:

```bash
docker compose --env-file .env.docker up --build -d
```

Ver logs:

```bash
docker compose --env-file .env.docker logs -f
```

Detener el stack:

```bash
docker compose --env-file .env.docker down
```

Rebuild del stack:

```bash
docker compose --env-file .env.docker build
docker compose --env-file .env.docker up -d
```

Eliminar tambien el volumen de PostgreSQL:

```bash
docker compose --env-file .env.docker down -v
```

Usa `down -v` solo cuando quieras destruir por completo los datos persistidos del entorno Docker.

## Flujos de uso

### Base nueva o vacia

Usa este orden para evitar que el backend arranque antes de que exista el esquema:

```bash
docker compose --env-file .env.docker up -d postgres
docker compose --env-file .env.docker run --rm backend pnpm exec prisma migrate deploy
docker compose --env-file .env.docker run --rm backend pnpm run prisma:seed
docker compose --env-file .env.docker up --build -d backend frontend
```

Si quieres usuarios demo en una base de pruebas vacia:

```bash
docker compose --env-file .env.docker run --rm backend pnpm run prisma:seed:demo
```

### Base ya migrada o importada

Si PostgreSQL ya contiene el esquema y los datos correctos:

```bash
docker compose --env-file .env.docker up --build -d
```

No ejecutes `prisma:seed` ni `prisma:seed:demo` sobre una base importada con datos reales, salvo que sepas exactamente por que lo haces.

## Prisma en Docker

Migracion del esquema:

```bash
docker compose --env-file .env.docker run --rm backend pnpm exec prisma migrate deploy
```

Seed seguro para base vacia:

```bash
docker compose --env-file .env.docker run --rm backend pnpm run prisma:seed
```

Seed demo solo para pruebas sobre base vacia:

```bash
docker compose --env-file .env.docker run --rm backend pnpm run prisma:seed:demo
```

El contenedor de backend no ejecuta migraciones automaticamente al iniciar. El flujo recomendado sigue siendo explicito y manual.

## Servicios expuestos por defecto

- frontend: `http://localhost:8080`
- backend: `http://localhost:3000/api`
- postgres: `localhost:5432`

Si cambiaste los puertos en `.env.docker`, usa esos valores en lugar de los defaults.

## Smoke test funcional

Checklist breve despues de levantar el stack:

- `docker compose --env-file .env.docker ps` muestra `postgres`, `backend` y `frontend` arriba.
- `http://localhost:3000/api/health` responde `200`.
- `http://localhost:8080/` responde `200` y sirve el HTML del frontend.
- `http://localhost:8080/api/health` responde `200` a traves del proxy Nginx.
- el login carga en frontend y la peticion va por `/api`, no por `localhost` hardcodeado en el navegador.
- si la base era nueva, `prisma:seed` completa sin errores.
- si la base era importada, no se ejecutaron seeds demo sobre datos reales.

## Diseno aplicado

- `postgres` usa un volumen nombrado (`postgres-data`);
- `backend` espera a que PostgreSQL pase su healthcheck antes de arrancar;
- `backend` expone un healthcheck local sobre `/api/health` para que Compose pueda encadenar el arranque;
- `frontend` espera a que el backend este healthy antes de iniciar;
- `frontend` sirve estaticos con Nginx y reenvia `/api` al backend sin tocar el codigo React;
- la separacion entre infraestructura y aplicacion queda en archivos Docker y variables de entorno, no en cambios de negocio.

## Limitaciones actuales

- esta base no automatiza importaciones desde SQLite dentro de Docker;
- las migraciones Prisma siguen siendo una accion operativa manual y consciente;
- no hay todavia perfiles separados para desarrollo caliente del frontend o backend dentro de Compose;
- no se agregan estrategias de despliegue productivo ni secretos gestionados;
- la imagen del backend prioriza claridad operativa sobre optimizacion agresiva.

## Recomendaciones para la siguiente fase

- decidir si quieres un flujo Docker de desarrollo con bind mounts y recarga en caliente;
- evaluar si conviene documentar un comando unico de mantenimiento para migraciones y seeds;
- considerar una limpieza documental mas amplia en `README.md` y otros markdown que aun conservan textos viejos o problemas de encoding.
