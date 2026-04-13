# MicroserviciosPOS

Repositorio principal de un sistema POS local con frontend y backend separados dentro del mismo proyecto. La interfaz autenticada se presenta como `Registry POS`, mientras que la API expone el backend local `MicroserviciosPOS API`.

La documentaciÃ³n de este repositorio fue actualizada sobre el estado real del cÃ³digo inspeccionado el 26 de marzo de 2026. Resume Ãºnicamente la arquitectura, mÃ³dulos, scripts y flujos que hoy estÃ¡n presentes en el repositorio.

## Contenido

- [Resumen del sistema](#resumen-del-sistema)
- [Alcance funcional verificado](#alcance-funcional-verificado)
- [Stack tecnolÃ³gico real](#stack-tecnolÃ³gico-real)
- [Arquitectura general](#arquitectura-general)
- [MÃ³dulos principales](#mÃ³dulos-principales)
- [BusinessConfig](#businessconfig)
- [Estructura del repositorio](#estructura-del-repositorio)
- [Requisitos previos](#requisitos-previos)
- [InstalaciÃ³n y puesta en marcha](#instalaciÃ³n-y-puesta-en-marcha)
- [Variables de entorno](#variables-de-entorno)
- [Base de datos y Prisma](#base-de-datos-y-prisma)
- [Docker local](#docker-local)
- [Usuarios de prueba](#usuarios-de-prueba)
- [Sistema de temas](#sistema-de-temas)
- [Build y despliegue](#build-y-despliegue)
- [Mejoras recientes de frontend](#mejoras-recientes-de-frontend)
- [DocumentaciÃ³n complementaria](#documentaciÃ³n-complementaria)
- [Capturas y material visual](#capturas-y-material-visual)
- [Estado actual del proyecto](#estado-actual-del-proyecto)
- [AutorÃ­a y uso del software](#autorÃ­a-y-uso-del-software)
- [Historial de cambios](#historial-de-cambios)

## Resumen del sistema

`MicroserviciosPOS` es un sistema de punto de venta orientado a operaciÃ³n local. El repositorio concentra:

- un backend con NestJS, Prisma y PostgreSQL;
- un frontend con React, Vite y Zustand;
- autenticaciÃ³n con JWT;
- control de acceso por roles;
- operaciÃ³n de POS y caja;
- administraciÃ³n de productos, variantes, ingredientes, stock, recetas y combos;
- gestiÃ³n de ventas, recibos e indicadores administrativos;
- un sistema visual premium con temas predefinidos persistidos por usuario.

## Alcance funcional verificado

Las capacidades verificadas en cÃ³digo y documentaciÃ³n interna del repositorio incluyen:

- inicio de sesiÃ³n por `email` o `username`;
- roles `ADMIN`, `CASHIER` y `AUDITOR`;
- selecciÃ³n de punto de venta activo desde el encabezado del frontend;
- catÃ¡logo operativo consolidado para POS con variantes y combos activos;
- apertura, consulta y cierre de caja por ubicaciÃ³n;
- creaciÃ³n de ventas, aplicaciÃ³n de descuentos y pago en `CASH` o `TRANSFER`;
- generaciÃ³n y consulta de comprobantes, Ãºltimas ventas e historial filtrable;
- gestiÃ³n administrativa de productos, variantes y recetas;
- gestiÃ³n de ingredientes, unidades base y ajustes de stock por ubicaciÃ³n;
- configuraciÃ³n comercial de combos a partir de variantes;
- panel administrativo con resumen comercial, ventas por mÃ©todo de pago, top de Ã­tems, stock bajo y actividad reciente;
- sistema de temas con cinco variantes visuales y preferencia persistida por usuario.

## Stack tecnolÃ³gico real

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
  â”œâ”€ Router protegido por rol
  â”œâ”€ Stores Zustand (sesiÃ³n, app, carrito)
  â”œâ”€ ThemeProvider + selector de tema
  â””â”€ Cliente Axios -> /api

Backend NestJS
  â”œâ”€ Guards JWT + roles
  â”œâ”€ MÃ³dulos por dominio
  â”œâ”€ ValidaciÃ³n global
  â”œâ”€ Interceptor de respuesta uniforme
  â””â”€ Filtro global de errores

Persistencia
  â”œâ”€ Prisma ORM
  â”œâ”€ Migraciones versionadas
  â”œâ”€ PostgreSQL operativo
  â””â”€ SQLite legacy solo para exportacion y rollback
```

Notas de arquitectura verificadas:

- el backend publica su API bajo el prefijo global `http://localhost:3000/api`;
- el frontend usa `VITE_API_URL` y, si no existe, apunta a `http://localhost:3000/api`;
- la autenticaciÃ³n se resuelve con JWT de 12 horas;
- las respuestas exitosas y de error tienen envoltura consistente;
- el inventario se gestiona en unidad base (`g`, `ml`, `unit`) con conversiÃ³n desde la unidad enviada;
- la preferencia de tema se persiste en el modelo `User`.

## MÃ³dulos principales

| Dominio | Backend | Frontend | Acceso verificado |
| --- | --- | --- | --- |
| AutenticaciÃ³n | `/auth/login`, `/auth/me`, `/auth/me/theme` | login, restauraciÃ³n de sesiÃ³n, logout por expiraciÃ³n | Todos autenticados segÃºn sesiÃ³n |
| POS | `/catalog`, `/sales`, `/sales/:id/pay` | `/pos` | `ADMIN`, `CASHIER` |
| Caja | `/cash/open`, `/cash/current`, `/cash/close` | `/cash` | `ADMIN`, `CASHIER` |
| Productos y variantes | `/products`, `/variants` | `/products` | gestiÃ³n `ADMIN`, consulta `AUDITOR` |
| Recetas | `/recipes/variant/:id` | `/products` | gestiÃ³n `ADMIN`, consulta `AUDITOR` |
| Ingredientes y stock | `/ingredients`, `/stock` | `/ingredients` | gestiÃ³n `ADMIN`, consulta parcial `AUDITOR` |
| Combos | `/combos`, `/combos/:id/items` | `/combos` | gestiÃ³n `ADMIN`, consulta `AUDITOR` |
| Ventas y recibos | `/sales`, `/sales/recent`, `/sales/latest`, `/sales/:id/receipt` | `/sales` | consulta `ADMIN`, `CASHIER`, `AUDITOR` |
| Panel administrativo | `/admin/*`, `/locations` | `/admin` | panel `ADMIN`, `AUDITOR`; creaciÃ³n de POS `ADMIN` |
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
â”œâ”€ src/                     # Backend NestJS por mÃ³dulos
â”œâ”€ prisma/                  # schema.prisma, migraciones y seed
â”œâ”€ frontend/                # AplicaciÃ³n React/Vite
â”œâ”€ docs/                    # DocumentaciÃ³n tÃ©cnica, funcional e histÃ³rica
â”œâ”€ requests.http            # ColecciÃ³n manual de pruebas HTTP
â”œâ”€ CHANGELOG.md             # Historial principal de cambios
â”œâ”€ package.json             # Scripts y dependencias del backend
â””â”€ README.md                # Portada del repositorio
```

## Requisitos previos

- Node.js 20 o superior recomendado
- npm
- Entorno capaz de ejecutar backend NestJS y frontend Vite
- Docker Desktop o Docker Engine con Compose plugin, solo si vas a usar el stack Docker local
- Puerto `3000` disponible para la API 
- Puerto disponible para Vite en desarrollo

## InstalaciÃ³n y puesta en marcha

### 1. Backend

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

La API quedarÃ¡ disponible en `http://localhost:3000/api`.
Si vienes de una base SQLite existente, sigue antes la guia de [docs/postgresql-migration.md](docs/postgresql-migration.md).

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Si no se define otra URL, el frontend consumirÃ¡ `http://localhost:3000/api`.

## Variables de entorno

### Backend (`.env`)

Archivo base existente: `.env.example`

```env
DATABASE_URL="postgresql://example-user-only:example-password-only@localhost:5432/microserviciospos?schema=public"
SQLITE_DATABASE_URL="file:./prisma/dev.db"
JWT_SECRET="example-jwt-secret-only"
```

### Frontend

No existe un `.env.example` especÃ­fico para `frontend/`, pero el cÃ³digo soporta:

```env
VITE_API_URL=http://localhost:3000/api
```

Ãšsalo solo si el backend no corre en la URL local por defecto.

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

- la migraciÃ³n SQLite -> PostgreSQL ya quedÃ³ incorporada en esta lÃ­nea base del repositorio;
- SQLite se conserva como fuente legacy para exportaciÃ³n, importaciÃ³n controlada y rollback documental;
- la guÃ­a operativa de migraciÃ³n sigue en [`docs/postgresql-migration.md`](docs/postgresql-migration.md).

Aspectos relevantes del modelo:

- `User` incluye `role`, `passwordHash` y `themePreference`;
- `Location` representa puntos de venta reales;
- `Ingredient`, `UnitType`, `IngredientStock` e `IngredientMovement` sostienen inventario y trazabilidad;
- `Product`, `ProductVariant`, `VariantRecipeItem`, `Combo` y `ComboItem` componen el catÃ¡logo comercial;
- `CashSession`, `Sale`, `SaleItem`, `Payment` y `AuditLog` cubren la operaciÃ³n comercial y de caja.

## Docker local

El repositorio ya incluye dockerizaciÃ³n local para `postgres`, `backend` y `frontend`. El frontend se sirve con Nginx, consume la API por `/api` y hace proxy al backend sin cambiar los contratos HTTP de la aplicaciÃ³n.

Resumen de uso:

- para una base nueva o vacÃ­a: levantar `postgres`, correr `prisma:migrate:deploy`, ejecutar `prisma:seed` y luego subir `backend` y `frontend`;
- para una base ya migrada o importada: basta con `docker compose --env-file .env.docker up --build -d`;
- `prisma:seed:demo` debe usarse solo sobre una base vacÃ­a de pruebas;
- el detalle tÃ©cnico completo quedÃ³ en [`docs/docker.md`](docs/docker.md).

Comandos principales:

```bash
cp .env.docker.example .env.docker
docker compose --env-file .env.docker up -d postgres
docker compose --env-file .env.docker run --rm backend npm run prisma:migrate:deploy
docker compose --env-file .env.docker run --rm backend npm run prisma:seed
docker compose --env-file .env.docker up --build -d backend frontend
```

Para una base ya migrada o importada:

```bash
docker compose --env-file .env.docker up --build -d
```

## Usuarios de prueba

Los usuarios demo siguen disponibles, pero ahora viven en un flujo separado para no interferir con importaciones reales. Cargalos con `npm run prisma:seed:demo` cuando trabajes sobre una base vacia de pruebas. El script aborta si detecta una base con datos operativos:

| Rol | Username | Email | ContraseÃ±a |
| --- | --- | --- | --- |
| Administrador | `admin` | `admin@local.pos` | `example-demo-password-only` |
| Cajero | `cashier` | `cashier@local.pos` | `example-demo-password-only` |
| Auditor | `auditor` | `auditor@local.pos` | `example-demo-password-only` |

## Sistema de temas

El sistema de temas estÃ¡ implementado y activo en la UI autenticada. Temas soportados:

- `midnight-indigo`
- `graphite-cyan`
- `arctic-blue`
- `emerald-ops`
- `slate-amber`

Comportamiento verificado:

- la pantalla de login y el estado no autenticado permanecen en `midnight-indigo`;
- el usuario autenticado puede cambiar el tema desde el header;
- la preferencia se aplica de inmediato en el documento y se persiste por usuario en backend;
- `localStorage` se usa como respaldo tÃ©cnico, no como fuente primaria del tema autenticado.

Detalle completo en [`docs/theme-system.md`](docs/theme-system.md).

## Build y despliegue

### Build backend

```bash
npm run build
npm run start:prod
```

### Build frontend

```bash
cd frontend
npm run build
npm run preview
```

Observaciones verificadas en el repositorio:

- el repositorio ya incluye `Dockerfile`, `compose.yaml` y configuraciÃ³n Docker dedicada para postgres, backend y frontend;
- la estrategia de despliegue documentable hoy sigue siendo local/manual, con una opciÃ³n adicional vÃ­a Docker Compose;
- el backend genera artefactos en `dist/`;
- el frontend genera artefactos en `frontend/dist/`.

## DocumentaciÃ³n complementaria

La documentaciÃ³n detallada quedÃ³ organizada en `docs/`:

- [`docs/README.md`](docs/README.md): Ã­ndice documental
- [`docs/overview.md`](docs/overview.md): visiÃ³n general y alcance
- [`docs/architecture.md`](docs/architecture.md): arquitectura y flujos entre capas
- [`docs/backend.md`](docs/backend.md): backend, mÃ³dulos, seguridad y API
- [`docs/frontend.md`](docs/frontend.md): frontend, rutas, stores y UX
- [docs/pos-mobile-ux.md](docs/pos-mobile-ux.md): resumen tecnico y funcional de la fase POS 1A enfocada en jerarquia visual inicial y UX movil del POS
- [`docs/business-config.md`](docs/business-config.md): implementacion de BusinessConfig, presets, endpoints, store global y proteccion gradual por modulo
- [`docs/navigation-and-layout-updates.md`](docs/navigation-and-layout-updates.md): nota breve sobre navegaciÃ³n responsive, scroll-to-top y colapso del sidebar
- [`docs/database.md`](docs/database.md): Prisma, modelos y reglas de datos
- [`docs/modules.md`](docs/modules.md): mapa funcional del sistema
- [`docs/deployment.md`](docs/deployment.md): puesta en marcha y despliegue manual
- [`docs/postgresql-migration.md`](docs/postgresql-migration.md): guÃ­a de migraciÃ³n, importaciÃ³n y rollback controlado de SQLite a PostgreSQL
- [`docs/docker.md`](docs/docker.md): guÃ­a de uso local con Docker Compose
- [`docs/theme-system.md`](docs/theme-system.md): sistema visual y temas
- [`docs/product-catalog-enrichment.md`](docs/product-catalog-enrichment.md): enriquecimiento comercial y operativo incremental del catalogo de productos
- [`docs/user-flows.md`](docs/user-flows.md): flujos funcionales principales
- [`docs/changelog-summary.md`](docs/changelog-summary.md): sÃ­ntesis evolutiva del proyecto
- [`docs/MANUAL_USUARIO.md`](docs/MANUAL_USUARIO.md): manual de operaciÃ³n para usuario final

## Capturas y material visual

El repositorio no incluye capturas oficiales actualmente. Se dejÃ³ una ubicaciÃ³n sugerida para material de presentaciÃ³n en:

- [`docs/assets/screenshots/README.md`](docs/assets/screenshots/README.md)

## Estado actual del proyecto

Estado verificado a nivel de repositorio:

- backend y frontend conviven en un mismo monorepo y comparten contratos reales;
- existen migraciones Prisma, seed inicial, colecciÃ³n `requests.http` y changelog histÃ³rico;
- el sistema de temas con persistencia por usuario ya forma parte del producto;
- la navegaciÃ³n y el acceso por rol estÃ¡n centralizados;
- no se identificaron scripts de pruebas automatizadas en los `package.json`;
- sÃ­ existen algunos elementos marcados como siguientes fases en la UI, por ejemplo:
  - exportaciÃ³n de reportes;
  - alertas configurables;
  - reglas por sucursal;
  - reordenacion visual de combos y refinamiento UX avanzado de su editor;
  - historial visual de movimientos recientes en inventario.

## Licencia

Software propietario. Todos los derechos reservados.

Consulta el archivo `LICENSE.md` para mÃ¡s informaciÃ³n.

## Mejoras recientes de frontend

Actualizacion breve de navegacion, layout y sidebar en la interfaz autenticada:

- boton hamburguesa persistente en movil, ahora controlado desde el layout principal y no desde el header;
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



