# Puesta en Marcha y Despliegue

## Alcance de este documento

Este repositorio sí incluye scripts de instalación, migración, seed y build. No incluye, en cambio, una estrategia de despliegue automatizada visible en archivos como `Dockerfile`, `docker-compose.yml`, pipelines CI/CD o manifiestos de infraestructura. Por esa razón, la guía se enfoca en la puesta en marcha manual y verificable.

## Ejecución en desarrollo

### Backend

```bash
npm install
# crear .env a partir de .env.example
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
npm run start:dev
```

Resultado esperado:

- API disponible en `http://localhost:3000/api`
- base SQLite local preparada;
- usuarios de ejemplo cargados.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Resultado esperado:

- aplicación web de desarrollo en Vite;
- consumo de `http://localhost:3000/api` por defecto;
- posibilidad de redefinir la URL con `VITE_API_URL`.

## Build del sistema

### Backend

```bash
npm run build
npm run start:prod
```

Artefacto generado: `dist/`

### Frontend

```bash
cd frontend
npm run build
npm run preview
```

Artefacto generado: `frontend/dist/`

## Consideraciones para un despliegue formal

Las siguientes recomendaciones son inferencias razonables a partir del material presente en el repositorio, no configuración ya implementada:

- definir un `JWT_SECRET` no temporal;
- ubicar la base SQLite en una ruta persistente respaldable;
- establecer política de respaldo para la base de datos local;
- decidir si el frontend se servirá de forma estática separada o por una capa web adicional;
- documentar estrategia operativa para actualizaciones de migraciones;
- proteger el acceso al archivo de base de datos y al entorno donde corre la API.

## Checklist mínimo antes de entregar o desplegar

- crear `.env` desde `.env.example`;
- ejecutar migraciones Prisma;
- ejecutar seed si se requieren usuarios base;
- validar login con `admin`, `cashier` o `auditor`;
- verificar que el frontend apunte a la URL correcta del backend;
- comprobar operación básica de POS, caja y consulta de ventas.

## Material auxiliar existente

- `requests.http`: colección útil para validar endpoints manualmente;
- `CHANGELOG.md`: historial funcional del proyecto;
- `docs/sprints/`: referencia de evolución reciente;
- `docs/assets/screenshots/`: ubicación sugerida para evidencia visual de despliegue o presentación.
