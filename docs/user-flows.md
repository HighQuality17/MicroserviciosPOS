# Flujos Principales de Usuario

## Alcance

Este documento describe los flujos funcionales principales verificados en el código y complementa el material operativo de [`MANUAL_USUARIO.md`](MANUAL_USUARIO.md).

### 1. Inicio de sesión y restauración de sesión

1. El usuario ingresa correo o usuario y contraseña.
2. El backend valida credenciales y devuelve un JWT.
3. El frontend consulta `/auth/me`.
4. Se resuelve el rol del usuario, el tema y la ruta inicial.
5. Si el token expira, el frontend limpia sesión y regresa a `/login`.

### 2. Configuración inicial del entorno

Flujo típico para `ADMIN`:

1. crear uno o más puntos de venta desde Admin;
2. crear ingredientes;
3. ajustar stock por ubicación;
4. crear productos;
5. crear variantes;
6. configurar recetas por variante;
7. crear combos cuando aplique.

### 3. Operación de caja

Roles: `ADMIN`, `CASHIER`

1. seleccionar un POS activo;
2. abrir caja con efectivo inicial;
3. consultar caja activa durante la jornada;
4. cerrar caja registrando el efectivo contado;
5. revisar esperado, contado y diferencia.

### 4. Flujo de venta en POS

Roles: `ADMIN`, `CASHIER`

1. seleccionar POS activo;
2. confirmar que exista caja abierta;
3. cargar variantes o combos desde el catálogo;
4. ajustar cantidades y descuentos;
5. crear la venta;
6. confirmar el pago;
7. consultar el recibo generado.

### 5. Validaciones críticas en el cobro

Durante el pago, el backend valida:

- existencia y estado activo de variantes o combos;
- caja abierta y coherente con la ubicación;
- suficiencia de stock;
- existencia de receta para variantes implicadas;
- monto recibido suficiente para el método de pago.

### 6. Consulta de ventas y comprobantes

Roles: `ADMIN`, `CASHIER`, `AUDITOR`

El módulo de ventas permite:

- buscar una venta por ID;
- consultar últimos comprobantes;
- revisar la última venta disponible;
- filtrar historial por estado, método, rango de fechas y ubicación;
- abrir el detalle completo del recibo.

### 7. Supervisión administrativa

Roles: `ADMIN`, `AUDITOR`

El dashboard administrativo permite revisar:

- ventas del día;
- ticket promedio;
- caja actual;
- top de productos o combos vendidos;
- alertas de stock bajo;
- actividad reciente de ventas, caja y ajustes de inventario.

### 8. Preferencia de tema

Usuario autenticado:

1. abre el selector de tema del header;
2. cambia el tema visual;
3. el cambio se refleja inmediatamente;
4. la preferencia se guarda en backend y se conserva para la siguiente sesión.

### 9. Flujo recomendado de adopción

Para presentar o evaluar el sistema, el orden más representativo es:

1. login;
2. selección o creación de POS;
3. creación de ingredientes y stock;
4. creación de productos, variantes y recetas;
5. apertura de caja;
6. venta y pago;
7. consulta del comprobante;
8. revisión del dashboard administrativo;
9. cambio de tema por usuario.
