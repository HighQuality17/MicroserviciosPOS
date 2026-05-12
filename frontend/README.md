# Frontend MVP

Frontend web para el POS offline-first, preparado para integrarse más adelante con Electron.

## Ejecutar

```bash
pnpm -C frontend install
pnpm -C frontend run dev -- --host
```

## Notas

- Backend esperado en `http://localhost:3000/api`
- Si necesitas otro host, usa `VITE_API_URL`
- Algunas pantallas muestran datos creados en la sesión porque el backend aún no expone ciertos endpoints GET de catálogo e historial
