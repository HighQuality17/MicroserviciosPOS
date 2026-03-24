# Changelog

Registro de cambios relevantes del proyecto. Las entradas historicas previas se conservan y los cierres recientes por sprint se documentan adicionalmente en `docs/sprints/`.

## [Sprint 9] - 2026-03-24

### Added
- Se incorporo un sistema de temas visuales predefinidos con soporte para `midnight-indigo`, `graphite-cyan`, `arctic-blue`, `emerald-ops` y `slate-amber`.
- La preferencia de tema paso a persistirse por usuario en backend, manteniendo sincronizacion con el frontend autenticado.
- Se agrego documentacion especifica del sistema de temas y del cierre de Sprint 9 en `docs/`.

### Changed
- La UI premium del frontend amplio su cobertura de tematizacion sobre vistas, cards KPI, barras compactas, tablas, badges, modales y paneles administrativos.
- El dashboard Admin quedo mejor integrado al lenguaje visual premium y al sistema de temas.
- El flujo visual no autenticado se fijo en `midnight-indigo`, incluyendo login, carga previa a sesion y logout.
- `arctic-blue` recibio ajustes finos de contraste, profundidad y jerarquia visual para mejorar legibilidad.

### Fixed
- Se corrigio el comportamiento del sidebar para que la opcion activa conserve su estado al pasar el cursor.
- Se redujo el hover invasivo de opciones no activas en `arctic-blue`.
- Se reforzo la separacion visual entre superficies claras, chips internos y paneles premium del tema claro.

## [Sprint 8] - 2026-03-21

### Changed
- Se reemplazaron los bloques superiores de KPI por barras compactas premium en POS, Caja, Productos, Ingredientes, Combos, Ventas y Admin.
- Se unifico el lenguaje visual operativo del frontend con superficies oscuras premium, chips de estado, badges cualitativos y jerarquia tipografica mas consistente.
- La vista Ventas mejoro la lectura de comprobantes recientes y del detalle de ticket usando solo datos ya disponibles en frontend.
- La vista Admin evoluciono hacia un dashboard ejecutivo con barra superior, bloques de panorama y radar, analitica mejor integrada y mejor balance visual entre paneles.
- El layout del POS quedo mas estable frente al crecimiento del carrito, sin deformar la lectura superior.

### Fixed
- Se eliminaron badges redundantes en Productos y Combos cuando repetian el mismo dato cuantitativo mostrado como metrica principal.
- Ingredientes sustituyo indicadores poco utiles por senales mas operativas, incluyendo lectura de creados y reposicion de stock.
- El dashboard Admin recibio una pasada fina de alineacion, alturas, espaciado y reticula para mejorar consistencia visual.

### Docs
- Se agrego documentacion de cierre para Sprint 7 y Sprint 8 en `docs/sprints/`.

## [Sprint 7] - 2026-03-19

### Added
- Se incorporaron y consolidaron controles de formulario mas accesibles y consistentes, incluyendo mejoras en Button, Input, Modal, CheckboxField, Select y Textarea.
- Se establecio una base visual compartida para paneles, badges, estados, tarjetas y superficies del sistema.

### Changed
- Se reforzo el comportamiento responsive del layout principal, header, sidebar, scroll containers y vistas operativas.
- La pantalla de login recibio un rediseno visual y estructural para mejorar la primera impresion del acceso al sistema.
- Ventas y otros modulos operativos mejoraron legibilidad, flujo y consistencia de interfaz.
- El sistema visual premium se fue refinando en fases sucesivas para preparar el terreno del Sprint 8.

### Fixed
- Se corrigieron inconsistencias de foco visible, espaciado, scroll, mensajes de feedback y legibilidad en varias vistas administrativas y operativas.

## [0.6.0] - 2026-03-11

### Added
- Real location support in backend and frontend with persistent POS selection.
- Administrative product and variant management endpoints for update, status changes and guarded deletion.
- Full recipe management endpoints for variants, including read, replace and item removal.
- `GET /api/ingredients` to support recipe configuration from the admin frontend.
- Real admin UI for products, variants and recipes.
- Scrollable panels for long operational and administrative lists.
- Sprint 6 release summary in repository history.

### Changed
- Frontend POS now translates missing-recipe payment errors into user-facing Spanish messages.
- `/sales` now uses persisted recent receipts and latest sale data from backend.
- `/admin` and operational views now react to real location data instead of mock POS values.
- UI feedback, labels and status badges were standardized across admin modules.
- Recent frontend text encoding issues were normalized back to UTF-8.

### Fixed
- `Cannot GET /api/ingredients` by exposing the missing endpoint.
- Multiple frontend mojibake issues in admin/catalog screens.
- UX problems caused by numeric inputs with intrusive default values.

## [0.5.0] - 2026-03-11

### Added
- Recent sales history endpoint and latest sale endpoint in backend.
- `/sales` frontend integration with persisted receipts from SQLite.

### Changed
- Improved receipt view and recent receipt consultation flow.
- Refined numeric input UX across operational forms.

## [0.4.0] - 2026-03-11

### Added
- Role-based navigation and protected routes for `ADMIN`, `CASHIER` and `AUDITOR`.
- Read-only mode for auditor-facing views.

### Changed
- Sidebar rendering now depends on centralized permissions.
- `/sales` and `/admin` distinguish between operational and consultative modes.

## [0.3.0] - 2026-03-10

### Added
- Frontend MVP with React, Vite, TypeScript, Tailwind, Zustand and Axios.
- POS, cash, products, ingredients, combos, sales and admin screens.
- Initial administrative dashboard and backend metric consumption.

### Changed
- Catalog consumption for `/pos` through consolidated backend endpoints.

## [0.2.0] - 2026-03-10

### Added
- Combo support in backend.
- Cash close summary and improved receipt payload.
- Stock validation before payment confirmation.

## [0.1.0] - 2026-03-06

### Added
- Initial offline-first POS backend with NestJS, Prisma and SQLite.
- Core modules for locations, ingredients, stock, products, variants, recipes, cash sessions, sales and payments.
