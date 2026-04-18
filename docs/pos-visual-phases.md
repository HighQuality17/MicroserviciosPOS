# Frontend UI D0, D1, D2A y D3

## Proposito

Esta nota documenta solo lo que hoy esta implementado en frontend para la evolucion visual del producto en cuatro etapas:

- D0: base del sistema visual y componentes reutilizables.
- D1: refresco visual fuerte del modulo POS sobre esa base.
- D2A: realineacion visual de Caja sobre el mismo lenguaje operativo.
- D3: rediseño visual de Productos con direccion mas admin/SaaS.

La descripcion se apoya en el codigo presente hoy en `frontend/`, la documentacion vigente y el estado real de la rama `feat/d3-products-redesign`.

## Estado cubierto por esta nota

- D0 ya esta integrado como capa visual compartida del frontend autenticado.
- D1 corresponde al refresco del POS ya visible en `frontend/src/features/pos`.
- D2A corresponde al refresco de Caja visible en `frontend/src/features/cash`.
- D3 corresponde al estado actual de Productos visible en `frontend/src/features/products`.
- La fuente de verdad es el estado actual del codigo. Esta nota no redefine fases cerradas ni agrega alcance que no exista en la UI.

## D0: sistema visual base

### Que se implemento

- capa de tokens y superficies compartidas en `frontend/src/styles.css` y `frontend/src/styles-d0.css`;
- catalogo de temas con variables para color, fondos, lineas, estados, sombras y controles;
- normalizacion de radios, espaciados, tamanos de control y transiciones;
- superficies reutilizables para paneles, tarjetas y bloques de apoyo;
- base comun para botones, inputs, modales, sheets, skeletons y toasts;
- componentes reutilizables para busqueda, chips de filtro, estados vacios y media placeholder de producto.

### Piezas base visibles en codigo

- `Button`, `IconButton`
- `SurfaceCard`, `Card`
- `Input`, `SearchField`
- `EmptyState`, `LoadingState`, `Skeleton`
- `Sheet`, `Toast`
- `FilterChip`
- `ProductMedia`

### Impacto esperado

- misma semantica visual para paneles, acciones, campos y estados;
- menor variacion entre pantallas autenticadas;
- base lista para aplicar mejoras por modulo sin rehacer controles desde cero.

## D1: refresco visual del POS

### Que se implemento

#### Vista principal del POS

`frontend/src/features/pos/PosPage.tsx` pasa de una composicion mas plana a una estructura con:

- hero operativo con `ModuleStatusHeader`;
- tres metricas rapidas de catalogo, carrito y venta actual;
- shell visual propio para catalogo y carrito;
- barra de catalogo con busqueda, resumen de vista activa y filtros;
- empty states y loading states integrados al mismo lenguaje visual.

#### Header y layout

`frontend/src/layouts/AppLayout.tsx` y `frontend/src/components/Header.tsx` agregan ajustes especificos para `/pos`:

- header compacto en mobile para POS;
- espaciado superior mas corto cuando la ruta activa es `/pos`;
- boton mobile de navegacion con variante visual propia para POS;
- mismos controles existentes de tema, POS activo y usuario, pero con presentacion afinada para este contexto.

#### Catalogo, busqueda y filtros

La capa visual del catalogo ahora enfatiza:

- busqueda principal mas visible;
- resumen de alcance activo del filtro o busqueda;
- chips de filtro con estados visuales mas marcados;
- empty state diferenciado para error, sin resultados y catalogo vacio.

No hay nuevas categorias de backend ni cambios de contrato. Los filtros siguen siendo por tipo comercial: `ALL`, `SIMPLE`, `VARIANT`, `COMBO`.

#### Cards de producto

`frontend/src/features/pos/components/PosCatalogCard.tsx` se rehace como card mas expresiva:

- encabezado con eyebrow y badge;
- `ProductMedia` grande como placeholder visual compartido;
- jerarquia mas clara entre nombre, subtitulo, descripcion, metadatos y precio;
- CTA de agregado integrado a la card;
- variacion visual por tipo mediante `data-kind`.

#### Carrito desktop

`frontend/src/features/pos/components/PosCartPanel.tsx` en modo desktop gana:

- bloque superior con contexto de venta;
- tarjetas de metricas rapidas;
- seccion propia para items del carrito;
- bloque separado para descuento y resumen;
- CTA de cobro mas estable y visible.

#### Carrito mobile

La experiencia mobile del carrito se mantiene sobre `PosCartSheet`, pero con refinamiento visual fuerte:

- boton flotante inferior con total y lineas de venta;
- toast de agregado con metadata mas legible;
- panel mobile con header, metricas, detalle, descuento y resumen dentro del mismo lenguaje visual;
- CTA de cobro grande y estable en el cierre del panel.

#### ProductMedia y placeholders

D1 reutiliza `ProductMedia` en catalogo y carrito para sostener la lectura visual sin depender de imagenes reales.

- hoy se usan placeholders, iconos y monogramas;
- `ProductMedia` soporta `src`, pero este trabajo no conecta imagenes reales de productos desde datos.

## D2A: refresco visual de Caja

### Que se implemento

`frontend/src/features/cash/CashPage.tsx` y `frontend/src/features/cash/cash-d2a.css` alinean Caja con el lenguaje operativo del POS sin tocar la logica de apertura o cierre:

- hero superior con `ModuleStatusHeader`, estado de la sesion, apertura activa y responsable actual;
- panel principal de apertura con spotlight, contexto del POS y CTA mas claros;
- panel de cierre con resumen operativo, bloque vacio cuando no existe sesion y resumen final al cerrar;
- fields, badges, feedback y tarjetas con la misma semantica visual del resto del shell autenticado;
- empty states y mensajes integrados al mismo sistema de superficies, bordes y estados.

### Alcance real

- la vista sigue usando `posApi.getCurrentCash`, `openCash` y `closeCash`;
- el backend sigue calculando el resumen de cierre;
- el cambio es de jerarquia visual, estructura y consistencia operativa.

## D3: rediseño visual de Productos

### Que se implemento

`frontend/src/features/products/ProductsPage.tsx` y `frontend/src/features/products/products-d2b.css` dejan la vista Productos en una direccion mas sobria y administrativa:

- header propio de Productos con resumen de estado, metricas compactas y CTA de refresco;
- estilos de layout dedicados para `Header`, `Sidebar` y boton mobile cuando la ruta activa es `/products`;
- panel izquierdo reorganizado en dos bloques claros para crear producto y crear variante;
- formularios agrupados por secciones con `ProductCatalogFieldsSection` y `ProductFiscalFieldsSection`, manteniendo los mismos handlers y validaciones;
- tablas/listados sobre `CatalogItemsTable` con contenedor mas limpio, encabezados sobrios y filas menos decorativas;
- jerarquia de lectura mas administrativa: nombre primero, precio facil de escanear, estado y receta compactos, metadatos secundarios con menos peso;
- acciones refinadas a `Editar`, `Operacion`, `Receta`, `Desactivar` o `Activar`, y `Eliminar`, con bordes semanticos mas suaves;
- en la vista general de productos, la columna `Operacion` ya no repite el SKU y muestra solo tamanos unidos con ` - ` cuando existen varias variantes;
- ajuste mobile en el rail izquierdo para que los CTA principales de productos se vean mas compactos;
- ajuste mobile en el layout para que el boton `Menu` forme parte del flujo normal y se desplace con el scroll.

### Estado actual de la direccion visual

- menos glow y menos protagonismo de gradientes grandes;
- cards y shells mas contenidos, con elevacion controlada;
- formularios y tablas mas cercanos a un lenguaje de app operativa;
- Productos se siente hoy mas cercano a un admin dashboard que a una vista showcase.

## Ajustes transversales incluidos en el estado actual

Ademas de cada fase, el estado actual del frontend incluye ajustes chicos pero reales:

- resumen textual del alcance activo de la busqueda;
- iconos especificos para error de carga y ausencia de resultados;
- separacion mas clara entre subtotal, total y numero de lineas en boton flotante y toast mobile;
- clases especificas para cart items y controles del header, usadas por `pos-d1.css`;
- variantes de header, sidebar y boton mobile segun el modulo activo.

## Que no cambio

- no hay cambios de backend ni nuevos endpoints;
- no cambian reglas de negocio, precios, descuentos ni flujo de pago;
- no se agregan nuevas entidades de catalogo;
- no se conectan imagenes reales de producto;
- no hay refactor masivo fuera de la capa visual del frontend.

## Responsive y accesibilidad respaldados por el codigo

- el layout aplica una variante compacta del header solo para POS en mobile;
- el carrito mobile sigue operando como dialog mediante `Sheet`;
- el boton flotante y el toast exponen `aria-controls` y `aria-haspopup` hacia el carrito;
- el catalogo expone `role="toolbar"` para filtros;
- `pos-d1.css` incluye estados `focus-visible`, `hover`, `active` y una rama `prefers-reduced-motion`;
- el boton `Menu` del shell autenticado hoy vive dentro del flujo de la pagina y no queda fijo al viewport.

## Archivos frontend directamente implicados en estas fases

- `frontend/src/styles.css`
- `frontend/src/styles-d0.css`
- `frontend/src/features/pos/PosPage.tsx`
- `frontend/src/features/pos/pos-d1.css`
- `frontend/src/features/pos/components/PosCartPanel.tsx`
- `frontend/src/features/pos/components/PosCatalogCard.tsx`
- `frontend/src/features/pos/components/PosMobileCartToast.tsx`
- `frontend/src/features/cash/CashPage.tsx`
- `frontend/src/features/cash/cash-d2a.css`
- `frontend/src/features/products/ProductsPage.tsx`
- `frontend/src/features/products/CatalogItemsTable.tsx`
- `frontend/src/features/products/ProductCatalogFieldsSection.tsx`
- `frontend/src/features/products/ProductFiscalFieldsSection.tsx`
- `frontend/src/features/products/products-d2b.css`
- `frontend/src/components/CartItem.tsx`
- `frontend/src/components/Header.tsx`
- `frontend/src/components/Sidebar.tsx`
- `frontend/src/layouts/AppLayout.tsx`

## Relacion con notas previas

- `docs/theme-system.md` sigue siendo la referencia del sistema de temas.
- `docs/pos-mobile-ux.md` documenta la etapa anterior de UX del POS; D1 la toma como base y empuja la jerarquia visual y el acabado del modulo.
- `docs/navigation-and-layout-updates.md` resume la capa de layout autenticado, incluido el comportamiento actual del menu mobile.
