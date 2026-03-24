# Sistema de Temas

## Proposito
El sistema de temas del POS centraliza la identidad visual del frontend para mantener consistencia, escalabilidad y control sobre la experiencia de uso. La solucion evita personalizacion libre por color picker y trabaja solo con un catalogo curado de temas predefinidos.

## Temas disponibles
- `midnight-indigo`
- `graphite-cyan`
- `arctic-blue`
- `emerald-ops`
- `slate-amber`

`midnight-indigo` es el tema base del sistema y la identidad fija del estado no autenticado.

## Seleccion de tema
La seleccion se realiza desde el selector visual del frontend, expuesto en la interfaz autenticada mediante `ThemeSelector`.

Flujo de uso:
- El usuario autenticado abre el selector.
- El cambio se aplica inmediatamente en el documento mediante `data-theme`.
- La preferencia se persiste en backend por usuario.
- La ultima preferencia tambien se replica en `localStorage` como respaldo tecnico.

## Comportamiento antes de login
Mientras no exista una sesion autenticada valida, la aplicacion usa siempre `midnight-indigo`.

Esto cubre:
- pantalla de login
- carga inicial previa a restaurar sesion
- retorno al login
- logout

Con este criterio se evita que el login herede el tema del ultimo usuario que uso el navegador.

## Comportamiento despues de login
Cuando la sesion autenticada ya esta disponible:
- si el usuario tiene `themePreference`, se aplica ese tema
- si no tiene preferencia valida, se aplica `midnight-indigo`

## Persistencia por usuario
La preferencia de tema queda asociada al usuario autenticado en backend a traves del campo `themePreference` del modelo `User`.

Reglas actuales:
- usuarios nuevos: quedan con default `midnight-indigo`
- usuarios existentes con `null`: se normalizan a `midnight-indigo`
- usuarios con preferencia valida previa: conservan su valor

## Fallback efectivo
El comportamiento final queda resumido asi:
- usuario no autenticado: `midnight-indigo`
- usuario autenticado con preferencia valida: su preferencia
- usuario autenticado sin preferencia valida: `midnight-indigo`

`localStorage` permanece como respaldo tecnico, pero ya no domina la identidad visual del estado no autenticado.

## Endpoints involucrados
- `POST /api/auth/login`
  Se usa para obtener el token de acceso.
- `GET /api/auth/me`
  Devuelve el usuario autenticado y su `themePreference`.
- `PATCH /api/auth/me/theme`
  Actualiza la preferencia de tema del usuario autenticado.

## Notas tecnicas de frontend
- `frontend/src/theme/theme.ts`
  Define el catalogo cerrado de temas, el tema por defecto y la aplicacion del `data-theme`.
- `frontend/src/theme/ThemeProvider.tsx`
  Orquesta el tema activo segun estado de autenticacion y persistencia por usuario.
- `frontend/src/components/ThemeSelector.tsx`
  Expone la seleccion de tema dentro de la UI autenticada.
- `frontend/src/store/sessionStore.ts`
  Hidrata la sesion y conserva el usuario autenticado con `themePreference`.

## Notas tecnicas de backend
- `prisma/schema.prisma`
  Agrega `themePreference` al modelo `User`.
- `src/auth/theme-preference.constants.ts`
  Centraliza los valores validos y el default.
- `src/auth/dto/update-theme-preference.dto.ts`
  Restringe el input a los cinco temas soportados.
- `src/auth/auth.service.ts`
  Lee y persiste la preferencia del usuario autenticado.

## Consideraciones de UX y consistencia visual
- El login conserva una identidad fija y predecible.
- Los cinco temas representan variaciones profesionales del mismo producto, no skins improvisadas.
- Los estados semanticos del sistema se mantienen separados del color primario del tema.
- `arctic-blue` es el unico tema claro y recibio ajustes especificos para legibilidad, contraste y jerarquia visual.
