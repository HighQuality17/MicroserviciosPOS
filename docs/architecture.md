# Arquitectura

## Vista de alto nivel

El repositorio implementa una arquitectura de tres capas dentro de un monorepo:

```text
Usuario
  │
  ▼
Frontend React/Vite
  │  Axios + token Bearer
  ▼
Backend NestJS (/api)
  │  Prisma ORM
  ▼
SQLite local
```

## Organización del monorepo

### Backend

- ubicación: `src/`
- framework: NestJS
- organización: módulos por dominio
- seguridad: `JwtAuthGuard` + `RolesGuard`
- persistencia: `PrismaService`

### Frontend

- ubicación: `frontend/src/`
- framework: React 19 con Vite
- navegación: React Router
- estado local y transversal: Zustand
- consumo HTTP: Axios

### Datos

- esquema principal: `prisma/schema.prisma`
- migraciones: `prisma/migrations/`
- seed: `prisma/seed.ts`
- proveedor actual: SQLite

## Flujo técnico entre capas

### 1. Autenticación

1. El usuario envía `email` o `username` y contraseña al endpoint `POST /api/auth/login`.
2. El backend valida credenciales con `bcrypt`.
3. Se emite un JWT firmado por 12 horas.
4. El frontend guarda el token y consulta `GET /api/auth/me`.
5. La sesión autenticada hidrata el store de sesión y activa la UI protegida.

### 2. Carga del contexto operativo

1. `AppBootstrap` restaura sesión y tema.
2. `AppLayout` consulta ubicaciones disponibles.
3. El header permite elegir el POS activo.
4. Los módulos operativos consumen el POS actual desde `appStore`.

### 3. Venta y pago

1. El POS consume `/api/catalog` para variantes y combos activos.
2. El usuario arma carrito y define descuentos en frontend.
3. `POST /api/sales` crea la venta en estado `PENDING`.
4. `POST /api/sales/:id/pay` valida monto, caja activa y stock suficiente.
5. El backend registra pago, descuenta stock, crea movimientos y deja la venta en `PAID`.
6. El frontend consulta el recibo con `GET /api/sales/:id/receipt`.

### 4. Caja

1. La vista Caja consulta `GET /api/cash/current?location_id=...`.
2. La apertura registra fondo inicial por ubicación.
3. El cierre calcula esperado, contado, diferencia y resumen por método de pago.

## Preocupaciones transversales

### Seguridad

- JWT requerido en todos los endpoints excepto rutas públicas declaradas;
- autorización adicional por rol en controladores;
- logout automático del frontend cuando una respuesta devuelve `401`.

### Validación y contratos

- `ValidationPipe` global con `whitelist`, `forbidNonWhitelisted` y conversión implícita;
- interceptor global que envuelve respuestas exitosas;
- filtro global que normaliza errores.

### Estado y experiencia de usuario

- `sessionStore`: sesión autenticada y token persistido;
- `appStore`: ubicaciones, POS activo, caja actual y recibos recientes;
- `cartStore`: venta en curso y descuentos;
- `ThemeProvider`: tema visual condicionado por sesión autenticada.

## Decisiones de diseño verificables en el código

- La API y el frontend están desacoplados por HTTP aun viviendo en el mismo repositorio.
- El backend centraliza reglas de negocio sensibles: stock, caja, descuentos, pagos y recetas.
- El frontend concentra experiencia de uso, navegación, presentación y composición de pantallas.
- El sistema de temas usa un catálogo cerrado y no un color picker libre.
- Las unidades de inventario se convierten a base antes de persistirse.

## Observaciones de arquitectura

- No se detectaron integraciones externas, colas, almacenamiento remoto ni servicios de terceros dentro del repositorio actual.
- Tampoco se identificó una estrategia de despliegue automatizada en archivos del repo; por eso la documentación de despliegue se limita a lo manual y verificable.
