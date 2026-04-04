# Combos

Documentacion tecnica y funcional del estado actual de la pestana `Combos` en `MicroserviciosPOS / Registry POS`.

Esta nota resume las mejoras operativas recientes aplicadas en dos iteraciones conservadoras:

- `C1`: gestion base del combo
- `C1.5`: edicion real de composicion

El objetivo de ambas fases fue volver operativa la pestana `Combos` sin rediseñar la UI completa, sin tocar infraestructura y sin romper la compatibilidad existente con POS, catalogo y ventas.

## Proposito de la mejora

Antes de estas fases, la pestana `Combos` permitia crear combinaciones basicas, pero quedaba corta para operacion real:

- faltaba editar el combo ya creado;
- faltaba activar o desactivar desde la UI;
- faltaba eliminar con confirmacion segura;
- faltaba buscar por nombre;
- faltaba mejor feedback y refresh;
- faltaba una edicion clara de la composicion del combo.

La mejora reciente cierra ese hueco operativo para que un administrador pueda mantener combos comerciales desde la misma pantalla sin modificar otros modulos.

## Alcance implementado

### Fase C1

Capacidades agregadas:

- edicion del combo base;
- activar o desactivar combo;
- eliminar con confirmacion;
- busqueda por nombre;
- mensajes de exito y error;
- refresh correcto del listado;
- consulta administrativa de combos activos e inactivos;
- correccion del flujo de carga rapida para no reemplazar silenciosamente items existentes.

### Fase C1.5

Capacidades agregadas:

- apertura de un combo existente en modo de edicion de composicion;
- visualizacion del borrador con items actuales;
- cambio de cantidad por item;
- eliminacion puntual de items;
- agregar nuevos items al borrador;
- guardado explicito de la composicion completa;
- soporte para guardar un combo sin items cuando el usuario elimina el ultimo.

## Acciones disponibles hoy

### Acciones administrativas sobre el combo

- crear combo;
- editar nombre, precio y estado;
- activar o desactivar;
- eliminar con confirmacion previa;
- buscar por nombre;
- refrescar el listado sin salir de la vista.

### Acciones sobre la composicion

- abrir la composicion actual de un combo;
- ver los items ya asociados;
- cambiar `qty` por item;
- quitar un item puntual;
- agregar un nuevo item operativo;
- guardar la composicion completa de forma explicita.

## Backend: cambios minimos realizados

Archivos principales:

- `src/combos/combos.controller.ts`
- `src/combos/combos.service.ts`
- `src/combos/dto/get-combos-query.dto.ts`
- `src/combos/dto/update-combo.dto.ts`
- `src/combos/dto/update-combo-status.dto.ts`
- `src/combos/dto/upsert-combo-items.dto.ts`

### Contratos relevantes

Se consolidaron o ampliaron estos endpoints:

- `GET /api/combos`
  ahora soporta `status=ALL|ACTIVE|INACTIVE` para que la vista administrativa pueda revisar tambien combos inactivos.
- `POST /api/combos`
  crea el combo base.
- `PATCH /api/combos/:id`
  actualiza nombre, precio y estado.
- `PATCH /api/combos/:id/status`
  cambia el estado activo/inactivo.
- `DELETE /api/combos/:id`
  elimina el combo si no tiene ventas historicas.
- `POST /api/combos/:id/items`
  guarda la composicion completa del combo.

### Reglas de backend aplicadas

- la consulta administrativa puede listar activos e inactivos;
- eliminar un combo con ventas historicas queda bloqueado y se sugiere desactivarlo;
- la composicion no acepta variantes duplicadas en el mismo payload;
- se puede guardar una lista vacia de items;
- una variante inactiva nueva no puede agregarse al combo;
- si el combo ya arrastra una variante inactiva, el backend permite guardar la composicion para facilitar la correccion de datos;
- el backend devuelve la composicion mapeada despues de guardar.

No hubo cambios de Prisma ni nuevas migraciones para estas fases.

## Frontend: cambios realizados

Archivo principal:

- `frontend/src/features/combos/CombosPage.tsx`

Cliente API:

- `frontend/src/services/api/posApi.ts`

### Mejoras visibles en la pantalla

- listado administrativo con combos activos e inactivos;
- buscador local por nombre;
- feedback de exito y error para acciones CRUD;
- refresh manual y refresh posterior a mutaciones;
- modal para editar datos base del combo;
- modal para editar composicion;
- confirmacion explicita antes de eliminar;
- indicadores de loading y saving razonables.

### Cambios de integracion en frontend

- la pantalla carga combos con `status=ALL` para administracion;
- el guardado de composicion reutiliza el endpoint existente de items con un alias semantico (`updateComboItems`) en el cliente API;
- la carga rapida de items sigue disponible para suma operativa rapida;
- la edicion fina de composicion se maneja desde un borrador local visible antes de persistir.

## Como funciona la edicion de composicion

Flujo actual:

1. Desde el listado, el usuario abre `Composicion` sobre un combo.
2. La UI toma la composicion actual del combo y la carga en un borrador local.
3. En el borrador se pueden:
   - cambiar cantidades;
   - quitar items puntuales;
   - agregar nuevos items operativos;
   - dejar el combo sin items.
4. Al guardar, el frontend envia la composicion completa actual del borrador a `POST /api/combos/:id/items`.
5. El backend reemplaza la composicion persistida por el payload completo enviado.
6. La pantalla refresca el listado y muestra feedback de resultado.

Punto importante:

- el guardado no borra items silenciosamente; el usuario ve el estado completo del borrador antes de confirmar;
- la carga rapida lateral suma cantidades a la composicion existente, mientras que el modal `Composicion` es el flujo de edicion fina.

## Compatibilidad con POS

La compatibilidad con POS se mantiene por diseno:

- el POS sigue consumiendo `/api/catalog`;
- `/api/catalog` sigue usando combos activos mediante `CombosService.findActive()`;
- un combo inactivo no debe aparecer en POS;
- la administracion de combos usa `/api/combos`, pero eso no altera el contrato de catalogo del POS;
- la composicion del combo sigue resolviendose en backend al momento de procesar ventas.

Implicacion operativa:

- un combo puede existir administrativamente y seguir sin items;
- eso sirve para trabajo interno o configuracion parcial;
- pero un combo activo sin items no esta listo para vender correctamente y debe completarse antes de uso comercial.

## Restricciones y decisiones de seguridad

- las mutaciones de combos quedan reservadas a `ADMIN`;
- `AUDITOR` conserva acceso de consulta;
- eliminar requiere confirmacion previa en UI;
- el backend bloquea eliminacion con ventas historicas;
- la composicion se guarda como payload completo, no como mutaciones parciales encadenadas;
- se bloquean duplicados para reducir ambiguedad operativa;
- la busqueda por nombre es local y no altera backend ni catalogo del POS.

## Limitaciones actuales

La version actual ya es operativa, pero aun no cubre una fase visual avanzada:

- no existe reordenacion visual de items dentro del combo;
- no hay drag and drop;
- no existe una vista detalle separada para el combo;
- la carga rapida y el editor fino conviven en la misma pantalla;
- no hay una capa visual mas rica para advertencias de composicion incompleta;
- no se hizo rediseño profundo de layout, mobile ni jerarquia visual;
- no se agregaron metricas nuevas ni herramientas de analisis comercial para combos.

## Pendiente para la siguiente fase visual y UX

La siguiente fase puede enfocarse en presentacion y ergonomia, no en contratos base:

- reorganizar la pantalla para separar mejor gestion base y composicion;
- mejorar la experiencia mobile del editor de composicion;
- introducir una tabla o layout mas claro para cantidades y acciones;
- agregar reordenacion visual de items si el negocio lo necesita;
- mejorar ayudas visuales para combos activos sin composicion o con composicion incompleta;
- refinar copy, jerarquia visual y estados vacios sin cambiar la logica ya estabilizada.

## Relacion con otras piezas del proyecto

- `frontend/src/features/pos/PosPage.tsx`
  consume combos desde catalogo para venta.
- `src/app.controller.ts`
  arma `/api/catalog` usando `CombosService.findActive()`.
- `src/sales/sales.service.ts`
  valida combos y expande su composicion al procesar ventas.

## Resumen ejecutivo

La pestana `Combos` paso de una gestion parcial a una operacion administrativa util:

- ya puede mantener el combo base;
- ya puede controlar estado y eliminacion segura;
- ya puede editar la composicion real del combo;
- conserva compatibilidad con POS;
- deja pendiente principalmente una fase de rediseño visual y mejoras de UX.
