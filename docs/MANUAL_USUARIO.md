# Manual de Usuario - Sistema POS

## 1. Introducción

El sistema POS permite gestionar la operación de un punto de venta, incluyendo administración de productos, ingredientes, recetas, stock, ventas, caja y visualización de indicadores del negocio.

Este manual describe el flujo recomendado de uso del sistema desde el inicio de sesión hasta el cierre de caja y la consulta de información administrativa.

---

## 2. Inicio de sesión

Al ingresar al sistema, el usuario debe autenticarse con sus credenciales.

### Credenciales de prueba

- **Administrador:** `admin@local.pos`
- **Cajero:** `cashier@local.pos`
- **Auditor:** `auditor@local.pos`
- **Contraseña para todos:** `example-demo-password-only`

Una vez autenticado, el sistema mostrará las opciones disponibles según el rol asignado.

---

## 3. Configuración inicial con rol Administrador

Antes de comenzar a vender, el administrador debe preparar la estructura básica del sistema.

### 3.1 Crear una localización del POS

1. Ingresar al módulo **Admin**.
2. Ir a la parte inferior de la vista.
3. Ubicar la sección de **Ubicaciones - Puntos de venta**.
4. Crear una nueva localización.
5. Registrar el nombre de la sede, caja o punto de venta.
6. Guardar los cambios.

Esta localización será utilizada posteriormente para operaciones de stock y caja.

---

## 4. Creación de ingredientes

Después de registrar la localización, el siguiente paso es crear los ingredientes necesarios para el inventario.

### 4.1 Registrar ingredientes

1. Ir al módulo **Ingredientes**.
2. Seleccionar la opción para crear un nuevo ingrediente.
3. Ingresar el nombre del ingrediente.
4. Definir la dimensión o tipo de medida correspondiente.
5. Seleccionar la unidad base adecuada.
6. Guardar.

### Ejemplos

- Azúcar → peso
- Leche → volumen
- Vasos → unidad

Es importante que la dimensión y la unidad del ingrediente sean correctas, ya que estas se usarán en el stock y en las recetas.

---

## 5. Registro de stock de ingredientes

Una vez creados los ingredientes, se debe registrar su existencia inicial.

### 5.1 Ajustar stock

1. Ir a la sección de **ajuste de stock**.
2. Seleccionar la **ubicación**.
3. Seleccionar el **ingrediente**.
4. Ingresar la **cantidad**.
5. Elegir la **unidad de medida** correcta.
6. Registrar una razón o comentario.
7. Confirmar el ajuste.

### Ejemplo

- Ingrediente: crema de leche
- Cantidad: 1000
- Unidad: ml
- Razón: ingreso inicial

---

## 6. Creación de productos

Luego de tener ingredientes y stock, el administrador puede crear los productos que serán vendidos.

### 6.1 Registrar productos

1. Ir al módulo **Productos**.
2. Crear un nuevo producto.
3. Ingresar el nombre y la información requerida.
4. Guardar.

### Ejemplos

- Fresas con crema
- Waffle especial
- Malteada de chocolate

---

## 7. Creación de variantes de productos

Cada producto puede tener diferentes presentaciones o tamaños.

### 7.1 Registrar variantes

1. Entrar al producto creado.
2. Ir a la sección **Variantes**.
3. Crear una nueva variante.
4. Definir nombre, presentación o tamaño.
5. Asignar el precio.
6. Guardar.

### Ejemplos

- Fresas con crema pequeña
- Fresas con crema mediana
- Fresas con crema grande

Las variantes son las unidades reales que se venden en caja.

---

## 8. Gestión de recetas de variantes

Después de crear las variantes, se debe definir qué ingredientes consume cada una.

### 8.1 Configurar receta

1. Entrar a la variante correspondiente.
2. Abrir la sección **Receta**.
3. Agregar los ingredientes que componen la variante.
4. Definir la cantidad usada de cada ingrediente.
5. Guardar los cambios.

### Ejemplo

Variante: Fresas con crema mediana

- 150 g de fresa
- 100 ml de crema
- 20 g de topping

Esto permite descontar automáticamente stock cuando se realiza una venta.

---

## 9. Apertura de caja

Cuando la configuración inicial ya está lista, se puede iniciar la operación comercial.

La apertura de caja puede realizarla un usuario con rol **Administrador** o **Cajero**.

### 9.1 Abrir caja

1. Ingresar al módulo **Caja**.
2. Seleccionar la localización correspondiente.
3. Crear o abrir una nueva caja.
4. Ingresar el valor base o fondo inicial.
5. Confirmar la apertura.

### Ejemplo

- Base inicial: 50.000

Este valor corresponde al efectivo inicial disponible al comenzar el turno.

---

## 10. Registro de ventas

Con la caja abierta, el sistema ya puede ser utilizado para registrar ventas.

### 10.1 Flujo de venta

1. Ir al módulo **Ventas**.
2. Seleccionar los productos o variantes disponibles.
3. Agregar cantidades al carrito.
4. Confirmar el total.
5. Registrar el método de pago.
6. Finalizar la venta.

Al completar la venta, el sistema:

- genera el comprobante
- registra la operación en caja
- descuenta el stock de ingredientes según la receta

---

## 11. Cierre de caja

Al finalizar la jornada, se debe cerrar la caja con el valor real recaudado en efectivo.

### 11.1 Procedimiento de cierre

1. Ingresar al módulo **Caja**.
2. Seleccionar la caja abierta.
3. Revisar el resumen de ventas.
4. Contar el efectivo disponible.
5. Ingresar el monto real recaudado.
6. Confirmar el cierre.

Esto permite comparar el efectivo esperado con el efectivo real y mantener control administrativo de la operación.

---

## 12. Consulta de comprobantes de venta

Después de registrar ventas, el sistema permite revisar los comprobantes emitidos.

### 12.1 Ver comprobantes

1. Ir al módulo **Ventas** o al historial correspondiente.
2. Buscar la venta deseada.
3. Abrir el detalle del comprobante.
4. Revisar productos, cantidades, fecha, total y forma de pago.

---

## 13. Panel administrativo y análisis del negocio

El administrador puede consultar el módulo **Admin** para revisar información general del negocio.

### 13.1 Información disponible

En esta sección se pueden visualizar indicadores como:

- comportamiento de ventas
- estado general de caja
- productos con mayor movimiento
- gráficos de negocio
- información de apoyo para análisis operativo

---

## 14. Flujo recomendado de uso

El orden recomendado para utilizar correctamente el sistema es el siguiente:

1. Iniciar sesión
2. Crear localización del POS
3. Crear ingredientes
4. Registrar stock de ingredientes
5. Crear productos
6. Crear variantes
7. Configurar recetas
8. Abrir caja
9. Registrar ventas
10. Cerrar caja
11. Consultar comprobantes
12. Revisar panel administrativo

---

## 15. Recomendaciones finales

- Crear primero toda la estructura del negocio antes de comenzar a vender.
- Verificar que cada ingrediente tenga su unidad correcta.
- Confirmar que las recetas estén asociadas correctamente a cada variante.
- Abrir caja antes de registrar ventas.
- Cerrar caja al finalizar el turno.
- Revisar periódicamente comprobantes e indicadores administrativos.
