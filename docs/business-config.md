# BusinessConfig

Guia tecnica y funcional de la implementacion actual de `BusinessConfig` en `MicroserviciosPOS / Registry POS`.

## Proposito

`BusinessConfig` centraliza una configuracion global de negocio para:

- definir identidad basica del negocio;
- clasificar el tipo de negocio mediante presets;
- activar o desactivar modulos opcionales;
- exponer esa configuracion al frontend autenticado;
- aplicar visibilidad y proteccion gradual sin tocar todavia los modulos core.

La version actual fue implementada por fases y hoy cubre backend, vista administrativa, store global frontend, visibilidad condicional y proteccion parcial por rutas y subflujos.

## Alcance implementado

Estado actual resumido:

1. Backend base:
   modelo Prisma, migracion, singleton, defaults, presets, validaciones y endpoints.
2. Vista administrativa:
   pantalla `/admin/config` para consultar y editar la configuracion.
3. Estado global frontend:
   carga automatica despues de autenticacion y store dedicado.
4. Visibilidad condicional:
   ocultamiento gradual de accesos y secciones opcionales.
5. Proteccion gradual:
   bloqueo por ruta de `ingredients` y `combos`, y bloqueo de subflujos opcionales en `ProductsPage`.

## Archivos clave

Backend:

- `prisma/schema.prisma`
- `prisma/migrations/20260403175848_add_business_config/migration.sql`
- `src/config/config.defaults.ts`
- `src/config/config.service.ts`
- `src/config/config.controller.ts`
- `src/config/dto/update-business-config.dto.ts`
- `src/app.module.ts`

Frontend:

- `frontend/src/types/api.ts`
- `frontend/src/services/api/posApi.ts`
- `frontend/src/store/businessConfigStore.ts`
- `frontend/src/hooks/useBusinessModules.ts`
- `frontend/src/app/AppBootstrap.tsx`
- `frontend/src/app/router/index.tsx`
- `frontend/src/app/router/ModuleAccessRoute.tsx`
- `frontend/src/features/access/ModuleDisabledPage.tsx`
- `frontend/src/features/admin/AdminConfigPage.tsx`
- `frontend/src/components/Sidebar.tsx`
- `frontend/src/features/admin/AdminPage.tsx`
- `frontend/src/features/products/ProductsPage.tsx`

## Modelo general

### Enum `BusinessType`

Valores soportados:

| Valor tecnico | Etiqueta funcional |
| --- | --- |
| `DESSERT_SHOP` | Postres |
| `CAFE` | Cafe |
| `RESTAURANT` | Restaurante |
| `RETAIL` | Retail |
| `MINIMARKET` | Minimarket |
| `SALON` | Peluqueria |
| `CUSTOM` | Personalizado |

### Modelo Prisma `BusinessConfig`

`BusinessConfig` es un singleton global. Su registro esperado vive en `id = 1`.

Campos principales:

| Campo | Tipo | Nota |
| --- | --- | --- |
| `id` | `Int` | singleton con default `1` |
| `businessName` | `String` | nombre comercial visible |
| `legalName` | `String?` | razon social opcional |
| `businessType` | `BusinessType` | tipo de negocio, default `DESSERT_SHOP` |
| `currencyCode` | `String` | default `COP` |
| `timezone` | `String` | default `America/Bogota` |
| `countryCode` | `String` | default `CO` |
| `email` | `String?` | correo opcional |
| `phone` | `String?` | telefono opcional |
| `address` | `String?` | direccion opcional |
| `modules` | `Json` | shape fijo de modulos opcionales |
| `updatedById` | `Int?` | usuario que hizo el ultimo cambio |
| `updatedBy` | `User?` | relacion opcional a `User` |
| `createdAt` | `DateTime` | fecha de creacion |
| `updatedAt` | `DateTime` | fecha de ultima actualizacion |

La migracion crea ademas un `CHECK ("id" = 1)` y una FK opcional a `User`.

### Shape de `modules`

```ts
{
  ingredients: boolean;
  recipes: boolean;
  combos: boolean;
  priceLists: boolean;
  fiscalFields: boolean;
  electronicInvoicing: boolean;
}
```

## Defaults y presets

### Configuracion inicial por defecto

Si no existe configuracion, backend crea automaticamente:

- `businessName = "Registry POS"`
- `businessType = DESSERT_SHOP`
- `currencyCode = "COP"`
- `timezone = "America/Bogota"`
- `countryCode = "CO"`
- `modules = preset de DESSERT_SHOP`

### Presets por tipo de negocio

| Tipo | ingredients | recipes | combos | priceLists | fiscalFields | electronicInvoicing |
| --- | --- | --- | --- | --- | --- | --- |
| `DESSERT_SHOP` | true | true | true | false | false | false |
| `CAFE` | true | true | true | false | false | false |
| `RESTAURANT` | true | true | true | false | false | false |
| `RETAIL` | false | false | false | true | false | false |
| `MINIMARKET` | false | false | false | true | false | false |
| `SALON` | false | false | false | true | false | false |
| `CUSTOM` | sin preset forzado | sin preset forzado | sin preset forzado | sin preset forzado | sin preset forzado | sin preset forzado |

Comportamiento actual:

- si `businessType` cambia y `applyPreset = true`, backend aplica el preset del tipo elegido;
- si `businessType = CUSTOM`, no existe preset automatico;
- si `applyPreset` no llega o llega en `false`, se conservan los modulos actuales;
- si el request trae `modules`, se fusionan sobre el estado resultante y luego se normalizan dependencias.

## Reglas de dependencia entre modulos

La normalizacion se aplica tanto en backend como en la UI de administracion.

Reglas implementadas:

- si `recipes = true`, entonces `ingredients = true`;
- si `ingredients = false`, entonces `recipes = false`;
- si `electronicInvoicing = true`, entonces `fiscalFields = true`;
- si `fiscalFields = false`, entonces `electronicInvoicing = false`.

Importante:

- desactivar modulos no elimina datos existentes;
- no existe logica de borrado asociada al apagado de modulos;
- los modulos core no se bloquean todavia por `BusinessConfig`.

## Backend

### Endpoints disponibles

| Endpoint | Metodo | Uso |
| --- | --- | --- |
| `/api/config` | `GET` | obtener la configuracion global, asegurando que exista |
| `/api/config` | `PATCH` | actualizar parcialmente la configuracion global |

### Permisos

| Endpoint | Roles permitidos |
| --- | --- |
| `GET /api/config` | `ADMIN`, `CASHIER`, `AUDITOR` |
| `PATCH /api/config` | `ADMIN` |

### Comportamiento de `GET /api/config`

- requiere autenticacion;
- busca `BusinessConfig` por `id = 1`;
- si no existe, lo crea con defaults y lo devuelve;
- siempre responde una configuracion valida.

### Comportamiento de `PATCH /api/config`

- requiere autenticacion y rol `ADMIN`;
- acepta update parcial;
- normaliza strings y codigos;
- valida `email`, longitudes y tipos booleanos;
- puede aplicar preset con `applyPreset`;
- guarda `updatedById` con el usuario autenticado;
- devuelve la configuracion final ya normalizada.

### Validaciones relevantes

Campos del DTO:

- `businessName`: string requerido si se envia, no vacio, maximo 120;
- `legalName`: string opcional, maximo 160;
- `businessType`: enum `BusinessType`;
- `currencyCode`: string de 3 caracteres, uppercase;
- `timezone`: string requerido si se envia, maximo 100;
- `countryCode`: string de 2 caracteres, uppercase;
- `email`: email valido, maximo 160;
- `phone`: string opcional, maximo 40;
- `address`: string opcional, maximo 300;
- `modules`: objeto parcial con booleans;
- `applyPreset`: boolean opcional.

## Frontend

### Vista administrativa `/admin/config`

La configuracion se administra desde `/admin/config`.

Capacidades actuales:

- lectura de `GET /api/config`;
- escritura por `PATCH /api/config`;
- formulario para datos del negocio;
- selector de tipo de negocio;
- switch `applyPreset`;
- toggles para `modules`;
- estados de loading, saving, success y error;
- validaciones basicas de formulario;
- normalizacion UI de dependencias entre modulos.

Acceso:

- la ruta frontend `/admin/config` esta disponible solo para `ADMIN`;
- la vista reutiliza el store global cuando existe y puede refrescarlo al guardar.

### Store global

El store actual es `useBusinessConfigStore`.

Estado expuesto:

- `config`
- `isLoadingConfig`
- `configError`
- `refreshConfig`
- `setConfig`
- `resetConfigState`

Comportamiento:

- `AppBootstrap` carga `GET /api/config` despues de restaurar sesion y solo cuando existe usuario autenticado;
- si no hay sesion, el store se resetea;
- si la carga falla, la app no se bloquea por completo.

### Helper de consumo por modulos

El helper `useBusinessModules` encapsula el acceso a `config.modules`.

Comportamiento actual:

- expone `isModuleEnabled(moduleKey)`;
- usa fallback conservador con todos los modulos en `true` cuando la config aun no existe;
- expone tambien `config`, `modules`, `isLoadingConfig`, `configError` y `hasResolvedConfig`.

Este fallback evita ocultamientos o bloqueos agresivos cuando la configuracion todavia no se pudo cargar.

## Uso actual de `BusinessConfig.modules`

### Visibilidad condicional implementada

Puntos ya conectados a `BusinessConfig.modules`:

| Superficie frontend | Modulos usados | Comportamiento |
| --- | --- | --- |
| `Sidebar` | `ingredients`, `combos` | oculta accesos visuales laterales |
| `AdminPage` | `ingredients`, `combos`, `recipes`, `fiscalFields` | oculta tarjetas secundarias y accesos internos |
| `ProductsPage` | `recipes`, `fiscalFields` | oculta tarjetas, columnas, botones, modal de recetas y secciones fiscales |

### Proteccion gradual por ruta implementada

Rutas protegidas actualmente:

- `/ingredients`
- `/combos`

La proteccion usa `ModuleAccessRoute`:

- si la config global aun no esta lista, deja pasar para evitar bloqueos a ciegas;
- si la config existe y el modulo esta apagado, muestra `ModuleDisabledPage`;
- no hace redirecciones silenciosas.

### Pantalla "Modulo desactivado"

`ModuleDisabledPage` muestra:

- nombre del modulo;
- ruta solicitada;
- accion para volver a una vista permitida;
- acceso a `/admin/config` cuando el usuario es `ADMIN`.

### Proteccion de subflujos opcionales en `ProductsPage`

#### Recetas

Cuando `recipes` esta apagado:

- no se abre el modal de recetas;
- no se permiten altas o bajas de items de receta;
- no se permite guardar recetas;
- se limpia el borrador abierto si el modulo se desactiva en caliente.

#### Campos fiscales

Cuando `fiscalFields` esta apagado:

- no se abre la seccion fiscal en crear o editar producto;
- la UI fiscal se oculta;
- crear producto envia draft fiscal vacio;
- editar producto conserva los datos fiscales existentes sin exponer esa parte del flujo visual.

## Modulos core que no se bloquean

`BusinessConfig` no bloquea todavia:

- POS
- Caja
- Productos
- Variantes
- Ventas
- Admin
- Ubicaciones

Esto es intencional y forma parte del enfoque conservador aplicado hasta ahora.

## Limitaciones actuales

La version actual todavia no hace lo siguiente:

- no bloquea todos los modulos opcionales del sistema, solo los puntos conectados hasta la fecha;
- no aplica reglas de `BusinessConfig` a POS, caja, ventas, ubicaciones ni admin core;
- no tiene store global para decisiones mas complejas por pantalla fuera del consumo actual;
- no implementa listas de precio funcionales;
- no implementa facturacion electronica real;
- no tiene historial de cambios de configuracion, solo `updatedById`;
- no reemplaza permisos por rol; `BusinessConfig` es una capa adicional, no la fuente unica de autorizacion.

## Siguientes pasos sugeridos

Siguientes incrementos razonables, manteniendo el enfoque conservador:

1. Extender proteccion gradual a nuevas superficies solo cuando haya una UI clara y estable para cada modulo opcional.
2. Unificar chequeos de modulos en helpers o guards reutilizables por pantalla y por accion.
3. Agregar pruebas para presets, dependencias y guardias de acceso por modulo.
4. Documentar futuras integraciones de `priceLists` y `electronicInvoicing` solo cuando existan flujos funcionales reales.
5. Evaluar una capa de auditoria si se necesita trazabilidad historica de cambios en configuracion.
