# MicroserviciosPOS

Repositorio principal de un sistema POS local con frontend y backend separados dentro del mismo proyecto. La interfaz autenticada se presenta como `Registry POS`, mientras que la API expone el backend local `MicroserviciosPOS API`.

La documentación de este repositorio fue actualizada sobre el estado real del código inspeccionado el 26 de marzo de 2026. Resume únicamente la arquitectura, módulos, scripts y flujos que hoy están presentes en el repositorio.

## Contenido

- [Resumen del sistema](#resumen-del-sistema)
- [Alcance funcional verificado](#alcance-funcional-verificado)
- [Stack tecnológico real](#stack-tecnológico-real)
- [Arquitectura general](#arquitectura-general)
- [Módulos principales](#módulos-principales)
- [BusinessConfig](#businessconfig)
- [Estructura del repositorio](#estructura-del-repositorio)
- [Requisitos previos](#requisitos-previos)
- [Instalación y puesta en marcha](#instalación-y-puesta-en-marcha)
- [Variables de entorno](#variables-de-entorno)
- [Base de datos y Prisma](#base-de-datos-y-prisma)
- [Docker local](#docker-local)
- [Usuarios de prueba](#usuarios-de-prueba)
- [Sistema de temas](#sistema-de-temas)
- [Build y despliegue](#build-y-despliegue)
- [Mejoras recientes de frontend](#mejoras-recientes-de-frontend)
- [Documentación complementaria](#documentación-complementaria)
- [Capturas y material visual](#capturas-y-material-visual)
- [Estado actual del proyecto](#estado-actual-del-proyecto)
- [Autoría y uso del software](#autoría-y-uso-del-software)
- [Historial de cambios](#historial-de-cambios)

## Resumen del sistema

`MicroserviciosPOS` es un sistema de punto de venta orientado a operación local. El repositorio concentra:

- un backend con NestJS, Prisma y PostgreSQL;
- un frontend con React, Vite y Zustand;
- autenticación con JWT;
- control de acceso por roles;
- operación de POS y caja;
- administración de productos, variantes, ingredientes, stock, recetas y combos;
- gestión de ventas, recibos e indicadores administrativos;
- un sistema visual premium con temas predefinidos persistidos por usuario.

## Alcance funcional verificado

Las capacidades verificadas en código y documentación interna del repositorio incluyen:

- inicio de sesión por `email` o `username`;
- roles `ADMIN`, `CASHIER` y `AUDITOR`;
- selección de punto de venta activo desde el encabezado del frontend;
- catálogo operativo consolidado para POS con variantes y combos activos;
- apertura, consulta y cierre de caja por ubicación;
- creación de ventas, aplicación de descuentos y pago en `CASH` o `TRANSFER`;
- generación y consulta de comprobantes, últimas ventas e historial filtrable;
- gestión administrativa de productos, variantes y recetas;
- gestión de ingredientes, unidades base y ajustes de stock por ubicación;
- configuración comercial de combos a partir de variantes;
- panel administrativo con resumen comercial, ventas por método de pago, top de ítems, stock bajo y actividad reciente;
- sistema de temas con cinco variantes visuales y preferencia persistida por usuario.

## Stack tecnológico real

### Backend

- NestJS 10
- TypeScript 5
- Prisma ORM 6
- PostgreSQL
- JWT (`@nestjs/jwt`)
- `bcrypt`
- `class-validator` y `class-transformer`

### Frontend

- React 19
- React Router 7
- Vite 6
- TypeScript 5
- Zustand 5
- Axios
- Tailwind CSS 4
- Recharts
- Lucide React

## Arquitectura general

```text
Frontend React/Vite
  ├─ Router protegido por rol
  ├─ Stores Zustand (sesión, app, carrito)
  ├─ ThemeProvider + selector de tema
  └─ Cliente Axios -> /api

Backend NestJS
  ├─ Guards JWT + roles
  ├─ Módulos por dominio
  ├─ Validación global
  ├─ Interceptor de respuesta uniforme
  └─ Filtro global de errores

Persistencia
  ├─ Prisma ORM
  ├─ Migraciones versionadas
  ├─ PostgreSQL operativo
  └─ SQLite legacy solo para exportacion y rollback
```

Notas de arquitectura verificadas:

- el backend publica su API bajo el prefijo global `http://localhost:3000/api`;
- el frontend usa `VITE_API_URL` y, si no existe, apunta a `http://localhost:3000/api`;
- la autenticación se resuelve con JWT de 12 horas;
- las respuestas exitosas y de error tienen envoltura consistente;
- el inventario se gestiona en unidad base (`g`, `ml`, `unit`) con conversión desde la unidad enviada;
- la preferencia de tema se persiste en el modelo `User`.

## Módulos principales

| Dominio | Backend | Frontend | Acceso verificado |
| --- | --- | --- | --- |
| Autenticación | `/auth/login`, `/auth/me`, `/auth/me/theme` | login, restauración de sesión, logout por expiración | Todos autenticados según sesión |
| POS | `/catalog`, `/sales`, `/sales/:id/pay` | `/pos` | `ADMIN`, `CASHIER` |
| Caja | `/cash/open`, `/cash/current`, `/cash/close` | `/cash` | `ADMIN`, `CASHIER` |
| Productos y variantes | `/products`, `/variants` | `/products` | gestión `ADMIN`, consulta `AUDITOR` |
| Recetas | `/recipes/variant/:id` | `/products` | gestión `ADMIN`, consulta `AUDITOR` |
| Ingredientes y stock | `/ingredients`, `/stock` | `/ingredients` | gestión `ADMIN`, consulta parcial `AUDITOR` |
| Combos | `/combos`, `/combos/:id/items` | `/combos` | gestión `ADMIN`, consulta `AUDITOR` |
| Ventas y recibos | `/sales`, `/sales/recent`, `/sales/latest`, `/sales/:id/receipt` | `/sales` | consulta `ADMIN`, `CASHIER`, `AUDITOR` |
| Panel administrativo | `/admin/*`, `/locations` | `/admin` | panel `ADMIN`, `AUDITOR`; creación de POS `ADMIN` |
| Temas | `/auth/me/theme` | selector en header autenticado | usuario autenticado |

## BusinessConfig

`BusinessConfig` centraliza la configuracion global del negocio y habilita una capa gradual de modulos opcionales sin intervenir todavia los modulos core del sistema.

- backend: modelo singleton `BusinessConfig`, enum `BusinessType`, presets por tipo de negocio y endpoints `GET /api/config` y `PATCH /api/config`;
- frontend admin: pantalla `/admin/config` para consultar y editar datos del negocio, tipo de negocio y `modules`;
- estado global: la app autenticada carga la configuracion despues de restaurar sesion y la expone mediante un store dedicado;
- aplicacion actual: ya se usa para visibilidad condicional y proteccion gradual de `ingredients`, `combos`, `recipes` y `fiscalFields`;
- referencia tecnica: [`docs/business-config.md`](docs/business-config.md).

## Estructura del repositorio

```text
.
├─ src/                     # Backend NestJS por módulos
├─ prisma/                  # schema.prisma, migraciones y seed
├─ frontend/                # Aplicación React/Vite
├─ docs/                    # Documentación técnica, funcional e histórica
├─ requests.http            # Colección manual de pruebas HTTP
├─ CHANGELOG.md             # Historial principal de cambios
├─ package.json             # Scripts y dependencias del backend
└─ README.md                # Portada del repositorio
```

## Requisitos previos

- Node.js 20 o superior recomendado
- pnpm 11.1.1
- Entorno capaz de ejecutar backend NestJS y frontend Vite
- Docker Desktop o Docker Engine con Compose plugin, solo si vas a usar el stack Docker local
- Puerto `3000` disponible para la API 
- Puerto disponible para Vite en desarrollo

## Instalación y puesta en marcha

### 1. Backend

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

La API quedará disponible en `http://localhost:3000/api`.
Si vienes de una base SQLite existente, sigue antes la guia de [docs/postgresql-migration.md](docs/postgresql-migration.md).

### 2. Frontend

```bash
pnpm -C frontend install
pnpm -C frontend run dev -- --host
```

Si no se define otra URL, el frontend consumirá `http://localhost:3000/api`.

## Variables de entorno

### Backend (`.env`)

Archivo base existente: `.env.example`

```env
DATABASE_URL="postgresql://example-user-only:example-password-only@localhost:5432/microserviciospos?schema=public"
SQLITE_DATABASE_URL="file:./prisma/dev.db"
JWT_SECRET="example-jwt-secret-only"
```

### Frontend

No existe un `.env.example` específico para `frontend/`, pero el código soporta:

```env
VITE_API_URL=http://localhost:3000/api
```

Úsalo solo si el backend no corre en la URL local por defecto.

## Base de datos y Prisma

- ORM: Prisma
- proveedor actual: PostgreSQL
- archivo de esquema: `prisma/schema.prisma`
- migraciones versionadas en `prisma/migrations/`
- historial SQLite legado en `prisma/migrations_sqlite_legacy/`
- seed de referencia en `prisma/seed.ts`
- seed demo opcional en `prisma/seed.demo.ts`
- tooling de migracion en `scripts/db/`

Estado actual de persistencia:

- la migración SQLite -> PostgreSQL ya quedó incorporada en esta línea base del repositorio;
- SQLite se conserva como fuente legacy para exportación, importación controlada y rollback documental;
- la guía operativa de migración sigue en [`docs/postgresql-migration.md`](docs/postgresql-migration.md).

Aspectos relevantes del modelo:

- `User` incluye `role`, `passwordHash` y `themePreference`;
- `Location` representa puntos de venta reales;
- `Ingredient`, `UnitType`, `IngredientStock` e `IngredientMovement` sostienen inventario y trazabilidad;
- `Product`, `ProductVariant`, `VariantRecipeItem`, `Combo` y `ComboItem` componen el catálogo comercial;
- `CashSession`, `Sale`, `SaleItem`, `Payment` y `AuditLog` cubren la operación comercial y de caja.

## Docker local

El repositorio ya incluye dockerización local para `postgres`, `backend` y `frontend`. El frontend se sirve con Nginx, consume la API por `/api` y hace proxy al backend sin cambiar los contratos HTTP de la aplicación.

Resumen de uso:

- para una base nueva o vacía: levantar `postgres`, correr `prisma:migrate:deploy`, ejecutar `prisma:seed` y luego subir `backend` y `frontend`;
- para una base ya migrada o importada: basta con `docker compose --env-file .env.docker up --build -d`;
- `prisma:seed:demo` debe usarse solo sobre una base vacía de pruebas;
- el detalle técnico completo quedó en [`docs/docker.md`](docs/docker.md).

Comandos principales:

```bash
cp .env.docker.example .env.docker
docker compose --env-file .env.docker up -d postgres
docker compose --env-file .env.docker run --rm backend pnpm exec prisma migrate deploy
docker compose --env-file .env.docker run --rm backend pnpm run prisma:seed
docker compose --env-file .env.docker up --build -d backend frontend
```

Para una base ya migrada o importada:

```bash
docker compose --env-file .env.docker up --build -d
```

## Usuarios de prueba

Los usuarios demo siguen disponibles, pero ahora viven en un flujo separado para no interferir con importaciones reales. Cargalos con `pnpm run prisma:seed:demo` cuando trabajes sobre una base vacia de pruebas. El script aborta si detecta una base con datos operativos:

| Rol | Username | Email | Contraseña |
| --- | --- | --- | --- |
| Administrador | `admin` | `admin@local.pos` | `example-demo-password-only` |
| Cajero | `cashier` | `cashier@local.pos` | `example-demo-password-only` |
| Auditor | `auditor` | `auditor@local.pos` | `example-demo-password-only` |

## Sistema de temas

El sistema de temas está implementado y activo en la UI autenticada. Temas soportados:

- `midnight-indigo`
- `graphite-cyan`
- `arctic-blue`
- `emerald-ops`
- `slate-amber`

Comportamiento verificado:

- la pantalla de login y el estado no autenticado permanecen en `midnight-indigo`;
- el usuario autenticado puede cambiar el tema desde el header;
- la preferencia se aplica de inmediato en el documento y se persiste por usuario en backend;
- `localStorage` se usa como respaldo técnico, no como fuente primaria del tema autenticado.

Detalle completo en [`docs/theme-system.md`](docs/theme-system.md).

## Build y despliegue

### Build backend

```bash
pnpm run build
pnpm run start:prod
```

### Build frontend

```bash
pnpm -C frontend run build
pnpm -C frontend run preview
```

Observaciones verificadas en el repositorio:

- el repositorio ya incluye `Dockerfile`, `compose.yaml` y configuración Docker dedicada para postgres, backend y frontend;
- la estrategia de despliegue documentable hoy sigue siendo local/manual, con una opción adicional vía Docker Compose;
- el backend genera artefactos en `dist/`;
- el frontend genera artefactos en `frontend/dist/`.

## Documentación complementaria

La documentación detallada quedó organizada en `docs/`:

- [`docs/README.md`](docs/README.md): índice documental
- [`docs/overview.md`](docs/overview.md): visión general y alcance
- [`docs/architecture.md`](docs/architecture.md): arquitectura y flujos entre capas
- [`docs/backend.md`](docs/backend.md): backend, módulos, seguridad y API
- [`docs/frontend.md`](docs/frontend.md): frontend, rutas, stores y UX
- [docs/pos-mobile-ux.md](docs/pos-mobile-ux.md): resumen tecnico y funcional de la fase POS 1A enfocada en jerarquia visual inicial y UX movil del POS
- [`docs/business-config.md`](docs/business-config.md): implementacion de BusinessConfig, presets, endpoints, store global y proteccion gradual por modulo
- [`docs/navigation-and-layout-updates.md`](docs/navigation-and-layout-updates.md): nota breve sobre navegación responsive, scroll-to-top y colapso del sidebar
- [`docs/database.md`](docs/database.md): Prisma, modelos y reglas de datos
- [`docs/modules.md`](docs/modules.md): mapa funcional del sistema
- [`docs/deployment.md`](docs/deployment.md): puesta en marcha y despliegue manual
- [`docs/postgresql-migration.md`](docs/postgresql-migration.md): guía de migración, importación y rollback controlado de SQLite a PostgreSQL
- [`docs/docker.md`](docs/docker.md): guía de uso local con Docker Compose
- [`docs/theme-system.md`](docs/theme-system.md): sistema visual y temas
- [`docs/product-catalog-enrichment.md`](docs/product-catalog-enrichment.md): enriquecimiento comercial y operativo incremental del catalogo de productos
- [`docs/user-flows.md`](docs/user-flows.md): flujos funcionales principales
- [`docs/changelog-summary.md`](docs/changelog-summary.md): síntesis evolutiva del proyecto
- [`docs/MANUAL_USUARIO.md`](docs/MANUAL_USUARIO.md): manual de operación para usuario final

## Capturas y material visual

El repositorio no incluye capturas oficiales actualmente. Se dejó una ubicación sugerida para material de presentación en:

- [`docs/assets/screenshots/README.md`](docs/assets/screenshots/README.md)

## Estado actual del proyecto

Estado verificado a nivel de repositorio:

- backend y frontend conviven en un mismo monorepo y comparten contratos reales;
- existen migraciones Prisma, seed inicial, colección `requests.http` y changelog histórico;
- el sistema de temas con persistencia por usuario ya forma parte del producto;
- la navegación y el acceso por rol están centralizados;
- no se identificaron scripts de pruebas automatizadas en los `package.json`;
- sí existen algunos elementos marcados como siguientes fases en la UI, por ejemplo:
  - exportación de reportes;
  - alertas configurables;
  - reglas por sucursal;
  - reordenacion visual de combos y refinamiento UX avanzado de su editor;
  - historial visual de movimientos recientes en inventario.

## Licencia

Software propietario. Todos los derechos reservados.

Consulta el archivo `LICENSE.md` para más información.

## Mejoras recientes de frontend

Actualizacion breve de navegacion, layout y sidebar en la interfaz autenticada:

- boton hamburguesa movil controlado desde el layout principal, dentro del flujo normal de la pagina y no desde el header;
- scroll automatico al inicio en cada cambio de ruta mediante `ScrollToTop`;
- cierre automatico del sidebar movil al navegar entre rutas;
- control desktop para colapsar o expandir el sidebar sin perder iconografia ni estados activos;
- ocultamiento explicito del control desktop en movil segun el breakpoint real del layout;
- refinamiento visual del estado activo del sidebar para eliminar el recorte lateral y alinear mejor el halo premium.

Detalle tecnico breve: [docs/navigation-and-layout-updates.md](docs/navigation-and-layout-updates.md)

Actualizacion breve de barras superiores y resumenes de modulos:

- refinamiento visual de las barras de estado superiores en POS, Caja, Productos, Ingredientes, Combos, Ventas y Admin;
- reduccion de texto redundante para priorizar lectura rapida y contexto operativo;
- unificacion de jerarquia entre titulo, estado y metricas;
- uso de una base reusable para estandarizar composicion y ayudas contextuales sin recargar la UI.

Detalle tecnico breve: [docs/module-status-header-updates.md](docs/module-status-header-updates.md)

Actualizacion breve de D0, D1, D2A y D3 en frontend:

- D0 dejo la base del sistema visual con tokens, superficies, botones, inputs, sheet, toast, search field, filter chip y `ProductMedia`;
- D1 aplica esa base al POS con un refresco visual fuerte en header mobile, hero operativo, catalogo, cards, carrito desktop, carrito mobile y resumen de venta;
- D2A alinea Caja con el lenguaje del POS mediante header operativo, paneles de apertura y cierre mas claros, empty state y resumen de sesion;
- D3 redirige Productos hacia una UI mas admin/SaaS con header, metricas, rail izquierdo, formularios, tablas y acciones mas sobrias; en la vista general la columna `Operacion` muestra tamanos y ya no repite el SKU;
- estas fases siguen siendo frontend-only: no agregan backend, reglas nuevas ni imagenes reales de producto conectadas desde datos;
- detalle tecnico y alcance verificado: [docs/pos-visual-phases.md](docs/pos-visual-phases.md)

Actualizacion breve de Combos:

- la pestana `Combos` ya permite crear, editar, activar o desactivar, eliminar con confirmacion, buscar por nombre y refrescar el listado sin salir de la vista;
- la composicion del combo ahora puede editarse desde un borrador explicito con visualizacion de items actuales, cambio de cantidades, baja puntual de items y alta de nuevos items antes de guardar;
- el POS mantiene compatibilidad porque sigue consumiendo combos activos desde `/catalog`, mientras la gestion administrativa opera sobre `/combos`;
- detalle tecnico y limitaciones actuales: [docs/combos.md](docs/combos.md)

Actualizacion breve de POS 1A:

- el POS recibio una primera mejora de UX enfocada en claridad operativa, jerarquia visual y uso mobile-first sin tocar backend ni reglas de negocio;
- el catalogo gano busqueda y filtros mas claros, junto con cards que comunican mejor nombre, tipo, SKU o presentacion y precio;
- el carrito gano mas presencia en desktop y en movil paso a vivir como una capa dedicada con toast de agregado, boton flotante y scroll interno;
- esta fase no implementa imagenes reales ni paginacion clasica; prepara la base para una siguiente etapa de rediseno visual mas fuerte.

Detalle tecnico breve: [docs/pos-mobile-ux.md](docs/pos-mobile-ux.md)

## Historial de cambios

- Historial principal: [`CHANGELOG.md`](CHANGELOG.md)
- Cierres documentales por sprint:
  - [`docs/sprints/sprint-7.md`](docs/sprints/sprint-7.md)
  - [`docs/sprints/sprint-8.md`](docs/sprints/sprint-8.md)
  - [`docs/sprints/sprint-9.md`](docs/sprints/sprint-9.md)




