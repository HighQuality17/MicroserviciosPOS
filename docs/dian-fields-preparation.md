# Fase 2: Preparacion de campos fiscales en productos

## Objetivo

Esta fase prepara el catalogo de productos para escenarios futuros de facturacion electronica y control fiscal en Colombia sin implementar aun integracion DIAN completa ni volver obligatorios los datos fiscales.

## Campos agregados en `Product`

- `unspscCode?: string`
- `vatType?: VatType`
- `taxCategory?: TaxCategory`
- `unitMeasure?: string`
- `isService: boolean = false`
- `applyInc: boolean = false`

## Enums agregados

### `VatType`

- `ZERO`
- `EXEMPT`
- `FIVE`
- `NINETEEN`
- `NOT_APPLICABLE`

### `TaxCategory`

- `TAXED`
- `EXEMPT`
- `EXCLUDED`
- `NOT_SUBJECT`

## Impacto funcional

- El backend acepta estos campos en creacion y edicion de productos.
- El frontend incorpora una seccion visible de `Datos fiscales` dentro del formulario de productos.
- Todos los campos siguen siendo opcionales en esta fase.
- Los productos existentes conservan compatibilidad por medio de migracion segura con campos `nullable` y defaults controlados.

## Limitaciones de esta fase

- No incluye integracion DIAN completa.
- No incluye UBL, XML, resoluciones, numeracion fiscal ni configuracion fiscal del negocio.
- No modifica aun el calculo fiscal de ventas.
- `taxCategory` se modela a nivel de producto; no reemplaza el regimen tributario del negocio.
