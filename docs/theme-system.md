# Sistema de Temas

## Propósito

El sistema de temas centraliza la identidad visual del frontend para mantener consistencia, escalabilidad y control sobre la experiencia de uso. La solución verificada en el repositorio trabaja con un catálogo cerrado de temas predefinidos.

## Temas disponibles

- `midnight-indigo`
- `graphite-cyan`
- `arctic-blue`
- `emerald-ops`
- `slate-amber`

`midnight-indigo` es el tema base del sistema y la identidad fija del estado no autenticado.

## Comportamiento verificado

### Antes de iniciar sesión

- la aplicación usa siempre `midnight-indigo`;
- esto cubre login, carga inicial previa a restaurar sesión, retorno al login y logout.

### Después de iniciar sesión

- si el usuario tiene `themePreference`, se aplica ese tema;
- si la preferencia no es válida o no existe, se aplica `midnight-indigo`.

## Persistencia

La preferencia de tema se persiste en dos niveles:

- backend: campo `themePreference` del modelo `User`;
- frontend: `localStorage` como respaldo técnico.

La fuente de verdad del usuario autenticado es el backend.

## Flujo de selección

1. El usuario autenticado accede al selector de tema en el header.
2. `ThemeProvider` aplica el tema al documento mediante `data-theme`.
3. La UI actualiza el estado local.
4. El frontend envía `PATCH /api/auth/me/theme`.
5. El backend valida el tema y lo persiste sobre el usuario.

## Componentes y archivos involucrados

### Frontend

- `frontend/src/theme/theme.ts`: catálogo cerrado de temas, tema por defecto y utilidades.
- `frontend/src/theme/ThemeProvider.tsx`: cálculo del tema efectivo y persistencia.
- `frontend/src/components/ThemeSelector.tsx`: selector visible en la UI autenticada.
- `frontend/src/store/sessionStore.ts`: conserva el usuario autenticado con `themePreference`.
- `frontend/src/styles.css`: tokens y estilos consumidos por la UI premium.

### Backend

- `prisma/schema.prisma`: persistencia del campo `themePreference`.
- `src/auth/theme-preference.constants.ts`: valores válidos y default.
- `src/auth/dto/update-theme-preference.dto.ts`: validación de entrada.
- `src/auth/auth.service.ts`: lectura y actualización de preferencia del usuario.

## Decisiones de UX observables

- el login no hereda el último tema usado por otro usuario;
- la selección de tema está restringida a un conjunto curado;
- la semántica de estados del sistema permanece separada del color primario del tema;
- `arctic-blue` es el único tema claro y recibió ajustes específicos de contraste según la documentación histórica del proyecto.

## Endpoints relacionados

- `POST /api/auth/login`
- `GET /api/auth/me`
- `PATCH /api/auth/me/theme`

## Relación con la evolución del proyecto

El sistema de temas quedó incorporado como una evolución posterior del frontend premium y está documentado también en:

- [`../CHANGELOG.md`](../CHANGELOG.md)
- [`sprints/sprint-9.md`](sprints/sprint-9.md)
