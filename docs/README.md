# DocumentaciÃ³n del Proyecto

Centro documental del repositorio `MicroserviciosPOS`. Esta carpeta quedÃ³ reorganizada para servir tanto como guÃ­a tÃ©cnica de desarrollo como material formal de presentaciÃ³n del software.

## NavegaciÃ³n recomendada

- [`overview.md`](overview.md): alcance, propÃ³sito y estado general del sistema.
- [`architecture.md`](architecture.md): arquitectura del monorepo y relaciÃ³n entre frontend, backend y base de datos.
- [`backend.md`](backend.md): mÃ³dulos NestJS, seguridad, contratos y scripts del backend.
- [`frontend.md`](frontend.md): estructura React/Vite, rutas, stores y comportamiento de la interfaz.
- [pos-mobile-ux.md](pos-mobile-ux.md): documentacion tecnica y funcional de la fase POS 1A, carrito movil, toast, filtros y limitaciones actuales.
- [`business-config.md`](business-config.md): implementacion completa de BusinessConfig en backend y frontend, con presets, endpoints y proteccion gradual por modulo.
- [`navigation-and-layout-updates.md`](navigation-and-layout-updates.md): nota tecnica breve de la mejora reciente de navegacion responsive, layout autenticado y refinamiento visual del sidebar.
- [`module-status-header-updates.md`](module-status-header-updates.md): nota tecnica breve de la estandarizacion visual de barras superiores y resumenes operativos por modulo.
- [`database.md`](database.md): esquema Prisma, entidades principales y reglas de persistencia.
- [`modules.md`](modules.md): mapa funcional y matriz resumida por dominio y roles.
- [`deployment.md`](deployment.md): instalaciÃ³n, build y despliegue manual con el material realmente presente en el repositorio.
- [`theme-system.md`](theme-system.md): catÃ¡logo de temas, persistencia y piezas tÃ©cnicas involucradas.
- [`dian-fields-preparation.md`](dian-fields-preparation.md): nota breve sobre la preparacion fiscal opcional del catalogo de productos.
- [`product-catalog-enrichment.md`](product-catalog-enrichment.md): nota breve sobre el enriquecimiento comercial y operativo incremental de `Product`.
- [`user-flows.md`](user-flows.md): flujos operativos principales del sistema.
- [`changelog-summary.md`](changelog-summary.md): sÃ­ntesis evolutiva del proyecto a partir del changelog y los cierres de sprint.

## Documentos complementarios preservados

- [`MANUAL_USUARIO.md`](MANUAL_USUARIO.md): guÃ­a operativa orientada al uso del sistema.
- [`../CHANGELOG.md`](../CHANGELOG.md): historial principal de cambios.
- [`sprints/sprint-7.md`](sprints/sprint-7.md), [`sprints/sprint-8.md`](sprints/sprint-8.md), [`sprints/sprint-9.md`](sprints/sprint-9.md): cierres documentales de evoluciÃ³n reciente.
- [`assets/screenshots/README.md`](assets/screenshots/README.md): ubicaciÃ³n sugerida para material visual de presentaciÃ³n.

## Criterio documental aplicado

- Se documenta Ãºnicamente lo verificado en el cÃ³digo, scripts, migraciones y documentaciÃ³n existente.
- No se describen integraciones, despliegues o funcionalidades que no estÃ©n sustentados en el repositorio.
- Cuando una observaciÃ³n es inferida a partir de la ausencia de archivos o configuraciÃ³n, se seÃ±ala como tal.




