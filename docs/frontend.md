# Frontend

## Resumen técnico

El frontend está ubicado en `frontend/` y construido con React 19, Vite y TypeScript. Su función es orquestar la experiencia operativa y administrativa del sistema POS, consumiendo la API local del backend.

## Stack y dependencias principales

- React 19
- React Router 7
- Vite 6
- Zustand 5
- Axios
- Tailwind CSS 4
- Recharts
- Lucide React

## Scripts disponibles

```bash
cd frontend
npm run dev
npm run build
npm run preview
```

Observación verificable: el `package.json` del frontend no expone scripts de test ni lint.

## Arranque de la aplicación

Archivo de entrada: `frontend/src/main.tsx`

Secuencia verificada:

1. se inicializa el tema por defecto;
2. se monta `AppBootstrap`;
3. `AppBootstrap` hidrata la sesión;
4. se configura el handler global de respuestas `401`;
5. `ThemeProvider` aplica el tema efectivo;
6. el router protegido toma el control de la navegación.

## Estructura principal

### `AppBootstrap`

- restaura sesión;
- activa logout forzado ante respuestas no autorizadas;
- envuelve la aplicación en `ThemeProvider`.

### `AppLayout`

- carga ubicaciones disponibles;
- mantiene header, sidebar y contenido principal;
- controla navegación móvil y cierre por `Escape`.

### Header

El header autenticado concentra tres controles transversales:

- selector de tema;
- selector de POS/ubicación activa;
- identificación del usuario y su rol.

## Estado compartido con Zustand

### `sessionStore`

- usuario autenticado;
- token persistido;
- hidratación de sesión;
- login y logout;
- actualización local de `themePreference`.

### `appStore`

- ubicaciones disponibles;
- POS activo;
- caja actual;
- entidades creadas en sesión (productos, variantes, ingredientes, combos);
- recibos recientes.

### `cartStore`

- carrito del POS;
- tipo y valor de descuento;
- actualización de cantidades y limpieza de venta.

## Integración con API

Cliente principal: `frontend/src/services/api/client.ts`

Características confirmadas:

- `baseURL` configurable por `VITE_API_URL`;
- token Bearer agregado por interceptor;
- normalización de errores de backend;
- notificación global de `401`.

`frontend/src/services/api/posApi.ts` centraliza los endpoints consumidos por la UI.

## Rutas principales

| Ruta | Función | Roles permitidos |
| --- | --- | --- |
| `/login` | Inicio de sesión | pública |
| `/pos` | Operación de venta | `ADMIN`, `CASHIER` |
| `/cash` | Apertura y cierre de caja | `ADMIN`, `CASHIER` |
| `/products` | Gestión de productos, variantes y recetas | `ADMIN`, `AUDITOR` |
| `/ingredients` | Gestión y consulta de inventario | `ADMIN`, `AUDITOR` |
| `/combos` | Gestión comercial de combos | `ADMIN`, `AUDITOR` |
| `/sales` | Consulta de ventas y comprobantes | `ADMIN`, `CASHIER`, `AUDITOR` |
| `/admin` | Dashboard administrativo | `ADMIN`, `AUDITOR` |
| `/access-denied` | Estado de acceso denegado | protegida |

## Pantallas funcionales verificadas

### Login

- acceso por usuario o correo;
- experiencia visual premium;
- mensajes de error normalizados.

### POS

- consulta de catálogo;
- búsqueda rápida;
- carrito;
- descuentos;
- cobro con modal de pago;
- consulta del último ticket desde estado de sesión.

### Caja

- apertura con fondo inicial;
- cierre con efectivo contado;
- resumen calculado por backend.

### Productos

- alta de productos y variantes;
- edición y activación/desactivación;
- consulta de cobertura de recetas;
- gestión de receta por variante.

### Ingredientes

- alta de ingredientes;
- ajuste de stock;
- consulta de stock por ubicación;
- lectura de ingredientes creados incluso si la sesión actual añadió datos antes de un refresco completo.

### Combos

- alta comercial;
- asociación de variantes a combos;
- consulta de combos creados.

### Ventas

- consulta por ID;
- comprobantes recientes;
- última venta;
- historial con filtros por estado, método, fechas y ubicación.

### Admin

- métricas de ventas del día;
- ticket promedio;
- caja actual;
- stock bajo;
- top de ítems;
- actividad reciente;
- gestión de puntos de venta.

## Sistema visual

El frontend ya incorpora:

- identidad visual premium compartida;
- componentes reutilizables para tarjetas, estados, modales y tablas;
- soporte responsive en layout principal;
- selector de tema y tematización transversal.

Detalle completo en [`theme-system.md`](theme-system.md).

## Observaciones de estado

Algunas piezas visibles en interfaz indican futuras ampliaciones, pero no implementación completa aún:

- botones de edición avanzada y reordenación de combos aparecen deshabilitados;
- Admin incluye placeholders para exportación de reportes, alertas configurables y reglas por sucursal;
- Ingredientes muestra un espacio preparado para auditoría visual de movimientos recientes, todavía sin listado operativo real en la pantalla.
