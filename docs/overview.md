# Visión General

## Propósito del sistema

`MicroserviciosPOS` es un sistema POS local que centraliza autenticación, operación de caja, venta, inventario, catálogo y monitoreo administrativo en un solo repositorio con frontend y backend separados.

La interfaz del producto se presenta como `Registry POS`, mientras que el backend expone `MicroserviciosPOS API`.

## Alcance funcional verificado

El estado actual del repositorio permite verificar las siguientes áreas funcionales:

- autenticación con JWT y restauración de sesión;
- control de acceso por roles `ADMIN`, `CASHIER` y `AUDITOR`;
- selección de punto de venta activo;
- operación de POS con catálogo consolidado de variantes y combos;
- apertura, consulta y cierre de caja por ubicación;
- creación de ventas, descuentos y pago en efectivo o transferencia;
- consulta de recibos, ventas recientes, última venta e historial filtrable;
- administración de productos, variantes y recetas;
- administración de ingredientes y stock por ubicación;
- configuración comercial de combos;
- panel administrativo con métricas y actividad reciente;
- sistema de temas con persistencia por usuario.

## Componentes del repositorio

- `src/`: backend NestJS por módulos de dominio.
- `frontend/src/`: aplicación React/Vite con rutas protegidas.
- `prisma/`: modelo de datos, migraciones y seed.
- `docs/`: documentación funcional, técnica e histórica.
- `requests.http`: colección manual de pruebas HTTP.

## Perfiles de usuario verificados

### ADMIN

- acceso completo a módulos operativos y administrativos;
- puede crear ubicaciones, catálogo, stock, combos, recetas, ventas y caja;
- puede consultar analítica y actividad del sistema.

### CASHIER

- acceso operativo a POS, caja y ventas;
- no gestiona catálogo ni inventario;
- no accede a administración avanzada del catálogo.

### AUDITOR

- acceso de consulta a ventas, admin, productos, variantes, recetas, ingredientes, stock y combos;
- no ejecuta operaciones de caja, cobro, stock ni alta de catálogo.

## Estado actual del producto

El repositorio ya no corresponde a un MVP inicial de backend únicamente. El código actual muestra una evolución clara hacia un producto POS más completo, con:

- frontend administrativo y operativo consolidado;
- identidad visual premium aplicada en múltiples vistas;
- preferencia de tema persistida por usuario;
- documentación histórica de cambios (`CHANGELOG.md` y sprints recientes);
- soporte real para puntos de venta, caja, ventas y lectura administrativa.

## Límites observables del estado actual

Sin inferir más allá del repo, hoy también se puede afirmar que:

- no se encontraron scripts de pruebas automatizadas en los `package.json`;
- no se detectaron archivos de contenedorización u orquestación;
- algunas áreas del frontend ya muestran placeholders de futura evolución, por ejemplo exportación de reportes, alertas configurables y reglas por sucursal en Admin, así como edición más completa de combos.

## Uso recomendado de esta documentación

- Para presentación ejecutiva: comenzar por [`../README.md`](../README.md), este documento y [`modules.md`](modules.md).
- Para desarrollo: continuar por [`architecture.md`](architecture.md), [`backend.md`](backend.md), [`frontend.md`](frontend.md) y [`database.md`](database.md).
- Para operación funcional: revisar [`MANUAL_USUARIO.md`](MANUAL_USUARIO.md) y [`user-flows.md`](user-flows.md).
