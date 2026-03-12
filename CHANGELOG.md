# Changelog

All notable changes to this project are documented in this file.

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
