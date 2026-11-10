# Sprint 0 · Backlog del producto

El backlog tiene **10 historias de usuario**, todas dentro del MVP: cada una ayuda a vender, a registrar clientes o a gestionar productos (la regla de oro del curso). No incluye tareas técnicas ni funciones fuera del alcance (pagos reales, reportes, facturación, multisucursal, impresoras).

Ordenadas por prioridad: primero lo que permite cobrar, después lo que premia al cliente y al final la administración.

| # | Issue | Historia |
| --- | --- | --- |
| 1 | [#5](https://github.com/Luisillo-Pillo/Cafecito/issues/5) | Como **vendedor** quiero buscar productos por nombre para encontrarlos rápido al atender. |
| 2 | [#6](https://github.com/Luisillo-Pillo/Cafecito/issues/6) | Como **vendedor** quiero agregar productos y cantidades al carrito para ver el subtotal y total antes de cobrar. |
| 3 | [#7](https://github.com/Luisillo-Pillo/Cafecito/issues/7) | Como **vendedor** quiero cobrar la cuenta y ver un ticket para entregarle el comprobante al cliente. |
| 4 | [#8](https://github.com/Luisillo-Pillo/Cafecito/issues/8) | Como **vendedor** quiero registrar a un cliente con nombre y teléfono o correo para identificarlo en sus próximas compras. |
| 5 | [#9](https://github.com/Luisillo-Pillo/Cafecito/issues/9) | Como **vendedor** quiero buscar a un cliente por nombre, teléfono o correo para asignarlo a la venta. |
| 6 | [#10](https://github.com/Luisillo-Pillo/Cafecito/issues/10) | Como **vendedor** quiero que el sistema aplique el descuento según las compras previas del cliente para premiar su lealtad sin calcularlo a mano. |
| 7 | [#11](https://github.com/Luisillo-Pillo/Cafecito/issues/11) | Como **administrador** quiero dar de alta productos con nombre, precio y stock para que estén disponibles en la venta. |
| 8 | [#12](https://github.com/Luisillo-Pillo/Cafecito/issues/12) | Como **administrador** quiero editar o eliminar productos para mantener el menú actualizado. |
| 9 | [#13](https://github.com/Luisillo-Pillo/Cafecito/issues/13) | Como **administrador** quiero entrar con correo y contraseña para que solo yo pueda gestionar los productos. |
| 10 | [#14](https://github.com/Luisillo-Pillo/Cafecito/issues/14) | Como **administrador** quiero que el vendedor no pueda modificar productos para proteger el catálogo y los precios. |

## Por qué estas historias

- **Ventas (1–3, 6):** son el corazón del punto de venta; sin ellas no hay producto.
- **Clientes (4–5):** sin identificar al cliente no se puede aplicar el descuento por lealtad.
- **Productos (7–8):** el catálogo, el precio y el stock son la base de cada venta.
- **Roles (9–10):** el curso pide que el vendedor venda y registre clientes, y que solo el administrador gestione productos.

## Qué quedó fuera a propósito

Categorías funcionales, pagos con terminal real, reportes de ventas, facturación e impuestos, varias sucursales e impresoras de tickets. El campo `category` y los tamaños de bebida existen, pero son opcionales y no agregan pantallas nuevas.
