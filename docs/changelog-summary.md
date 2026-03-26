# Resumen de Evolución del Proyecto

## Fuente documental

Este resumen se basa en dos fuentes ya presentes en el repositorio:

- [`../CHANGELOG.md`](../CHANGELOG.md)
- cierres de sprint en [`sprints/`](sprints/)

## Etapas identificables del proyecto

### Fase 0.1.0

- base inicial del backend local;
- módulos centrales de ubicaciones, ingredientes, stock, productos, variantes, recetas, caja y ventas.

### Fase 0.2.0

- soporte de combos;
- mejora del cierre de caja;
- validación de stock antes del pago.

### Fase 0.3.0

- incorporación del frontend MVP con React, Vite, Zustand y Axios;
- aparición de pantallas POS, caja, productos, ingredientes, combos, ventas y admin.

### Fase 0.4.0

- navegación protegida por rol;
- separación funcional entre `ADMIN`, `CASHIER` y `AUDITOR`;
- modos de consulta para auditoría.

### Fase 0.5.0

- historial reciente de ventas;
- última venta disponible;
- consulta persistida de recibos desde SQLite.

### Fase 0.6.0

- soporte real de ubicaciones;
- endpoints administrativos de productos y variantes;
- gestión completa de recetas por variante;
- consolidación de datos reales en frontend administrativo.

### Sprint 7

- refuerzo de accesibilidad, responsive y consistencia visual;
- rediseño de login;
- consolidación de componentes base del frontend.

Detalle: [`sprints/sprint-7.md`](sprints/sprint-7.md)

### Sprint 8

- adopción del lenguaje visual premium con barras compactas;
- mejora sustancial del dashboard Admin;
- refinamiento de lectura operativa en POS, caja, ventas y módulos administrativos.

Detalle: [`sprints/sprint-8.md`](sprints/sprint-8.md)

### Sprint 9

- incorporación del sistema de temas predefinidos;
- persistencia de preferencia por usuario;
- extensión de la tematización al conjunto de la UI premium.

Detalle: [`sprints/sprint-9.md`](sprints/sprint-9.md)

## Lectura sintética de la evolución

La trayectoria observable del proyecto es la de un backend POS local que evolucionó hacia un producto más completo con frontend administrativo, operación por roles, panel ejecutivo y una capa visual más madura.

En términos de documentación formal del software, el repositorio hoy permite demostrar:

- crecimiento funcional por dominios;
- evolución de interfaz y experiencia de usuario;
- trazabilidad reciente de cambios significativos;
- continuidad técnica entre backend, frontend, base de datos y documentación.
