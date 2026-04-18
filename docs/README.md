# Documentación del Proyecto

Centro documental del repositorio `MicroserviciosPOS`. Esta carpeta quedó reorganizada para servir tanto como guía técnica de desarrollo como material formal de presentación del software.

## Navegación recomendada

- [`overview.md`](overview.md): alcance, propósito y estado general del sistema.
- [`architecture.md`](architecture.md): arquitectura del monorepo y relación entre frontend, backend y base de datos.
- [`backend.md`](backend.md): módulos NestJS, seguridad, contratos y scripts del backend.
- [`frontend.md`](frontend.md): estructura React/Vite, rutas, stores y comportamiento de la interfaz.
- [`pos-visual-phases.md`](pos-visual-phases.md): alcance real de D0, D1, D2A y D3 en frontend, con foco en sistema visual base y el estado visual actual de POS, Caja y Productos.
- [`pos-mobile-ux.md`](pos-mobile-ux.md): documentacion tecnica y funcional de la fase POS 1A, carrito movil, toast, filtros y limitaciones actuales.
- [`business-config.md`](business-config.md): implementacion completa de BusinessConfig en backend y frontend, con presets, endpoints y proteccion gradual por modulo.
- [`navigation-and-layout-updates.md`](navigation-and-layout-updates.md): nota tecnica breve de la mejora reciente de navegacion responsive, layout autenticado y refinamiento visual del sidebar.
- [`module-status-header-updates.md`](module-status-header-updates.md): nota tecnica breve de la estandarizacion visual de barras superiores y resumenes operativos por modulo.
- [`database.md`](database.md): esquema Prisma, entidades principales y reglas de persistencia.
- [`modules.md`](modules.md): mapa funcional y matriz resumida por dominio y roles.
- [`deployment.md`](deployment.md): instalación, build y despliegue manual con el material realmente presente en el repositorio.
- [`theme-system.md`](theme-system.md): catálogo de temas, persistencia y piezas técnicas involucradas.
- [`dian-fields-preparation.md`](dian-fields-preparation.md): nota breve sobre la preparacion fiscal opcional del catalogo de productos.
- [`product-catalog-enrichment.md`](product-catalog-enrichment.md): nota breve sobre el enriquecimiento comercial y operativo incremental de `Product`.
- [`user-flows.md`](user-flows.md): flujos operativos principales del sistema.
- [`changelog-summary.md`](changelog-summary.md): síntesis evolutiva del proyecto a partir del changelog y los cierres de sprint.

## Documentos complementarios preservados

- [`MANUAL_USUARIO.md`](MANUAL_USUARIO.md): guía operativa orientada al uso del sistema.
- [`../CHANGELOG.md`](../CHANGELOG.md): historial principal de cambios.
- [`sprints/sprint-7.md`](sprints/sprint-7.md), [`sprints/sprint-8.md`](sprints/sprint-8.md), [`sprints/sprint-9.md`](sprints/sprint-9.md): cierres documentales de evolución reciente.
- [`assets/screenshots/README.md`](assets/screenshots/README.md): ubicación sugerida para material visual de presentación.

## Criterio documental aplicado

- Se documenta únicamente lo verificado en el código, scripts, migraciones y documentación existente.
- No se describen integraciones, despliegues o funcionalidades que no estén sustentados en el repositorio.
- Cuando una observación es inferida a partir de la ausencia de archivos o configuración, se señala como tal.





