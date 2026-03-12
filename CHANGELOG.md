# Changelog

## Sprint 6

Release commit: `edd2808`  
Titulo: `feat: release sprint 6 admin management and real locations`

### Backend
- Se agrego soporte real para ubicaciones con `GET /api/locations` y `POST /api/locations`.
- Se expuso `GET /api/ingredients` para listar ingredientes reales desde backend.
- Se implemento gestion administrativa de catalogo:
  - `PATCH /api/products/:id`
  - `PATCH /api/products/:id/status`
  - `DELETE /api/products/:id`
  - `PATCH /api/variants/:id`
  - `PATCH /api/variants/:id/status`
  - `DELETE /api/variants/:id`
- Se implemento gestion real de recetas:
  - `GET /api/recipes/variant/:variantId`
  - `PUT /api/recipes/variant/:variantId`
  - `DELETE /api/recipes/variant/:variantId/items/:ingredientId`
- Se mantuvieron reglas de negocio para no eliminar productos o variantes con uso historico y sugerir desactivacion.

### Frontend
- El selector de POS ahora usa ubicaciones reales del backend en lugar de mocks.
- Se agrego gestion administrativa real para productos, variantes y recetas en `/products`.
- Solo `ADMIN` puede ver y ejecutar acciones de catalogo y recetas.
- Se mejoro `/pos` para traducir errores tecnicos de recetas faltantes a mensajes claros en espanol.
- Se mejoro `/sales` con historial reciente real y ultima venta persistida desde backend.
- Se agregaron paneles con scroll interno para mantener layout ordenado en vistas largas.
- Se corrigieron textos visibles en espanol y problemas de codificacion UTF-8 en archivos recientes.

### UX y UI
- Se estandarizaron estados visuales con badges de `Activo/Inactivo` y `Con receta/Sin receta`.
- Se mejoro la experiencia de formularios numericos evitando valores iniciales molestos.
- Se reforzo consistencia visual en feedback, estados vacios y paneles administrativos.

## Historial reciente

### Sprint 5
- Historial reciente de ventas y ultima venta disponible.
- Mejoras globales de UX en formularios.

### Sprint 4
- Control de acceso por rol.
- Sidebar condicionado por rol.
- Rutas protegidas y vistas de solo lectura para auditoria.

### Sprint 3
- Frontend MVP completo del POS con React + Vite + TypeScript + Tailwind.
- Dashboard administrativo y consumo de backend local.
