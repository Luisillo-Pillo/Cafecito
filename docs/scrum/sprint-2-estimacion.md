# Sprint 2 · Estimación y plan de sprints

El backlog suma **27 story points**. Se repartió en dos sprints de 2 semanas: el Sprint 1 con **19 puntos** (el flujo completo de venta) y el Sprint 2 con **8 puntos** (administración y roles). Ninguno pasa del máximo de 20.

## Escala

Puntos de Fibonacci (1, 2, 3, 5, 8). Miden complejidad, riesgo e incertidumbre, no horas.

**Historia de referencia: «Registrar clientes» = 2 puntos.** Es un formulario con validación y una regla (contacto único), sin dependencias con otras historias. Las demás se estimaron comparándolas con ella.

## Estimación del backlog

| # | Historia | Puntos | Por qué |
| --- | --- | --- | --- |
| [#7](https://github.com/Luisillo-Pillo/Cafecito/issues/7) | Registrar una venta y mostrar el ticket | 5 | La más riesgosa: valida stock de varios productos, es todo-o-nada, guarda snapshots de precio y genera el ticket. Debe aguantar dos ventas simultáneas. |
| [#6](https://github.com/Luisillo-Pillo/Cafecito/issues/6) | Armar la cuenta en el carrito | 3 | Estado en el frontend, tamaños con precios distintos y totales que se recalculan. |
| [#10](https://github.com/Luisillo-Pillo/Cafecito/issues/10) | Aplicar descuento por compras previas | 3 | Regla con 4 niveles, solo en el backend, y el contador que sube con cada venta. |
| [#12](https://github.com/Luisillo-Pillo/Cafecito/issues/12) | Editar y eliminar productos | 3 | Dos operaciones y la regla de no alterar ventas pasadas. |
| [#13](https://github.com/Luisillo-Pillo/Cafecito/issues/13) | Iniciar sesión como administrador | 3 | Seguridad: contraseña cifrada, token firmado y límite de intentos. |
| [#5](https://github.com/Luisillo-Pillo/Cafecito/issues/5) | Buscar productos en el punto de venta | 2 | Búsqueda por nombre con paginación; patrón conocido. |
| [#8](https://github.com/Luisillo-Pillo/Cafecito/issues/8) | Registrar clientes | 2 | Historia de referencia. |
| [#9](https://github.com/Luisillo-Pillo/Cafecito/issues/9) | Buscar e identificar al cliente recurrente | 2 | Búsqueda por tres campos y mostrar el descuento. |
| [#11](https://github.com/Luisillo-Pillo/Cafecito/issues/11) | Crear productos | 2 | Formulario con validación, similar a clientes. |
| [#14](https://github.com/Luisillo-Pillo/Cafecito/issues/14) | Restringir acciones según el rol | 2 | Middleware de permisos y ocultar opciones en la interfaz. |
| | **Total** | **27** | |

## Plan de sprints

| Sprint | Historias | Puntos | Objetivo |
| --- | --- | --- | --- |
| Sprint 1 (15–28 oct) | #5, #6, #7, #8, #9, #10, #11 | 19 | Un vendedor puede cobrar una venta completa a un cliente frecuente con su descuento. |
| Sprint 2 (29 oct–11 nov) | #12, #13, #14 | 8 | Solo el administrador gestiona el catálogo. |

**Justificación del Sprint 1.** Con 19 de 20 puntos, cabe el flujo completo de venta, que es lo que da valor desde el primer día. «Crear productos» (2) entra porque sin catálogo no hay qué vender. Se dejó 1 punto de holgura para imprevistos, en lugar de llenar el sprint al 100 %.

**Justificación del Sprint 2.** Solo 8 puntos porque el inicio de sesión toca seguridad y conviene hacerlo sin prisa. El resto de la capacidad se usó en pruebas, el pipeline de CI y la documentación.
