# Frontend UI D0 y D1

## Proposito

Esta nota documenta solo lo que hoy esta implementado en frontend para la evolucion visual del producto en dos etapas:

- D0: base del sistema visual y componentes reutilizables.
- D1: refresco visual fuerte del modulo POS sobre esa base.

La descripcion se apoya en codigo presente en `frontend/` y en el diff actual de la rama `feat/d0-design-system-base`.

## Estado cubierto por esta nota

- D0 ya esta integrado en la rama mediante `feat(ui): implement D0 frontend design system foundation`.
- D1 corresponde al trabajo visual actual del POS en el working tree.
- Tambien se incluye un pulido menor si aparece en el diff actual y sigue dentro del alcance visual del POS.

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
- boton flotante de navegacion mobile con variante visual propia para POS;
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

## Pulido menor incluido en el diff actual

Ademas del refresco principal, el diff actual incluye ajustes chicos pero reales:

- resumen textual del alcance activo de la busqueda;
- iconos especificos para error de carga y ausencia de resultados;
- separacion mas clara entre subtotal, total y numero de lineas en boton flotante y toast mobile;
- clases especificas para cart items y controles del header, usadas por `pos-d1.css`.

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
- `pos-d1.css` incluye estados `focus-visible`, `hover`, `active` y una rama `prefers-reduced-motion`.

## Archivos frontend directamente implicados en D1

- `frontend/src/features/pos/PosPage.tsx`
- `frontend/src/features/pos/pos-d1.css`
- `frontend/src/features/pos/components/PosCartPanel.tsx`
- `frontend/src/features/pos/components/PosCatalogCard.tsx`
- `frontend/src/features/pos/components/PosMobileCartToast.tsx`
- `frontend/src/components/CartItem.tsx`
- `frontend/src/components/Header.tsx`
- `frontend/src/layouts/AppLayout.tsx`

## Relacion con notas previas

- `docs/theme-system.md` sigue siendo la referencia del sistema de temas.
- `docs/pos-mobile-ux.md` documenta la etapa anterior de UX del POS; D1 la toma como base y empuja la jerarquia visual y el acabado del modulo.
