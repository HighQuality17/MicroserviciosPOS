# MicroserviciosPOS

Repositorio principal de un sistema POS local con frontend y backend separados dentro del mismo proyecto. La interfaz autenticada se presenta como `Registry POS`, mientras que la API expone el backend local `MicroserviciosPOS API`.

La documentaciÃƒÆ’Ã‚Â³n de este repositorio fue actualizada sobre el estado real del cÃƒÆ’Ã‚Â³digo inspeccionado el 26 de marzo de 2026. Resume ÃƒÆ’Ã‚Âºnicamente la arquitectura, mÃƒÆ’Ã‚Â³dulos, scripts y flujos que hoy estÃƒÆ’Ã‚Â¡n presentes en el repositorio.

## Contenido

- [Resumen del sistema](#resumen-del-sistema)
- [Alcance funcional verificado](#alcance-funcional-verificado)
- [Stack tecnolÃƒÆ’Ã‚Â³gico real](#stack-tecnolÃƒÆ’Ã‚Â³gico-real)
- [Arquitectura general](#arquitectura-general)
- [MÃƒÆ’Ã‚Â³dulos principales](#mÃƒÆ’Ã‚Â³dulos-principales)
- [Estructura del repositorio](#estructura-del-repositorio)
- [Requisitos previos](#requisitos-previos)
- [InstalaciÃƒÆ’Ã‚Â³n y puesta en marcha](#instalaciÃƒÆ’Ã‚Â³n-y-puesta-en-marcha)
- [Variables de entorno](#variables-de-entorno)
- [Base de datos y Prisma](#base-de-datos-y-prisma)
- [Usuarios de prueba](#usuarios-de-prueba)
- [Sistema de temas](#sistema-de-temas)
- [Build y despliegue](#build-y-despliegue)
- [Mejoras recientes de frontend](#mejoras-recientes-de-frontend)
- [DocumentaciÃƒÆ’Ã‚Â³n complementaria](#documentaciÃƒÆ’Ã‚Â³n-complementaria)
- [Capturas y material visual](#capturas-y-material-visual)
- [Estado actual del proyecto](#estado-actual-del-proyecto)
- [AutorÃƒÆ’Ã‚Â­a y uso del software](#autorÃƒÆ’Ã‚Â­a-y-uso-del-software)
- [Historial de cambios](#historial-de-cambios)

## Resumen del sistema

`MicroserviciosPOS` es un sistema de punto de venta orientado a operaciÃƒÆ’Ã‚Â³n local. El repositorio concentra:

- un backend con NestJS, Prisma y SQLite;
- un frontend con React, Vite y Zustand;
- autenticaciÃƒÆ’Ã‚Â³n con JWT;
- control de acceso por roles;
- operaciÃƒÆ’Ã‚Â³n de POS y caja;
- administraciÃƒÆ’Ã‚Â³n de productos, variantes, ingredientes, stock, recetas y combos;
- gestiÃƒÆ’Ã‚Â³n de ventas, recibos e indicadores administrativos;
- un sistema visual premium con temas predefinidos persistidos por usuario.

## Alcance funcional verificado

Las capacidades verificadas en cÃƒÆ’Ã‚Â³digo y documentaciÃƒÆ’Ã‚Â³n interna del repositorio incluyen:

- inicio de sesiÃƒÆ’Ã‚Â³n por `email` o `username`;
- roles `ADMIN`, `CASHIER` y `AUDITOR`;
- selecciÃƒÆ’Ã‚Â³n de punto de venta activo desde el encabezado del frontend;
- catÃƒÆ’Ã‚Â¡logo operativo consolidado para POS con variantes y combos activos;
- apertura, consulta y cierre de caja por ubicaciÃƒÆ’Ã‚Â³n;
- creaciÃƒÆ’Ã‚Â³n de ventas, aplicaciÃƒÆ’Ã‚Â³n de descuentos y pago en `CASH` o `TRANSFER`;
- generaciÃƒÆ’Ã‚Â³n y consulta de comprobantes, ÃƒÆ’Ã‚Âºltimas ventas e historial filtrable;
- gestiÃƒÆ’Ã‚Â³n administrativa de productos, variantes y recetas;
- gestiÃƒÆ’Ã‚Â³n de ingredientes, unidades base y ajustes de stock por ubicaciÃƒÆ’Ã‚Â³n;
- configuraciÃƒÆ’Ã‚Â³n comercial de combos a partir de variantes;
- panel administrativo con resumen comercial, ventas por mÃƒÆ’Ã‚Â©todo de pago, top de ÃƒÆ’Ã‚Â­tems, stock bajo y actividad reciente;
- sistema de temas con cinco variantes visuales y preferencia persistida por usuario.

## Stack tecnolÃƒÆ’Ã‚Â³gico real

### Backend

- NestJS 10
- TypeScript 5
- Prisma ORM 6
- SQLite
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
  ÃƒÂ¢Ã¢â‚¬ÂÃ…â€œÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ Router protegido por rol
  ÃƒÂ¢Ã¢â‚¬ÂÃ…â€œÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ Stores Zustand (sesiÃƒÆ’Ã‚Â³n, app, carrito)
  ÃƒÂ¢Ã¢â‚¬ÂÃ…â€œÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ ThemeProvider + selector de tema
  ÃƒÂ¢Ã¢â‚¬ÂÃ¢â‚¬ÂÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ Cliente Axios -> /api

Backend NestJS
  ÃƒÂ¢Ã¢â‚¬ÂÃ…â€œÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ Guards JWT + roles
  ÃƒÂ¢Ã¢â‚¬ÂÃ…â€œÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ MÃƒÆ’Ã‚Â³dulos por dominio
  ÃƒÂ¢Ã¢â‚¬ÂÃ…â€œÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ ValidaciÃƒÆ’Ã‚Â³n global
  ÃƒÂ¢Ã¢â‚¬ÂÃ…â€œÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ Interceptor de respuesta uniforme
  ÃƒÂ¢Ã¢â‚¬ÂÃ¢â‚¬ÂÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ Filtro global de errores

Persistencia
  ÃƒÂ¢Ã¢â‚¬ÂÃ…â€œÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ Prisma ORM
  ÃƒÂ¢Ã¢â‚¬ÂÃ…â€œÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ Migraciones versionadas
  ÃƒÂ¢Ã¢â‚¬ÂÃ¢â‚¬ÂÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ SQLite local
```

Notas de arquitectura verificadas:

- el backend publica su API bajo el prefijo global `http://localhost:3000/api`;
- el frontend usa `VITE_API_URL` y, si no existe, apunta a `http://localhost:3000/api`;
- la autenticaciÃƒÆ’Ã‚Â³n se resuelve con JWT de 12 horas;
- las respuestas exitosas y de error tienen envoltura consistente;
- el inventario se gestiona en unidad base (`g`, `ml`, `unit`) con conversiÃƒÆ’Ã‚Â³n desde la unidad enviada;
- la preferencia de tema se persiste en el modelo `User`.

## MÃƒÆ’Ã‚Â³dulos principales

| Dominio               | Backend                                                          | Frontend                                                                  | Acceso verificado                                        |
| --------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------- | -------------------------------------------------------- |
| AutenticaciÃƒÆ’Ã‚Â³n  | `/auth/login`, `/auth/me`, `/auth/me/theme`                      | login, restauraciÃƒÆ’Ã‚Â³n de sesiÃƒÆ’Ã‚Â³n, logout por expiraciÃƒÆ’Ã‚Â³n | Todos autenticados segÃƒÆ’Ã‚Âºn sesiÃƒÆ’Ã‚Â³n            |
| POS                   | `/catalog`, `/sales`, `/sales/:id/pay`                           | `/pos`                                                                    | `ADMIN`, `CASHIER`                                       |
| Caja                  | `/cash/open`, `/cash/current`, `/cash/close`                     | `/cash`                                                                   | `ADMIN`, `CASHIER`                                       |
| Productos y variantes | `/products`, `/variants`                                         | `/products`                                                               | gestiÃƒÆ’Ã‚Â³n `ADMIN`, consulta `AUDITOR`               |
| Recetas               | `/recipes/variant/:id`                                           | `/products`                                                               | gestiÃƒÆ’Ã‚Â³n `ADMIN`, consulta `AUDITOR`               |
| Ingredientes y stock  | `/ingredients`, `/stock`                                         | `/ingredients`                                                            | gestiÃƒÆ’Ã‚Â³n `ADMIN`, consulta parcial `AUDITOR`       |
| Combos                | `/combos`, `/combos/:id/items`                                   | `/combos`                                                                 | gestiÃƒÆ’Ã‚Â³n `ADMIN`, consulta `AUDITOR`               |
| Ventas y recibos      | `/sales`, `/sales/recent`, `/sales/latest`, `/sales/:id/receipt` | `/sales`                                                                  | consulta `ADMIN`, `CASHIER`, `AUDITOR`                   |
| Panel administrativo  | `/admin/*`, `/locations`                                         | `/admin`                                                                  | panel `ADMIN`, `AUDITOR`; creaciÃƒÆ’Ã‚Â³n de POS `ADMIN` |
| Temas                 | `/auth/me/theme`                                                 | selector en header autenticado                                            | usuario autenticado                                      |

## Estructura del repositorio

```text
.
ÃƒÂ¢Ã¢â‚¬ÂÃ…â€œÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ src/                     # Backend NestJS por mÃƒÆ’Ã‚Â³dulos
ÃƒÂ¢Ã¢â‚¬ÂÃ…â€œÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ prisma/                  # schema.prisma, migraciones y seed
ÃƒÂ¢Ã¢â‚¬ÂÃ…â€œÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ frontend/                # AplicaciÃƒÆ’Ã‚Â³n React/Vite
ÃƒÂ¢Ã¢â‚¬ÂÃ…â€œÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ docs/                    # DocumentaciÃƒÆ’Ã‚Â³n tÃƒÆ’Ã‚Â©cnica, funcional e histÃƒÆ’Ã‚Â³rica
ÃƒÂ¢Ã¢â‚¬ÂÃ…â€œÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ requests.http            # ColecciÃƒÆ’Ã‚Â³n manual de pruebas HTTP
ÃƒÂ¢Ã¢â‚¬ÂÃ…â€œÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ CHANGELOG.md             # Historial principal de cambios
ÃƒÂ¢Ã¢â‚¬ÂÃ…â€œÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ package.json             # Scripts y dependencias del backend
ÃƒÂ¢Ã¢â‚¬ÂÃ¢â‚¬ÂÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ README.md                # Portada del repositorio
```

## Requisitos previos

- Node.js 20 o superior recomendado
- npm
- Entorno capaz de ejecutar backend NestJS y frontend Vite
- Puerto `3000` disponible para la API local
- Puerto disponible para Vite en desarrollo

## InstalaciÃƒÆ’Ã‚Â³n y puesta en marcha

### 1. Backend

```bash
npm install
# crear .env a partir de .env.example
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
npm run start:dev
```

La API quedarÃƒÆ’Ã‚Â¡ disponible en `http://localhost:3000/api`.

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Si no se define otra URL, el frontend consumirÃƒÆ’Ã‚Â¡ `http://localhost:3000/api`.

## Variables de entorno

### Backend (`.env`)

Archivo base existente: `.env.example`

```env
DATABASE_URL="file:./prisma/dev.db"
JWT_SECRET="change-this-in-production"
```

### Frontend

No existe un `.env.example` especÃƒÆ’Ã‚Â­fico para `frontend/`, pero el cÃƒÆ’Ã‚Â³digo soporta:

```env
VITE_API_URL=http://localhost:3000/api
```

ÃƒÆ’Ã…Â¡salo solo si el backend no corre en la URL local por defecto.

## Base de datos y Prisma

- ORM: Prisma
- proveedor actual: SQLite
- archivo de esquema: `prisma/schema.prisma`
- migraciones versionadas en `prisma/migrations/`
- seed disponible en `prisma/seed.ts`

Aspectos relevantes del modelo:

- `User` incluye `role`, `passwordHash` y `themePreference`;
- `Location` representa puntos de venta reales;
- `Ingredient`, `UnitType`, `IngredientStock` e `IngredientMovement` sostienen inventario y trazabilidad;
- `Product`, `ProductVariant`, `VariantRecipeItem`, `Combo` y `ComboItem` componen el catÃƒÆ’Ã‚Â¡logo comercial;
- `CashSession`, `Sale`, `SaleItem`, `Payment` y `AuditLog` cubren la operaciÃƒÆ’Ã‚Â³n comercial y de caja.

## Usuarios de prueba

El seed actual crea tres usuarios de ejemplo con contraseÃƒÆ’Ã‚Â±a compartida:

| Rol           | Username  | Email               | ContraseÃƒÆ’Ã‚Â±a |
| ------------- | --------- | ------------------- | ----------------- |
| Administrador | `admin`   | `admin@local.pos`   | `Pos123456!`      |
| Cajero        | `cashier` | `cashier@local.pos` | `Pos123456!`      |
| Auditor       | `auditor` | `auditor@local.pos` | `Pos123456!`      |

## Sistema de temas

El sistema de temas estÃƒÆ’Ã‚Â¡ implementado y activo en la UI autenticada. Temas soportados:

- `midnight-indigo`
- `graphite-cyan`
- `arctic-blue`
- `emerald-ops`
- `slate-amber`

Comportamiento verificado:

- la pantalla de login y el estado no autenticado permanecen en `midnight-indigo`;
- el usuario autenticado puede cambiar el tema desde el header;
- la preferencia se aplica de inmediato en el documento y se persiste por usuario en backend;
- `localStorage` se usa como respaldo tÃƒÆ’Ã‚Â©cnico, no como fuente primaria del tema autenticado.

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

- no se detectaron `Dockerfile`, `docker-compose`, manifiestos de orquestaciÃƒÆ’Ã‚Â³n ni pipeline CI/CD dentro del repo;
- la estrategia de despliegue documentable hoy es manual/local;
- el backend genera artefactos en `dist/`;
- el frontend genera artefactos en `frontend/dist/`.

## DocumentaciÃƒÆ’Ã‚Â³n complementaria

La documentaciÃƒÆ’Ã‚Â³n detallada quedÃƒÆ’Ã‚Â³ organizada en `docs/`:

- [`docs/README.md`](docs/README.md): ÃƒÆ’Ã‚Â­ndice documental
- [`docs/overview.md`](docs/overview.md): visiÃƒÆ’Ã‚Â³n general y alcance
- [`docs/architecture.md`](docs/architecture.md): arquitectura y flujos entre capas
- [`docs/backend.md`](docs/backend.md): backend, mÃƒÆ’Ã‚Â³dulos, seguridad y API
- [`docs/frontend.md`](docs/frontend.md): frontend, rutas, stores y UX
- [`docs/navigation-and-layout-updates.md`](docs/navigation-and-layout-updates.md): nota breve sobre navegaciÃƒÆ’Ã‚Â³n responsive, scroll-to-top y colapso del sidebar
- [`docs/database.md`](docs/database.md): Prisma, modelos y reglas de datos
- [`docs/modules.md`](docs/modules.md): mapa funcional del sistema
- [`docs/deployment.md`](docs/deployment.md): puesta en marcha y despliegue manual
- [`docs/theme-system.md`](docs/theme-system.md): sistema visual y temas
- [`docs/stock-adjustment-enhancement.md`](docs/stock-adjustment-enhancement.md): nota tecnica breve de la Fase 3 de movimientos auditados de stock
- [`docs/dian-fields-preparation.md`](docs/dian-fields-preparation.md): nota tecnica breve de la Fase 2 de preparacion fiscal opcional en productos
- [`docs/user-flows.md`](docs/user-flows.md): flujos funcionales principales
- [`docs/changelog-summary.md`](docs/changelog-summary.md): sÃƒÆ’Ã‚Â­ntesis evolutiva del proyecto
- [`docs/MANUAL_USUARIO.md`](docs/MANUAL_USUARIO.md): manual de operaciÃƒÆ’Ã‚Â³n para usuario final

## Capturas y material visual

El repositorio no incluye capturas oficiales actualmente. Se dejÃƒÆ’Ã‚Â³ una ubicaciÃƒÆ’Ã‚Â³n sugerida para material de presentaciÃƒÆ’Ã‚Â³n en:

- [`docs/assets/screenshots/README.md`](docs/assets/screenshots/README.md)

## Estado actual del proyecto

Estado verificado a nivel de repositorio:

- backend y frontend conviven en un mismo monorepo y comparten contratos reales;
- existen migraciones Prisma, seed inicial, colecciÃƒÆ’Ã‚Â³n `requests.http` y changelog histÃƒÆ’Ã‚Â³rico;
- el sistema de temas con persistencia por usuario ya forma parte del producto;
- la navegaciÃƒÆ’Ã‚Â³n y el acceso por rol estÃƒÆ’Ã‚Â¡n centralizados;
- no se identificaron scripts de pruebas automatizadas en los `package.json`;
- sÃƒÆ’Ã‚Â­ existen algunos elementos marcados como siguientes fases en la UI, por ejemplo:
  - exportaciÃƒÆ’Ã‚Â³n de reportes;
  - alertas configurables;
  - reglas por sucursal;
  - ediciÃƒÆ’Ã‚Â³n/reordenaciÃƒÆ’Ã‚Â³n completa de combos;
  - historial visual de movimientos recientes en inventario.

## Licencia

Software propietario. Todos los derechos reservados.

Consulta el archivo `LICENSE.md` para mÃƒÆ’Ã‚Â¡s informaciÃƒÆ’Ã‚Â³n.

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

## Historial de cambios

- Historial principal: [`CHANGELOG.md`](CHANGELOG.md)
- Cierres documentales por sprint:
  - [`docs/sprints/sprint-7.md`](docs/sprints/sprint-7.md)
  - [`docs/sprints/sprint-8.md`](docs/sprints/sprint-8.md)
  - [`docs/sprints/sprint-9.md`](docs/sprints/sprint-9.md)

