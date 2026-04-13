# POS Mobile UX - Fase 1A

## Proposito de la fase

La fase POS 1A documenta la primera mejora estructural del POS enfocada en UX, con prioridad en claridad operativa, mejor jerarquia visual y una experiencia movil mas usable sin tocar reglas de negocio, backend ni contratos API.

No es un rediseño visual completo del POS ni del sistema entero. Es una capa inicial para ordenar la vista, dar mas presencia al carrito y preparar una fase visual mas fuerte despues.

## Alcance de esta fase

Esta fase cubre solo la experiencia del POS en frontend:

- reorganizacion de la vista principal del POS;
- mayor protagonismo visual del carrito en desktop;
- mejoras mobile-first para carrito, catalogo y feedback de agregado;
- popup o toast de carrito al agregar items en movil;
- carrito movil como capa flotante dedicada;
- filtros claros por tipo comercial y mejoras de busqueda;
- cards de catalogo mas expresivas sin depender de imagenes reales;
- resumen de venta mas claro en carrito y cobro.

Queda explicitamente fuera de esta fase:

- cambios de backend;
- nuevas reglas de precio, promociones o negocio;
- paginacion clasica del catalogo;
- paginacion del carrito;
- imagenes reales de producto;
- rediseño total del sistema.

## Implementacion actual en frontend

Los componentes y archivos que concentran la fase POS 1A son:

- `frontend/src/features/pos/PosPage.tsx`
- `frontend/src/features/pos/components/PosCatalogCard.tsx`
- `frontend/src/features/pos/components/PosCartPanel.tsx`
- `frontend/src/features/pos/components/PosCartSheet.tsx`
- `frontend/src/features/pos/components/PosMobileCartToast.tsx`
- `frontend/src/components/CartItem.tsx`
- `frontend/src/layouts/AppLayout.tsx`
- `frontend/src/store/appStore.ts`
- `frontend/src/styles.css`

## Nueva jerarquia general de la vista POS

La vista del POS ahora se organiza en tres capas operativas:

1. barra superior de estado operativo;
2. catalogo principal como foco de exploracion;
3. carrito y cobro como zona de cierre de venta.

En desktop:

- el catalogo sigue siendo la superficie principal;
- el carrito gana peso visual como panel lateral estable;
- el resumen de venta y el CTA de cobro quedan mas visibles.

En movil:

- el catalogo sigue siendo la vista principal;
- el carrito ya no compite como columna secundaria;
- el carrito vive como capa dedicada full-screen, abierta desde un boton flotante o desde el toast de agregado.

## Mejoras aplicadas en desktop

- el carrito paso de verse como columna secundaria debil a un panel mas presente;
- el resumen de venta quedo mas estructurado, con subtotal, descuento, cantidad de items y total;
- el bloque de carrito usa una jerarquia mas clara para cantidades, totales y accion de cobro;
- las cards del catalogo comunican mejor nombre, tipo, SKU o presentacion y precio.

## Mejoras aplicadas en movil

- se agrego un toast de carrito al sumar un item;
- el carrito movil se abre como capa dedicada, no como pantalla separada del flujo;
- el carrito movil aprovecha todo el alto util de la pantalla;
- el contenido del carrito movil tiene un header unico, metricas compactas, zona scrollable real y CTA estable;
- el boton flotante del carrito resume items y total actual;
- el boton flotante de menu se oculta cuando el carrito movil esta abierto y tambien cuando el menu movil esta abierto.

## Popup o toast del carrito

El popup de carrito aparece al agregar un item desde el catalogo en movil.

Comportamiento actual:

- muestra icono de carrito;
- confirma que el item fue agregado;
- resume cantidad total de items y subtotal actual;
- se oculta automaticamente despues de unos segundos;
- si el usuario lo toca, abre el carrito movil.

Su objetivo no es reemplazar el carrito, sino dar feedback inmediato sin sacar al usuario del catalogo.

## Carrito flotante movil

La implementacion actual evoluciono desde un bottom sheet parcial hacia una capa movil dedicada que ocupa el alto util completo.

Comportamiento actual:

- se abre desde el boton flotante del carrito o desde el toast;
- bloquea el scroll del fondo mientras esta abierta;
- mantiene un handle superior y accion de cierre;
- conserva accesibilidad de dialogo;
- evita competir visualmente con el contenido de fondo;
- permite recorrer el contenido interno con scroll real.

## Boton flotante del carrito

El boton flotante del carrito solo aparece en movil cuando ya hay items cargados.

Su rol actual es:

- mantener visible el acceso al carrito desde el catalogo;
- mostrar cantidad de items y total actual;
- abrir la capa movil del carrito sin sacar al usuario del flujo del POS.

## Que parte del carrito movil scrollea

La zona scrollable del carrito movil contiene:

- lista de items;
- bloque de descuento;
- resumen de venta.

El CTA principal de cobro queda estable abajo para no perder accion rapida y para aprovechar mejor la altura util del contenido.

## Busqueda, filtros y cards del catalogo

La fase POS 1A tambien mejoro el frente del catalogo:

- la busqueda del catalogo quedo mas visible y usable;
- se incorporaron filtros por tipo comercial: todos, productos simples, variantes y combos;
- las cards muestran mejor jerarquia entre nombre, tipo, precio y metadatos;
- las cards ya no dependen de miniaturas reales para funcionar.

Importante:

- por ahora no hay categoria real de backend para el catalogo;
- los filtros actuales son por tipo comercial, no por categoria funcional de producto.

## Aclaraciones importantes

### Sin imagenes reales de producto

La UI actual usa placeholders visuales elegantes, iconografia y badges de tipo para sostener la lectura del catalogo. No depende de thumbnails reales.

### Sin paginacion clasica

No se implemento paginacion clasica ni en catalogo ni en carrito.

- el catalogo sigue filtrando en la misma vista;
- el carrito mantiene todos los items en una lista continua;
- el foco de esta fase fue fluidez de operacion, no navegacion por paginas.

## Limitaciones actuales

La fase POS 1A deja varias decisiones deliberadamente pendientes:

- no hay categorias reales de catalogo soportadas por backend para filtrar;
- no hay imagenes reales de producto;
- el cierre del carrito movil es por boton o backdrop, no por gesto avanzado;
- el look ya es mas claro y usable, pero aun no representa un rediseño visual fuerte de marca;
- el toast y el carrito movil estan orientados al flujo POS actual, no a escenarios futuros como promociones o multiples capas operativas.

## Que queda pendiente para la siguiente fase visual fuerte

La siguiente fase visual del POS deberia concentrarse en refinamiento, no en reabrir esta base estructural.

Pendientes recomendados:

- profundizar el lenguaje visual premium del POS con una identidad mas definida;
- refinar microinteracciones y estados de seleccion o agregado;
- revisar densidad visual de cards, espaciados y tipografia del catalogo;
- introducir categorias reales si backend y modelo de datos lo soportan;
- evaluar gestos avanzados para la capa movil del carrito;
- revisar pulido final de animaciones, empty states y feedback operativo del cobro.

## Resumen ejecutivo

POS 1A deja al POS con una base UX mas solida:

- mejor jerarquia visual;
- carrito desktop mas protagonista;
- feedback inmediato al agregar productos;
- carrito movil como capa dedicada y usable;
- busqueda y filtros mas claros;
- cards de catalogo mas informativas aun sin imagenes reales.

Es una fase de ordenamiento y usabilidad. La siguiente etapa puede enfocarse en el rediseño visual fuerte sobre una estructura ya mas estable.


