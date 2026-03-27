# Actualizaciones de Navegación y Layout

## Alcance

Nota técnica breve sobre los ajustes recientes de navegación y layout en la interfaz autenticada de `Registry POS`.

## Cambios implementados

- El disparador hamburguesa de móvil ahora se renderiza desde `frontend/src/layouts/AppLayout.tsx`, fuera de `Header.tsx`, para permanecer visible durante el scroll.
- Los cambios de ruta reinician la posición principal mediante `frontend/src/app/router/ScrollToTop.tsx` usando `window.scrollTo(...)`.
- La navegación móvil cierra automáticamente el sidebar al cambiar de ruta y al seleccionar una opción del menú.
- En desktop se añadió un control compacto en la unión entre sidebar y contenido para colapsar o expandir la navegación lateral.
- El sidebar colapsado de desktop conserva iconos, estados activos y navegación directa mientras reduce el espacio ocupado por los textos.

## Archivos principales involucrados

- `frontend/src/layouts/AppLayout.tsx`
- `frontend/src/components/Header.tsx`
- `frontend/src/components/Sidebar.tsx`
- `frontend/src/app/router/ScrollToTop.tsx`

## Impacto en usabilidad

- La navegación móvil sigue accesible durante sesiones largas de scroll vertical.
- Cada nueva vista comienza arriba, evitando transiciones entre rutas con scroll intermedio.
- Las transiciones en móvil se sienten más limpias porque el menú lateral se cierra de inmediato al navegar.
- Desktop gana un modo de navegación más compacto sin alterar la identidad visual del sistema.