# Stock Adjustment Enhancement

## Objetivo

Implementar la Fase 3 de inventario con movimientos manuales auditados para entradas, salidas y ajustes por conteo, sin romper la logica existente de ventas, recetas y stock por ubicacion.

## Tipos de movimiento

- `ENTRY`: suma inventario disponible.
- `EXIT`: descuenta inventario por una salida manual.
- `ADJUSTMENT`: recalcula stock desde un conteo fisico y guarda la diferencia resultante.

## Motivos soportados

- `PURCHASE`
- `INITIAL_LOAD`
- `SUPPLIER_RETURN`
- `POSITIVE_ADJUSTMENT`
- `WASTE`
- `DAMAGE`
- `INTERNAL_USE`
- `EXPIRATION`
- `NEGATIVE_ADJUSTMENT`
- `PHYSICAL_COUNT`
- `ADMIN_CORRECTION`

## Reglas de validacion

- No se permite dejar stock negativo.
- `ENTRY` y `EXIT` usan cantidad positiva y unidad de trabajo.
- `ADJUSTMENT` no usa cantidad positiva o negativa manual: recibe stock contado y calcula la diferencia.
- `EXIT` requiere `notes`.
- `ADJUSTMENT` requiere `notes`.
- `unitCostAtTime` solo aplica para `ENTRY`.
- Los movimientos historicos son inmutables: no hay endpoints para editar o borrar.

## Impacto en inventario

- `IngredientMovement` ahora guarda snapshots de `previousStock` y `newStock`.
- Tambien registra `reasonCode`, `supportDocument`, `batchNumber`, `countedStock`, `unitCostAtTime` y referencia de origen cuando aplica.
- Las salidas por venta siguen ocurriendo al pagar la venta, pero ahora reutilizan la misma rutina central de persistencia de movimientos.

## Endpoints implementados

- `POST /api/stock/adjustments`
- `GET /api/stock/adjustments`
- `GET /api/stock/adjustments/:id`
- `POST /api/stock/adjust`
  - Se conserva como ruta legacy para compatibilidad con el flujo anterior.
