# Módulos del Sistema

## Mapa funcional

Este documento resume cada dominio del sistema con su responsabilidad principal, la superficie técnica visible en el repositorio y el alcance por roles.

| Módulo | Qué resuelve | Backend verificado | Frontend verificado | Roles |
| --- | --- | --- | --- | --- |
| Autenticación | Inicio de sesión, sesión actual y preferencia visual | `auth` | `LoginPage`, `sessionStore`, `ThemeProvider` | Todos los usuarios autenticados |
| Ubicaciones | Puntos de venta disponibles para operación real | `locations` | selector de POS en header, alta desde Admin | lectura `ADMIN`/`CASHIER`, alta `ADMIN` |
| POS | Venta en curso y cobro | `catalog`, `sales` | `PosPage`, `cartStore`, `PaymentModal` | `ADMIN`, `CASHIER` |
| Caja | Apertura, caja activa y cierre | `cash` | `CashPage` | `ADMIN`, `CASHIER` |
| Productos | Catálogo comercial base | `products` | `ProductsPage` | gestión `ADMIN`, lectura `AUDITOR` |
| Variantes | Presentaciones vendibles reales | `variants` | `ProductsPage` | gestión `ADMIN`, lectura `AUDITOR` |
| Recetas | Consumo de ingredientes por variante | `recipes` | modal de receta en `ProductsPage` | gestión `ADMIN`, lectura `AUDITOR` |
| Ingredientes | Catálogo de insumos | `ingredients` | `IngredientsPage` | gestión `ADMIN`, lectura `AUDITOR` |
| Stock | Existencias y movimientos por ubicación | `stock` | `IngredientsPage` | gestión `ADMIN`, lectura `AUDITOR` |
| Combos | Productos compuestos basados en variantes | `combos` | `CombosPage` | gestión `ADMIN`, lectura `AUDITOR` |
| Ventas | Historial, recibos y trazabilidad comercial | `sales` | `SalesPage` | lectura `ADMIN`/`CASHIER`/`AUDITOR`, operación `ADMIN`/`CASHIER` |
| Administración | Métricas y actividad ejecutiva | `admin` | `AdminPage` | `ADMIN`, `AUDITOR` |
| Temas | Identidad visual por usuario | `auth` + campo `themePreference` | header autenticado + `ThemeSelector` | usuario autenticado |

## Descripción funcional resumida

### Autenticación y sesión

- login por correo o usuario;
- sesión restaurable;
- usuario autenticado recuperado desde backend;
- preferencia de tema asociada al usuario.

### Operación de venta

- selección de variantes y combos activos;
- armado de carrito;
- descuentos porcentuales o fijos;
- pago y posterior consulta del comprobante.

### Caja

- apertura con efectivo inicial;
- consulta de caja activa por POS;
- cierre con cálculo de diferencia.

### Catálogo e inventario

- productos y variantes con activación/desactivación;
- ingredientes con dimensión y unidad por defecto;
- recetas por variante;
- stock por ubicación con conversión de unidades;
- combos compuestos a partir de variantes activas.

### Consulta y administración

- historial de ventas con filtros;
- actividad reciente de ventas, caja y ajustes;
- stock bajo;
- top de productos o combos vendidos;
- gestión de puntos de venta.

## Límites funcionales observables

Las siguientes capacidades aparecen como preparación o siguiente fase, pero no como módulo operativo cerrado:

- exportación de reportes;
- alertas configurables;
- reglas por sucursal;
- edición avanzada y reordenación de combos desde UI;
- visualización completa de movimientos recientes de inventario dentro de la pantalla de Ingredientes.

## Relación recomendada entre documentos

- Para detalle técnico de backend: [`backend.md`](backend.md)
- Para detalle de interfaz y navegación: [`frontend.md`](frontend.md)
- Para detalle de datos: [`database.md`](database.md)
- Para flujos funcionales: [`user-flows.md`](user-flows.md)
